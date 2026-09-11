/**
 * Reglas de contraseña. Deben coincidir con backend/src/routes/auth.js —
 * aquí sirven para avisar mientras se escribe; la validación que manda es
 * la del servidor, porque esta se puede saltar.
 */
export const MIN_LARGO = 8;

const COMUNES = ['12345678', 'password', 'contrasena', 'contraseña', 'qwerty123', '11111111', 'cimasport'];

export function reglasPassword(pass = '') {
  return [
    { id: 'largo', texto: `Al menos ${MIN_LARGO} caracteres`, ok: pass.length >= MIN_LARGO },
    { id: 'minus', texto: 'Una letra minúscula', ok: /[a-z]/.test(pass) },
    { id: 'mayus', texto: 'Una letra mayúscula', ok: /[A-Z]/.test(pass) },
    { id: 'num', texto: 'Un número', ok: /\d/.test(pass) },
  ];
}

/** Nivel de 0 a 4, para el medidor visual. */
export function nivelPassword(pass = '') {
  if (!pass) return { nivel: 0, etiqueta: '', clase: '' };
  if (COMUNES.includes(pass.toLowerCase())) {
    return { nivel: 1, etiqueta: 'Muy común, elige otra', clase: 'is-weak' };
  }
  const cumplidas = reglasPassword(pass).filter((r) => r.ok).length;
  let nivel = cumplidas;
  // Un extra por longitud generosa o símbolos.
  if (pass.length >= 12 && /[^A-Za-z0-9]/.test(pass)) nivel = Math.min(4, nivel + 1);
  const mapa = {
    1: { etiqueta: 'Débil', clase: 'is-weak' },
    2: { etiqueta: 'Regular', clase: 'is-fair' },
    3: { etiqueta: 'Buena', clase: 'is-good' },
    4: { etiqueta: 'Fuerte', clase: 'is-strong' },
  };
  return { nivel, ...(mapa[nivel] || mapa[1]) };
}

export function passwordValida(pass = '') {
  return reglasPassword(pass).every((r) => r.ok) && !COMUNES.includes(pass.toLowerCase());
}
