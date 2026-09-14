/**
 * URL del portafolio, para el botón "Volver al portafolio".
 * Mismo patrón que los proyectos hermanos (Cabra de León, Libreta, Rifa):
 * se deduce del host con el que se abrió la página, así funciona igual desde
 * el PC que desde el celular en la red local. En producción, el dominio real.
 * Se puede forzar con VITE_PORTFOLIO_URL.
 */
const PORTFOLIO_DEV_PORT = import.meta.env.VITE_PORTFOLIO_PORT || 5173;
const PRODUCTION_URL = 'https://dfpalacios.cloud';

function resolvePortfolioUrl() {
  if (import.meta.env.VITE_PORTFOLIO_URL) return import.meta.env.VITE_PORTFOLIO_URL;
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname } = window.location;
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
    if (isLocal) return `${protocol}//${hostname}:${PORTFOLIO_DEV_PORT}`;
  }
  return PRODUCTION_URL;
}

export const PORTFOLIO_URL = resolvePortfolioUrl();
