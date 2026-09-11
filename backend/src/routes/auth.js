const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authenticate, permisosDe } = require('../middleware/auth');

const router = express.Router();

function sign(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
}

/**
 * Reglas de contraseña. Se validan también en el navegador para dar aviso
 * inmediato, pero esta es la que manda: el cliente se puede saltar.
 */
const MIN_LARGO = 8;
function validarPassword(pass) {
  const fallos = [];
  if (!pass || pass.length < MIN_LARGO) fallos.push(`Debe tener al menos ${MIN_LARGO} caracteres.`);
  if (!/[a-z]/.test(pass || '')) fallos.push('Debe incluir al menos una letra minúscula.');
  if (!/[A-Z]/.test(pass || '')) fallos.push('Debe incluir al menos una letra mayúscula.');
  if (!/\d/.test(pass || '')) fallos.push('Debe incluir al menos un número.');
  // Las más usadas del mundo; bloquearlas evita cuentas triviales de abrir.
  const comunes = ['12345678','password','contrasena','contraseña','qwerty123','11111111','cimasport'];
  if (comunes.includes((pass || '').toLowerCase())) fallos.push('Esa contraseña es demasiado común.');
  return fallos;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Datos que el frontend necesita para pintar el menú y las acciones. */
async function sesionDe(account) {
  const permisos = await permisosDe(account.id);
  const [roles] = await pool.query(
    `SELECT r.slug, r.name FROM employees e
       JOIN employee_roles er ON er.employee_id = e.id
       JOIN roles r ON r.id = er.role_id
      WHERE e.account_id = ? AND e.is_active = 1`,
    [account.id]
  );
  const [[cliente]] = await pool.query('SELECT account_id FROM customer_profiles WHERE account_id = ?', [account.id]);
  return {
    id: account.id,
    name: account.full_name,
    email: account.email,
    isEmployee: roles.length > 0,
    isCustomer: !!cliente,
    roles: roles.map((r) => ({ slug: r.slug, name: r.name })),
    permissions: permisos,
  };
}

/* ---------------- Entrada única ----------------
   Una sola puerta para todos: el sistema decide qué puede hacer cada quien
   según sus cargos, no según por dónde entró. Antes había dos endpoints
   distintos (staff y cliente) sobre dos tablas separadas. */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Escribe tu correo y contraseña.' });
  try {
    const [rows] = await pool.query('SELECT * FROM accounts WHERE email = ?', [String(email).trim().toLowerCase()]);
    const account = rows[0];
    if (!account || !account.is_active || !(await bcrypt.compare(password, account.password_hash))) {
      return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
    }
    const sesion = await sesionDe(account);
    res.json({ token: sign({ id: account.id, name: account.full_name }), user: sesion });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al iniciar sesión.' });
  }
});

router.post('/register', async (req, res) => {
  const { name, email, password, passwordConfirm, phone } = req.body;

  if (!name || String(name).trim().length < 3) {
    return res.status(400).json({ message: 'Escribe tu nombre completo (mínimo 3 caracteres).' });
  }
  if (!EMAIL_RE.test(String(email || ''))) {
    return res.status(400).json({ message: 'Ese correo no parece válido.' });
  }
  if (password !== passwordConfirm) {
    return res.status(400).json({ message: 'Las dos contraseñas no coinciden.' });
  }
  const fallos = validarPassword(password);
  if (fallos.length) return res.status(400).json({ message: fallos[0], issues: fallos });
  if (phone && !/^\d{7,15}$/.test(String(phone).replace(/\s/g, ''))) {
    return res.status(400).json({ message: 'El teléfono debe tener entre 7 y 15 dígitos.' });
  }

  const correo = String(email).trim().toLowerCase();
  try {
    const [existe] = await pool.query('SELECT id FROM accounts WHERE email = ?', [correo]);
    if (existe.length) return res.status(409).json({ message: 'Ya hay una cuenta con ese correo.' });

    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query(
      'INSERT INTO accounts (full_name, email, password_hash, phone) VALUES (?,?,?,?)',
      [String(name).trim(), correo, hash, phone || null]
    );
    await pool.query('INSERT INTO customer_profiles (account_id) VALUES (?)', [r.insertId]);

    const [[account]] = await pool.query('SELECT * FROM accounts WHERE id = ?', [r.insertId]);
    const sesion = await sesionDe(account);
    res.status(201).json({ token: sign({ id: account.id, name: account.full_name }), user: sesion });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al crear la cuenta.' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const [[account]] = await pool.query('SELECT * FROM accounts WHERE id = ?', [req.user.id]);
    if (!account) return res.status(404).json({ message: 'Cuenta no encontrada.' });
    res.json(await sesionDe(account));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al leer la sesión.' });
  }
});

module.exports = router;
