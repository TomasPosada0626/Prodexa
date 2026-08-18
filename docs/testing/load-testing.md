# Prueba de carga real

Item 1.2 de [`docs/gestion/roadmap-calidad-90.md`](../gestion/roadmap-calidad-90.md).
Escalabilidad y Rendimiento se autoevaluaban solo por diseño (índices, `Decimal`,
motor de costeo puro) sin haber medido nunca el sistema bajo carga real. Este
documento reemplaza esa suposición con números reales.

## Qué se midió y por qué

`apps/backend/scripts/load-test.mjs` (con [autocannon](https://github.com/mcollina/autocannon))
contra un backend real, compilado (`npm run build`), corriendo contra Postgres real
(`prodexa_test`, la misma base que usa la suite de integración) — no un mock, no un
stub:

- **`GET /health`** — baseline: sin auth, sin tocar Postgres. Mide el techo puro de
  Express/Node en esta máquina, para tener con qué comparar la ruta real.
- **`POST /api/v1/simulations`** — el motor de costeo real: pasa por `JwtAuthGuard`
  (verifica la cookie), hace una query a Postgres (`formulation.findFirst` con sus
  ingredientes), y corre el cálculo puro de costeo. Es la ruta de negocio más citada
  en el README (`SimulationService`), así que es la que importa medir.

El script se autentica de verdad: registra un usuario nuevo, hace login, crea una
formulación real, y usa esa cookie de sesión para las 100k+ peticiones — no hay atajo
que se salte el guard o la query.

**`GLOBAL_THROTTLE_LIMIT`** (nuevo, `apps/backend/src/app.module.ts`) y
`AUTH_THROTTLE_LIMIT` se suben solo para esta corrida — sin eso, el límite real de
producción (60 peticiones/min por IP, cualquier ruta) tapa la medición al segundo uno:
autocannon manda toda la carga desde una sola IP (`127.0.0.1`), así que sin subir el
límite se estaría midiendo el rate limiter, no el motor de costeo. El default de
producción sigue siendo 60 sin la variable — ver `docs/security/owasp-top10.md` (A04).

## Cómo correrla

```bash
npm run build
DATABASE_URL="postgresql://prodexa:prodexa@localhost:55432/prodexa_test?schema=public" \
  npx prisma migrate deploy
DATABASE_URL="postgresql://prodexa:prodexa@localhost:55432/prodexa_test?schema=public" \
  NODE_ENV=development BACKEND_PORT=3900 \
  JWT_ACCESS_SECRET=x JWT_REFRESH_SECRET=x COOKIE_SECURE=false CORS_ORIGIN=http://localhost:3901 \
  AUTH_THROTTLE_LIMIT=100000 GLOBAL_THROTTLE_LIMIT=100000 \
  node dist/src/main.js &

npm run load-test   # LOAD_TEST_CONNECTIONS / LOAD_TEST_DURATION_S configurables
```

## Resultados (2026-08-18, laptop de desarrollo local — no el servidor real de Render)

20 segundos por corrida. Cero errores, cero timeouts, cero respuestas no-2xx en las
4 corridas (~260k peticiones en total) — el sistema nunca cayó, ni a 5x la
concurrencia base.

| Ruta | Conexiones | Req/s (avg) | Latencia media | Latencia p99 | Errores |
|---|:---:|:---:|:---:|:---:|:---:|
| `GET /health` | 20 | 5.864 | 3 ms | 8 ms | 0 |
| `POST /simulations` | 20 | **720** | **27 ms** | 52 ms | 0 |
| `GET /health` | 100 | 6.003 | 16 ms | 35 ms | 0 |
| `POST /simulations` | 100 | 568 | **174 ms** | 308 ms | 0 |

## Lectura honesta

**Lo bueno:** 720 peticiones/segundo sostenidas en la ruta de negocio real (auth +
query a Postgres + cálculo), con latencia media de 27 ms, en una laptop — no un
servidor dedicado. Cero errores incluso a 100 conexiones concurrentes (5x). El
sistema degrada con gracia (más lento) en vez de romperse (caerse, tirar 500, dejar
timeouts) bajo presión — eso es exactamente lo que se quiere ver en una prueba de
carga.

**El hallazgo real:** al subir de 20 a 100 conexiones concurrentes, el throughput de
`/simulations` *bajó* levemente (720→568 req/s) mientras la latencia se disparó 6x
(27ms→174ms de promedio, 52ms→308ms de p99). `/health` (que no toca Postgres) siguió
igual de rápido a 100 conexiones. Eso apunta a un cuello de botella concreto: el pool
de conexiones de `pg` detrás de `PrismaPg` (`apps/backend/src/prisma/prisma.service.ts`)
no tiene un `max` explícito configurado — corre con el default de la librería, no con
un número elegido a propósito. Con más requests concurrentes que conexiones
disponibles en el pool, las peticiones se encolan esperando una conexión libre en vez
de fallar — lo cual explica por qué no hubo errores, pero también por qué la
latencia sube tanto.

**Qué significa esto para la nota:** el sistema no se cae bajo carga (evidencia real,
no una suposición) — eso sube Fiabilidad y Disponibilidad bajo presión. El techo de
throughput real bajo alta concurrencia todavía no está optimizado — eso es
exactamente lo que el ítem 1.5 de la hoja de ruta (medir y ajustar el pool de
conexiones) va a atacar con datos, no a ciegas.

## Límites de esta medición

- Corrida en una laptop de desarrollo, no en el plan gratuito real de Render (mucho
  menos CPU/RAM) — los números absolutos no son los de producción, pero la forma de
  la curva (degradación por pool de conexiones, no por el código de negocio en sí) sí
  es información real y aplicable.
- Un solo endpoint de escritura pesada (`/simulations`) se midió a fondo; no se
  probó carga mixta (varios endpoints a la vez) ni con datos a la escala de una
  organización con cientos de formulaciones.
- No hay una corrida equivalente contra el ambiente real de Render todavía — eso
  requeriría anunciar una ventana de mantenimiento (aunque sea el plan gratuito) para
  no confundir carga de prueba con tráfico real, y no se justifica sin usuarios
  reales activos hoy.
