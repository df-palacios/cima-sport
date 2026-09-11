const jwt = require('jsonwebtoken');
const pool = require('../db');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Debes iniciar sesión.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Tu sesión venció. Vuelve a entrar.' });
  }
}

/**
 * Los permisos se releen de la base en cada petición sensible en vez de
 * confiar solo en los que trae el token: si a alguien le quitan un cargo,
 * pierde el acceso de inmediato, sin esperar a que expire su sesión.
 */
async function permisosDe(accountId) {
  const [rows] = await pool.query(
    `SELECT DISTINCT p.slug
       FROM accounts a
       JOIN employees e         ON e.account_id = a.id AND e.is_active = 1
       JOIN employee_roles er   ON er.employee_id = e.id
       JOIN role_permissions rp ON rp.role_id = er.role_id
       JOIN permissions p       ON p.id = rp.permission_id
      WHERE a.id = ? AND a.is_active = 1`,
    [accountId]
  );
  return rows.map((r) => r.slug);
}

/** Exige uno o varios permisos concretos, no un cargo. */
function requirePermission(...needed) {
  return async (req, res, next) => {
    try {
      const tiene = await permisosDe(req.user.id);
      req.permissions = tiene;
      if (needed.some((n) => tiene.includes(n))) return next();
      return res.status(403).json({ message: 'Tu cargo no tiene permiso para esta acción.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error al verificar permisos.' });
    }
  };
}

/** Carga permisos sin bloquear, para rutas que ajustan su respuesta según el cargo. */
async function loadPermissions(req, res, next) {
  try {
    req.permissions = req.user ? await permisosDe(req.user.id) : [];
  } catch {
    req.permissions = [];
  }
  next();
}

module.exports = { authenticate, requirePermission, loadPermissions, permisosDe };
