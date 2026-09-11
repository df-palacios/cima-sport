const express = require('express');
const pool = require('../db');
const { authenticate, requirePermission } = require('../middleware/auth');
const fiscal = require('../fiscal');

const router = express.Router();
router.use(authenticate);

/* ------------------------- TURNO DE CAJA ------------------------- */

async function sesionAbierta(accountId) {
  const [[s]] = await pool.query(
    "SELECT * FROM cash_sessions WHERE account_id = ? AND status = 'abierta' ORDER BY id DESC LIMIT 1",
    [accountId]
  );
  return s || null;
}

/** Base + efectivo cobrado = lo que debería haber en el cajón. */
async function resumenSesion(sesion) {
  const [rows] = await pool.query(
    `SELECT method, COALESCE(SUM(amount),0) AS total, COUNT(*) AS n
       FROM payments WHERE session_id = ? GROUP BY method`,
    [sesion.id]
  );
  const porMedio = Object.fromEntries(rows.map((r) => [r.method, Number(r.total)]));
  const efectivo = porMedio.efectivo || 0;
  return {
    porMedio,
    totalCobrado: rows.reduce((s, r) => s + Number(r.total), 0),
    pagosCount: rows.reduce((s, r) => s + Number(r.n), 0),
    efectivoEsperado: Number(sesion.opening_amount) + efectivo,
  };
}

