/**
 * Capa fiscal.
 *
 * Hoy emite un documento LOCAL con su consecutivo. NO es un documento
 * electrónico válido ante la DIAN: para eso hay que conectar un proveedor
 * tecnológico autorizado (Alegra, Factus, Siigo…) que firme y transmita.
 *
 * Todo lo que esa integración necesita ya está modelado en la tabla
 * fiscal_documents (status, cufe_cude, qr_data, provider, issued_at,
 * error_message). Para conectarla basta implementar `emitirEnProveedor()`.
 */

// IVA general en Colombia. Ojo: es 19% para ropa y calzado — NO se usa aquí
// el impuesto al consumo del 8%, que aplica a restaurantes.
const IVA_GENERAL = 19;

const CONFIG = {
  prefijo: process.env.FISCAL_PREFIX || 'CIM',
  tasaImpuesto: Number(process.env.FISCAL_TAX_RATE || IVA_GENERAL),
  // Tope del documento equivalente POS (5 UVT). Por encima, la DIAN exige
  // factura electrónica de venta.
  topePos: Number(process.env.FISCAL_POS_LIMIT || 261870),
};

/**
 * Descompone un total que YA incluye impuesto. En Colombia el precio de
 * vitrina se muestra con IVA incluido, así que la base se saca hacia atrás
 * en lugar de sumarle el 19% encima.
 */
function desglosar({ subtotal, discount = 0 }) {
  const baseConImpuesto = Math.max(0, subtotal - discount);
  const tasa = CONFIG.tasaImpuesto / 100;
  const taxBase = Math.round(baseConImpuesto / (1 + tasa));
  const taxAmount = baseConImpuesto - taxBase;
  return { subtotal, discount, taxBase, taxRate: CONFIG.tasaImpuesto, taxAmount, total: baseConImpuesto };
}

/** Tipo de documento según monto y si el cliente se identificó. */
function tipoDocumento({ total, customerDoc }) {
  if (customerDoc) return 'FACTURA';
  return total > CONFIG.topePos ? 'FACTURA' : 'POS';
}

/** Siguiente consecutivo. Debe llamarse dentro de la transacción. */
async function siguienteConsecutivo(conn, prefix) {
  const [[row]] = await conn.query(
    'SELECT COALESCE(MAX(number), 0) + 1 AS siguiente FROM fiscal_documents WHERE prefix = ? FOR UPDATE',
    [prefix]
  );
  return row.siguiente;
}

/** Punto de extensión para la facturación electrónica real. */
async function emitirEnProveedor() {
  return { status: 'pendiente', provider: null, cufeCude: null, qrData: null };
}

module.exports = { CONFIG, desglosar, tipoDocumento, siguienteConsecutivo, emitirEnProveedor };
