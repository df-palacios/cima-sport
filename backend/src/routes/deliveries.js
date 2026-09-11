const express = require('express');
const pool = require('../db');
const { authenticate, requirePermission, permisosDe } = require('../middleware/auth');

const router = express.Router();

// Despachar (asignar) y operar (salir/entregar) ahora son permisos, no
// cargos: así el administrador puede crear el cargo "Coordinador de
// despachos" sin tocar código.
const P_DESPACHO = 'domicilios.asignar';
const P_VER_TODOS = 'domicilios.ver_todos';
const P_OPERAR = 'domicilios.operar';

const SELECT_BASE = `
  SELECT d.*, c.name AS courier_name, o.customer_name, o.customer_phone, o.total
  FROM deliveries d
  LEFT JOIN couriers c ON c.id = d.courier_id
  LEFT JOIN orders   o ON o.id = d.order_id
`;

/** El id de courier del usuario conectado (null si no es domiciliario). */
async function courierDelUsuario(userId) {
  const [rows] = await pool.query('SELECT id FROM couriers WHERE account_id = ? LIMIT 1', [userId]);
  return rows[0]?.id ?? null;
}

// GET /api/deliveries — el domiciliario solo ve las SUYAS; quien despacha las ve todas.
router.get('/', authenticate, async (req, res) => {
  try {
    const permisos = await permisosDe(req.user.id);
    // Quien puede ver todos, ve todos. Quien solo opera, ve las suyas.
    if (permisos.includes(P_VER_TODOS)) {
      const [rows] = await pool.query(`${SELECT_BASE} ORDER BY d.id DESC`);
      return res.json(rows);
    }
    if (permisos.includes(P_OPERAR)) {
      const courierId = await courierDelUsuario(req.user.id);
      if (!courierId) return res.json([]);
      const [rows] = await pool.query(`${SELECT_BASE} WHERE d.courier_id = ? ORDER BY d.id DESC`, [courierId]);
      return res.json(rows);
    }
    return res.status(403).json({ message: 'Tu cargo no tiene acceso a los domicilios.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener los domicilios.' });
  }
});

// GET /api/deliveries/couriers — lista para el selector de asignación.
router.get('/couriers', authenticate, requirePermission(P_DESPACHO), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM couriers ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener los domiciliarios.' });
  }
});

// PATCH /api/deliveries/:id/assign — asignar domiciliario propio.
// El domiciliario NO puede auto-asignarse: quien despacha decide quién sale.
router.patch('/:id/assign', authenticate, requirePermission(P_DESPACHO), async (req, res) => {
  const { courierId } = req.body;
  try {
    const [[entrega]] = await pool.query('SELECT * FROM deliveries WHERE id = ?', [req.params.id]);
    if (!entrega) return res.status(404).json({ message: 'Domicilio no encontrado.' });
    if (['Entregada', 'Fallida'].includes(entrega.status)) {
      return res.status(409).json({ message: 'Este domicilio ya está cerrado.' });
    }
    if (entrega.provider !== 'propio') {
      return res.status(409).json({
        message: 'Este pedido va por mensajería externa; no se asigna un domiciliario propio.',
      });
    }
    if (courierId) {
      const [[c]] = await pool.query('SELECT id FROM couriers WHERE id = ?', [courierId]);
      if (!c) return res.status(400).json({ message: 'Ese domiciliario no existe.' });
    }
    await pool.query(
      `UPDATE deliveries SET courier_id = ?, status = ?, assigned_at = ? WHERE id = ?`,
      [courierId || null, courierId ? 'Asignada' : 'Sin asignar', courierId ? new Date() : null, entrega.id]
    );
    const [[actualizada]] = await pool.query(`${SELECT_BASE} WHERE d.id = ?`, [entrega.id]);
    res.json(actualizada);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al asignar el domiciliario.' });
  }
});

// PATCH /api/deliveries/:id/provider — marcar que va por mensajería externa.
router.patch('/:id/provider', authenticate, requirePermission(P_DESPACHO), async (req, res) => {
  const { provider, externalCarrier, trackingRef } = req.body;
  if (!['propio', 'externo'].includes(provider)) {
    return res.status(400).json({ message: 'Tipo de reparto no válido.' });
  }
  try {
    await pool.query(
      `UPDATE deliveries
         SET provider = ?, external_carrier = ?, tracking_ref = ?,
             courier_id = CASE WHEN ? = 'propio' THEN courier_id ELSE NULL END,
             status = CASE WHEN ? = 'propio' THEN status ELSE 'En camino' END
       WHERE id = ?`,
      [provider, externalCarrier || null, trackingRef || null, provider, provider, req.params.id]
    );
    const [[actualizada]] = await pool.query(`${SELECT_BASE} WHERE d.id = ?`, [req.params.id]);
    if (!actualizada) return res.status(404).json({ message: 'Domicilio no encontrado.' });
    res.json(actualizada);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al cambiar el tipo de reparto.' });
  }
});

