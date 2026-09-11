require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function setup() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  const dbName = process.env.DB_NAME || 'cima_sport';
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4;`);
  await connection.query(`USE \`${dbName}\`;`);

  console.log('→ Creando tablas...');
  const schema = fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'schema.sql'), 'utf8');
  await connection.query(schema);

  console.log('→ Aplicando migraciones...');
  const { migrar } = require('./migrate');
  const hechas = await migrar(connection);
  if (hechas.length) console.log('  cambios aplicados:', hechas.join(', '));

  console.log('→ Insertando datos de prueba...');
  // Primero identidad/cargos/permisos, luego el catálogo y los pedidos.
  const rbac = fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'seed_rbac.sql'), 'utf8');
  await connection.query(rbac);
  const seed = fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'seed.sql'), 'utf8');
  await connection.query(seed);

  console.log('✔ Base de datos lista.');
  await connection.end();
}

setup().catch((err) => {
  console.error('✖ Error configurando la base de datos:', err.message);
  process.exit(1);
});
