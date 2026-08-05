# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
versionado con [SemVer](https://semver.org/lang/es/).

Nota sobre este historial: el proyecto se construyó por fases internas, pero no se
etiquetó una versión por cada una — este archivo no fabrica releases retroactivos que
no existieron. `[0.1.0]` es el commit
inicial real; `[0.2.0]` es una retrospectiva honesta de todo lo construido desde
entonces hasta esta entrega, agrupado por tipo de cambio, no una lista de 9 versiones
inventadas. De aquí en adelante, cada tag corresponde a un release real.

## [0.3.0] - 2026-08-05

### Added

- **Recuperación de contraseña por código de email**: `POST /auth/forgot-password` +
  `POST /auth/reset-password`, código de 6 dígitos con expiración de 15 min,
  invalida sesiones activas al usarse. Envío real vía Resend, con fallback a loguear
  el código en desarrollo si no hay `RESEND_API_KEY` configurada.
  `/recuperar-contrasena` en el frontend, link desde `/login`.
- **Mostrar/ocultar contraseña** (ícono de ojo) en los tres formularios que piden
  contraseña: login, registro, cambio de contraseña en Configuración.
- **Despliegue real**: frontend en Vercel, backend en Render (Docker, desde el
  `Dockerfile` existente), Postgres gestionado por Render — ver
  [`docs/deployment/roadmap-despliegue.md`](docs/deployment/roadmap-despliegue.md).
- **Almacenamiento de imágenes en Cloudflare R2** para producción (el filesystem de
  Render es efímero entre deploys), con fallback automático a disco local si las
  variables de R2 no están configuradas — desarrollo local no cambia.
- **Sentry** (backend y frontend) para error tracking, gateado por la presencia del
  DSN — sin configurarlo, cero llamadas de red. Ver
  [`docs/observability/overview.md`](docs/observability/overview.md).
- **Suite E2E de Playwright corriendo en CI** (`frontend-e2e`, en
  `.github/workflows/test.yml`), contra un backend y frontend reales levantados en
  el propio job — antes solo corría en local.
- **Acción de revisión de alertas de login fallido**: desde Auditoría, un `ADMIN`
  puede marcar una alerta como revisada; el widget de Inicio deja de mostrar las ya
  revisadas.
- **Hook de pre-push (husky)**: corre localmente, antes de cualquier `git push`, la
  misma batería que CI corre después (tsc, eslint, tests con cobertura, e2e de
  backend contra Postgres real, y los specs de Playwright) — nació de un locator
  ambiguo que pasó todas las verificaciones locales a mano y solo salió rojo en CI.
  Ver [`docs/testing/ci.md`](docs/testing/ci.md).

### Changed

- **Swagger (`/api/docs`) deshabilitado por defecto en producción**, con opt-in
  explícito vía `SWAGGER_ENABLED=true` para el caso raro de necesitarlo expuesto.
- **Dependabot agrupa las actualizaciones minor/patch** de cada ecosistema en una
  sola PR en vez de una por paquete; los bumps de major siguen llegando aislados.
- **`npm audit` en CI excluye devDependencies** (`--omit=dev`) — ninguna herramienta
  de build/lint/test llega al build de producción ni procesa input de un atacante,
  ver A06 en [`docs/security/owasp-top10.md`](docs/security/owasp-top10.md).
- **Cookie de sesión con `SameSite` configurable por entorno** (`COOKIE_SAMESITE`,
  default `lax`): en producción se necesita `none` porque Vercel y Render son dos
  sitios distintos, no solo subdominios.

### Fixed

- **Subida de imágenes ahora valida la firma real del archivo (magic bytes)**, no el
  `Content-Type` declarado por quien sube el archivo — cierra un vector de spoofing
  (ej. un `.html` con script disfrazado de `image/png`).
- **Migraciones de Prisma faltantes en la base de datos de producción** causaban un
  500 genérico en `/audit-log` sin ningún cambio de código asociado — aplicadas, y
  documentado el proceso real para el plan gratuito de Render (sin Shell, vía la
  External Database URL desde una máquina local). Ver
  [`docs/observability/known-gaps.md`](docs/observability/known-gaps.md).
- Locator ambiguo de Playwright en `recuperar-contrasena.spec.ts`, encontrado por CI
  después de pasar todas las verificaciones locales.
- Lockfile de npm rechazado por `npm ci` (aunque `npm install` lo aceptaba) por un
  override anidado; y una regresión de ESLint en CI por una versión ESM-only de
  `brace-expansion` traída por ese mismo override — ambos revertidos.

### Security

- Nuevas variables de entorno: `RESEND_API_KEY`/`MAIL_FROM` (email), `R2_*`
  (almacenamiento), `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` (error tracking),
  `SWAGGER_ENABLED` — las cuatro con fallback seguro si no están configuradas.
- Rate limiting propio (5/min) en `forgot-password` y `reset-password`, mismo
  criterio que login/register — el código de 6 dígitos es un blanco de fuerza bruta.

## [0.2.1] - 2026-07-23

### Security

- **XSS almacenado en `preparacionHtml` — resuelto.** El hallazgo abierto de la
  revisión OWASP anterior (0.2.0) se sanitiza ahora con `isomorphic-dompurify`
  (`lib/sanitize-html.ts`) en los dos puntos reales de renderizado/parseo:
  `formulacion-card.tsx` (`dangerouslySetInnerHTML`) y `lib/pdf.ts`
  (`htmlToPlainText` — un vector menos obvio, un `<img onerror>` se dispara al
  asignar `innerHTML` aunque el elemento nunca se adjunte al DOM visible). Verificado
  con test unitario y con el flujo real end-to-end.

### Added

- **Matriz de permisos de la API generada del código.** `docs/api/endpoints.md` ya
  no se mantiene a mano: se deriva de los decoradores reales (`@Roles`,
  `@UseGuards`, `@ApiOperation`) vía `apps/backend/scripts/generate-endpoints-doc.mjs`,
  y CI falla si queda desactualizada respecto al código.
- **Cobertura de test real donde había huecos genuinos**, no relleno artificial:
  `uploads.controller.ts` (78%→96%, `imageFileFilter`/generador de nombre de archivo
  extraídos como funciones testeables), `suppliers.service.ts` (el branch de "error
  no relacionado con nombre duplicado" nunca se probaba), `calidad.ts`
  (`calcularEstadoRegistro`, 7 estados, sin ningún test hasta ahora).
- **`HttpExceptionFilter` ahora loguea el detalle real de un error no-HTTP** (mensaje +
  stack, vía `request.log` con el serializer de pino-http) sin cambiar lo que ve el
  cliente — cierra el hueco de observabilidad documentado en 0.2.0.
- **`modulos-avanzados.spec.ts`**: cobertura E2E permanente nueva para Análisis
  (tasa de rechazo), Reportes (cartera por cobrar), Proveedores (CRUD), Configuración
  (tarifas/sesiones/equipo) y Auditoría (detalle de eventos) — los 5 solo se habían
  verificado antes con specs temporales, ya borradas.

## [0.2.0] - 2026-07-23

### Added

- **Autenticación**: JWT de acceso corto (15 min) + refresh token opaco rotatorio,
  Argon2 para contraseñas, cookies `httpOnly`, gestión de sesiones activas
  (ver/revocar por dispositivo).
- **RBAC y organizaciones multiusuario**: roles `ADMIN`/`COORDINADOR`/`MIEMBRO` por
  organización, invitaciones de un solo uso, gestión de equipo (ver
  [ADR-005](docs/adr/ADR-005-rbac-organizaciones-multiusuario.md)).
- **Formulaciones**: CRUD completo con ingredientes, preparación enriquecida,
  categoría, registro sanitario, historial de versiones (snapshot completo por
  edición) e historial de precios por ingrediente. Archivar/reactivar en vez de
  permitir borrar una formulación con historial de producción.
- **Producción**: órdenes de producción persistentes, máquina de estados de calidad
  (`PLANIFICADO → EN_PROCESO → EN_CALIDAD → TERMINADO`/`RECHAZADO`, control de calidad
  obligatorio, un paso de retroceso permitido), pagos/abonos parciales.
- **Costos**: simulador de precio de venta con descuentos, desglose por ingrediente,
  botón para registrar un análisis directo como orden de producción en Preparar.
- **Proveedores**: CRUD real (crear, renombrar, eliminar).
- **Auditoría**: bitácora de 12 tipos de evento (seguridad de cuenta y eventos de
  negocio), con detalle específico por evento visible en la UI. Solo `ADMIN`.
- **Análisis**: ficha de rendimiento por formulación, utilidad real acumulada, tasa de
  rechazo en calidad, ranking frente a las demás formulaciones. Export a PDF.
- **Reportes**: reporte financiero consolidado y vista dedicada de cartera por cobrar,
  ambos exportables.
- **Calidad**: seguimiento de vigencia de registro sanitario por formulación.
- **Dashboard**: KPIs de margen/utilidad con filtros, gráficos de tendencia, alertas de
  vencimiento, widget de lotes esperando revisión de calidad, y (solo `ADMIN`) alertas
  de intentos de login fallidos.
- **Observabilidad**: `/health`, `/ready`, logging estructurado con correlation id
  (`X-Request-Id`).
- **Testing**: 196 unit + 27 integración/e2e (backend, contra Postgres real), 27 unit +
  5 E2E con Playwright y axe-core (frontend). Quality gate de cobertura (≥95%) en CI.
- **CI/CD parcial**: workflows de tests (`test.yml`) y seguridad (`security.yml`,
  gitleaks + `npm audit`), Dependabot semanal.
- **Documentación completa**: README ampliado, `docs/` con arquitectura, ADRs, API,
  base de datos, diagramas (C4, ER, despliegue, máquina de estados), testing,
  observabilidad y seguridad; gobernanza de repositorio (`LICENSE`, `CONTRIBUTING.md`,
  `SECURITY.md`, `CODE_OF_CONDUCT.md`, plantillas de PR/issue).

### Changed

- **RBAC pasó de "descartado explícitamente" a implementado.** La decisión original
  (2026-07-22, sin roles) se revirtió cuando el modelo de negocio pasó a requerir
  equipos multiusuario por empresa — ver ADR-005.

### Fixed

- `next` actualizado a 16.2.11 y overrides de `sharp`/`postcss` para cerrar
  vulnerabilidades altas reportadas por `npm audit`.
- `/auth/login` se reintentaba indebidamente vía `/auth/refresh` en una respuesta 401,
  duplicando el evento `LOGIN_FAILED` en la auditoría cuando el navegador ya tenía una
  sesión válida de otra cuenta.

### Security

- Revisión OWASP Top 10 propia (`docs/security/owasp-top10.md`), con hallazgos
  pendientes explícitos, no una checklist marcada de más.
- **Hallazgo abierto conocido:** riesgo real de XSS almacenado en el campo de
  preparación de una formulación (HTML enriquecido sin sanitizar, ahora visible entre
  miembros de una misma organización) — sin mitigar todavía, ver el detalle en la
  revisión OWASP.

## [0.1.0] - 2026-02-02

- Proyecto inicial: calculadora de costos y recetas alimenticias.