router.get('/session', requirePermission('caja.ver', 'caja.operar'), async (req, res) => {
  try {
    const sesion = await sesionAbierta(req.user.id);
    if (!sesion) return res.json({ abierta: false });
    res.json({ abierta: true, sesion, resumen: await resumenSesion(sesion) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al consultar la caja.' });
  }
});

router.post('/session/open', requirePermission('caja.operar'), async (req, res) => {
  const base = Number(req.body.openingAmount) || 0;
  if (base < 0) return res.status(400).json({ message: 'La base no puede ser negativa.' });
  try {
    if (await sesionAbierta(req.user.id)) {
      return res.status(409).json({ message: 'Ya tienes una caja abierta.' });
    }
    const [r] = await pool.query(
      'INSERT INTO cash_sessions (account_id, opening_amount) VALUES (?,?)', [req.user.id, base]
    );
    const [[sesion]] = await pool.query('SELECT * FROM cash_sessions WHERE id = ?', [r.insertId]);
    res.status(201).json({ abierta: true, sesion, resumen: await resumenSesion(sesion) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al abrir la caja.' });
  }
});

router.post('/session/close', requirePermission('caja.operar'), async (req, res) => {
  const contado = Number(req.body.countedCash);
  if (!Number.isFinite(contado) || contado < 0) {
    return res.status(400).json({ message: 'Indica cuánto efectivo contaste.' });
  }
  try {
    const sesion = await sesionAbierta(req.user.id);
    if (!sesion) return res.status(409).json({ message: 'No tienes una caja abierta.' });
    const resumen = await resumenSesion(sesion);
    await pool.query(
      "UPDATE cash_sessions SET status='cerrada', closed_at=NOW(), counted_cash=?, notes=? WHERE id=?",
      [contado, (req.body.notes || '').slice(0, 255) || null, sesion.id]
    );
    res.json({
      cerrada: true,
      esperado: resumen.efectivoEsperado,
      contado,
      // Positivo = sobra plata, negativo = falta.
      diferencia: contado - resumen.efectivoEsperado,
      resumen,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al cerrar la caja.' });
  }
});

/* --------------------------- COBRO --------------------------- */

router.get('/pending', requirePermission('caja.ver', 'caja.operar'), async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT * FROM orders
        WHERE payment_status = 'pendiente' AND status <> 'cancelado'
        ORDER BY id DESC`
    );
    const [items] = await pool.query('SELECT * FROM order_items');
    res.json(orders.map((o) => ({ ...o, items: items.filter((i) => i.order_id === o.id) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener los pedidos por cobrar.' });
  }
});

router.post('/pay/:orderId', requirePermission('caja.operar'), async (req, res) => {
  const { payments = [], discount = 0, customerName, customerDoc } = req.body;

  if (!Array.isArray(payments) || payments.length === 0) {
    return res.status(400).json({ message: 'Indica al menos un medio de pago.' });
  }
  const MEDIOS = ['efectivo', 'tarjeta', 'transferencia', 'contraentrega'];
  if (payments.some((p) => !MEDIOS.includes(p.method) || !(Number(p.amount) > 0))) {
    return res.status(400).json({ message: 'Hay un medio de pago o un monto inválido.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[order]] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [req.params.orderId]);
    if (!order) { await conn.rollback(); return res.status(404).json({ message: 'Pedido no encontrado.' }); }
    if (order.payment_status === 'pagado') {
      await conn.rollback();
      return res.status(409).json({ message: 'Este pedido ya fue cobrado.' });
    }
    if (order.status === 'cancelado') {
      await conn.rollback();
      return res.status(409).json({ message: 'No se puede cobrar un pedido cancelado.' });
    }

    const desc = Math.max(0, Math.round(Number(discount) || 0));
    if (desc > order.total) {
      await conn.rollback();
      return res.status(400).json({ message: 'El descuento no puede superar el total.' });
    }

    const desglose = fiscal.desglosar({ subtotal: order.total, discount: desc });
    const pagado = payments.reduce((s, p) => s + Math.round(Number(p.amount)), 0);
    if (pagado < desglose.total) {
      await conn.rollback();
      return res.status(400).json({
        message: `Faltan $${(desglose.total - pagado).toLocaleString('es-CO')} por cubrir.`,
      });
    }

    const sesion = await sesionAbierta(req.user.id);
    const efectivo = payments.find((p) => p.method === 'efectivo');

    // El vuelto sale de lo que el cliente ENTREGÓ, no del monto aplicado:
    // si paga $149.900 con un billete de $200.000, se le devuelven $50.100.
    const entregado = payments.reduce((s, p) => {
      const monto = Math.round(Number(p.amount));
      if (p.method !== 'efectivo') return s + monto;
      return s + Math.round(Number(p.received ?? p.amount));
    }, 0);
    const vuelto = Math.max(0, entregado - desglose.total);

    for (const p of payments) {
      const esEfectivo = p.method === 'efectivo';
      await conn.query(
        `INSERT INTO payments (order_id, session_id, account_id, method, amount, received, change_given)
         VALUES (?,?,?,?,?,?,?)`,
        [order.id, sesion?.id ?? null, req.user.id, p.method, Math.round(Number(p.amount)),
         esEfectivo ? Math.round(Number(p.received ?? p.amount)) : null,
         esEfectivo ? vuelto : null]
      );
    }

    const docType = fiscal.tipoDocumento({ total: desglose.total, customerDoc });
    const numero = await fiscal.siguienteConsecutivo(conn, fiscal.CONFIG.prefijo);
    const [docRes] = await conn.query(
      `INSERT INTO fiscal_documents
        (order_id, doc_type, prefix, number, subtotal, discount, tax_base, tax_rate,
         tax_amount, total, customer_name, customer_doc, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'pendiente')`,
      [order.id, docType, fiscal.CONFIG.prefijo, numero, desglose.subtotal, desglose.discount,
       desglose.taxBase, desglose.taxRate, desglose.taxAmount, desglose.total,
       customerName || order.customer_name, customerDoc || null]
    );

    await conn.query(
      `UPDATE orders SET payment_status='pagado', payment_method=?, paid_at=NOW() WHERE id=?`,
      [payments.length > 1 ? 'efectivo' : payments[0].method, order.id]
    );

    await conn.commit();
    const [[doc]] = await pool.query('SELECT * FROM fiscal_documents WHERE id = ?', [docRes.insertId]);
    res.status(201).json({
      ok: true, documento: doc, desglose, vuelto,
      recibidoEfectivo: efectivo ? Math.round(Number(efectivo.received ?? efectivo.amount)) : 0,
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Error al registrar el cobro.' });
  } finally {
    conn.release();
  }
});

router.get('/receipt/:orderId', requirePermission('caja.ver', 'caja.operar'), async (req, res) => {
  try {
    const [[doc]] = await pool.query(
      'SELECT * FROM fiscal_documents WHERE order_id = ? ORDER BY id DESC LIMIT 1', [req.params.orderId]
    );
    if (!doc) return res.status(404).json({ message: 'Ese pedido no tiene documento.' });
    const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ?', [doc.order_id]);
    const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [doc.order_id]);
    const [pagos] = await pool.query('SELECT * FROM payments WHERE order_id = ?', [doc.order_id]);
    res.json({ documento: doc, order, items, pagos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener la tirilla.' });
  }
});

module.exports = router;
