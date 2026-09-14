const CUENTAS = {
  admin:        { email: 'admin@cimasport.com',      password: 'admin123',     nombre: 'Andrea Molina' },
  asesor:       { email: 'asesor@cimasport.com',     password: 'asesor123',    nombre: 'Santiago Rojas' },
  bodega:       { email: 'bodega@cimasport.com',     password: 'bodega123',    nombre: 'Laura Betancourt' },
  domiciliario: { email: 'domicilios@cimasport.com', password: 'domicilio123', nombre: 'Kevin Marín' },
  cliente:      { email: 'camila@correo.com',        password: 'cliente123',   nombre: 'Camila Vargas' },
};

/** ¿Estamos en el formato móvil? Mismo corte que el CSS. */
function esMovil(page) {
  const vp = page.viewportSize();
  return !!vp && vp.width <= 920;
}

/** Entra por la única puerta que existe: /cuenta. */
async function iniciarSesion(page, rol) {
  const c = CUENTAS[rol];
  await page.goto('/cuenta');
  await page.locator('#a-mail').waitFor({ state: 'visible' });
  await page.locator('#a-mail').fill(c.email);
  await page.locator('#a-pass').fill(c.password);
  await page.getByRole('button', { name: 'Entrar a mi cuenta' }).click();
  await page.waitForURL('**/tienda**');
  return c;
}

/** Limpia la sesión guardada entre pruebas. */
async function cerrarSesion(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
}

module.exports = { CUENTAS, esMovil, iniciarSesion, cerrarSesion };
