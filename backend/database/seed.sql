SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE order_items;
TRUNCATE TABLE deliveries;
TRUNCATE TABLE couriers;
TRUNCATE TABLE orders;
TRUNCATE TABLE product_images;
TRUNCATE TABLE product_variants;
TRUNCATE TABLE products;
TRUNCATE TABLE categories;
TRUNCATE TABLE service_requests;
SET FOREIGN_KEY_CHECKS = 1;

-- ==================== CATEGORÍAS ====================
INSERT INTO categories (id, slug, name, description, sort_order) VALUES
(1, 'calzado',  'Calzado deportivo', 'Tenis para running, urbano y básquet.', 1),
(2, 'urbano',   'Urbano y hoodies',  'Buzos, chaquetas y prendas de calle.', 2),
(3, 'fitness',  'Fitness y running', 'Conjuntos, tops y leggings de alto rendimiento.', 3);

-- ==================== PRODUCTOS: CALZADO ====================
INSERT INTO products (id, category_id, slug, name, brand, description, base_price) VALUES
(101, 1, 'adidas-tenis-blanco-performance', 'Tenis Blanco Performance', 'Adidas', 'Tenis deportivo Adidas en blanco, pensado para entrenamiento y uso diario.', 149900),
(102, 1, 'nike-tenis-running-azul', 'Tenis Running Azul', 'Nike', 'Tenis Nike en azul con perfil ligero para running y entrenamiento.', 189900),
(103, 1, 'fila-tenis-running-negro', 'Tenis Running Negro', 'Fila', 'Tenis Fila en negro con suela deportiva, cómodo para uso diario.', 159900),
(104, 1, 'nike-tenis-running-verde', 'Tenis Running Verde', 'Nike', 'Tenis Nike para running, con silueta ligera y soporte para entrenamiento.', 179900),
(105, 1, 'new-balance-tenis-rosa', 'Tenis Deportivo Rosa', 'New Balance', 'Tenis New Balance en rosa, orientado a entrenamiento y uso urbano.', 159900),
(106, 1, 'cima-court-black', 'Cima Court Black', 'Cima Sport', 'Silueta negra minimalista de la marca propia, versátil para cualquier outfit.', 139900);

-- ==================== PRODUCTOS: URBANO ====================
INSERT INTO products (id, category_id, slug, name, description, base_price) VALUES
(201, 2, 'hoodie-oversize-gris', 'Hoodie Oversize Gris Cima',        'Corte oversize, felpa perchada 320gsm, bolsillo canguro.', 139900),
(202, 2, 'hoodie-negro-classic', 'Hoodie Negro Classic',             'Silueta regular, capota ajustable, puños acanalados.', 129900),
(203, 2, 'buzo-crema-basico',    'Buzo Crema Básico',                'Algodón perchado suave, ideal para combinar con cualquier outfit.', 119900),
(204, 2, 'hoodie-estampado-relax','Hoodie Estampado Relax',          'Estampado frontal en alto relieve, felpa premium.', 149900),
(205, 2, 'chaqueta-cortavientos','Chaqueta Cortavientos Urbana',     'Tejido resistente al viento, forro interior liviano.', 179900);

-- ==================== PRODUCTOS: FITNESS / RUNNING ====================
INSERT INTO products (id, category_id, slug, name, description, base_price) VALUES
(301, 3, 'conjunto-fitness-azul', 'Conjunto Fitness Azul Dos Piezas', 'Top y short en tela compresiva de secado rápido.', 159900),
(302, 3, 'set-deportivo-coral',   'Set Deportivo Coral',              'Top y short en tono coral, tela liviana para entrenar o salir a correr.', 89900),
(303, 3, 'legging-negro-alto',    'Legging Negro Talle Alto',          'Compresión suave, ideal para gimnasio o uso diario.', 99900),
(304, 3, 'conjunto-tenis-blanco', 'Conjunto Tenis Blanco',             'Top y falda short en blanco, pensado para tenis o pádel.', 139900);

