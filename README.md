# CIMA SPORT

Tienda de ropa y calzado deportivo: sitio público con catálogo, carrito y
checkout, más un panel interno de gestión con tres roles (administrador,
ventas, bodega).

Marca original inspirada en el modelo de negocio de una tienda deportiva
real de Cali (multi-categoría, personalización de uniformes, tienda física
+ online) — sin usar su nombre ni identidad. Ver `CONTEXTO_CIMA_SPORT.txt`
para el detalle completo de esa decisión y de todo el proceso de curaduría
de fotos.

## Stack

React + Vite (frontend) · Node.js + Express (backend) · MySQL

## Estructura

```
cima-sport/
├── backend/
│   ├── database/
│   │   ├── schema.sql
│   │   └── seed.sql        (catálogo, staff, pedidos y solicitudes de demo)
│   └── src/
│       ├── server.js
│       ├── db.js
│       ├── database/setup.js
│       ├── middleware/auth.js
│       └── routes/
│           ├── auth.js         (login de staff + registro/login de clientes)
│           ├── catalog.js      (categorías, productos, variantes)
│           ├── orders.js       (checkout, avance de estado, cancelación)
│           ├── reports.js      (resumen y más vendidos — solo admin)
│           └── services.js     (bordado / estampado / confección)
└── frontend/
    ├── public/images/          (calzado/ urbano/ fitness/ — fotos reales)
    └── src/
        ├── api.js
        ├── config.js           (roles, navegación, estados de pedido)
        ├── context/             (Theme, Auth, Cart, Toast)
        ├── layouts/
        │   ├── StoreLayout.jsx  (tienda pública)
        │   └── AppLayout.jsx    (panel interno)
        └── pages/
            ├── LandingPage / CatalogPage / ProductPage / CartPage / ServicesPage
            ├── StaffLoginPage
            └── app/ (Dashboard, Orders, Inventory, CatalogAdmin, ServiceRequests, Reports)
```

## Puesta en marcha local

Puertos propios para no chocar con otros proyectos en la misma máquina:
**backend en 4001, frontend en 5175** (fijado con `strictPort` en
`vite.config.js`).

### 1. Base de datos

```bash
sudo mysql <<'SQL'
CREATE DATABASE IF NOT EXISTS cima_sport CHARACTER SET utf8mb4;
CREATE USER IF NOT EXISTS 'cima_app'@'localhost' IDENTIFIED BY 'TU_CLAVE_AQUI';
GRANT ALL ON cima_sport.* TO 'cima_app'@'localhost';
FLUSH PRIVILEGES;
SQL
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edita .env: DB_USER=cima_app, DB_PASSWORD=la clave de arriba
npm install
npm run db:setup   # crea las tablas y siembra los datos de demo
npm start          # http://localhost:4001
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev         # http://localhost:5175
```

En desarrollo el frontend deduce sola la URL de la API a partir del host
desde el que se abre — no hace falta tocar `.env` para probar en local o
desde el celular por la red.

## Roles y credenciales de demostración

**Panel interno** (`/staff/login`):

| Rol | Correo | Contraseña | Ve |
|---|---|---|---|
| Administrador | admin@cimasport.com | admin123 | Todo |
| Ventas | ventas@cimasport.com | ventas123 | Pedidos, Domicilios, Servicios |
| Bodega | bodega@cimasport.com | bodega123 | Catálogo, Inventario |
| Domiciliario | domicilios@cimasport.com | domicilio123 | Solo sus propias entregas |

**Cliente de prueba** (tienda pública, `/cuenta`): `camila@correo.com` —
también se puede comprar como invitado, sin crear cuenta.

## Domicilios

