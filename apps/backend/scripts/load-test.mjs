#!/usr/bin/env node
// Prueba de carga real contra un backend YA arriba (ver docs/testing/load-testing.md para
// como levantarlo). Mide dos rutas: /health (baseline sin auth ni DB) y POST /simulations
// (el motor de costeo real: JwtAuthGuard + una query a Postgres + el calculo puro).
//
// Requiere GLOBAL_THROTTLE_LIMIT (y AUTH_THROTTLE_LIMIT para el registro/login de setup)
// elevados en el backend de destino -- si no, el limite real de produccion (60/min por IP)
// tapa la medicion antes de que autocannon alcance a mandar carga real. No se toca el
// default de produccion: sigue siendo 60 sin la variable.

import autocannon from 'autocannon';

const BASE_URL = process.env.LOAD_TEST_BASE_URL ?? 'http://localhost:3900';
const DURATION_S = Number(process.env.LOAD_TEST_DURATION_S ?? 20);
const CONNECTIONS = Number(process.env.LOAD_TEST_CONNECTIONS ?? 20);

async function fetchJson(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const cookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`${options.method ?? 'GET'} ${path} -> ${res.status}: ${JSON.stringify(body)}`);
  }
  return { body, cookies };
}

function cookieHeader(cookies) {
  return cookies.map((c) => c.split(';')[0]).join('; ');
}

async function setup() {
  const sufijo = Date.now();
  const email = `load-test-${sufijo}@prodexa.test`;
  const password = 'CargaReal123!';

  await fetchJson('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      nombre: 'Load Test',
      nombreEmpresa: `Empresa Carga ${sufijo}`,
      aceptaTerminos: true,
    }),
  });

  const { cookies } = await fetchJson('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const cookie = cookieHeader(cookies);

  const { body: formulacion } = await fetchJson('/api/v1/formulations', {
    method: 'POST',
    headers: { Cookie: cookie },
    body: JSON.stringify({
      nombreProducto: 'Formulacion de carga',
      cantidadBaseKg: 1,
      margenPorcentaje: 30,
      impuestoPorcentaje: 19,
      ingredientes: [
        { nombre: 'Base', porcentaje: 100, cantidadGramosBase: 1000, cantidadKg: 1, precioKg: 10, precioTotal: 10 },
      ],
    }),
  });

  return { cookie, formulationId: formulacion.id };
}

function runAutocannon(opts) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(opts, (err, result) => (err ? reject(err) : resolve(result)));
    autocannon.track(instance, { renderProgressBar: true });
  });
}

function resumen(nombre, result) {
  return {
    ruta: nombre,
    duracionS: DURATION_S,
    conexiones: CONNECTIONS,
    'req/s (avg)': Math.round(result.requests.average),
    'latencia media (ms)': Math.round(result.latency.average),
    'latencia p99 (ms)': result.latency.p99,
    total: result.requests.total,
    '2xx': result['2xx'],
    non2xx: result.non2xx,
    errores: result.errors,
    timeouts: result.timeouts,
  };
}

async function main() {
  console.log(`Preparando datos de prueba contra ${BASE_URL}...`);
  const { cookie, formulationId } = await setup();
  console.log(`Listo. formulationId=${formulationId}\n`);

  console.log(`== /health (baseline, sin auth, sin Postgres) -- ${DURATION_S}s, ${CONNECTIONS} conexiones ==`);
  const health = await runAutocannon({
    url: `${BASE_URL}/health`,
    duration: DURATION_S,
    connections: CONNECTIONS,
  });

  console.log(`\n== POST /api/v1/simulations (motor de costeo real) -- ${DURATION_S}s, ${CONNECTIONS} conexiones ==`);
  const sim = await runAutocannon({
    url: `${BASE_URL}/api/v1/simulations`,
    method: 'POST',
    duration: DURATION_S,
    connections: CONNECTIONS,
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ formulationId, cantidadObjetivoKg: 10 }),
  });

  const filas = [resumen('GET /health', health), resumen('POST /simulations', sim)];
  console.log('\n== Resumen ==');
  console.table(filas);
  console.log(JSON.stringify(filas, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
