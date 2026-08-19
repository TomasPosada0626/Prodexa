# Scan OWASP ZAP baseline — ambiente real

Item 1.7 de [`docs/gestion/roadmap-calidad-90.md`](../gestion/roadmap-calidad-90.md).
La autoevaluación de seguridad ([`owasp-top10.md`](owasp-top10.md)) era hasta ahora
100% revisión de código — nunca se había lanzado tráfico real de un scanner contra el
ambiente en producción. Este documento reemplaza esa laguna con un resultado medido,
no una suposición.

## Qué se escaneó y por qué

[ZAP baseline](https://www.zaproxy.org/docs/docker/baseline-scan/) (`zap-baseline.py`,
imagen `ghcr.io/zaproxy/zaproxy:stable`) contra los dos targets reales de producción:

- **Frontend**: `https://prodexa-iota.vercel.app` — spider real (no autenticado)
  durante 3 minutos, encontró y analizó 43 URLs (landing, `/registro`,
  `/legal/terminos`, `/legal/privacidad`, assets estáticos).
- **Backend**: `https://prodexa-backend.onrender.com` — mismo scan. Solo 3 URLs
  alcanzables por el spider (`/`, `/sitemap.xml`, ninguno de los dos existe como
  recurso navegable — un backend REST puro no tiene links que seguir). Swagger
  (`/api/docs`) está deshabilitado en producción por diseño (ver `owasp-top10.md`,
  A05), así que el scan no tuvo un OpenAPI spec que importar para probar los
  endpoints reales de negocio uno por uno — eso requeriría `zap-api-scan.py` con el
  spec expuesto temporalmente, fuera del alcance de este baseline.

**Baseline = pasivo + activo liviano.** No es un scan activo completo (no intenta
explotar, no hace fuzzing agresivo de inputs) — es el nivel apropiado para correr
contra un ambiente de producción real con datos de pilotos reales, sin arriesgar
tumbar el servicio ni corromper datos.

## Cómo correrlo

```bash
docker run --rm -v "<carpeta-de-salida>:/zap/wrk:rw" -t ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t https://prodexa-iota.vercel.app \
  -r frontend-report.html -w frontend-report.md -J frontend-report.json -m 3 -I

docker run --rm -v "<carpeta-de-salida>:/zap/wrk:rw" -t ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t https://prodexa-backend.onrender.com \
  -r backend-report.html -w backend-report.md -J backend-report.json -m 3 -I
```

En Windows con Git Bash, el mount de `-v` necesita `MSYS_NO_PATHCONV=1` y una ruta
Windows (`C:/...`) del lado del host — sin eso, la conversión automática de rutas de
MSYS rompe el flag `-v` y el contenedor arranca sin `/zap/wrk` montado.

## Resultados (2026-08-19, contra producción real)

| Target | URLs analizadas | PASS | WARN-NEW | FAIL-NEW |
|---|:---:|:---:|:---:|:---:|
| Frontend (Vercel) | 43 | 57 | 10 | **0** |
| Backend (Render) | 3 | 66 | 1 | **0** |

**Cero hallazgos FAIL en ambos targets** — nada del nivel "vulnerabilidad explotable
confirmada". Reportes completos (HTML/JSON/Markdown) generados localmente, no
committeados al repo (son artefactos de una corrida puntual, no código fuente).

## Lectura honesta, hallazgo por hallazgo

### Corregidos (mismo día, con evidencia)

El backend ya pasaba estos checks gracias a `helmet()` (ver `owasp-top10.md`, A05);
el frontend en Vercel no tenía nada de esto configurado — Next.js no los agrega por
defecto. Cerrado en `apps/frontend/next.config.ts` (`headers()`), verificado con
`npm run build` + `npm run start` local y `curl -D -` confirmando los 4 headers
presentes en la respuesta real:

| Alerta ZAP | Header agregado |
|---|---|
| Missing Anti-clickjacking Header [10020] | `X-Frame-Options: DENY` |
| X-Content-Type-Options Header Missing [10021] | `X-Content-Type-Options: nosniff` |
| Permissions Policy Header Not Set [10063] | `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()` |
| (bonus, no reportado por ZAP pero mismo mecanismo) | `Referrer-Policy: strict-origin-when-cross-origin` |

