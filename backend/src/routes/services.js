const express = require('express');
const pool = require('../db');
const { authenticate, requirePermission } = require('../middleware/auth');

const router = express.Router();

// POST /api/services -> el público solicita bordado/estampado/confección
router.post('/', async (req, res) => {
  const { service_type, customer_name, customer_phone, description } = req.body;
  const VALIDOS = ['bordado', 'estampado', 'confeccion'];
  if (!VALIDOS.includes(service_type)) return res.status(400).json({ message: 'Tipo de servicio inválido.' });
  if (!customer_name || !customer_phone || !description) {
    return res.status(400).json({ message: 'Nombre, teléfono y descripción son obligatorios.' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO service_requests (service_type, customer_name, customer_phone, description) VALUES (?,?,?,?)',
      [service_type, customer_name, customer_phone, description]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al enviar la solicitud.' });
  }
});

// GET /api/services -> staff revisa solicitudes
router.get('/', authenticate, requirePermission('servicios.ver','servicios.gestionar'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM service_requests ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener las solicitudes.' });
  }
});

// PATCH /api/services/:id -> cambiar estado
router.patch('/:id', authenticate, requirePermission('servicios.ver','servicios.gestionar'), async (req, res) => {
  const { status } = req.body;
  const VALIDOS = ['nueva', 'cotizada', 'en_proceso', 'entregada'];
  if (!VALIDOS.includes(status)) return res.status(400).json({ message: 'Estado inválido.' });
  try {
    await pool.query('UPDATE service_requests SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ id: Number(req.params.id), status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar la solicitud.' });
  }
});

module.exports = router;
