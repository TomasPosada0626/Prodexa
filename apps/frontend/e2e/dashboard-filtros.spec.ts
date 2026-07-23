import { test, expect } from '@playwright/test';

function uniqueEmail(): string {
  return `e2e-dash-${Date.now()}-${Math.floor(Math.random() * 100000)}@prodexa.test`;
}

test.describe('Dashboard con filtros', () => {
  test('filtra por formulacion y por categoria', async ({ page }) => {
    const email = uniqueEmail();
    const password = 'Clave12345678!';

    await test.step('0. Cuenta nueva y dos formulaciones con categorias distintas', async () => {
      await page.goto('/registro');
      await page.getByLabel('Nombre', { exact: true }).fill('Usuario');
      await page.getByLabel('Apellidos').fill('Dashboard');
      await page.getByLabel('Correo').fill(email);
      await page.getByLabel('Nombre de tu empresa').fill('Empresa Dashboard');
      await page.getByLabel('Contrasena', { exact: true }).fill(password);
      await page.getByLabel('Repetir contrasena').fill(password);
      await page.getByRole('button', { name: 'Registrarse' }).click();
      await expect(page).toHaveURL(/\/login$/);

      await page.getByLabel('Correo').fill(email);
      await page.getByLabel('Contrasena', { exact: true }).fill(password);
      await page.getByRole('button', { name: 'Iniciar sesion' }).click();
      await expect(page).toHaveURL(/\/dashboard$/);

      await page.goto('/formulaciones');
      await page.getByLabel('Nombre del producto').fill('Salsa Roja');
      await page.getByPlaceholder('Ej. Salsas, Cremas').fill('Salsas');
      await page.getByLabel('Cantidad base (kg)').fill('1');
      await page.getByPlaceholder('Nombre', { exact: true }).fill('Tomate');
      await page.getByPlaceholder('% en formula').fill('80');
      await page.getByPlaceholder('Precio/kg').fill('3000');
      await page.getByRole('button', { name: 'Crear formulacion' }).click();
      await expect(page.getByRole('heading', { name: 'Salsa Roja' })).toBeVisible();

      await page.getByLabel('Nombre del producto').fill('Crema Corporal');
      await page.getByPlaceholder('Ej. Salsas, Cremas').fill('Cremas');
      await page.getByLabel('Cantidad base (kg)').fill('1');
      await page.getByPlaceholder('Nombre', { exact: true }).fill('Base');
      await page.getByPlaceholder('% en formula').fill('90');
      await page.getByPlaceholder('Precio/kg').fill('5000');
      await page.getByRole('button', { name: 'Crear formulacion' }).click();
      await expect(page.getByRole('heading', { name: 'Crema Corporal' })).toBeVisible();
    });

    const kpiFormulaciones = () =>
      page
        .locator('div', { has: page.getByText('Formulaciones', { exact: true }) })
        .locator('p.text-3xl');

    await test.step('1. Sin filtro, el KPI "Formulaciones" cuenta las dos', async () => {
      await page.goto('/dashboard');
      await expect(kpiFormulaciones().first()).toHaveText('2');
    });

    await test.step('2. Filtrar por formulacion especifica deja el KPI en 1', async () => {
      await page.getByLabel('Filtrar por formulacion').selectOption({ label: 'Salsa Roja' });
      await expect(kpiFormulaciones().first()).toHaveText('1');
    });

    await test.step('3. Volver a "todas" y filtrar por categoria deja el KPI en 1', async () => {
      await page.getByLabel('Filtrar por formulacion').selectOption('todas');
      await expect(kpiFormulaciones().first()).toHaveText('2');

      await page.getByLabel('Filtrar por categoria').selectOption('Cremas');
      await expect(kpiFormulaciones().first()).toHaveText('1');
    });
  });
});
