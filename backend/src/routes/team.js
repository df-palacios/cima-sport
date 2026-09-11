const express = require('express');
const pool = require('../db');
const { authenticate, requirePermission } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/team/roles — cargos con sus permisos y cuánta gente los tiene.
router.get('/roles', requirePermission('equipo.ver'), async (req, res) => {
  try {
    const [roles] = await pool.query('SELECT * FROM roles ORDER BY is_system DESC, name');
    const [perms] = await pool.query(
      `SELECT rp.role_id, p.slug, p.area, p.description
         FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id`
    );
    const [conteo] = await pool.query(
      'SELECT role_id, COUNT(*) AS n FROM employee_roles GROUP BY role_id'
    );
    res.json(roles.map((r) => ({
      ...r,
      permissions: perms.filter((p) => p.role_id === r.id).map(({ slug, area, description }) => ({ slug, area, description })),
      employeeCount: Number(conteo.find((c) => c.role_id === r.id)?.n || 0),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener los cargos.' });
  }
});

// GET /api/team/permissions — catálogo completo, agrupado por área.
router.get('/permissions', requirePermission('equipo.ver'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM permissions ORDER BY area, slug');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener los permisos.' });
  }
});

// GET /api/team/employees — quién trabaja aquí y con qué cargos.
router.get('/employees', requirePermission('equipo.ver'), async (req, res) => {
  try {
    const [emps] = await pool.query(
      `SELECT e.*, a.full_name, a.email, a.phone, a.is_active AS account_active
         FROM employees e JOIN accounts a ON a.id = e.account_id
        ORDER BY e.is_active DESC, a.full_name`
    );
    const [asign] = await pool.query(
      `SELECT er.employee_id, r.id AS role_id, r.slug, r.name
         FROM employee_roles er JOIN roles r ON r.id = er.role_id`
    );
    res.json(emps.map((e) => ({ ...e, roles: asign.filter((a) => a.employee_id === e.id) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener el equipo.' });
  }
});

// PUT /api/team/employees/:id/roles — reemplaza los cargos de un empleado.
router.put('/employees/:id/roles', requirePermission('equipo.gestionar'), async (req, res) => {
  const { roleIds } = req.body;
  if (!Array.isArray(roleIds)) return res.status(400).json({ message: 'Envía la lista de cargos.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[emp]] = await conn.query('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    if (!emp) { await conn.rollback(); return res.status(404).json({ message: 'Empleado no encontrado.' }); }

    // No dejar el sistema sin ningún administrador activo.
    const [[{ admins }]] = await conn.query(
      `SELECT COUNT(DISTINCT e.id) AS admins
         FROM employees e
         JOIN employee_roles er ON er.employee_id = e.id
         JOIN roles r ON r.id = er.role_id
        WHERE r.slug = 'administrador' AND e.is_active = 1 AND e.id <> ?`,
      [emp.id]
    );
    const [rolesAdmin] = await conn.query("SELECT id FROM roles WHERE slug = 'administrador'");
    const quedaAdmin = roleIds.includes(rolesAdmin[0]?.id);
    if (admins === 0 && !quedaAdmin) {
      await conn.rollback();
      return res.status(409).json({
        message: 'No puedes dejar la tienda sin ningún administrador activo.',
      });
    }

    await conn.query('DELETE FROM employee_roles WHERE employee_id = ?', [emp.id]);
    for (const rid of roleIds) {
      await conn.query('INSERT INTO employee_roles (employee_id, role_id) VALUES (?,?)', [emp.id, rid]);
    }
    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar los cargos.' });
  } finally {
    conn.release();
  }
});

// PATCH /api/team/employees/:id/active — dar de baja o reactivar.
router.patch('/employees/:id/active', requirePermission('equipo.gestionar'), async (req, res) => {
  const activo = req.body.isActive ? 1 : 0;
  try {
    const [[emp]] = await pool.query('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    if (!emp) return res.status(404).json({ message: 'Empleado no encontrado.' });

    if (!activo) {
      const [[{ admins }]] = await pool.query(
        `SELECT COUNT(DISTINCT e.id) AS admins
           FROM employees e
           JOIN employee_roles er ON er.employee_id = e.id
           JOIN roles r ON r.id = er.role_id
          WHERE r.slug = 'administrador' AND e.is_active = 1 AND e.id <> ?`,
        [emp.id]
      );
      if (admins === 0) {
        return res.status(409).json({ message: 'No puedes dar de baja al último administrador.' });
      }
    }
    await pool.query(
      'UPDATE employees SET is_active = ?, terminated_at = ? WHERE id = ?',
      [activo, activo ? null : new Date(), emp.id]
    );
    res.json({ ok: true, isActive: !!activo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar el empleado.' });
  }
});

module.exports = router;
