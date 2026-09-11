/**
 * Dirección de la API.
 * En desarrollo se deduce del host con el que se abrió la página (funciona
 * igual en el PC y desde el celular por la red local). En producción,
 * VITE_API_URL se define como una RUTA (/proyectos/cima-sport/api), no como
 * host:puerto, para que funcione detrás de Nginx sin exponer el puerto 4001.
 */
const PUERTO_BACKEND = import.meta.env.VITE_API_PORT || 4001;

function resolveApiUrl() {
  const configurada = import.meta.env.VITE_API_URL;
  if (configurada) return configurada.replace(/\/$/, '');
  return `${window.location.protocol}//${window.location.hostname}:${PUERTO_BACKEND}/api`;
}

export const API_URL = resolveApiUrl();

// Un solo token: la cuenta es única y los permisos deciden el resto.
function getToken() {
  return localStorage.getItem('cima_token');
}

async function request(path, { method = 'GET', body, auth } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* respuesta sin cuerpo */ }
  if (!res.ok) throw new Error(data?.message || 'Error inesperado del servidor.');
  return data;
}

export const api = {
  // Catálogo (público)
  getCategories: () => request('/categories'),
  getBrands: () => request('/brands'),
  getProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/products${qs ? `?${qs}` : ''}`);
  },
  getProduct: (slug) => request(`/products/${slug}`),

  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  me: () => request('/auth/me', { auth: true }),

  // Caja
  getCashSession: () => request('/cash/session', { auth: true }),
  openCashSession: (openingAmount) => request('/cash/session/open', { method: 'POST', auth: true, body: { openingAmount } }),
  closeCashSession: (countedCash) => request('/cash/session/close', { method: 'POST', auth: true, body: { countedCash } }),
  getPendingCharges: () => request('/cash/pending', { auth: true }),
  payOrder: (orderId, body) => request(`/cash/pay/${orderId}`, { method: 'POST', auth: true, body }),
  getReceipt: (orderId) => request(`/cash/receipt/${orderId}`, { auth: true }),

  // Historial del cliente con cuenta
  getMyOrders: () => request('/orders/mine', { auth: true }),

  // Equipo, cargos y permisos
  getRoles: () => request('/team/roles', { auth: true }),
  getPermissions: () => request('/team/permissions', { auth: true }),
  getEmployees: () => request('/team/employees', { auth: true }),
  setEmployeeRoles: (id, roleIds) => request(`/team/employees/${id}/roles`, { method: 'PUT', auth: true, body: { roleIds } }),
  setEmployeeActive: (id, isActive) => request(`/team/employees/${id}/active`, { method: 'PATCH', auth: true, body: { isActive } }),

  // Pedidos
  createOrder: (payload) => request('/orders', { method: 'POST', body: payload }),
  getOrders: () => request('/orders', { auth: true }),
  advanceOrder: (id) => request(`/orders/${id}/advance`, { method: 'PATCH', auth: true }),
  cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: 'PATCH', auth: true }),

  // Administración de catálogo
  createProduct: (payload) => request('/products', { method: 'POST', auth: true, body: payload }),
  updateProduct: (id, payload) => request(`/products/${id}`, { method: 'PATCH', auth: true, body: payload }),
  setVariantStock: (id, stock) => request(`/variants/${id}/stock`, { method: 'PATCH', auth: true, body: { stock } }),

  // Reportes
  getSummary: () => request('/reports/summary', { auth: true }),
  getTopProducts: (limit = 8) => request(`/reports/top-products?limit=${limit}`, { auth: true }),

  // Servicios (bordado / estampado / confección)
  createServiceRequest: (payload) => request('/services', { method: 'POST', body: payload }),
  getServiceRequests: () => request('/services', { auth: true }),
  updateServiceRequest: (id, status) => request(`/services/${id}`, { method: 'PATCH', auth: true, body: { status } }),

  // Domicilios
  getDeliveries: () => request('/deliveries', { auth: true }),
  getCouriers: () => request('/deliveries/couriers', { auth: true }),
  assignCourier: (id, courierId) => request(`/deliveries/${id}/assign`, { method: 'PATCH', auth: true, body: { courierId } }),
  setDeliveryProvider: (id, body) => request(`/deliveries/${id}/provider`, { method: 'PATCH', auth: true, body }),
  pickupDelivery: (id) => request(`/deliveries/${id}/pickup`, { method: 'PATCH', auth: true }),
  markDelivered: (id) => request(`/deliveries/${id}/deliver`, { method: 'PATCH', auth: true }),
  failDelivery: (id, reason) => request(`/deliveries/${id}/fail`, { method: 'PATCH', auth: true, body: { reason } }),

  // Demostración
  reiniciarDemo: () => request('/testing/reset', { method: 'POST', auth: true }),
};

export function formatCOP(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
}
