import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';

function uniqueEmail(): string {
  return `e2e-reset-${Date.now()}-${Math.floor(Math.random() * 100000)}@prodexa.test`;
}

/**
 * Sin RESEND_API_KEY (ver mail.service.ts), el codigo de recuperacion se loguea en vez
 * de enviarse por correo real. El job frontend-e2e redirige el stdout del backend a
 * este archivo (ver .github/workflows/test.yml, step "Backend — arrancar en
 * background") — leerlo es la unica forma de obtener el codigo real sin agregar un
 * endpoint de backdoor solo para tests.
 */
const BACKEND_LOG_PATH = path.resolve(__dirname, '../../backend/backend.log');

async function leerCodigoDeRecuperacion(email: string, desdeOffset: number): Promise<string> {
  const emailEscapado = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patron = new RegExp(`para: ${emailEscapado}.*?contenido: Tu codigo de recuperacion es: (\\d{6})`, 's');

  for (let intento = 0; intento < 20; intento++) {
    if (existsSync(BACKEND_LOG_PATH)) {
      const contenidoNuevo = readFileSync(BACKEND_LOG_PATH, 'utf8').slice(desdeOffset);
      const match = contenidoNuevo.match(patron);
      if (match) return match[1];
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    `No se encontro el codigo de recuperacion en ${BACKEND_LOG_PATH} despues de 10s. ` +
      'Este spec necesita que el backend corra sin RESEND_API_KEY (para que loguee el ' +
      'codigo) con su salida redirigida a ese archivo — asi corre el job frontend-e2e en CI.',
  );
}

test.describe('Recuperacion de contrasena', () => {
  test('solicitar codigo, resetear, entrar con la nueva contrasena y la vieja ya no sirve', async ({ page }) => {
    test.skip(!existsSync(BACKEND_LOG_PATH), `Requiere ${BACKEND_LOG_PATH} (ver comentario arriba)`);

    const email = uniqueEmail();
    const passwordOriginal = 'Clave12345678!';
    const passwordNueva = 'ClaveNueva98765!';

    await test.step('Registro', async () => {
      await page.goto('/registro');
      await page.getByLabel('Nombre', { exact: true }).fill('Usuario');
      await page.getByLabel('Apellidos').fill('Recuperacion');
      await page.getByLabel('Correo').fill(email);
      await page.getByLabel('Nombre de tu empresa').fill('Empresa Recuperacion');
      await page.getByLabel('Contrasena', { exact: true }).fill(passwordOriginal);
      await page.getByLabel('Repetir contrasena').fill(passwordOriginal);
      await page.getByLabel(/Acepto los Terminos y Condiciones/).check();
      await page.getByRole('button', { name: 'Registrarse' }).click();
      await expect(page).toHaveURL(/\/login$/);
    });

    let offsetLog = 0;
    await test.step('Solicitar el codigo de recuperacion', async () => {
      offsetLog = readFileSync(BACKEND_LOG_PATH, 'utf8').length;
      await page.goto('/recuperar-contrasena');
      await page.getByLabel('Correo').fill(email);
      await page.getByRole('button', { name: 'Enviar codigo' }).click();
      await expect(page.getByLabel('Codigo de 6 digitos')).toBeVisible();
    });

    await test.step('Completar el reset con el codigo real logueado por el backend', async () => {
      const codigo = await leerCodigoDeRecuperacion(email, offsetLog);
      await page.getByLabel('Codigo de 6 digitos').fill(codigo);
      // exact: true es necesario — "Nueva contrasena" es substring de "Repetir nueva
      // contrasena", sin esto Playwright tira strict mode violation (2 matches).
      await page.getByLabel('Nueva contrasena', { exact: true }).fill(passwordNueva);
      await page.getByLabel('Repetir nueva contrasena').fill(passwordNueva);
      await page.getByRole('button', { name: 'Restablecer contrasena' }).click();
      await expect(page).toHaveURL(/\/login$/);
    });

    await test.step('La contrasena vieja ya no sirve (se cambio, no solo se revocaron sesiones)', async () => {
      await page.getByLabel('Correo').fill(email);
      await page.getByLabel('Contrasena', { exact: true }).fill(passwordOriginal);
      await page.getByRole('button', { name: 'Iniciar sesion' }).click();
      await expect(page.getByText('Correo o contrasena incorrectos.')).toBeVisible();
    });

    await test.step('La contrasena nueva entra normalmente', async () => {
      await page.getByLabel('Correo').fill(email);
      await page.getByLabel('Contrasena', { exact: true }).fill(passwordNueva);
      await page.getByRole('button', { name: 'Iniciar sesion' }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
    });
  });
});
