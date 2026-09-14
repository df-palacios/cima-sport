const { test, expect } = require('@playwright/test');
const { esMovil } = require('./helpers');

test.describe('Tienda pública', () => {
  test('la portada carga con hero, categorías y productos', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero__title')).toContainText('Muévete');
    await expect(page.locator('.bento__cell').first()).toBeVisible();
    // Los destacados llegan de la API, no son estáticos
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 });
  });

  test('el hero rota entre escenas y se puede saltar', async ({ page }) => {
    await page.goto('/');
    const puntos = page.locator('.hero__dots button');
    await expect(puntos).toHaveCount(2);
    await puntos.nth(1).click();
    await expect(puntos.nth(1)).toHaveAttribute('aria-current', 'true');
  });

  test('el catálogo filtra por categoría', async ({ page }) => {
    await page.goto('/tienda/calzado');
    await expect(page.locator('.view-head h2')).toContainText('Calzado');
    const n = await page.locator('.card').count();
    expect(n).toBeGreaterThan(0);
  });

  test('la búsqueda sin resultados muestra un estado vacío útil', async ({ page }) => {
    await page.goto('/tienda?q=zzzzsinresultados');
    await expect(page.locator('.empty')).toContainText('No encontramos');
    await expect(page.getByRole('link', { name: /Ver todo el catálogo/ })).toBeVisible();
  });

  test('la ficha muestra galería, tallas y stock', async ({ page }) => {
    await page.goto('/tienda/calzado');
    await page.locator('.card').first().click();
    // La ficha se carga en su propio chunk: hay que esperar la navegación.
    await page.waitForURL('**/producto/**');
    await expect(page.locator('.pdp__info h1')).toBeVisible({ timeout: 10000 });
    // Tres fotos por producto: hay miniaturas
    await expect(page.locator('.pdp__thumbs button')).toHaveCount(3);
    await expect(page.locator('.chips .chip').first()).toBeVisible();
    await expect(page.locator('.stock-line')).toBeVisible();
  });

  test('la galería cambia de foto con las flechas', async ({ page }) => {
    await page.goto('/producto/cima-court-black');
    const activa = () => page.locator('.pdp__thumbs button.on');
    await expect(activa()).toHaveCount(1);
    await page.locator('.pdp__nav--next').click();
    // Tras avanzar, la miniatura activa ya no es la primera
    await expect(page.locator('.pdp__thumbs button').nth(1)).toHaveClass(/on/);
  });

  test('la franja de demostración enlaza al portafolio', async ({ page }) => {
    await page.goto('/');
    const enlace = page.locator('[data-testid=link-portafolio]');
    await expect(enlace).toBeVisible();
    await expect(enlace).toContainText('Volver al portafolio');
  });

  test('el tema claro/oscuro se puede cambiar y persiste', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    const inicial = await html.getAttribute('data-theme');
    if (esMovil(page)) {
      await page.locator('.nav__burger').click();
      await page.locator('.drawer__foot button').nth(1).click();
    } else {
      await page.locator('.nav__actions button[title]').nth(1).click();
    }
    await expect(html).not.toHaveAttribute('data-theme', inicial || 'light');
    const cambiado = await html.getAttribute('data-theme');
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', cambiado);
  });
});