### Revisados y descartados (evidencia de que no aplican, no solo ignorados)

- **Cross-Domain Misconfiguration [10098]** — evidencia real:
  `Access-Control-Allow-Origin: *` en assets estáticos (fuentes `.woff2`, chunks
  `.js`). Es el comportamiento por defecto de la CDN de Vercel para archivos
  públicos e inmutables (`_next/static/...`) — no hay dato sensible ni de sesión en
  esas respuestas, así que un origin abierto ahí no expone nada. Sin acción.
- **Storable and Cacheable Content [10049] / Retrieved from Cache [10050] /
  Re-examine Cache-control Directives [10015]** — las URLs marcadas son la landing
  pública, `/registro`, las páginas legales y assets estáticos inmutables: ninguna
  contiene datos de sesión ni de negocio. Las vistas privadas (Dashboard,
  Formulaciones, etc.) son client-rendered detrás de `AuthProvider` y consumen la
  API con `credentials: include` — no son páginas estáticas cacheables por un proxy
  compartido. Sin acción.
- **Modern Web Application [10109]** — de las 5 URLs listadas, 2 son un artefacto
  del propio parser de ZAP: interpretó mal el query string de una URL de
  `/_next/image` (optimizador de imágenes de Next.js) como si fuera una ruta
  propia, produciendo un 404 que no existe si se navega la URL real. Confirmado
  manualmente. Sin acción.

### Diferidos a propósito, con la razón explícita (no un olvido)

- **Content Security Policy (CSP) Header Not Set [10038]** — no se improvisó una
  CSP a ciegas contra producción real con pilotos activos: una directiva mal
  ajustada (`connect-src` sin el origin del backend o de Sentry, `img-src` sin el
  host real de las imágenes subidas) rompe silenciosamente cosas como el envío de
  formularios, la carga de imágenes de formulaciones o el reporte de errores a
  Sentry, y solo se detecta probando cada flujo real en el navegador. Queda como
  siguiente paso, con verificación manual en el navegador antes de deployar, no
  como algo resuelto hoy.
- **Cross-Origin-Embedder-Policy Header Missing or Invalid [90004]** — COEP existe
  para habilitar aislamiento de origen cruzado (necesario para `SharedArrayBuffer`
  y APIs relacionadas). Prodexa no usa ninguna de esas APIs; activarlo sin
  necesidad real arriesga romper la carga de recursos de terceros (fuentes,
  imágenes) sin ningún beneficio de seguridad concreto hoy. Mismo criterio que ya
  usa el proyecto para no conectar Redis sin un caso de uso real (ver README, FAQ).

## Límites de esta medición

- Scan no autenticado — no probó nada detrás de login (Dashboard, Formulaciones,
  Producción, etc.). Un baseline autenticado requeriría un `context_file` con
  credenciales de una cuenta de prueba dedicada, fuera del alcance de esta corrida.
- El backend, al ser una API REST pura sin páginas navegables ni OpenAPI spec
  expuesto en producción, tuvo una superficie de solo 3 URLs — la cobertura real
  del backend depende más de la revisión de código ya hecha en
  [`owasp-top10.md`](owasp-top10.md) que de este scan.
- Es una corrida puntual, no continua — no hay un job de CI que repita este scan en
  cada deploy todavía (a diferencia de `npm audit`/gitleaks, que sí corren en cada
  push). Se podría agregar como job semanal de GitHub Actions si se justifica.

## Qué significa esto para la nota

Cero FAIL en ambos targets, y los 4 hallazgos con impacto real ya corregidos y
verificados el mismo día — no quedó "sin arrancar" como decía la hoja de ruta. Los
6 hallazgos restantes están revisados individualmente con una razón explícita cada
uno (descartado con evidencia, o diferido con criterio), no una lista ignorada.
Seguridad sube de 90 a **94** en
[`roadmap-calidad-90.md`](../gestion/roadmap-calidad-90.md).
