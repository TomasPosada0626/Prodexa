import { test, expect } from '@playwright/test';

function uniqueEmail(): string {
  return `e2e-crud-${Date.now()}-${Math.floor(Math.random() * 100000)}@prodexa.test`;
}

async function crearCuentaYEntrar(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/registro');
  await page.getByLabel('Nombre', { exact: true }).fill('Usuario');
  await page.getByLabel('Apellidos').fill('CRUD');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Nombre de tu empresa').fill('Empresa CRUD');
  await page.getByLabel('Contrasena', { exact: true }).fill(password);
  await page.getByLabel('Repetir contrasena').fill(password);
  await page.getByRole('button', { name: 'Registrarse' }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contrasena', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar sesion' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe('CRUD completo de formulaciones', () => {
  test('crear, editar y eliminar una formulacion', async ({ page }) => {
    const email = uniqueEmail();
    const password = 'Clave12345678!';

    await test.step('0. Cuenta nueva y sesion iniciada', async () => {
      await crearCuentaYEntrar(page, email, password);
    });

    await test.step('1. Crear formulacion', async () => {
      await page.goto('/formulaciones');
      await page.getByLabel('Nombre del producto').fill('Formulacion Original');
      await page.getByLabel('Cantidad base (kg)').fill('1');
      await page.getByPlaceholder('Nombre', { exact: true }).fill('Agua');
      await page.getByPlaceholder('% en formula').fill('100');
      await page.getByPlaceholder('Precio/kg').fill('2');
      await page.getByRole('button', { name: 'Crear formulacion' }).click();

      await expect(page.getByRole('heading', { name: 'Formulacion Original' })).toBeVisible();
    });

    await test.step('2. Editar el nombre de la formulacion la actualiza en la lista', async () => {
      await page.getByRole('button', { name: 'Editar' }).click();
      // El formulario de creacion sigue arriba en la pagina; el de edicion es el segundo.
      const nombreInput = page.getByLabel('Nombre del producto').nth(1);
      await nombreInput.fill('Formulacion Editada');
      await page.getByRole('button', { name: 'Guardar cambios' }).click();

      await expect(page.getByRole('status').last()).toContainText('actualizada correctamente');
      await expect(page.getByRole('heading', { name: 'Formulacion Editada' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Formulacion Original' })).not.toBeVisible();
    });

    await test.step('3. Eliminar la formulacion la quita de la lista', async () => {
      await page.getByRole('button', { name: 'Eliminar' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();

      await expect(page.getByRole('status').last()).toContainText('eliminada');
      await expect(page.getByRole('heading', { name: 'Formulacion Editada' })).not.toBeVisible();
    });

    await test.step('4. La lista vacia muestra el estado de onboarding', async () => {
      await expect(page.getByText('Crea tu primera formulacion')).toBeVisible();
    });
  });
});
