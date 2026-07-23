// Graba un recorrido completo de Prodexa como video (.webm) para convertir despues a
// docs/demo/prodexa-demo.gif. Se conserva como herramienta reutilizable (a diferencia de
// los specs `_tmp-verify-*.spec.ts`, que son de un solo uso y se borran): asi la proxima
// vez que la UI cambie, volver a grabar el demo es `node scripts/record-demo.mjs`, no
// reconstruir todo el pipeline desde cero.
//
// Requisitos: backend en :3000 y frontend en :3001 corriendo (npm run dev en la raiz),
// Postgres arriba. No usa el test runner de Playwright (evita tocar playwright.config.ts
// y evita que quede dentro de testDir: './e2e').
//
// Uso: node scripts/record-demo.mjs
// Salida: .demo-recording-tmp/raw-demo.webm (el script de conversion a gif se encarga
// de convertirlo y borrar este directorio).

import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', '.demo-recording-tmp');
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3001';

const PAUSA_LARGA = 3500;
const PAUSA_MEDIA = 2200;
const PAUSA_CORTA = 1300;

function unico() {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

async function pausa(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ slowMo: 200 });
  const context = await browser.newContext({
    baseURL: BASE_URL,
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 800 } },
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const sufijo = unico();
  const email = `demo-${sufijo}@prodexa.test`;
  const password = 'DemoProdexa123!';
  const empresa = 'Panaderia Demo';
  const producto = 'Crema Hidratante Demo';
  const proveedor = 'Distribuidora Andina';

  try {
    // 1. Landing publica
    await page.goto('/');
    await pausa(PAUSA_LARGA);

    // 2. Registro
    await page.goto('/registro');
    await page.getByLabel('Nombre', { exact: true }).fill('Usuario');
    await page.getByLabel('Apellidos').fill('Demo');
    await page.getByLabel('Correo').pressSequentially(email, { delay: 40 });
    await page.getByLabel('Nombre de tu empresa').pressSequentially(empresa, { delay: 40 });
    await page.getByLabel('Contrasena', { exact: true }).fill(password);
    await page.getByLabel('Repetir contrasena').fill(password);
    await pausa(PAUSA_CORTA);
    await page.getByRole('button', { name: 'Registrarse' }).click();
    await page.waitForURL(/\/login$/);
    await pausa(PAUSA_CORTA);

    // 3. Login
    await page.getByLabel('Correo').fill(email);
    await page.getByLabel('Contrasena', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Iniciar sesion' }).click();
    await page.waitForURL(/\/dashboard$/);
    await pausa(PAUSA_LARGA);

    // 4. Crear formulacion con 2 ingredientes
    await page.goto('/formulaciones');
    await page.getByLabel('Nombre del producto').pressSequentially(producto, { delay: 45 });
    await page.getByLabel('Cantidad base (kg)').fill('1');
    const nombres = page.getByPlaceholder('Nombre', { exact: true });
    const porcentajes = page.getByPlaceholder('% en formula');
    const precios = page.getByPlaceholder('Precio/kg');
    await nombres.first().fill('Manteca de karite');
    await porcentajes.first().fill('60');
    await precios.first().fill('18000');
    await page.getByRole('button', { name: '+ Agregar ingrediente' }).click();
    await nombres.nth(1).fill('Aceite de coco');
    await porcentajes.nth(1).fill('40');
    await precios.nth(1).fill('12000');
    await pausa(PAUSA_CORTA);
    await page.getByRole('button', { name: 'Crear formulacion' }).click();
    await page.getByRole('heading', { name: producto }).waitFor();
    await pausa(PAUSA_LARGA);

    // 5. Costos: analizar y registrar como orden de produccion
    await page.goto('/costos');
    await page.getByLabel('Cantidad a analizar (kg)').fill('3');
    await page.getByLabel('Transporte').fill('8000');
    await page.getByRole('button', { name: 'Analizar' }).click();
    await page.getByText('Registrar como orden de produccion').waitFor();
    await pausa(PAUSA_LARGA);
    await page.getByRole('button', { name: 'Registrar como orden de produccion' }).click();
    await page.waitForURL(/\/preparar\?/);
    await page.getByText('Datos cargados desde tu analisis de Costos').waitFor();
    await pausa(PAUSA_MEDIA);

    // 6. Preparar: guardar la orden de produccion
    await page.getByRole('button', { name: 'Guardar orden de produccion' }).click();
    await page.getByRole('status').last().waitFor();
    await pausa(PAUSA_MEDIA);

    // 7. Avanzar el lote en el flujo de calidad (PLANIFICADO -> EN_PROCESO -> EN_CALIDAD)
    const tablaHistorial = page.locator('table').last();
    const filaLote = tablaHistorial.locator('tbody tr').first();
    for (const estado of ['EN_PROCESO', 'EN_CALIDAD']) {
      await filaLote.getByRole('button', { name: 'Editar' }).click();
      await filaLote.locator('select').last().selectOption(estado);
      await filaLote.getByRole('button', { name: 'Guardar' }).click();
      await page.getByRole('status').last().waitFor();
      await pausa(PAUSA_MEDIA);
    }

    // 8. Dashboard: ahora muestra el lote esperando revision de calidad
    await page.goto('/dashboard');
    await page.getByText('lote esperando revision de calidad', { exact: false }).waitFor();
    await pausa(PAUSA_LARGA);

    // 9. Analisis
    await page.goto('/analisis');
    await page.getByText('Indicadores de rendimiento').waitFor();
    await pausa(PAUSA_LARGA);

    // 10. Calidad
    await page.goto('/calidad');
    await pausa(PAUSA_LARGA);

    // 11. Auditoria
    await page.goto('/auditoria');
    await page.getByText('Eventos recientes', { exact: false }).waitFor();
    await pausa(PAUSA_LARGA);

    // 12. Configuracion: sesiones activas + equipo
    await page.goto('/configuracion');
    await page.getByText('Sesiones activas', { exact: false }).waitFor();
    await pausa(PAUSA_LARGA);

    // 13. Proveedores: crear, renombrar, eliminar
    await page.goto('/proveedores');
    await page.getByLabel('Nuevo proveedor').pressSequentially(proveedor, { delay: 45 });
    await page.getByRole('button', { name: 'Crear proveedor' }).click();
    await page.getByRole('cell', { name: proveedor }).waitFor();
    await pausa(PAUSA_MEDIA);
    // La tabla "Todos los proveedores" es la ultima de la pagina; al hacer click en
    // "Renombrar" el nombre pasa a un <input value="...">, que ya no matchea por texto,
    // asi que se ancla la fila por posicion, no por contenido.
    const filaProveedor = page.locator('table').last().locator('tbody tr').first();
    await filaProveedor.getByRole('button', { name: 'Renombrar' }).click();
    await pausa(PAUSA_CORTA);
    await filaProveedor.getByRole('button', { name: 'Cancelar' }).click();
    await pausa(PAUSA_CORTA);

    // 14. Reportes: cartera por cobrar
    await page.goto('/reportes');
    await page.getByText('Cartera por cobrar', { exact: false }).waitFor();
    await pausa(PAUSA_LARGA);
  } finally {
    await context.close();
    await browser.close();
  }

  console.log(`Video grabado en: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
