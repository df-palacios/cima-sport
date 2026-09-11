const express = require('express');
const pool = require('../db');
const { authenticate, requirePermission } = require('../middleware/auth');

const router = express.Router();

async function attachVariantsAndImages(products) {
  if (!products.length) return products;
  const ids = products.map((p) => p.id);
  const [variants] = await pool.query(
    `SELECT * FROM product_variants WHERE product_id IN (?) ORDER BY size, color`, [ids]
  );
  const [images] = await pool.query(
    `SELECT * FROM product_images WHERE product_id IN (?) ORDER BY is_primary DESC, sort_order`, [ids]
  );
  return products.map((p) => ({
    ...p,
    variants: variants.filter((v) => v.product_id === p.id),
    images: images.filter((i) => i.product_id === p.id),
    // Stock total del producto, para saber si mostrarlo como agotado.
    total_stock: variants.filter((v) => v.product_id === p.id).reduce((s, v) => s + v.stock, 0),
  }));
}

// GET /api/categories
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY sort_order');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener las categorías.' });
  }
});

// GET /api/brands
router.get('/brands', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT brand, COUNT(*) AS product_count
       FROM products
       WHERE active = 1 AND brand IS NOT NULL AND brand <> ''
       GROUP BY brand
       ORDER BY brand`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener las marcas.' });
  }
});

// GET /api/products?category=calzado&q=texto
router.get('/products', async (req, res) => {
  const { category, brand, q } = req.query;
  try {
    let sql = `SELECT p.* FROM products p
               LEFT JOIN categories c ON c.id = p.category_id
               WHERE p.active = 1`;
    const params = [];
    if (category) { sql += ' AND c.slug = ?'; params.push(category); }
    if (brand) { sql += ' AND p.brand = ?'; params.push(brand); }
    if (q) { sql += ' AND (p.name LIKE ? OR p.brand LIKE ? OR p.description LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    sql += ' ORDER BY p.created_at DESC';
    const [rows] = await pool.query(sql, params);
    res.json(await attachVariantsAndImages(rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener los productos.' });
  }
});

// GET /api/products/:slug
router.get('/products/:slug', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE slug = ? AND active = 1', [req.params.slug]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Producto no encontrado.' });
    const [full] = await attachVariantsAndImages(rows);
    res.json(full);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener el producto.' });
  }
});

/* ------------------- Administración del catálogo ------------------- */
const GESTIONA_CATALOGO = ['admin', 'bodega'];

// POST /api/products -> crear producto (admin)
router.post('/products', authenticate, requirePermission('catalogo.editar'), async (req, res) => {
  const { category_id, name, brand, description, base_price } = req.body;
  if (!category_id || !name || !base_price) {
    return res.status(400).json({ message: 'Categoría, nombre y precio son obligatorios.' });
  }
  const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  try {
    const [result] = await pool.query(
      'INSERT INTO products (category_id, slug, name, brand, description, base_price) VALUES (?,?,?,?,?,?)',
      [category_id, slug, name, brand || null, description || null, Math.round(base_price)]
    );
    res.status(201).json({ id: result.insertId, slug });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al crear el producto.' });
  }
});

// PATCH /api/products/:id -> editar (admin)
router.patch('/products/:id', authenticate, requirePermission('catalogo.editar'), async (req, res) => {
  const campos = ['name', 'brand', 'description', 'base_price', 'active'];
  const sets = [];
  const values = [];
  for (const c of campos) {
    if (req.body[c] !== undefined) { sets.push(`${c} = ?`); values.push(req.body[c]); }
  }
  if (!sets.length) return res.status(400).json({ message: 'Nada para actualizar.' });
  values.push(req.params.id);
  try {
    await pool.query(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`, values);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar el producto.' });
  }
});

// PATCH /api/variants/:id/stock -> fijar existencia (admin, bodega)
router.patch('/variants/:id/stock', authenticate, requirePermission('inventario.ajustar'), async (req, res) => {
  const { stock } = req.body;
  if (stock === undefined || Number(stock) < 0) {
    return res.status(400).json({ message: 'La existencia debe ser un número igual o mayor que cero.' });
  }
  try {
    await pool.query('UPDATE product_variants SET stock = ? WHERE id = ?', [Number(stock), req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar la existencia.' });
  }
});

module.exports = router;