-- ==================== VARIANTES (talla / color / stock) ====================
INSERT INTO product_variants (product_id, sku, size, color, stock) VALUES
(101,'CIM-101-S-BLA',  'S','Blanco',8),(101,'CIM-101-M-BLA','M','Blanco',14),(101,'CIM-101-L-BLA','L','Blanco',10),(101,'CIM-101-XL-BLA','XL','Blanco',4),
(102,'CIM-102-S-AZU',  'S','Azul',6),(102,'CIM-102-M-AZU','M','Azul',11),(102,'CIM-102-L-AZU','L','Azul',9),(102,'CIM-102-XL-AZU','XL','Azul',2),
(103,'CIM-103-S-COR',  'S','Coral',7),(103,'CIM-103-M-COR','M','Coral',9),(103,'CIM-103-L-COR','L','Coral',5),
(104,'CIM-104-M-VER',  'M','Verde',5),(104,'CIM-104-L-VER','L','Verde',8),(104,'CIM-104-XL-VER','XL','Verde',6),
(105,'CIM-105-S-ROS',  'S','Rosa',10),(105,'CIM-105-M-ROS','M','Rosa',15),(105,'CIM-105-L-ROS','L','Rosa',12),
(106,'CIM-106-M-NEG',  'M','Negro',9),(106,'CIM-106-L-NEG','L','Negro',7),(106,'CIM-106-XL-NEG','XL','Negro',1),

(201,'CIM-201-S-GRI',  'S','Gris',5),(201,'CIM-201-M-GRI','M','Gris',12),(201,'CIM-201-L-GRI','L','Gris',10),(201,'CIM-201-XL-GRI','XL','Gris',6),
(202,'CIM-202-M-NEG',  'M','Negro',11),(202,'CIM-202-L-NEG','L','Negro',13),(202,'CIM-202-XL-NEG','XL','Negro',5),
(203,'CIM-203-S-CRE',  'S','Crema',8),(203,'CIM-203-M-CRE','M','Crema',10),(203,'CIM-203-L-CRE','L','Crema',6),
(204,'CIM-204-M-NEG',  'M','Negro',7),(204,'CIM-204-L-NEG','L','Negro',9),(204,'CIM-204-XL-NEG','XL','Negro',2),
(205,'CIM-205-S-VER',  'S','Verde',4),(205,'CIM-205-M-VER','M','Verde',8),(205,'CIM-205-L-VER','L','Verde',6),

(301,'CIM-301-S-AZU',  'S','Azul',6),(301,'CIM-301-M-AZU','M','Azul',10),(301,'CIM-301-L-AZU','L','Azul',7),
(302,'CIM-302-S-COR',  'S','Coral',9),(302,'CIM-302-M-COR','M','Coral',12),(302,'CIM-302-L-COR','L','Coral',5),
(303,'CIM-303-S-NEG',  'S','Negro',11),(303,'CIM-303-M-NEG','M','Negro',14),(303,'CIM-303-L-NEG','L','Negro',8),
(304,'CIM-304-S-BLA',  'S','Blanco',13),(304,'CIM-304-M-BLA','M','Blanco',15),(304,'CIM-304-L-BLA','L','Blanco',9);

-- ==================== IMÁGENES ====================
-- Fotos reales curadas de Pexels. Algunas fichas muestran marcas comerciales reales como referencia de catálogo/demo; las marcas pertenecen a sus respectivos titulares.
-- Tres imágenes por producto: la primaria es la ficha, las otras alimentan
-- la galería y la transición al pasar el cursor sobre la tarjeta.
INSERT INTO product_images (product_id, image_path, is_primary, sort_order) VALUES
(101,'/images/marcas/adidas-blanco.jpg',1,1),
(101,'/images/calzado/pexels-photo-25492112.jpg',0,2),
(101,'/images/calzado/pexels-photo-38154572.jpg',0,3),

