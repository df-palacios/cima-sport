const { test, expect } = require('@playwright/test');
const { iniciarSesion, cerrarSesion } = require('./helpers');

test.describe('Caja', () => {
  test.beforeEach(async ({ page }) => { await cerrarSesion(page); });

  test('el bodeguero no tiene acceso a caja', async ({ page }) => {
    await iniciarSesion(page, 'bodega');
    await page.goto('/app/caja');
    // Sin permiso, la página no muestra los indicadores de caja
    await expect(page.locator('.kpis')).toHaveCount(0);
  });

  test('abrir turno, cobrar con IVA y ver el comprobante', async ({ page }) => {
    await iniciarSesion(page, 'asesor');
    await page.goto('/app/caja');

    const cerrada = page.locator('.empty', { hasText: 'caja está cerrada' });
    await page.locator('.empty, .kpis').first().waitFor({ state: 'visible', timeout: 15000 });
    if (await cerrada.isVisible().catch(() => false)) {
      await cerrada.getByRole('button', { name: 'Abrir caja' }).click();
      const modal = page.locator('.modal');
      await modal.waitFor({ state: 'visible' });
      await modal.getByRole('button', { name: 'Abrir caja' }).click();
    }
    await expect(page.locator('.kpis')).toBeVisible();

    const porCobrar = page.locator('.ocard button', { hasText: 'Cobrar' });
    test.skip((await porCobrar.count()) === 0, 'No quedan pedidos por cobrar');

    await porCobrar.first().click();
    await page.locator('.modal').waitFor({ state: 'visible' });
    // El desglose muestra IVA 19%, no el 8% de restaurantes
    await expect(page.locator('.modal')).toContainText('IVA 19%');

    await page.getByLabel('Efectivo recibido').fill('900000');
    await expect(page.locator('.change-box')).toBeVisible();

    await page.getByRole('button', { name: /Confirmar cobro/ }).click();
    await expect(page.locator('#toast')).toContainText('Cobro registrado', { timeout: 12000 });
    // El comprobante advierte que aún no es válido ante la DIAN
    await expect(page.locator('.receipt__pending')).toContainText('DIAN');
  });
});
