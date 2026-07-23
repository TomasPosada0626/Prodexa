import { test, expect } from '@playwright/test';

// Convierte en specs permanentes tres verificaciones que antes se hacian a mano con
// scripts de Playwright de un solo uso: anular una orden de produccion, borrar un
// registro sanitario en Calidad, y el editor de preparacion con formato + imagenes.
// Comparten UNA sola cuenta (como auth-flow.spec.ts) para no acercarse al rate limit
// real de /auth/register y /auth/login (5/min) al correr junto al resto de la suite.

function uniqueEmail(): string {
  return `e2e-perm-${Date.now()}-${Math.floor(Math.random() * 100000)}@prodexa.test`;
}

// El PNG 1x1 mas pequeno posible (67 bytes), suficiente para probar la subida real de imagenes.
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

test.describe('Verificaciones permanentes: anular orden, borrar registro sanitario, editor', () => {
  test('anular orden de produccion, borrar registro sanitario en Calidad, y formato + imagen en el editor', async ({
    page,
  }) => {
    const email = uniqueEmail();
    const password = 'Clave12345678!';
    const numeroLote = `LOTE-E2E-${Date.now()}`;
    const registroSanitario = `RS-E2E-${Date.now()}`;

    await test.step('0. Cuenta nueva y sesion iniciada', async () => {
      await page.goto('/registro');
      await page.getByLabel('Nombre', { exact: true }).fill('Usuario');
      await page.getByLabel('Apellidos').fill('Permanente');
      await page.getByLabel('Correo').fill(email);
      await page.getByLabel('Nombre de tu empresa').fill('Empresa Permanente');
      await page.getByLabel('Contrasena', { exact: true }).fill(password);
      await page.getByLabel('Repetir contrasena').fill(password);
      await page.getByRole('button', { name: 'Registrarse' }).click();
      await expect(page).toHaveURL(/\/login$/);

      await page.getByLabel('Correo').fill(email);
      await page.getByLabel('Contrasena', { exact: true }).fill(password);
      await page.getByRole('button', { name: 'Iniciar sesion' }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
    });

    await test.step('1. Crear una formulacion con registro sanitario, para Produccion y Calidad', async () => {
      await page.goto('/formulaciones');
      await page.getByLabel('Nombre del producto').fill('Formulacion Permanente');
      await page.getByLabel('Registro sanitario (opcional)').fill(registroSanitario);
      await page.getByLabel('Cantidad base (kg)').fill('1');
      await page.getByPlaceholder('Nombre', { exact: true }).fill('Agua');
      await page.getByPlaceholder('% en formula').fill('100');
      await page.getByPlaceholder('Precio/kg').fill('2');
      await page.getByRole('button', { name: 'Crear formulacion' }).click();
      await expect(page.getByRole('heading', { name: 'Formulacion Permanente' })).toBeVisible();
    });

    await test.step('2. Registrar y anular una orden de produccion la quita del historial', async () => {
      await page.goto('/preparar');
      await page.getByRole('button', { name: 'Lote, costos y venta (opcional)' }).click();
      await page.getByLabel('Numero de lote').fill(numeroLote);
      await page.getByRole('button', { name: 'Guardar orden de produccion' }).click();

      await expect(page.getByRole('status').last()).toContainText('guardada');
      // Scoped a la tabla de historial: el mismo lote (pendiente de cobro por defecto)
      // tambien aparece en el panel de "pendientes de cobro" arriba de la pagina.
      await expect(page.locator('table').getByText(numeroLote)).toBeVisible();

      const fila = page.locator('tr', { hasText: numeroLote });
      await fila.getByRole('button', { name: 'Anular' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Anular' }).click();

      await expect(page.getByRole('status').last()).toContainText('anulada');
      await expect(page.locator('table').getByText(numeroLote)).not.toBeVisible();
      await expect(
        page.getByText('Aun no has registrado ordenes de produccion para esta formulacion.'),
      ).toBeVisible();
    });

    await test.step('3. Borrar el registro sanitario desde Calidad (la formulacion sigue existiendo)', async () => {
      await page.goto('/calidad');
      const fila = page.locator('tr', { hasText: 'Formulacion Permanente' });
      await expect(fila.getByText(registroSanitario)).toBeVisible();

      await fila.getByRole('button', { name: 'Borrar registro' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Borrar' }).click();

      await expect(page.getByRole('status').last()).toContainText('borrado');
      await expect(fila.getByText(registroSanitario)).not.toBeVisible();
      await expect(fila.getByRole('button', { name: 'Borrar registro' })).toBeDisabled();

      await page.goto('/formulaciones');
      await expect(page.getByRole('heading', { name: 'Formulacion Permanente' })).toBeVisible();
    });

    await test.step('4. El editor de preparacion guarda negrita e imagenes subidas de verdad', async () => {
      await page.getByRole('button', { name: 'Preparacion (opcional)' }).click();
      const editor = page.locator('[contenteditable="true"]').first();
      await editor.click();
      await page.keyboard.type('Mezclar bien');
      await page.keyboard.press('Control+a');
      await page.getByRole('button', { name: 'Negrita' }).click();

      // Coloca el cursor al final y quita la seleccion: si el texto siguiera seleccionado,
      // insertar la imagen lo reemplazaria en vez de agregarse a continuacion.
      await editor.click();
      await page.keyboard.press('End');

      await page.setInputFiles('input[type="file"][accept*="image"]', {
        name: 'foto.png',
        mimeType: 'image/png',
        buffer: PNG_1X1,
      });
      await expect(page.getByRole('button', { name: 'Adjuntar imagen' })).toBeVisible();
      await expect(editor.locator('img')).toBeVisible();

      await page.getByLabel('Nombre del producto').fill('Formulacion Editor Permanente');
      await page.getByLabel('Cantidad base (kg)').fill('1');
      await page.getByPlaceholder('Nombre', { exact: true }).fill('Agua');
      await page.getByPlaceholder('% en formula').fill('100');
      await page.getByPlaceholder('Precio/kg').fill('2');
      await page.getByRole('button', { name: 'Crear formulacion' }).click();
      await expect(page.getByRole('heading', { name: 'Formulacion Editor Permanente' })).toBeVisible();

      const card = page.locator('article', { hasText: 'Formulacion Editor Permanente' });
      await card.getByRole('button', { name: 'Preparacion' }).click();
      await expect(card.locator('strong', { hasText: 'Mezclar bien' })).toBeVisible();
      const img = card.locator('img');
      await expect(img).toBeVisible();
      await expect(img).toHaveAttribute('src', /\/uploads\/images\/.+\.png$/);
    });
  });
});
