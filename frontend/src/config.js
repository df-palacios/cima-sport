export const ROLES = {
  admin: { label: 'Administrador' },
  ventas: { label: 'Ventas' },
  bodega: { label: 'Bodega' },
  domiciliario: { label: 'Domiciliario' },
};

export const VIEWS = {
  dashboard:  { label: 'Panel',      icon: 'grid',      path: '/app' },
  pedidos:    { label: 'Pedidos',    icon: 'ticket',    path: '/app/pedidos' },
  catalogo:   { label: 'Catálogo',   icon: 'shirt',     path: '/app/catalogo' },
  inventario: { label: 'Inventario', icon: 'box',       path: '/app/inventario' },
  domicilios: { label: 'Domicilios', icon: 'truck',     path: '/app/domicilios' },
  servicios:  { label: 'Servicios',  icon: 'needle',    path: '/app/servicios' },
  caja:       { label: 'Caja',       icon: 'wallet',    path: '/app/caja' },
  reportes:   { label: 'Reportes',   icon: 'trending',  path: '/app/reportes' },
  equipo:     { label: 'Equipo',     icon: 'user',      path: '/app/equipo' },
};

// Cada sección declara qué permiso la habilita. El menú se arma con los
// permisos reales de la persona, así que crear un cargo nuevo no obliga a
// tocar este archivo.
export const VIEW_PERMISSIONS = {
  dashboard:  null, // siempre visible para cualquier empleado
  pedidos:    ['pedidos.ver', 'pedidos.gestionar'],
  catalogo:   ['catalogo.ver', 'catalogo.editar'],
  inventario: ['inventario.ver', 'inventario.ajustar'],
  domicilios: ['domicilios.ver_todos', 'domicilios.operar', 'domicilios.asignar'],
  servicios:  ['servicios.ver', 'servicios.gestionar'],
  caja:       ['caja.ver', 'caja.operar'],
  reportes:   ['reportes.ver'],
  equipo:     ['equipo.ver', 'equipo.gestionar'],
};

export function viewsFor(permissions = []) {
  return Object.entries(VIEW_PERMISSIONS)
    .filter(([, req]) => req === null || req.some((p) => permissions.includes(p)))
    .map(([k]) => k);
}

// Los colores usan los nombres del sistema de diseño actual (tag--*).
export const ORDER_STATUS = {
  pendiente:      { label: 'Pendiente',      color: 'warn' },
  confirmado:     { label: 'Confirmado',     color: 'blaze' },
  en_preparacion: { label: 'En preparación', color: 'blaze' },
  enviado:        { label: 'Enviado',        color: 'ok' },
  entregado:      { label: 'Entregado',      color: 'ok' },
  cancelado:      { label: 'Cancelado',      color: 'bad' },
};

export const SERVICE_LABELS = {
  bordado: 'Bordado',
  estampado: 'Estampado',
  confeccion: 'Confección a medida',
};