(102,'/images/marcas/nike-azul.jpg',1,1),
(102,'/images/calzado/pexels-photo-25492113.jpg',0,2),
(102,'/images/calzado/pexels-photo-8283582.jpg',0,3),

(103,'/images/marcas/fila-negro.jpg',1,1),
(103,'/images/calzado/pexels-photo-9195765.jpg',0,2),
(103,'/images/calzado/pexels-photo-38154587.jpg',0,3),

(104,'/images/marcas/nike-running.jpg',1,1),
(104,'/images/calzado/pexels-photo-6783170.jpg',0,2),
(104,'/images/calzado/pexels-photo-6246832.jpg',0,3),

(105,'/images/marcas/newbalance-rosa.jpg',1,1),
(105,'/images/calzado/pexels-photo-9207813.jpg',0,2),
(105,'/images/calzado/pexels-photo-38154580.jpg',0,3),

(106,'/images/marcas/cima-negro.jpg',1,1),
(106,'/images/calzado/pexels-photo-9666619.jpg',0,2),
(106,'/images/calzado/pexels-photo-8473534.jpg',0,3),

(201,'/images/urbano/pexels-photo-30257616.jpg',1,1),
(201,'/images/urbano/pexels-photo-6995877.jpg',0,2),
(201,'/images/urbano/pexels-photo-6311481.jpg',0,3),

(202,'/images/urbano/pexels-photo-18880795.jpg',1,1),
(202,'/images/urbano/pexels-photo-35406025.jpg',0,2),
(202,'/images/urbano/pexels-photo-8346261.jpg',0,3),

(203,'/images/urbano/pexels-photo-33356325.jpg',1,1),
(203,'/images/urbano/pexels-photo-5840461.jpg',0,2),
(203,'/images/urbano/pexels-photo-13273140.jpg',0,3),

(204,'/images/urbano/pexels-photo-12555806.jpg',1,1),
(204,'/images/urbano/pexels-photo-36488507.jpg',0,2),
(204,'/images/urbano/pexels-photo-30410057.jpg',0,3),

(205,'/images/urbano/pexels-photo-38675826.jpg',1,1),
(205,'/images/urbano/pexels-photo-30410057.jpg',0,2),
(205,'/images/urbano/pexels-photo-13273140.jpg',0,3),

(301,'/images/fitness/pexels-photo-29242390.jpg',1,1),
(301,'/images/fitness/pexels-photo-29242398.jpg',0,2),
(301,'/images/fitness/pexels-photo-29242415.jpg',0,3),

(302,'/images/fitness/pexels-photo-35865509.jpg',1,1),
(302,'/images/fitness/pexels-photo-33059195.jpg',0,2),
(302,'/images/fitness/pexels-photo-29242379.jpg',0,3),

(303,'/images/fitness/pexels-photo-9634895.jpg',1,1),
(303,'/images/fitness/pexels-photo-29242398.jpg',0,2),
(303,'/images/fitness/pexels-photo-8483369.jpg',0,3),

(304,'/images/fitness/pexels-photo-39360759.jpg',1,1),
(304,'/images/fitness/pexels-photo-29242424.jpg',0,2),
(304,'/images/fitness/pexels-photo-13462647.jpg',0,3);

