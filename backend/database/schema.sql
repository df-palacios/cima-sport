-- ============================================================
--  IDENTIDAD, EMPLEADOS Y PERMISOS
--
--  Modelo repensado. Antes había dos tablas sueltas (users para el staff y
--  customers para la tienda) con el cargo escrito a fuego en un ENUM, lo que
--  obligaba a tocar código para crear un cargo nuevo, e impedía que una
--  misma persona fuera cliente y empleado a la vez (real en un negocio
--  pequeño: el asesor también compra).
--
--  Ahora:
--    accounts       -> la identidad (quién es, cómo entra). Una por persona.
--    customers      -> perfil de compra de esa identidad.
--    employees      -> vínculo laboral de esa identidad (código, cargo, alta/baja).
--    roles          -> cargos configurables (asesor, domiciliario, admin...).
--    permissions    -> lo que se puede hacer, en granos pequeños.
--    role_permissions / employee_roles -> las relaciones N a N.
--
--  El permiso, no el cargo, es lo que el backend valida. Así se puede crear
--  el cargo "Jefe de bodega" sin tocar una línea de código.
-- ============================================================

CREATE TABLE IF NOT EXISTS accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customer_profiles (
  account_id INT PRIMARY KEY,
  default_address VARCHAR(255) NULL,
  city VARCHAR(80) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL UNIQUE,
  employee_code VARCHAR(20) NOT NULL UNIQUE,
  hired_at DATE NOT NULL,
  terminated_at DATE NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(200) NULL,
  -- Los del sistema no se pueden borrar desde la interfaz.
  is_system TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(60) NOT NULL UNIQUE,
  area VARCHAR(40) NOT NULL,
  description VARCHAR(160) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Un empleado puede tener varios cargos: en una tienda pequeña el asesor
-- sale a repartir los sábados. Sin esto habría que inventar cargos híbridos.
CREATE TABLE IF NOT EXISTS employee_roles (
  employee_id INT NOT NULL,
  role_id INT NOT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (employee_id, role_id),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- CIMA SPORT — esquema de base de datos
-- Tienda de ropa y calzado deportivo. Roles de staff (admin, ventas, bodega)
-- + clientes públicos que compran en la tienda online.

-- (La antigua tabla `users` con el cargo en un ENUM fue reemplazada por
--  accounts + employees + roles. Ver la sección de identidad más abajo.)

-- (La antigua tabla `customers` fue reemplazada por customer_profiles,
--  que cuelga de accounts para que una persona pueda ser cliente y empleado.)

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(60) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  brand VARCHAR(80) NULL,
  description TEXT NULL,
  base_price INT NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB;

-- Cada combinación talla/color tiene su propio stock y SKU. El precio base
-- vive en products; aquí solo se sobreescribe si una variante cuesta distinto
-- (ej. tallas grandes con recargo).
CREATE TABLE IF NOT EXISTS product_variants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  sku VARCHAR(40) NOT NULL UNIQUE,
  size VARCHAR(10) NOT NULL,
  color VARCHAR(40) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  price_override INT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  image_path VARCHAR(255) NOT NULL,
  alt_text VARCHAR(160) NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(30) NOT NULL,
  customer_email VARCHAR(160) NULL,
  channel ENUM('online','tienda') NOT NULL DEFAULT 'online',
  shipping_address VARCHAR(255) NULL,
  city VARCHAR(80) NULL,
  subtotal INT NOT NULL,
  shipping_cost INT NOT NULL DEFAULT 0,
  total INT NOT NULL,
  status ENUM('pendiente','confirmado','en_preparacion','enviado','entregado','cancelado')
         NOT NULL DEFAULT 'pendiente',
  payment_method ENUM('efectivo','tarjeta','transferencia','contraentrega') NULL,
  payment_status ENUM('pendiente','pagado') NOT NULL DEFAULT 'pendiente',
  paid_at DATETIME NULL,
  discount INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  variant_id INT NULL,
  product_name VARCHAR(160) NOT NULL,
  size VARCHAR(10) NOT NULL,
  color VARCHAR(40) NOT NULL,
  quantity INT NOT NULL,
  unit_price INT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES product_variants(id)
) ENGINE=InnoDB;

-- Inspirado en los servicios reales de personalización de Fabysport
-- (bordados, estampados, confección) — un canal de solicitudes, no un
-- catálogo de productos fijo, porque cada pedido es a medida.
CREATE TABLE IF NOT EXISTS service_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_type ENUM('bordado','estampado','confeccion') NOT NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(30) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('nueva','cotizada','en_proceso','entregada') NOT NULL DEFAULT 'nueva',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
--  DOMICILIOS
--  Mismo patrón que Cabra de León: quien despacha (admin/ventas) asigna,
--  el domiciliario solo ve y opera SUS entregas. Adaptado de comida a
--  paquetería: en vez de plataformas tipo Rappi/DiDi, aquí la alternativa
--  a un domiciliario propio es una empresa de mensajería externa
--  (Servientrega, Coordinadora, Interrapidísimo...).
-- ============================================================
CREATE TABLE IF NOT EXISTS couriers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  status ENUM('Disponible','En ruta') NOT NULL DEFAULT 'Disponible',
  account_id INT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS deliveries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(80) NULL,
  courier_id INT NULL,
  -- 'propio' = domiciliario de CIMA SPORT. 'externo' = empresa de
  -- mensajería tipo Servientrega/Coordinadora/Interrapidísimo.
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


-- ============================================================
--  CAJA
--  Mismo patrón que Cabra de León, con dos diferencias de fondo:
--   1. El impuesto es IVA 19% (ropa y calzado), no el INC 8% que aplica a
--      restaurantes.
--   2. No hay propina: en retail no aplica.
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  opened_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at  DATETIME NULL,
  opening_amount INT NOT NULL DEFAULT 0,
  counted_cash   INT NULL,
  notes VARCHAR(255) NULL,
  status ENUM('abierta','cerrada') NOT NULL DEFAULT 'abierta',
  FOREIGN KEY (account_id) REFERENCES accounts(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  session_id INT NULL,
  account_id INT NOT NULL,
  method ENUM('efectivo','tarjeta','transferencia','contraentrega') NOT NULL,
  amount INT NOT NULL,
  received INT NULL,
  change_given INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES cash_sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fiscal_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  doc_type ENUM('POS','FACTURA') NOT NULL DEFAULT 'POS',
  prefix VARCHAR(10) NOT NULL DEFAULT 'CIM',
  number INT NOT NULL,
  subtotal INT NOT NULL,
  discount INT NOT NULL DEFAULT 0,
  tax_base INT NOT NULL,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 19.00,
  tax_amount INT NOT NULL,
  total INT NOT NULL,
  customer_name VARCHAR(120) NULL,
  customer_doc  VARCHAR(30) NULL,
  status ENUM('pendiente','emitido','error') NOT NULL DEFAULT 'pendiente',
  provider VARCHAR(40) NULL,
  cufe_cude VARCHAR(120) NULL,
  qr_data TEXT NULL,
  issued_at DATETIME NULL,
  error_message VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_doc (prefix, number),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;
