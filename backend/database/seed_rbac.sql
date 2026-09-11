-- ==================== IDENTIDAD, CARGOS Y PERMISOS ====================
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE payments;
TRUNCATE TABLE fiscal_documents;
TRUNCATE TABLE cash_sessions;
TRUNCATE TABLE employee_roles;
TRUNCATE TABLE role_permissions;
TRUNCATE TABLE permissions;
TRUNCATE TABLE roles;
TRUNCATE TABLE employees;
TRUNCATE TABLE customer_profiles;
TRUNCATE TABLE accounts;
SET FOREIGN_KEY_CHECKS = 1;

-- Permisos en granos pequeños, agrupados por área.
INSERT INTO permissions (slug, area, description) VALUES
('catalogo.ver',        'Catálogo',  'Ver el catálogo interno'),
('catalogo.editar',     'Catálogo',  'Crear, editar y ocultar productos'),
('inventario.ver',      'Inventario','Consultar existencias'),
('inventario.ajustar',  'Inventario','Modificar existencias'),
('pedidos.ver',         'Pedidos',   'Ver los pedidos de la tienda'),
('pedidos.gestionar',   'Pedidos',   'Avanzar y cancelar pedidos'),
('domicilios.ver_todos','Domicilios','Ver todos los domicilios'),
('domicilios.asignar',  'Domicilios','Asignar domiciliarios y mensajería'),
('domicilios.operar',   'Domicilios','Marcar salida y entrega de los propios'),
('servicios.ver',       'Servicios', 'Ver solicitudes de personalización'),
('servicios.gestionar', 'Servicios', 'Cambiar el estado de las solicitudes'),
('reportes.ver',        'Reportes',  'Ver reportes de ventas'),
('equipo.ver',          'Equipo',    'Ver empleados y sus cargos'),
('equipo.gestionar',    'Equipo',    'Crear empleados y asignar cargos'),
('caja.operar',         'Caja',      'Abrir turno, cobrar y cerrar caja'),
('caja.ver',            'Caja',      'Consultar el estado de la caja'),
('demo.reiniciar',      'Sistema',   'Restaurar los datos de demostración');

-- Cargos reales de una tienda de ropa deportiva.
INSERT INTO roles (id, slug, name, description, is_system) VALUES
(1,'administrador','Administrador','Acceso completo, incluida la gestión del equipo.',1),
(2,'asesor_tienda','Asesor de tienda','Atiende clientes, toma pedidos y consulta inventario.',1),
(3,'bodeguero','Bodeguero','Controla existencias y prepara los pedidos.',1),
(4,'domiciliario','Domiciliario','Entrega los pedidos asignados.',1),
(5,'cajero','Cajero','Cobra y consulta reportes de ventas del día.',0);

-- El administrador tiene todos los permisos existentes.
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE slug IN
  ('catalogo.ver','inventario.ver','pedidos.ver','pedidos.gestionar','servicios.ver','servicios.gestionar','domicilios.ver_todos','domicilios.asignar','caja.operar','caja.ver');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE slug IN
  ('catalogo.ver','catalogo.editar','inventario.ver','inventario.ajustar','pedidos.ver');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions WHERE slug IN ('domicilios.operar');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions WHERE slug IN
  ('pedidos.ver','pedidos.gestionar','reportes.ver','catalogo.ver','caja.operar','caja.ver');

-- ==================== CUENTAS ====================
-- admin123 / asesor123 / domicilio123 / bodega123 / cliente123
INSERT INTO accounts (id, full_name, email, password_hash, phone) VALUES
(1,'Andrea Molina',    'admin@cimasport.com',      '$2a$10$hjwBop.pwKqiMLWj95Cw7uCY50ChWz0017dCClwOplJdpmu7.XZ3.','3151112233'),
(2,'Santiago Rojas',   'asesor@cimasport.com',     '$2a$10$1SNzoD6I9I.ch1tBBxdYdeCDK4gP8255/remh8vZdeVdtqEYMMx2O','3152223344'),
(3,'Laura Betancourt', 'bodega@cimasport.com',     '$2a$10$lR.Cs2RCktbH5zFIrl1KTu8QDA6hioS3qr1leh/kuotY5XCDv1/hy','3153334455'),
(4,'Kevin Marín',      'domicilios@cimasport.com', '$2a$10$VOt8b53vaYQtMoZFFPXSeuj/clpOKD1ZT03GI1XDMl2bRaPUek.dy','3154445566'),
(5,'Camila Vargas',    'camila@correo.com',        '$2a$10$5DED50JEocBVx4RtTgQB3.kfz2q5ISJipWaXcFyhj8YoYqIUl.nwO','3157894561');

-- Camila es solo clienta. Santiago además de asesor compra en la tienda:
-- una misma identidad con perfil de cliente Y vínculo laboral.
INSERT INTO customer_profiles (account_id, default_address, city) VALUES
(5,'Cra 45 #12-30','Cali'),
(2,'Calle 9 #40-15','Cali');

INSERT INTO employees (id, account_id, employee_code, hired_at) VALUES
(1,1,'CIM-001','2023-02-01'),
(2,2,'CIM-002','2024-06-15'),
(3,3,'CIM-003','2024-09-01'),
(4,4,'CIM-004','2025-03-10');

INSERT INTO employee_roles (employee_id, role_id) VALUES
(1,1),          -- Andrea: administradora
(2,2),          -- Santiago: asesor de tienda
(3,3),          -- Laura: bodeguera
(4,4),          -- Kevin: domiciliario
(2,4);          -- Santiago también reparte los fines de semana
