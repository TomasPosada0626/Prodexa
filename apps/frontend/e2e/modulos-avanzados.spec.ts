import { test, expect } from '@playwright/test';

// Cubre 5 modulos que hasta ahora solo se habian verificado con specs temporales
// (_tmp-verify-*, borrados despues de usarlos una vez): Analisis, Reportes,
// Proveedores, Configuracion y Auditoria. Comparten UNA sola cuenta (igual que
// verificaciones-permanentes.spec.ts) para no acercarse al rate limit real de
// /auth/register y /auth/login (5/min) al correr junto al resto de la suite.

function uniqueEmail(): string {
  return `e2e-avanzados-${Date.now()}-${Math.floor(Math.random() * 100000)}@prodexa.test`;
}

test.describe('Modulos avanzados: Analisis, Reportes, Proveedores, Configuracion, Auditoria', () => {
  test('tasa de rechazo, cartera por cobrar, CRUD de proveedores, tarifas/sesiones y bitacora de auditoria', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const email = uniqueEmail();
    const password = 'Clave12345678!';
    const proveedor = `Proveedor E2E ${Date.now()}`;

    await test.step('0. Cuenta nueva, sesion iniciada y formulacion creada', async () => {
      await page.goto('/registro');
      await page.getByLabel('Nombre', { exact: true }).fill('Usuario');
      await page.getByLabel('Apellidos').fill('Avanzado');
      await page.getByLabel('Correo').fill(email);
      await page.getByLabel('Nombre de tu empresa').fill('Empresa Avanzada');
      await page.getByLabel('Contrasena', { exact: true }).fill(password);
      await page.getByLabel('Repetir contrasena').fill(password);
      await page.getByRole('button', { name: 'Registrarse' }).click();
      await expect(page).toHaveURL(/\/login$/);

      await page.getByLabel('Correo').fill(email);
      await page.getByLabel('Contrasena', { exact: true }).fill(password);
      await page.getByRole('button', { name: 'Iniciar sesion' }).click();
      await expect(page).toHaveURL(/\/dashboard$/);

      await page.goto('/formulaciones');
      await page.getByLabel('Nombre del producto').fill('Formulacion Avanzada');
      await page.getByLabel('Cantidad base (kg)').fill('1');
      await page.getByPlaceholder('Nombre', { exact: true }).fill('Base');
      await page.getByPlaceholder('% en formula').fill('100');
      await page.getByPlaceholder('Precio/kg').fill('10');
      await page.getByRole('button', { name: 'Crear formulacion' }).click();
      await expect(page.getByRole('heading', { name: 'Formulacion Avanzada' })).toBeVisible();
    });

    await test.step('1. Registrar dos lotes: uno terminado, uno rechazado (para tasa de rechazo y cartera)', async () => {
      await page.goto('/preparar');
      await page.getByRole('button', { name: 'Guardar orden de produccion' }).click();
      await expect(page.getByRole('status').last()).toContainText('guardada');
      await page.getByRole('button', { name: 'Guardar orden de produccion' }).click();
      await expect(page.getByRole('status').last()).toContainText('guardada');

      const tablaHistorial = page.locator('table').last();
      const filas = tablaHistorial.locator('tbody tr');
      await expect(filas).toHaveCount(2);

      async function avanzarA(fila: import('@playwright/test').Locator, estado: string) {
        await fila.getByRole('button', { name: 'Editar' }).click();
        await fila.locator('select').last().selectOption(estado);
        await fila.getByRole('button', { name: 'Guardar' }).click();
        await expect(page.getByRole('status').last()).toContainText('actualizada');
      }

      const loteTerminado = filas.nth(0);
      await avanzarA(loteTerminado, 'EN_PROCESO');
      await avanzarA(loteTerminado, 'EN_CALIDAD');
      await avanzarA(loteTerminado, 'TERMINADO');

      const loteRechazado = filas.nth(1);
      await avanzarA(loteRechazado, 'RECHAZADO');
    });

    await test.step('2. Analisis: tasa de rechazo y ranking', async () => {
      await page.goto('/analisis');
      await expect(page.getByText('Indicadores de rendimiento')).toBeVisible();
      await expect(page.getByText('Tasa de rechazo en calidad')).toBeVisible();
      await expect(page.getByText('1 de 2 lotes finalizados')).toBeVisible();
      await expect(page.getByText('50%')).toBeVisible();
      await expect(page.getByText('Donde queda frente a las demas (utilidad)')).toBeVisible();
    });

    await test.step('3. Reportes: financiero y cartera por cobrar', async () => {
      await page.goto('/reportes');
      await expect(page.getByText('Reporte financiero real', { exact: false })).toBeVisible();
      const carteraSection = page.locator('div.rounded-2xl', {
        hasText: 'Cartera por cobrar (lotes con saldo pendiente)',
      });
      await expect(carteraSection).toBeVisible();
      // Solo el lote TERMINADO cuenta para cartera: el RECHAZADO se excluye de rentabilidad.
      await expect(carteraSection.locator('tbody tr')).toHaveCount(1);
    });

    await test.step('4. Proveedores: crear, renombrar y eliminar', async () => {
      await page.goto('/proveedores');
      await page.getByLabel('Nuevo proveedor').fill(proveedor);
      await page.getByRole('button', { name: 'Crear proveedor' }).click();
      await expect(page.getByRole('cell', { name: proveedor })).toBeVisible();

      const filaProveedor = page.locator('table').last().locator('tbody tr').first();
      await filaProveedor.getByRole('button', { name: 'Renombrar' }).click();
      const nombreNuevo = `${proveedor} renombrado`;
      await filaProveedor.locator('input[type="text"]').fill(nombreNuevo);
      await filaProveedor.getByRole('button', { name: 'Guardar' }).click();
      await expect(page.getByRole('cell', { name: nombreNuevo })).toBeVisible();

      await filaProveedor.getByRole('button', { name: 'Eliminar' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
      await expect(page.getByRole('cell', { name: nombreNuevo })).not.toBeVisible();
    });

    await test.step('5. Configuracion: tarifas de la empresa, sesiones activas y equipo', async () => {
      await page.goto('/configuracion');
      await expect(page.getByText('Sesiones activas')).toBeVisible();
      await expect(page.getByText('Esta sesion')).toBeVisible();

      await page.getByLabel('Tarifa/hora mano de obra').fill('5000');
      await page.getByLabel('Tarifa/hora energia').fill('1200');
      await page.getByRole('button', { name: 'Guardar tarifas' }).click();
      await expect(page.getByRole('status').last()).toContainText('Tarifas de la empresa actualizadas');

      await expect(page.getByText('Mi equipo', { exact: false })).toBeVisible();
      await expect(page.getByRole('cell', { name: 'Administrador' })).toBeVisible();
      await expect(page.getByText('Tu cuenta', { exact: true })).toBeVisible();
    });

    await test.step('6. Auditoria: eventos y detalle', async () => {
      await page.goto('/auditoria');
      await expect(page.getByText('Eventos recientes')).toBeVisible();
      await expect(page.getByRole('cell', { name: 'Tarifas de la empresa' })).toBeVisible();
      const filaTarifas = page.locator('tbody tr', { hasText: 'Tarifas de la empresa' });
      await expect(filaTarifas.locator('td').nth(3)).not.toHaveText('—');
    });
  });
});
