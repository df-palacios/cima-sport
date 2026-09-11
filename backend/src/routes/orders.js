const express = require('express');
const pool = require('../db');
const jwt = require('jsonwebtoken');
const { authenticate, requirePermission } = require('../middleware/auth');

/** Lee la cuenta del token si viene, sin exigirlo: el checkout es abierto. */
function cuentaOpcional(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try { return jwt.verify(h.slice(7), process.env.JWT_SECRET).id; } catch { return null; }
}

const router = express.Router();

// POST /api/orders -> checkout público (cliente registrado o invitado)
router.post('/', async (req, res) => {
  const { items, customer_name, customer_phone, customer_email, shipping_address, city, channel } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'El carrito está vacío.' });
  }
  if (!customer_name || !customer_phone) {
    return res.status(400).json({ message: 'Nombre y teléfono son obligatorios.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const lineas = [];
    for (const it of items) {
      const [[variant]] = await conn.query(
        `SELECT v.*, p.name AS product_name, p.base_price, p.active
           FROM product_variants v JOIN products p ON p.id = v.product_id
          WHERE v.id = ? FOR UPDATE`,
        [it.variantId]
      );
      if (!variant || !variant.active) {
        await conn.rollback();
        return res.status(400).json({ message: `Una de las prendas ya no está disponible.` });
      }
      const cantidad = Number(it.quantity);
      if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 10) {
        await conn.rollback();
        return res.status(400).json({ message: `Cantidad inválida para ${variant.product_name}.` });
      }
      if (variant.stock < cantidad) {
        await conn.rollback();
        return res.status(409).json({
          message: `Solo quedan ${variant.stock} unidades de ${variant.product_name} (${variant.size}/${variant.color}).`,
        });
      }
      // El precio SIEMPRE se lee de la base de datos, nunca del carrito del navegador.
      const unitPrice = variant.price_override ?? variant.base_price;
      lineas.push({
        variant_id: variant.id, product_name: variant.product_name,
        size: variant.size, color: variant.color, quantity: cantidad, unit_price: unitPrice,
      });
    }

    const subtotal = lineas.reduce((s, l) => s + l.unit_price * l.quantity, 0);
    const shippingCost = channel === 'tienda' ? 0 : (subtotal >= 150000 ? 0 : 12000);
    const total = subtotal + shippingCost;

    // Si compró con sesión iniciada, el pedido queda ligado a su cuenta y
    // aparecerá en su historial. Como invitado, account_id queda en null.
    const accountId = cuentaOpcional(req);
    const [orderResult] = await conn.query(
      `INSERT INTO orders (account_id, customer_name, customer_phone, customer_email, channel, shipping_address, city, subtotal, shipping_cost, total)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [accountId, customer_name, customer_phone, customer_email || null, channel || 'online',
       shipping_address || null, city || null, subtotal, shippingCost, total]
    );
    const orderId = orderResult.insertId;

    // Los pedidos online con dirección generan su domicilio automáticamente,
    // sin asignar todavía (eso lo decide ventas/admin desde el panel).
    if ((channel || 'online') === 'online' && shipping_address) {
      await conn.query(
        'INSERT INTO deliveries (order_id, address, city) VALUES (?,?,?)',
        [orderId, shipping_address, city || null]
      );
    }

    for (const l of lineas) {
      await conn.query(
        `INSERT INTO order_items (order_id, variant_id, product_name, size, color, quantity, unit_price)
         VALUES (?,?,?,?,?,?,?)`,
        [orderId, l.variant_id, l.product_name, l.size, l.color, l.quantity, l.unit_price]
      );
      await conn.query('UPDATE product_variants SET stock = stock - ? WHERE id = ?', [l.quantity, l.variant_id]);
    }

    await conn.commit();
    res.status(201).json({ id: orderId, subtotal, shippingCost, total });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Error al registrar el pedido.' });
  } finally {
    conn.release();
  }
});

// GET /api/orders/mine -> historial del cliente autenticado.
// Solo devuelve lo suyo: el id sale del token, nunca de la petición.
router.get('/mine', authenticate, async (req, res) => {
  try {
    const [orders] = await pool.query(
      'SELECT * FROM orders WHERE account_id = ? ORDER BY id DESC', [req.user.id]
    );
    if (orders.length === 0) return res.json([]);
    const ids = orders.map((o) => o.id);
    const [items] = await pool.query('SELECT * FROM order_items WHERE order_id IN (?)', [ids]);
    const [docs] = await pool.query('SELECT order_id, prefix, number, doc_type FROM fiscal_documents WHERE order_id IN (?)', [ids]);
    res.json(orders.map((o) => ({
      ...o,
      items: items.filter((i) => i.order_id === o.id),
      documento: docs.find((d) => d.order_id === o.id) || null,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener tus pedidos.' });
  }
});

// GET /api/orders -> panel de ventas/admin
router.get('/', authenticate, requirePermission('pedidos.ver','pedidos.gestionar'), async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT * FROM orders ORDER BY id DESC');
    const [items] = await pool.query('SELECT * FROM order_items');
    res.json(orders.map((o) => ({ ...o, items: items.filter((i) => i.order_id === o.id) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener los pedidos.' });
  }
});

const SIGUIENTE = {
  pendiente: 'confirmado', confirmado: 'en_preparacion',
  en_preparacion: 'enviado', enviado: 'entregado',
};

// PATCH /api/orders/:id/advance -> avanzar estado (admin, ventas)
router.patch('/:id/advance', authenticate, requirePermission('pedidos.ver','pedidos.gestionar'), async (req, res) => {
  try {
    const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ message: 'Pedido no encontrado.' });
    const next = SIGUIENTE[order.status];
    if (!next) return res.status(400).json({ message: 'Este pedido ya llegó a su último estado.' });
    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [next, order.id]);
    res.json({ id: order.id, status: next });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar el pedido.' });
  }
});

// PATCH /api/orders/:id/cancel -> cancelar y devolver stock (admin, ventas)
router.patch('/:id/cancel', authenticate, requirePermission('pedidos.ver','pedidos.gestionar'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[order]] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!order) { await conn.rollback(); return res.status(404).json({ message: 'Pedido no encontrado.' }); }
    if (['entregado', 'cancelado'].includes(order.status)) {
      await conn.rollback();
      return res.status(409).json({ message: 'Este pedido ya no se puede cancelar.' });
    }
    const [items] = await conn.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    for (const it of items) {
      if (it.variant_id) {
        await conn.query('UPDATE product_variants SET stock = stock + ? WHERE id = ?', [it.quantity, it.variant_id]);
      }
    }
    await conn.query("UPDATE orders SET status = 'cancelado' WHERE id = ?", [order.id]);

    // Si el pedido tenía un domicilio sin cerrar, se marca fallido con el
    // motivo de la cancelación, para no dejarlo huérfano en "en camino".
    const [[entrega]] = await conn.query(
      "SELECT * FROM deliveries WHERE order_id = ? AND status NOT IN ('Entregada','Fallida')",
      [order.id]
    );
    if (entrega) {
      await conn.query(
        "UPDATE deliveries SET status = 'Fallida', failure_reason = 'Pedido cancelado' WHERE id = ?",
        [entrega.id]
      );
      if (entrega.courier_id) {
        await conn.query("UPDATE couriers SET status = 'Disponible' WHERE id = ?", [entrega.courier_id]);
      }
    }

    await conn.commit();
    res.json({ id: order.id, status: 'cancelado' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Error al cancelar el pedido.' });
  } finally {
    conn.release();
  }
});

module.exports = router;
