const { test, expect } = require('@playwright/test');

test.describe('Carrito y checkout', () => {
  test('el carrito vacío invita a la tienda', async ({ page }) => {
    await page.goto('/carrito');
    await expect(page.locator('.empty')).toContainText('carrito está vacío');
  });

  test('agregar una prenda actualiza el contador', async ({ page }) => {
    await page.goto('/producto/cima-court-black');
    await page.getByRole('button', { name: /Agregar al carrito/ }).click();
    await expect(page.locator('.icon-btn__count')).toHaveText('1');
  });

  test('cambiar cantidad y quitar del carrito', async ({ page }) => {
    await page.goto('/producto/cima-court-black');
    await page.getByRole('button', { name: /Agregar al carrito/ }).click();
    await page.goto('/carrito');
    await expect(page.locator('.cart__item')).toHaveCount(1);

    await page.getByRole('button', { name: 'Agregar una unidad' }).click();
    await expect(page.locator('.stepper span')).toHaveText('2');

    await page.locator('.cart__remove').click();
    await expect(page.locator('.empty')).toContainText('carrito está vacío');
  });

  test('el checkout exige los datos de entrega', async ({ page }) => {
    await page.goto('/producto/cima-court-black');
    await page.getByRole('button', { name: /Agregar al carrito/ }).click();
    await page.goto('/carrito');
    await page.getByRole('button', { name: /Confirmar pedido/ }).click();
    await expect(page.locator('#toast')).toContainText('Faltan datos');
  });

  test('compra completa como invitado', async ({ page }) => {
    await page.goto('/producto/cima-court-black');
    await page.getByRole('button', { name: /Agregar al carrito/ }).click();
    await page.goto('/carrito');
    await page.locator('#f-name').fill('Invitado Playwright');
    await page.locator('#f-phone').fill('3001234567');
    await page.locator('#f-addr').fill('Calle Falsa 123');
    await page.locator('#f-city').fill('Cali');
    await page.getByRole('button', { name: /Confirmar pedido/ }).click();
    await expect(page.locator('.empty b')).toContainText('confirmado', { timeout: 12000 });
  });
});
