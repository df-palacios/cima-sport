const express = require('express');
const fs = require('fs');
const path = require('path');
const pool = require('../db');
const { authenticate, requirePermission } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/testing/reset
 * Devuelve la base a los datos de demostración.
 *
 * Doble protección, igual que en Cabra de León:
 *   1. Requiere sesión de administrador.
 *   2. Solo responde si ALLOW_DEMO_RESET=true en el .env del servidor.
 */
router.post('/reset', authenticate, requirePermission('demo.reiniciar'), async (req, res) => {
  if (process.env.ALLOW_DEMO_RESET !== 'true') {
    return res.status(403).json({ message: 'El reinicio de datos está desactivado en este servidor.' });
  }
  try {
    const seed = fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'seed.sql'), 'utf8');
    const connection = await pool.getConnection();
    try {
      await connection.query(seed);
    } finally {
      connection.release();
    }
    res.json({ ok: true, message: 'Datos de demostración restaurados.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'No se pudo reiniciar la demostración.' });
  }
});

module.exports = router;
