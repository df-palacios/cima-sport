const express = require('express');
const pool = require('../db');
const { authenticate, requirePermission } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requirePermission('reportes.ver'));

router.get('/summary', async (req, res) => {
  try {
    const [[totals]] = await pool.query(
      `SELECT COALESCE(SUM(total),0) AS revenue, COUNT(*) AS order_count
       FROM orders WHERE status != 'cancelado'`
    );
    const [[stockBajo]] = await pool.query(
      'SELECT COUNT(*) AS n FROM product_variants WHERE stock <= 3'
    );
    const [porCategoria] = await pool.query(`
      SELECT c.name AS category, COUNT(DISTINCT p.id) AS productos,
             COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS revenue
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id
        LEFT JOIN order_items oi ON oi.product_name = p.name
       GROUP BY c.id ORDER BY revenue DESC
    `);
    res.json({
      revenue: Number(totals.revenue),
      orderCount: Number(totals.order_count),
      lowStockCount: Number(stockBajo.n),
      byCategory: porCategoria.map((r) => ({ ...r, revenue: Number(r.revenue), productos: Number(r.productos) })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al generar el resumen.' });
  }
});

router.get('/top-products', async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 1), 50);
  try {
    const [rows] = await pool.query(
      `SELECT product_name, SUM(quantity) AS units, SUM(quantity*unit_price) AS revenue
         FROM order_items GROUP BY product_name ORDER BY units DESC LIMIT ?`,
      [limit]
    );
    res.json(rows.map((r) => ({ ...r, units: Number(r.units), revenue: Number(r.revenue) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener los más vendidos.' });
  }
});

module.exports = router;
