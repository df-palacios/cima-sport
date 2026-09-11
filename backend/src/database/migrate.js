/**
 * Migraciones idempotentes — mismo patrón que se usó en Cabra de León.
 *
 * `CREATE TABLE IF NOT EXISTS` no toca tablas que ya existen, así que en una
 * instalación previa las columnas/tablas nuevas nunca aparecerían solas.
 * Aquí se agregan solo si faltan, consultando information_schema.
 */
async function columnaExiste(conn, tabla, columna) {
  const [rows] = await conn.query(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [tabla, columna]
  );
  return rows.length > 0;
}

async function tablaExiste(conn, tabla) {
  const [rows] = await conn.query(
    `SELECT 1 FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    [tabla]
  );
  return rows.length > 0;
}

const COLUMNAS = [
  ['products', 'brand', 'VARCHAR(80) NULL AFTER name'],
  // Necesarias para el módulo de caja.
  ['orders', 'paid_at', 'DATETIME NULL'],
  ['orders', 'discount', 'INT NOT NULL DEFAULT 0'],
  ['orders', 'account_id', 'INT NULL'],
];

async function migrar(conn) {
  const hechas = [];

  for (const [tabla, columna, definicion] of COLUMNAS) {
    if (!(await columnaExiste(conn, tabla, columna))) {
      await conn.query(`ALTER TABLE \`${tabla}\` ADD COLUMN \`${columna}\` ${definicion}`);
      hechas.push(`${tabla}.${columna}`);
    }
  }


  // Tablas de domicilios: si la instalación es previa a este cambio, no
  // existen todavía (CREATE TABLE IF NOT EXISTS del schema.sql solo corre
  // una vez al inicio; si el schema.sql se actualizó después, hay que
  // crearlas aquí explícitamente).
  if (!(await tablaExiste(conn, 'couriers'))) {
    await conn.query(`
      CREATE TABLE couriers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        status ENUM('Disponible','En ruta') NOT NULL DEFAULT 'Disponible',
        account_id INT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);
    hechas.push('tabla couriers');
  }
  if (!(await tablaExiste(conn, 'deliveries'))) {
    await conn.query(`
      CREATE TABLE deliveries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        address VARCHAR(255) NOT NULL,
        city VARCHAR(80) NULL,
        courier_id INT NULL,
        provider ENUM('propio','externo') NOT NULL DEFAULT 'propio',
        external_carrier VARCHAR(60) NULL,
        tracking_ref VARCHAR(60) NULL,
        status ENUM('Sin asignar','Asignada','En camino','Entregada','Fallida')
               NOT NULL DEFAULT 'Sin asignar',
        failure_reason VARCHAR(255) NULL,
        assigned_at  DATETIME NULL,
        picked_up_at DATETIME NULL,
        delivered_at DATETIME NULL,
        created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (courier_id) REFERENCES couriers(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);
    hechas.push('tabla deliveries');
  }

  return hechas;
}

module.exports = { migrar };
