import { test, expect } from '@playwright/test';

function uniqueEmail(): string {
  return `e2e-sim-${Date.now()}-${Math.floor(Math.random() * 100000)}@prodexa.test`;
}

test.describe('Flujo completo de simulacion de costos', () => {
  test('crear formulacion, simular costo con descuento y actualizar el margen', async ({ page }) => {
    const email = uniqueEmail();
    const password = 'Clave12345678!';

    await test.step('0. Cuenta nueva, sesion iniciada y formulacion creada', async () => {
      await page.goto('/registro');
      await page.getByLabel('Nombre', { exact: true }).fill('Usuario');
      await page.getByLabel('Apellidos').fill('Simulacion');
      await page.getByLabel('Correo').fill(email);
      await page.getByLabel('Nombre de tu empresa').fill('Empresa Simulacion');
      await page.getByLabel('Contrasena', { exact: true }).fill(password);
      await page.getByLabel('Repetir contrasena').fill(password);
      await page.getByRole('button', { name: 'Registrarse' }).click();
      await expect(page).toHaveURL(/\/login$/);

      await page.getByLabel('Correo').fill(email);
      await page.getByLabel('Contrasena', { exact: true }).fill(password);
      await page.getByRole('button', { name: 'Iniciar sesion' }).click();
      await expect(page).toHaveURL(/\/dashboard$/);

      await page.goto('/formulaciones');
      await page.getByLabel('Nombre del producto').fill('Formulacion Simulada');
      await page.getByLabel('Cantidad base (kg)').fill('1');
      await page.getByPlaceholder('Nombre', { exact: true }).fill('Base');
      await page.getByPlaceholder('% en formula').fill('100');
      await page.getByPlaceholder('Precio/kg').fill('10');
      await page.getByRole('button', { name: 'Crear formulacion' }).click();
      await expect(page.getByRole('heading', { name: 'Formulacion Simulada' })).toBeVisible();
    });

    await test.step('1. Costos muestra la formulacion en la tabla de rentabilidad', async () => {
      await page.goto('/costos');
      // No usar getByText().first(): la grafica de costo vs precio tiene un <title> de SVG
      // (tooltip, no visible) con el mismo texto que aparece antes en el DOM que la celda
      // de la tabla. Apuntar a la celda evita ese conflicto.
      await expect(page.getByRole('cell', { name: 'Formulacion Simulada' })).toBeVisible();
    });

    await test.step('2. Simular el costo de un lote de 5kg sin descuento', async () => {
      await page.getByLabel('Cantidad a analizar (kg)').fill('5');
      await page.getByRole('button', { name: 'Analizar' }).click();

      // <dt> especificamente: la leyenda de la grafica de costos tambien tiene un <span>
      // con el mismo texto exacto "Costo de produccion".
      await expect(page.locator('dt', { hasText: 'Costo de produccion' })).toBeVisible();
      await expect(page.getByText('$50', { exact: false })).toBeVisible();
    });

    await test.step('3. Simular con descuento mayorista aplicado', async () => {
      await page.getByLabel(/Aplicar descuento/).check();
      await page.getByLabel('Descuento (%)').fill('20');
      await page.getByRole('button', { name: 'Analizar' }).click();

      await expect(page.getByText('Precio final con descuento', { exact: true })).toBeVisible();
    });

    await test.step('4. Actualizar el margen de la formulacion desde Costos', async () => {
      await page.getByLabel('Margen (%)').fill('50');
      await page.getByRole('button', { name: 'Guardar margen' }).click();

      await expect(page.getByRole('status')).toContainText('Margen actualizado');
    });
  });
});