/** Solo quien despacha, o el domiciliario dueño de esa entrega. */
async function puedeOperar(req, entrega) {
  const permisos = await permisosDe(req.user.id);
  if (permisos.includes(P_DESPACHO)) return true;
  if (!permisos.includes(P_OPERAR)) return false;
  // Un domiciliario solo mueve lo que tiene asignado.
  const courierId = await courierDelUsuario(req.user.id);
  return courierId !== null && entrega.courier_id === courierId;
}

// PATCH /api/deliveries/:id/pickup — "ya salí con el pedido".
router.patch('/:id/pickup', authenticate, async (req, res) => {
  try {
    const [[entrega]] = await pool.query('SELECT * FROM deliveries WHERE id = ?', [req.params.id]);
    if (!entrega) return res.status(404).json({ message: 'Domicilio no encontrado.' });
    if (!(await puedeOperar(req, entrega))) {
      return res.status(403).json({ message: 'Solo puedes mover los domicilios asignados a ti.' });
    }
    if (entrega.status !== 'Asignada') {
      return res.status(409).json({ message: 'El domicilio debe estar asignado para poder salir.' });
    }
    await pool.query("UPDATE deliveries SET status = 'En camino', picked_up_at = NOW() WHERE id = ?", [entrega.id]);
    await pool.query("UPDATE couriers SET status = 'En ruta' WHERE id = ?", [entrega.courier_id]);
    res.json({ id: entrega.id, status: 'En camino' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al registrar la salida.' });
  }
});

// PATCH /api/deliveries/:id/deliver — entregado al cliente.
router.patch('/:id/deliver', authenticate, async (req, res) => {
  try {
    const [[entrega]] = await pool.query('SELECT * FROM deliveries WHERE id = ?', [req.params.id]);
    if (!entrega) return res.status(404).json({ message: 'Domicilio no encontrado.' });
    if (!(await puedeOperar(req, entrega))) {
      return res.status(403).json({ message: 'Solo puedes mover los domicilios asignados a ti.' });
    }
    if (entrega.status === 'Entregada') {
      return res.status(409).json({ message: 'Este domicilio ya fue entregado.' });
    }
    await pool.query("UPDATE deliveries SET status = 'Entregada', delivered_at = NOW() WHERE id = ?", [entrega.id]);
    await pool.query("UPDATE orders SET status = 'entregado' WHERE id = ?", [entrega.order_id]);
    if (entrega.courier_id) {
      const [[{ pendientes }]] = await pool.query(
        `SELECT COUNT(*) AS pendientes FROM deliveries
         WHERE courier_id = ? AND status IN ('Asignada','En camino')`,
        [entrega.courier_id]
      );
      await pool.query('UPDATE couriers SET status = ? WHERE id = ?',
        [pendientes > 0 ? 'En ruta' : 'Disponible', entrega.courier_id]);
    }
    res.json({ id: entrega.id, status: 'Entregada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al marcar la entrega.' });
  }
});

// PATCH /api/deliveries/:id/fail — no se pudo entregar.
router.patch('/:id/fail', authenticate, async (req, res) => {
  const { reason } = req.body;
  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ message: 'Indica por qué no se pudo entregar.' });
  }
  try {
    const [[entrega]] = await pool.query('SELECT * FROM deliveries WHERE id = ?', [req.params.id]);
    if (!entrega) return res.status(404).json({ message: 'Domicilio no encontrado.' });
    if (!(await puedeOperar(req, entrega))) {
      return res.status(403).json({ message: 'Solo puedes mover los domicilios asignados a ti.' });
    }
    await pool.query(
      "UPDATE deliveries SET status = 'Fallida', failure_reason = ? WHERE id = ?",
      [String(reason).trim().slice(0, 255), entrega.id]
    );
    if (entrega.courier_id) {
      await pool.query("UPDATE couriers SET status = 'Disponible' WHERE id = ?", [entrega.courier_id]);
    }
    res.json({ id: entrega.id, status: 'Fallida' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al registrar el fallo.' });
  }
});

module.exports = router;