-- ==================== PEDIDOS DE DEMOSTRACIÓN ====================
-- Los pedidos de Camila llevan account_id: así aparecen en su historial.
-- Los de invitados quedan en NULL, que es justo la diferencia entre comprar
-- con cuenta y comprar sin ella.
INSERT INTO orders (id, account_id, customer_name, customer_phone, customer_email, channel, shipping_address, city, subtotal, shipping_cost, total, status, payment_method, payment_status, created_at) VALUES
(1001,(SELECT id FROM accounts WHERE email='camila@correo.com'),'Camila Vargas','3157894561','camila@correo.com','online','Cra 45 #12-30','Cali',219800,12000,231800,'entregado','contraentrega','pagado', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(1002,NULL,'Julián Restrepo','3204561234',NULL,'tienda',NULL,NULL,149900,0,149900,'entregado','tarjeta','pagado', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(1003,NULL,'María Fernanda Gil','3116783452','mfgil@correo.com','online','Calle 5 #8-21','Cali',159900,10000,169900,'en_preparacion','transferencia','pagado', NOW()),
(1004,NULL,'Andrés Felipe Toro','3001239876',NULL,'tienda',NULL,NULL,69900,0,69900,'confirmado','efectivo','pagado', NOW()),
(1005,NULL,'Valentina Ospina','3187452301','valen.o@correo.com','online','Av 6N #23-10','Cali',189900,12000,201900,'pendiente','contraentrega','pendiente', NOW());

INSERT INTO orders (id, account_id, customer_name, customer_phone, customer_email, channel, shipping_address, city, subtotal, shipping_cost, total, status, payment_method, payment_status, paid_at, created_at) VALUES
(1000,(SELECT id FROM accounts WHERE email='camila@correo.com'),'Camila Vargas','3157894561','camila@correo.com','online','Cra 45 #12-30','Cali',139900,12000,151900,'entregado','tarjeta','pagado', DATE_SUB(NOW(), INTERVAL 21 DAY), DATE_SUB(NOW(), INTERVAL 22 DAY));

INSERT INTO order_items (order_id, product_name, size, color, quantity, unit_price) VALUES
(1000,'Hoodie Oversize Gris Cima','M','Gris',1,139900),
(1001,'Tenis Blanco Performance','M','Blanco',1,149900),
(1001,'Legging Negro Talle Alto','M','Negro',1,99900),
(1002,'Hoodie Oversize Gris Cima','L','Gris',1,149900),
(1003,'Conjunto Fitness Azul Dos Piezas','M','Azul',1,159900),
(1004,'Set Deportivo Coral','S','Coral',1,89900),
(1005,'Tenis Running Azul','M','Azul',1,189900);

-- ==================== SOLICITUDES DE SERVICIO (bordado/estampado/confección) ====================
INSERT INTO service_requests (service_type, customer_name, customer_phone, description, status) VALUES
('bordado','Club Deportivo Alameda','3159874521','Bordado de escudo en 20 camisetas para equipo de fútbol infantil.','en_proceso'),
('estampado','Colegio San Rafael','3012345678','Estampado de nombre y número en 35 buzos de educación física.','nueva'),
('confeccion','Andrea Salazar','3187541230','Confección de 3 uniformes personalizados para equipo de voleibol.','cotizada');

-- ==================== DOMICILIOS ====================
-- Kevin Marín (usuario domiciliario) enlazado a su registro de courier.
INSERT INTO couriers (name, status, account_id) VALUES
('Kevin Marín', 'En ruta', (SELECT id FROM accounts WHERE email='domicilios@cimasport.com')),
-- Santiago es asesor de tienda y además reparte: el mismo modelo de cargos
-- múltiples se refleja aquí.
('Santiago Rojas', 'Disponible', (SELECT id FROM accounts WHERE email='asesor@cimasport.com'));

-- 1001 (entregado), 1003 (en preparación → todavía en camino) y 1005
-- (pendiente de pago → aún sin asignar) cubren los tres estados típicos.
INSERT INTO deliveries (order_id, address, city, courier_id, provider, status, assigned_at, picked_up_at, delivered_at) VALUES
(1001, 'Cra 45 #12-30', 'Cali', 1, 'propio', 'Entregada', DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY)),
(1003, 'Calle 5 #8-21', 'Cali', 1, 'propio', 'En camino', NOW(), NOW(), NULL),
(1005, 'Av 6N #23-10',  'Cali', NULL, 'propio', 'Sin asignar', NULL, NULL, NULL);
