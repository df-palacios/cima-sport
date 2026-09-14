const { test, expect } = require('@playwright/test');
const { iniciarSesion, cerrarSesion } = require('./helpers');

test.describe('Cuenta: registro, validación e historial', () => {
  test.beforeEach(async ({ page }) => { await cerrarSesion(page); });

  test('las cuentas de prueba autocompletan los datos', async ({ page }) => {
    await page.goto('/cuenta');
    await expect(page.locator('.demo-box')).toContainText('¿Solo quieres probar?');
    await page.locator('.demo-card', { hasText: 'Bodeguero' }).click();
    await expect(page.locator('#a-mail')).toHaveValue('bodega@cimasport.com');
  });

  test('el registro pide confirmar la contraseña', async ({ page }) => {
    await page.goto('/cuenta');
    await page.getByRole('button', { name: 'Crea una cuenta' }).click();
    await expect(page.locator('#a-pass2')).toBeVisible();
  });

  test('el medidor marca débil y bloquea el envío', async ({ page }) => {
    await page.goto('/cuenta');
    await page.getByRole('button', { name: 'Crea una cuenta' }).click();
    await page.locator('#a-name').fill('Prueba Playwright');
    await page.locator('#a-mail').fill('pw@prueba.com');
    await page.locator('#a-pass').fill('abc');
    await expect(page.locator('.pw-label')).toContainText('Débil');
    await expect(page.getByRole('button', { name: 'Crear mi cuenta' })).toBeDisabled();
  });

  test('el checklist se marca al cumplir cada regla', async ({ page }) => {
    await page.goto('/cuenta');
    await page.getByRole('button', { name: 'Crea una cuenta' }).click();
    await page.locator('#a-pass').fill('ClaveValida9');
    // Las cuatro reglas deben quedar cumplidas
    await expect(page.locator('.pw-rules li.ok')).toHaveCount(4);
  });

  test('avisa cuando las contraseñas no coinciden', async ({ page }) => {
    await page.goto('/cuenta');
    await page.getByRole('button', { name: 'Crea una cuenta' }).click();
    await page.locator('#a-name').fill('Prueba Playwright');
    await page.locator('#a-mail').fill('pw2@prueba.com');
    await page.locator('#a-pass').fill('ClaveValida9');
    await page.locator('#a-pass2').fill('OtraClave9');
    await page.locator('#a-pass2').blur();
    await expect(page.locator('.field-error')).toContainText('no coinciden');
    await expect(page.getByRole('button', { name: 'Crear mi cuenta' })).toBeDisabled();
  });

  test('un cliente con cuenta ve su historial de pedidos', async ({ page }) => {
    await iniciarSesion(page, 'cliente');
    await page.goto('/cuenta');
    await expect(page.locator('h2', { hasText: 'Tus pedidos' })).toBeVisible();
    const n = await page.locator('.ocard').count();
    expect(n).toBeGreaterThan(0);
    // El historial muestra estado y pago, que es lo que un invitado no tiene
    await expect(page.locator('.ocard').first().locator('.tag').first()).toBeVisible();
  });

  test('un empleado ve el acceso al panel desde su cuenta', async ({ page }) => {
    await iniciarSesion(page, 'admin');
    await page.goto('/cuenta');
    await expect(page.getByRole('link', { name: /Panel de trabajo/ })).toBeVisible();
  });

  test('un cliente no ve acceso al panel', async ({ page }) => {
    await iniciarSesion(page, 'cliente');
    await page.goto('/cuenta');
    await expect(page.getByRole('link', { name: /Panel de trabajo/ })).toHaveCount(0);
  });
});
