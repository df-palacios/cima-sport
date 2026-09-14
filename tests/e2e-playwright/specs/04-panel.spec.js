const { test, expect } = require('@playwright/test');
const { iniciarSesion, cerrarSesion, esMovil } = require('./helpers');

/** El menú del panel: barra lateral en escritorio, cajón en móvil. */
async function abrirNavegacion(page) {
  if (esMovil(page)) {
    const boton = page.locator('.appbar__menu-btn');
    if ((await boton.getAttribute('aria-expanded')) !== 'true') await boton.click();
    const cajon = page.locator('.appdrawer.open');
    await cajon.waitFor({ state: 'visible' });
    return cajon;
  }
  const lateral = page.locator('.side__nav');
  await lateral.waitFor({ state: 'visible' });
  return lateral;
}

const VISTAS_POR_ROL = {
  admin:        { ve: ['Panel','Pedidos','Catálogo','Inventario','Domicilios','Servicios','Caja','Reportes','Equipo'], noVe: [] },
  // El asesor consulta inventario (permiso inventario.ver), pero no lo ajusta.
  asesor:       { ve: ['Panel','Pedidos','Catálogo','Inventario','Domicilios','Servicios','Caja'], noVe: ['Equipo','Reportes'] },
  bodega:       { ve: ['Panel','Catálogo','Inventario'], noVe: ['Caja','Equipo','Domicilios','Reportes'] },
  domiciliario: { ve: ['Panel','Domicilios'], noVe: ['Caja','Equipo','Pedidos','Catálogo'] },
};

test.describe('Panel interno: el menú se arma con permisos', () => {
  test.beforeEach(async ({ page }) => { await cerrarSesion(page); });

  for (const [rol, { ve, noVe }] of Object.entries(VISTAS_POR_ROL)) {
    test(`${rol} ve solo sus secciones`, async ({ page }) => {
      await iniciarSesion(page, rol);
      await page.goto('/app');
      const nav = await abrirNavegacion(page);
      for (const s of ve)   await expect(nav.getByText(s, { exact: true })).toBeVisible();
      for (const s of noVe) await expect(nav.getByText(s, { exact: true })).toHaveCount(0);
    });
  }

  test('un cliente no puede entrar al panel', async ({ page }) => {
    await iniciarSesion(page, 'cliente');
    await page.goto('/app');
    await page.waitForURL('**/cuenta**');
  });

  test('el panel enlaza de vuelta al portafolio', async ({ page }) => {
    await iniciarSesion(page, 'admin');
    await page.goto('/app');
    if (!esMovil(page)) {
      await expect(page.locator('.side__foot [data-testid=link-portafolio]')).toBeVisible();
    }
  });

  test('solo quien puede reiniciar ve el botón de demostración', async ({ page }) => {
    await iniciarSesion(page, 'admin');
    await page.goto('/app');
    if (!esMovil(page)) {
      await expect(page.locator('[data-testid=btn-reiniciar]')).toBeVisible();
    }
    await cerrarSesion(page);
    await iniciarSesion(page, 'bodega');
    await page.goto('/app');
    await expect(page.locator('[data-testid=btn-reiniciar]')).toHaveCount(0);
  });
});

test.describe('Equipo y cargos', () => {
  test.beforeEach(async ({ page }) => { await cerrarSesion(page); });

  test('el administrador ve el equipo y los cargos múltiples', async ({ page }) => {
    await iniciarSesion(page, 'admin');
    await page.goto('/app/equipo');
    await expect(page.locator('.view-head h2')).toContainText('Equipo');
    // Santiago tiene dos cargos: asesor y domiciliario
    const santiago = page.locator('.ocard', { hasText: 'Santiago Rojas' });
    await expect(santiago.locator('.tag')).toHaveCount(2);
  });

  test('los cargos muestran sus permisos', async ({ page }) => {
    await iniciarSesion(page, 'admin');
    await page.goto('/app/equipo');
    await expect(page.locator('.ocard', { hasText: 'Administrador' }).first()).toBeVisible();
  });
});

test.describe('Domicilios', () => {
  test.beforeEach(async ({ page }) => { await cerrarSesion(page); });

  test('quien despacha puede asignar; el domiciliario no', async ({ page }) => {
    await iniciarSesion(page, 'asesor');
    await page.goto('/app/domicilios');
    await expect(page.locator('.view-head p')).toContainText('Asigna');

    await cerrarSesion(page);
    await iniciarSesion(page, 'domiciliario');
    await page.goto('/app/domicilios');
    await expect(page.locator('.view-head p')).toContainText('tus entregas');
    // Sin selector de asignación ni botón de mensajería externa
    await expect(page.locator('.ocard select')).toHaveCount(0);
  });
});
