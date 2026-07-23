import { test, expect } from '@playwright/test';

function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 100000)}@prodexa.test`;
}

test.describe('Flujo de autenticacion y formulaciones', () => {
  test('landing publica, redireccion sin sesion, registro, crear formulacion, persistencia y logout', async ({
    page,
  }) => {
    const email = uniqueEmail();
    const password = 'Clave12345678!';

    await test.step('1. La landing publica muestra los botones de acceso', async () => {
      await page.goto('/');
      await expect(page.getByRole('banner').getByRole('link', { name: 'Iniciar sesion' })).toBeVisible();
      await expect(page.getByRole('banner').getByRole('link', { name: 'Empezar gratis' })).toBeVisible();
    });

    await test.step('2. Una ruta protegida sin sesion redirige a /login', async () => {
      await page.goto('/formulaciones');
      await expect(page).toHaveURL(/\/login$/);
    });

    await test.step('3. El registro crea la cuenta y redirige a /login (sin iniciar sesion)', async () => {
      await page.goto('/registro');
      await page.getByLabel('Nombre', { exact: true }).fill('Usuario');
      await page.getByLabel('Apellidos').fill('E2E');
      await page.getByLabel('Correo').fill(email);
      await page.getByLabel('Nombre de tu empresa').fill('Empresa E2E');
      await page.getByLabel('Contrasena', { exact: true }).fill(password);
      await page.getByLabel('Repetir contrasena').fill(password);
      await page.getByRole('button', { name: 'Registrarse' }).click();

      await expect(page).toHaveURL(/\/login$/);
    });

    await test.step('3b. El login con las credenciales recien creadas entra al dashboard', async () => {
      await page.getByLabel('Correo').fill(email);
      await page.getByLabel('Contrasena', { exact: true }).fill(password);
      await page.getByRole('button', { name: 'Iniciar sesion' }).click();

      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.getByRole('link', { name: 'Formulaciones', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Usuario E2E' })).toBeVisible();
    });

    await test.step('4. Crear una formulacion la muestra en la lista sin recargar', async () => {
      await page.goto('/formulaciones');

      await page.getByLabel('Nombre del producto').fill('Formulacion E2E');
      await page.getByLabel('Cantidad base (kg)').fill('1');
      await page.getByPlaceholder('Nombre').fill('Agua');
      await page.getByPlaceholder('% en formula').fill('100');
      await page.getByPlaceholder('Precio/kg').fill('2');
      await page.getByRole('button', { name: 'Crear formulacion' }).click();

      await expect(page.getByRole('heading', { name: 'Formulacion E2E' })).toBeVisible();
      await expect(page.getByRole('status')).toContainText('creada correctamente');
    });

    await test.step('5. La sesion y los datos persisten tras recargar', async () => {
      await page.reload();
      await expect(page).toHaveURL(/\/formulaciones$/);
      await expect(page.getByRole('heading', { name: 'Formulacion E2E' })).toBeVisible();
    });

    await test.step('6. Cerrar sesion redirige a /login', async () => {
      await page.getByRole('button', { name: 'Usuario E2E' }).click();
      await page.getByRole('button', { name: 'Cerrar sesion' }).click();
      await expect(page).toHaveURL(/\/login$/);
    });

    await test.step('7. Tras logout, una ruta protegida vuelve a redirigir a /login', async () => {
      await page.goto('/formulaciones');
      await expect(page).toHaveURL(/\/login$/);
    });
  });
});