Mismo patrón de despacho que Cabra de León, adaptado de comida a
paquetería: quien despacha (**admin**/**ventas**) asigna un domiciliario
propio o marca el pedido para **mensajería externa** (Servientrega,
Coordinadora, Interrapidísimo…); el domiciliario **nunca se autoasigna**,
solo ve sus propias entregas y las mueve en orden: *Asignada → En camino →
Entregada* (o *Fallida*, con motivo obligatorio).

Los pedidos online con dirección generan su domicilio automáticamente al
crearse. Si un pedido se cancela, su domicilio se cierra como "Fallida" en
vez de quedar huérfano.

## Botón de reinicio de demo

Igual que en Cabra de León: `[DEMO] Reiniciar datos` en el panel (solo
visible para admin) recarga el `seed.sql` completo. Doble protección: rol
admin + `ALLOW_DEMO_RESET=true` en el `.env` del servidor — ponlo en
`false` si esto deja de ser una demo.

## Seguridad verificada

- El precio de cada línea de pedido se recalcula siempre en el servidor
  leyendo el precio real de la base de datos — nunca se confía en lo que
  manda el navegador. Probado enviando `unitPrice` manipulado: el cobro
  real no cambió.
- El stock se valida y se bloquea (`FOR UPDATE`) al confirmar un pedido, y
  se devuelve automáticamente si el pedido se cancela.

## Catálogo actual

15 productos en 3 categorías con fotos reales de banco libre (Pexels):
**Calzado** (6), **Urbano** (5, sudaderas/hoodies), **Fitness** (4). Fútbol
y ciclismo no tienen categoría de producto todavía — faltan fotos de
producto limpias para esas líneas (ver pendientes en
`CONTEXTO_CIMA_SPORT.txt`).

## Servicios de personalización

Además del catálogo, hay un canal de solicitudes (`/servicios` en la tienda
pública, `Servicios` en el panel) para bordado, estampado y confección a
medida — pensado para equipos, colegios y empresas, no como productos de
catálogo fijo sino como cotización a medida.

## Pendientes

- Suite de pruebas automatizadas (Karate/Playwright) — todavía no existe
  para este proyecto.
- Crear productos nuevos desde el panel (`CatalogAdminPage` solo permite
  mostrar/ocultar los existentes por ahora).
- Despliegue a producción — hasta ahora solo se ha probado en local.

## Actualización: roles, autenticación de clientes y domicilios

Se agregó un cuarto rol de staff (**domiciliario**), la pantalla de
login/registro de clientes (`/cuenta` — el backend ya existía, faltaba la
interfaz), y el módulo completo de **domicilios**, reutilizando el patrón
de despacho/domiciliario de Cabra de León adaptado a paquetería: mensajería
propia o externa (Servientrega/Coordinadora/Interrapidísimo) en vez de
plataformas de comida. También se sumó el botón `[DEMO] Reiniciar datos`
(solo admin) y un componente `Modal` reutilizable. Todo probado end-to-end:
asignación bloqueada para quien no despacha, ciclo completo de una entrega,
y cancelación de pedido cerrando su domicilio correctamente.

Nota sobre marcas: en una revisión posterior del proyecto se agregó un
campo `brand` a los productos y se relabelearon 5 de los 6 tenis con
nombres de marcas reales (Adidas, Nike, Fila, New Balance). Esa decisión
fue tomada y aplicada directamente por quien mantiene este repositorio,
no por el asistente que documentó este README.

Detalle completo de decisiones, curaduría de fotos, y bugs encontrados
durante la construcción: ver `CONTEXTO_CIMA_SPORT.txt` en la raíz del
proyecto.


## Rediseño 2026 — dirección visual y micro-interacciones

La interfaz se rehízo por completo. El punto de partida fue detectar que la
versión anterior (fondo casi negro + acento verde lima, etiquetas en
mayúsculas, cadenas con puntos medios, monoespaciada para precios) caía en
patrones que se leen como plantilla genérica.

**Dirección nueva — vernáculo de cancha:**
- Base clara de tiza (`#EDEDE8`) donde manda la foto de producto, no la
  interfaz. Modo oscuro sigue disponible y respeta la preferencia del sistema.
- Un solo acento: naranja de señalización deportiva (`#FF4A17`).
- Tipografía Archivo variable en ancho expandido (110–125) para display —el
  gesto de marca deportiva— e Inter para texto. Precios con cifras
  tabulares en vez de monoespaciada.

**Movimiento e interacción:**
- Hero con tres escenas que rotan solas, con controles para saltarlas.
- Tarjetas de producto que cambian a la segunda foto al pasar el cursor y
  revelan las tallas sin abrir la ficha. En pantallas táctiles las tallas se
  muestran siempre, porque ahí no existe el hover.
- Galería de producto con flechas, miniaturas y transición suave (cada
  producto tiene 3 fotos reales).
- Botones que se hunden al presionarse, contador del carrito que late al
  cambiar, y medidor de progreso hacia el envío gratis.
- Revelado al entrar en pantalla, un gesto por sección y no en cada tarjeta.
- Todo el movimiento respeta `prefers-reduced-motion`.

**Sonido:** motor de Web Audio sintetizado (sin archivos, no pesa nada), con
timbres distintos para tocar, agregar al carrito, quitar, confirmar y error.
Se puede silenciar desde la barra o el menú, y la preferencia se guarda.

**Móvil:** barra de compra fija con precio y talla al alcance del pulgar,
menú con leyendas completas, y solo tres botones en la barra superior —
sonido, tema y cuenta viven dentro del cajón para que nada se desborde.

**Leyendas:** ningún botón queda como icono suelto sin decir qué hace.
Iniciar sesión y registrarse explican para qué sirve cada uno, y el botón
dice la acción concreta ("Entrar a mi cuenta", "Crear mi cuenta").


## Modelo de identidad, cargos y permisos

El modelo anterior tenía dos tablas sueltas (`users` para el staff con el
cargo escrito en un ENUM, y `customers` para la tienda). Eso obligaba a tocar
código para crear un cargo nuevo, e impedía que una misma persona fuera
clienta y empleada a la vez — algo normal en un negocio pequeño, donde el
asesor también compra.

**Modelo actual:**

| Tabla | Qué guarda |
|---|---|
| `accounts` | La identidad: quién es y cómo entra. Una por persona. |
| `customer_profiles` | Perfil de compra de esa identidad. |
| `employees` | Vínculo laboral: código, fecha de ingreso, activo/baja. |
| `roles` | Cargos configurables (asesor, domiciliario, bodeguero…). |
| `permissions` | Lo que se puede hacer, en granos pequeños. |
| `role_permissions` | Qué permisos trae cada cargo. |
| `employee_roles` | Un empleado puede tener **varios** cargos. |

Dos consecuencias prácticas:

- **El backend valida permisos, no cargos.** Se puede crear el cargo "Jefe de
  bodega" desde la interfaz y funciona sin desplegar código nuevo.
- **Una persona puede tener varios cargos.** En los datos de demostración,
  Santiago es asesor de tienda *y* domiciliario los fines de semana, y además
  compra en la tienda con la misma cuenta.

Los permisos se releen de la base en cada petición sensible: si a alguien le
quitan un cargo, pierde el acceso de inmediato, sin esperar a que expire su
sesión. Y no se puede dejar la tienda sin ningún administrador activo — ni
quitándole el cargo al último, ni dándolo de baja.

### Una sola puerta de entrada

Antes había dos pantallas de login (`/staff/login` y `/cuenta`) sobre dos
tablas distintas. Ahora la entrada es una: el sistema decide qué mostrar
según los permisos de quien entra. Si tienes vínculo laboral activo, tu
cuenta te ofrece el panel de trabajo; si no, solo la tienda.

### Entrar sin registrarse

La pantalla de inicio de sesión muestra un bloque **"¿Solo quieres probar?"**
con las cuentas sembradas. Al tocar una, se completan correo y contraseña y
un aviso confirma qué cargo se cargó — no hay que crear cuenta ni memorizar
credenciales para recorrer la aplicación.

Cada tarjeta dice qué verá esa cuenta, para elegir con criterio:

| Correo | Contraseña | Cargos | Qué ve |
|---|---|---|---|
| admin@cimasport.com | admin123 | Administrador | Todo el panel, incluido el equipo |
| asesor@cimasport.com | asesor123 | Asesor de tienda + Domiciliario | Pedidos, servicios y domicilios |
| bodega@cimasport.com | bodega123 | Bodeguero | Catálogo e inventario |
| domicilios@cimasport.com | domicilio123 | Domiciliario | Solo sus propias entregas |
| camila@correo.com | cliente123 | (solo clienta) | Solo la tienda, sin panel |

Las contraseñas son simples a propósito: son de demostración. En una tienda
real se cambian y se pone `ALLOW_DEMO_RESET=false`.

## Validación de contraseñas

Al crear cuenta se exige confirmación y un mínimo real de seguridad: 8
caracteres, minúscula, mayúscula y número, y se rechazan las contraseñas más
comunes. El navegador muestra un medidor de fuerza y una lista de requisitos
que se van marcando mientras se escribe, pero **la validación que manda es la
del servidor** — la del navegador se puede saltar.

## Imágenes del hero

Se sirven en cuatro anchos (828 / 1280 / 1920 / 2560) con `srcset`, en WebP
con respaldo JPG. Antes se estiraba una foto de 500px a pantalla completa, lo
que se veía borroso en cualquier monitor.

El degradado sobre el cielo del atardecer producía bandas visibles: se
corrigió con un degradado de más paradas y una capa de ruido encima que
difumina el borde de cada banda.


## Módulo de caja

Mismo patrón que Cabra de León, con dos diferencias de fondo propias del
retail de ropa:

- **El impuesto es IVA 19%**, no el INC 8% de restaurantes. Como el precio de
  vitrina en Colombia ya lo incluye, la base gravable se saca hacia atrás
  (dividiendo por 1.19) en lugar de sumarle el 19% encima.
- **No hay propina**: en retail no aplica.

Flujo: abrir turno con una base → cobrar (efectivo, tarjeta, transferencia o
contraentrega, con descuento y datos opcionales del cliente) → comprobante
imprimible → cerrar con arqueo, que compara lo contado contra lo que debería
haber y muestra la diferencia.

El vuelto se calcula sobre lo que el cliente **entrega**, no sobre el monto
aplicado: pagar $201.900 con $250.000 devuelve $48.100.

### Preparado para facturación electrónica

La tabla `fiscal_documents` guarda consecutivo por prefijo, base, impuesto y
datos del cliente, con `cufe_cude`, `qr_data`, `provider` e `issued_at`
esperando. El sistema ya decide solo entre **documento POS** y **factura**
según el monto (tope de 5 UVT) y si el cliente se identifica.

`backend/src/fiscal.js` tiene `emitirEnProveedor()` como único punto a
implementar cuando se contrate un proveedor autorizado por la DIAN. El
comprobante actual dice explícitamente que todavía no es válido ante la DIAN.

Quién puede cobrar se decide por el permiso `caja.operar`, no por el cargo:
hoy lo tienen el asesor de tienda y el cajero; el bodeguero no (verificado:
recibe 403 al intentar abrir caja).

## Cliente con cuenta frente a invitado

Comprar sigue siendo posible sin registrarse, pero tener cuenta ahora da algo
concreto:

| | Invitado | Con cuenta |
|---|---|---|
| Comprar | Sí | Sí |
| Datos de entrega | Los escribe cada vez | Se completan solos |
| Historial de pedidos | No tiene dónde verlo | Lista completa en `/cuenta` |
| Estado de cada pedido | Solo por teléfono | Visible en su historial |
| Comprobante | — | Número de documento a la vista |

Técnicamente, el pedido guarda `account_id` cuando se compra con sesión
iniciada y `NULL` como invitado. El endpoint `/api/orders/mine` saca el id
**del token**, nunca de la petición, así que nadie puede consultar pedidos
ajenos.
