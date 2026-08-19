<p align="center">
  <b>Prodexa</b><br>
  <i>Plataforma de costeo, producción y rentabilidad para fabricantes de alimentos y cosméticos</i>
</p>

<p align="center"><sub><b>STACK</b></sub></p>
<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Framer_Motion-black?logo=framer&logoColor=white" />
  <img src="https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" />
</p>

<p align="center"><sub><b>SEGURIDAD</b></sub></p>
<p align="center">
  <img src="https://img.shields.io/badge/Auth-JWT_%2B_refresh_rotatorio-black?logo=jsonwebtokens&logoColor=white" />
  <img src="https://img.shields.io/badge/Passwords-Argon2-black" />
  <img src="https://img.shields.io/badge/RBAC-multi--tenant_por_organizaci%C3%B3n-black" />
  <img src="https://img.shields.io/badge/Headers-Helmet-black" />
  <img src="https://img.shields.io/badge/Secrets_scan-gitleaks-black?logo=gitleaks&logoColor=white" />
  <img src="https://img.shields.io/badge/Dependency_audit-npm_audit_%2B_Dependabot-black" />
  <img src="https://img.shields.io/badge/OWASP_Top_10-autoevaluaci%C3%B3n_p%C3%BAblica-black" />
</p>

<p align="center"><sub><b>CALIDAD Y CI/CD</b></sub></p>
<p align="center">
  <img src="https://img.shields.io/badge/GitHub_Actions-CI%2FCD-2088FF?logo=githubactions&logoColor=white" />
  <img src="https://img.shields.io/badge/Jest-unit_tests-C21325?logo=jest&logoColor=white" />
  <img src="https://img.shields.io/badge/Vitest-unit_tests-6E9F18?logo=vitest&logoColor=white" />
  <img src="https://img.shields.io/badge/Playwright-E2E_%2B_axe--core-2EAD33?logo=playwright&logoColor=white" />
  <img src="https://img.shields.io/badge/ESLint-4B32C3?logo=eslint&logoColor=white" />
  <img src="https://img.shields.io/badge/pre--push_hook-husky-yellow" />
  <img src="https://img.shields.io/badge/tests-381%20passing-brightgreen" />
</p>

<p align="center"><sub><b>CUMPLIMIENTO</b></sub></p>
<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" />
  <img src="https://img.shields.io/badge/Datos_personales-Ley_1581_de_2012_(Colombia)-6b46c1" />
  <img src="https://img.shields.io/badge/Accesibilidad-WCAG_2.1_AA_(axe--core)-6b46c1" />
  <img src="https://img.shields.io/badge/Eliminaci%C3%B3n_de_datos-autoservicio-6b46c1" />
</p>

<p align="center"><sub><b>COBERTURA DE TESTS (backend)</b></sub></p>

<div align="center">

| Statements                  | Branches                | Functions                 | Lines             |
| :---------------------------: | :----------------------: | :-------------------------: | :------------------: |
| ![Statements](https://img.shields.io/badge/statements-98.97%25-brightgreen.svg?style=flat) | ![Branches](https://img.shields.io/badge/branches-88.67%25-yellow.svg?style=flat) | ![Functions](https://img.shields.io/badge/functions-95.62%25-brightgreen.svg?style=flat) | ![Lines](https://img.shields.io/badge/lines-98.9%25-brightgreen.svg?style=flat) |

</div>

---

## Índice

- [Qué problema resuelve](#qué-problema-resuelve)
- [Demo](#demo)
- [Recorrido por la aplicación](#recorrido-por-la-aplicación)
- [Arquitectura](#arquitectura)
- [Stack técnico](#stack-técnico)
- [Auditoría de calidad de software](#auditoría-de-calidad-de-software)
- [Cumplimiento legal y privacidad de datos](#cumplimiento-legal-y-privacidad-de-datos)
- [Empezar en local](#empezar-en-local)
  - [Variables de entorno](#variables-de-entorno)
  - [Docker y scripts](#docker-y-scripts)
- [Despliegue](#despliegue)
- [Testing y cobertura](#testing-y-cobertura)
- [Documentación adicional](#documentación-adicional)
- [FAQ y soporte](#faq-y-soporte)
- [Licencia](#licencia)
- [Autor](#autor)

## Qué problema resuelve

Quien fabrica alimentos o cosméticos a escala de pyme normalmente calcula costos, márgenes y precios de venta en una hoja de cálculo que se vuelve inconsistente apenas hay más de un par de productos y más de una persona tocándola: precios de insumos desactualizados, márgenes que nadie recuerda por qué se fijaron así, cero trazabilidad de qué lote se produjo con qué costo real, y ningún control de quién puede editar qué.

Prodexa reemplaza esa hoja de cálculo con una plataforma real, multiusuario por empresa: cada formulación tiene su historial completo de cambios, su cumplimiento regulatorio (registro sanitario y vencimientos), su rentabilidad calculada con el mismo motor de costeo en todas partes, un flujo de producción con control de calidad obligatorio antes de dar un lote por terminado, y un panel de análisis que responde la pregunta que más importa — **cuánto deja cada producto, y cómo se compara con los demás**.

El proyecto tiene un predecesor real: `legacy/desktop-v1/` es la calculadora de escritorio en Python con la que arrancó esta idea (un solo archivo, sin persistencia real, sin multiusuario). Prodexa es su reemplazo completo, y desde el 14 de agosto de 2026 está entrando en **fase de pilotaje con clientes reales** — lo que eleva la vara de seguridad, legal y de producto respecto a un proyecto de portafolio (ver [Cumplimiento legal y privacidad de datos](#cumplimiento-legal-y-privacidad-de-datos)).

## Demo

**En vivo**: [prodexa-iota.vercel.app](https://prodexa-iota.vercel.app) (frontend en
Vercel, API en Render — el backend gratuito se duerme tras inactividad, la primera
petición puede tardar 50+ segundos en despertar).

![Demo de Prodexa](docs/demo/prodexa-demo.gif)

*(Registro → crear formulación → analizar costos → registrar el lote → avanzarlo por control de calidad → auditoría, sesiones activas, proveedores y cartera por cobrar. Grabado en local con un script de Playwright propio — ver [`apps/frontend/scripts/record-demo.mjs`](apps/frontend/scripts/record-demo.mjs), `npm --prefix apps/frontend run demo:record` para volver a generarlo.)*

## Recorrido por la aplicación

| Sección | Qué hace |
|---|---|
| **Dashboard** | KPIs de margen y utilidad con filtro por periodo, formulación y categoría; gráficos de tendencia; alertas de registros sanitarios/lotes por vencer; widget de lotes esperando revisión de calidad; y (solo ADMIN) alertas de seguridad con los últimos inicios de sesión fallidos. |
| **Formulaciones** | CRUD completo con ingredientes, preparación enriquecida, categoría, registro sanitario, historial de versiones (snapshot completo en cada edición) e historial de precios por ingrediente. Una formulación con lotes de producción ya registrados no se puede eliminar (perdería ese historial financiero); se archiva en su lugar. |
| **Producción (Preparar)** | Escala cualquier formulación a la cantidad objetivo y calcula el costo real del lote; cada lote queda registrado como una orden de producción persistente, con una máquina de estados explícita (`PLANIFICADO → EN_PROCESO → EN_CALIDAD → TERMINADO`, o `RECHAZADO` en cualquier punto) — el control de calidad es obligatorio antes de poder marcar un lote como terminado. |
| **Costos** | Simulador de precio de venta con descuentos/mayoristas y desglose de costo por ingrediente. Un análisis que convence se registra directo como orden de producción en Preparar con un botón, sin retipear nada. |
| **Análisis** | Ficha de rendimiento por formulación: costo, precio de venta, utilidad, punto de equilibrio, utilidad real acumulada, tasa de rechazo en calidad, desglose de costo por ingrediente y ranking frente a las demás formulaciones. Exportable a PDF. |
| **Calidad** | Estado del registro sanitario de cada formulación (vigente / por vencer / vencido), con fecha y estado editables directamente en la tabla. |
| **Reportes** | Reporte financiero consolidado (exportable a PDF/CSV) y una vista dedicada de **cartera por cobrar**: solo lotes con saldo pendiente, ordenados del más urgente al menos urgente, con su propio export CSV. |
| **Proveedores** | CRUD real (crear, renombrar, eliminar) para poder limpiar duplicados o corregir nombres — antes solo se creaban implícitamente al registrar un precio de ingrediente. |
| **Configuración** | Perfil, margen por defecto, cambio de contraseña, tarifas de producción de la empresa, **sesiones activas** (ver y revocar cada dispositivo con sesión iniciada), gestión de equipo (roles, invitaciones) y una **zona de peligro** de autoservicio: eliminar tu propio perfil o la empresa completa, con tu contraseña como confirmación (ver [Cumplimiento legal y privacidad de datos](#cumplimiento-legal-y-privacidad-de-datos)). |
| **Auditoría** | Bitácora de seguridad y de negocio: login/logout/registro, recuperación de contraseña, cambios de rol, remoción de miembros, cambios de precio, ediciones de formulación, cambios de tarifas y eliminación de cuenta/empresa — cada evento con su detalle específico visible en la tabla. Los inicios de sesión fallidos se pueden marcar como revisados (dejan de contar como alerta activa). Solo ADMIN. |
| **Recuperar contraseña** | Flujo de dos fases (pedir código → confirmar) con código de 6 dígitos enviado por correo, expira a los 15 minutos y revoca todas las sesiones activas al usarse. |
| **Legal** (`/legal/terminos`, `/legal/privacidad`) | Términos y condiciones y Política de tratamiento de datos personales, públicas, enlazadas desde el pie de página de la landing y desde el checkbox de aceptación obligatorio en el registro. |

Guía paso a paso para el usuario final (sin jerga técnica, con capturas reales de cada
pantalla): [`docs/usuario/guia-usuario.md`](docs/usuario/guia-usuario.md).

## Arquitectura

```mermaid
flowchart LR
    subgraph Cliente
        FE["Next.js 16 (App Router)<br/>React 19 + Tailwind v4"]
    end
    subgraph Servidor
        API["NestJS 11<br/>REST + Swagger"]
        AUTH["Auth: JWT + refresh<br/>rotatorio (cookies httpOnly)"]
        RBAC["RolesGuard<br/>(ADMIN/COORDINADOR/MIEMBRO)"]
        AUDIT["Audit log<br/>(seguridad + eventos de negocio)"]
        COST["Motor de costeo<br/>(SimulationService, puro y sin estado)"]
    end
    subgraph Datos
        PG[("PostgreSQL 16<br/>via Prisma 7")]
    end

    FE -- "fetch con credentials:include" --> API
    API --> AUTH
    API --> RBAC
    API --> AUDIT
    API --> COST
    API -- "Prisma Client" --> PG
    COST -. "misma formula, espejada en el cliente<br/>para vistas de solo lectura" .-> FE
```

La API vive detrás de `/api/v1`; `/health` y `/ready` quedan fuera de ese prefijo a propósito porque un orquestador los golpea sin versionar. Diagramas completos (C4 niveles 1-3, entidad-relación, despliegue y la máquina de estados de producción) en [`docs/diagrams/`](docs/diagrams/).

## Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Framer Motion, Tiptap (editor enriquecido) |
| Backend | NestJS 11, Prisma 7 (driver adapter `@prisma/adapter-pg`), class-validator, `@nestjs/throttler` (rate limiting) |
| Datos | PostgreSQL 16 — 13 modelos, índices en todas las columnas de filtrado multi-tenant (`organizationId`) y claves foráneas |
| Auth | JWT (access 15 min) + refresh token opaco rotatorio, Argon2, cookies httpOnly, RBAC por organización, recuperación de contraseña por código de un solo uso |
| Almacenamiento | Disco local por defecto; Cloudflare R2 (S3-compatible) si están configuradas las 5 variables `R2_*` — sin código nuevo, solo env vars |
| Correo | Resend para el código de recuperación; sin `RESEND_API_KEY` se loguea en vez de enviarse en desarrollo, y **falla al iniciar** si falta en producción (no hay fallback silencioso a texto plano en logs) |
| Observabilidad | pino-http (logs JSON estructurados + correlation id), `/health` y `/ready`, Sentry (frontend y backend) gateado por DSN — sin él, cero llamadas de red |
| Calidad | Jest (backend), Vitest (frontend), Playwright + axe-core (E2E y accesibilidad) — más un hook de pre-push (husky) que corre todo eso antes de dejar pushear |
| CI | GitHub Actions: tests + typecheck + lint + quality gate de cobertura (`test.yml`), gitleaks, `npm audit --omit=dev`, Dependabot con PRs agrupadas (`security.yml`) |

> Redis está provisionado en `docker-compose.yml` para cuando se necesite cache o un store de rate-limiting distribuido, pero hoy no está conectado a ningún código — se documenta así en vez de aparentar que ya se usa.

## Auditoría de calidad de software

Autoevaluación honesta contra 13 atributos de calidad de software, agrupados en 3 ejes. **Cubierto** significa que hay evidencia concreta y verificable en el repo (no una intención); donde existe un límite real, se dice explícitamente en vez de esconderlo — mismo criterio que ya usa [`docs/security/owasp-top10.md`](docs/security/owasp-top10.md) y [`docs/observability/known-gaps.md`](docs/observability/known-gaps.md).

Calificación agregada: **~87/100 (B+)**. Plan concreto para subirla, pilar por pilar, en [`docs/gestion/roadmap-calidad-90.md`](docs/gestion/roadmap-calidad-90.md) — el número se actualiza ahí primero y se propaga a este README, para que no queden desincronizados.

### Pilares fundamentales

| Atributo | Estado | Evidencia |
|---|---|---|
| **Seguridad** | Cubierto | Argon2 para contraseñas, JWT de vida corta + refresh rotatorio hasheado en DB, cookies `httpOnly`/`secure`, RBAC por organización con aislamiento por `organizationId` en cada query, `helmet()` + CORS restringido a un origin, `ValidationPipe` con `whitelist`/`forbidNonWhitelisted`, rate limiting dedicado en endpoints de auth (5/min), sanitización XSS con DOMPurify en 2 puntos de renderizado, validación de firma real de archivos subidos (no solo `Content-Type`), `trust proxy` configurado explícitamente para que el rate limiting use la IP real del cliente detrás de Render. Autoevaluación completa contra OWASP Top 10 2021 en [`docs/security/owasp-top10.md`](docs/security/owasp-top10.md) — 8/10 categorías cubiertas, 1 parcial (firma de artefactos de build), 1 no aplica todavía (SSRF). |
| **Escalabilidad** | Cubierto, medido con datos reales | Multi-tenant por `organizationId`, indexado en las 13 tablas del esquema para los patrones de consulta reales (ver `apps/backend/prisma/schema.prisma`). Auth stateless (JWT) — el backend no necesita sticky sessions para escalar horizontalmente. Estrategia explícita de crecimiento por etapas (monolito modular → extraer microservicios solo si hay necesidad real de negocio) en [ADR-003](docs/adr/ADR-003-escalabilidad-futura.md). Redis ya provisionado para cuando haga falta cache o rate-limiting distribuido. **Prueba de carga real** (`apps/backend/scripts/load-test.mjs`, [`docs/testing/load-testing.md`](docs/testing/load-testing.md)): 720 req/s sostenidas en la ruta de negocio real (auth + Postgres + cálculo), cero errores incluso a 5x la concurrencia base — el sistema degrada con latencia, nunca se cae. Ese mismo test encontró el pool de conexiones de `pg`/Prisma sin `max` explícito; ya tiene uno (`DATABASE_POOL_MAX`, default 20, `apps/backend/src/prisma/prisma.service.ts`). **Límite honesto:** repetir la prueba de carga para confirmar el efecto del `max` nuevo dio resultados inconclusos por ruido de hardware compartido — falta una corrida limpia (Render u otra máquina sin carga) para tener un número confiable. |
| **Mantenibilidad** | Cubierto | Estructura idiomática de NestJS por dominio (`controller`/`service`/`dto`/`module` en cada uno de los 12 módulos del backend), TypeScript estricto + ESLint + Prettier en ambas apps, 5 ADRs documentando decisiones de arquitectura **incluidas las revertidas** (ej. RBAC descartado y luego reconstruido), `docs/` con 10 subcarpetas temáticas (arquitectura, base de datos, testing, seguridad, observabilidad, API, diagramas, despliegue, gestión, usuario), `CHANGELOG.md` con formato Keep a Changelog, `CONTRIBUTING.md` con convenciones de ramas/commits y checklist de PR. `docs/api/endpoints.md` se genera desde el código (`docs:api:check` en CI bloquea si queda desactualizado, en vez de confiar en que alguien se acuerde de editarlo a mano). |
| **Fiabilidad** | Cubierto | `HttpExceptionFilter` global captura cualquier error no controlado y responde un mensaje genérico consistente (nunca expone detalles internos), con el error real logueado server-side con su `X-Request-Id` para diagnóstico. El logging de auditoría nunca interrumpe el flujo principal si falla (verificado con test dedicado). Reglas de negocio protegen la integridad de datos (una formulación con lotes no se puede borrar, solo archivar; una máquina de estados explícita gobierna el ciclo de vida de un lote). `PrismaService` reintenta con backoff exponencial las **lecturas** que fallan por un error transitorio de conexión (P1001/P1002/P2024) — nunca las escrituras, para no arriesgar duplicar un efecto cuya confirmación se perdió en la red, no la operación en sí. Dos incidentes reales de producción, diagnosticados con causa raíz documentada y resueltos, en [`docs/observability/known-gaps.md`](docs/observability/known-gaps.md) — en vez de solo decir "es confiable", se muestra qué falló y cómo se detectó. |
| **Disponibilidad** | Cubierto, con límite de plan gratuito documentado | `GET /health` (liveness) y `GET /ready` (readiness, con `SELECT 1` real contra Postgres) fuera del prefijo versionado para que un orquestador los consuma sin fricción. Ping de "keep-warm" programado (`.github/workflows/keep-warm.yml`, lunes a viernes 08:00-18:00 hora Bogotá) reduce cold starts en horario de uso real. Backup diario automatizado de Postgres a Cloudflare R2 (`.github/workflows/backup-db.yml`, retención 30 días) — ver [`docs/deployment/backups.md`](docs/deployment/backups.md). **Límite honesto, explícito en los [Términos y condiciones](https://prodexa-iota.vercel.app/legal/terminos) (§7):** el plan gratuito de Render duerme el backend tras inactividad fuera de ese horario (primera petición 50+ segundos), y durante esta fase de pilotaje no se garantiza disponibilidad 24/7 continua — se dice así en vez de prometer una SLA que la infraestructura actual no puede cumplir. |
| **Rendimiento** | Cubierto, medido con datos reales | Índices en todas las columnas de filtro multi-tenant y claves foráneas; `Decimal` (no `Float`) en cálculos financieros para evitar reconciliaciones costosas por error de redondeo; motor de costeo puro y sin estado, espejado en el cliente para vistas de solo lectura sin round-trip al servidor; Sentry muestrea trazas al 10% para no agregar overhead. Con la misma prueba de carga de Escalabilidad: 27 ms de latencia media en la ruta de negocio real a concurrencia normal (720 req/s, 20 conexiones) — sube a 174 ms a 100 conexiones por el cuello de botella del pool de conexiones (ya con `max` explícito desde entonces, efecto aún sin reconfirmar en una corrida limpia), no por el cálculo en sí (`GET /health`, que no toca Postgres, se mantiene igual de rápido a esa misma concurrencia). Detalle en [`docs/testing/load-testing.md`](docs/testing/load-testing.md). |

### Eficiencia y validación

| Atributo | Estado | Evidencia |
|---|---|---|
| **Eficiencia de recursos** | Cubierto, medido con datos reales | Imágenes Docker multi-stage sobre `node:22-alpine` para ambas apps (solo el runtime final se despliega, no las herramientas de build). Tamaño real medido (`docker build` + `docker images`, no estimado): backend 1.13 GB → **896 MB** tras podar devDependencies del `node_modules` copiado al runtime (`npm prune --omit=dev`); frontend ya en 391 MB gracias a `output: 'standalone'` de Next.js, sin cambios necesarios. Detalle en [`docs/deployment/docker.md`](docs/deployment/docker.md). Integraciones opcionales (Sentry, Resend, R2) con patrón fallback-a-no-op: sin la variable de entorno correspondiente, cero llamadas de red — no se paga el costo de una integración que no está en uso. Auth stateless evita un store de sesiones en memoria/DB adicional. |
| **Capacidad de prueba (Testability)** | Cubierto | 286 tests unitarios de backend (Jest, Prisma mockeado) + 29 de integración contra Postgres real (incluye el snapshot real del contrato de la API) + 59 unitarios de frontend (Vitest) + 7 flujos E2E con Playwright y verificación de accesibilidad (`@axe-core/playwright`) — **381 tests en total**, ninguna capa probada solo contra mocks completos. Quality gate real en ambas apps: backend exige ≥95% statements/lines/functions y ≥80% branches (`apps/backend/package.json`); frontend exige ≥90% statements/lines, ≥80% functions y ≥75% branches sobre `src/lib/**` (`apps/frontend/vitest.config.ts`, agregado en agosto de 2026 — antes el frontend no tenía gate y dos módulos, `forecast.ts` y `sugerencias.ts`, tenían 0% de cobertura sin que nada lo bloqueara). `npm run test:cov` falla el build en cualquiera de las dos apps si la cobertura baja de ahí. Detalle en [`docs/testing/`](docs/testing/). |
| **Portabilidad** | Cubierto | Todo el stack corre en contenedores (`docker-compose.yml`: Postgres, Redis, backend, frontend), configuración 100% por variables de entorno (patrón 12-factor), abstracción de almacenamiento que cambia de disco local a Cloudflare R2 solo con env vars (cero cambios de código). No es solo teoría: el proyecto está desplegado hoy en **dos proveedores cloud distintos** (Vercel para el frontend, Render para el backend y la base de datos). |
| **Compatibilidad** | Cubierto | API REST versionada bajo `/api/v1` con documentación OpenAPI viva en `/api/docs` (Swagger), CORS con origin explícito y `credentials: true` (no wildcard), evolución de esquema que preserva integridad referencial hacia atrás (archivar en vez de borrar donde hay historial financiero, `onDelete: SetNull` en vez de `Cascade` donde el dato no debe desaparecer con su referencia). **Política de versionado explícita** en [`docs/api/versioning.md`](docs/api/versioning.md) — qué cuenta como cambio compatible vs incompatible, y qué se haría el día que exista un `v2`. Respaldada por un test real: `apps/backend/test/api-schema.e2e-spec.ts` compara el schema OpenAPI generado en runtime contra un snapshot committeado y falla en CI si el contrato de la API cambia sin que nadie lo haya decidido a propósito. |

### Experiencia y operación

| Atributo | Estado | Evidencia |
|---|---|---|
| **Usabilidad** | Cubierto | Pantallas clave auditadas con `@axe-core/playwright` (WCAG 2.1 AA) en modo claro y oscuro — violaciones de contraste encontradas y corregidas, no solo una revisión visual subjetiva. Sistema de diseño documentado con tokens de color/tipografía consistentes ([`DESIGN.md`](DESIGN.md)). Autoservicio para acciones sensibles (reseteo de contraseña, revocar sesiones, eliminar cuenta/empresa) sin depender de escribirle a soporte. Guía de usuario final con capturas reales de cada pantalla en [`docs/usuario/guia-usuario.md`](docs/usuario/guia-usuario.md). **Límite honesto:** la auditoría de accesibilidad es automatizada (axe-core), no incluye pruebas manuales con lector de pantalla. |
| **Monitoreabilidad (Observabilidad)** | Cubierto, con alcance deliberadamente acotado | Logs JSON estructurados (`pino-http`) con redacción automática de credenciales/cookies, `X-Request-Id` de correlación presente tanto en logs como en el body de cualquier error, `/health`/`/ready` para orquestadores, Sentry (frontend y backend) gateado por DSN. Tabla `AuditLog` dedicada con 16 tipos de evento (login/logout, recuperación de contraseña, cambios de rol, eliminación de cuenta/empresa, etc.) — ver [`docs/observability/audit-log.md`](docs/observability/audit-log.md). **Alerta proactiva real:** `AuditService.notificarSiLoginsFallidosRepetidos()` avisa por correo a los ADMIN de la empresa al cruzar N logins fallidos seguidos (default 5) — ya no hace falta entrar a Auditoría para enterarse. `docs/observability/known-gaps.md` documenta a propósito qué se puede y qué no se puede inferir de un log, incluyendo dos incidentes reales ya resueltos. **Decisión explícita, no un olvido:** Prometheus/Grafana/métricas técnicas de infraestructura se evaluaron y no se construyeron — la escala real del despliegue (una instancia gratuita, sin tráfico de producción significativo) no justifica ese stack todavía; se revisaría si eso cambia. |
| **Cumplimiento legal** | Cubierto | Ver la siguiente sección completa — [Cumplimiento legal y privacidad de datos](#cumplimiento-legal-y-privacidad-de-datos). |

## Cumplimiento legal y privacidad de datos

Prodexa entró en fase de pilotaje con clientes reales el 14 de agosto de 2026, así que estas políticas dejaron de ser un ejercicio de portafolio y pasan a ser parte real del producto.

| Documento | Dónde | Contenido |
|---|---|---|
| **Términos y condiciones** | [`/legal/terminos`](https://prodexa-iota.vercel.app/legal/terminos) ([código](apps/frontend/src/app/legal/terminos/page.tsx)) | Uso aceptable, propiedad de los datos de negocio (son de la organización, no de Prodexa), naturaleza informativa del registro sanitario (Prodexa no certifica ante INVIMA), disponibilidad sin SLA durante el pilotaje, limitación de responsabilidad, ley aplicable (Colombia). |
| **Política de tratamiento de datos personales** | [`/legal/privacidad`](https://prodexa-iota.vercel.app/legal/privacidad) ([código](apps/frontend/src/app/legal/privacidad/page.tsx)) | Alineada a la **Ley 1581 de 2012** (Habeas Data, Colombia), Decreto 1377 de 2013 y Decreto 1074 de 2015: qué datos se recolectan, para qué, a quién se transfieren (Vercel, Render, Resend, Cloudflare R2, Sentry — listados explícitamente como encargados del tratamiento), derechos del titular (conocer, actualizar, rectificar, suprimir, quejarse ante la SIC), y plazos de respuesta (10/15 días hábiles). |
| **Política de conservación y eliminación de datos** | Privacidad, §10 y §8 | Los datos se conservan mientras la cuenta esté activa; al eliminarla se suprimen o anonimizan salvo obligación legal/contractual de conservarlos (ej. logs de auditoría de seguridad ya generados, o datos de negocio que pertenecen a la organización, no al individuo). |
| **Eliminación de datos — mecanismo real, no solo política escrita** | Configuración → Zona de peligro (in-app) | `DELETE /auth/me`: el usuario elimina su propio perfil con su contraseña como confirmación (bloqueado si es el único miembro activo o el único ADMIN, para no dejar un equipo huérfano). `DELETE /organizations`: un ADMIN elimina la empresa completa reescribiendo su nombre exacto — borra la organización, sus usuarios y purga los archivos subidos a R2/disco. Ambas acciones quedan auditadas (`ACCOUNT_DELETED`, `ORGANIZATION_DELETED`); `DELETE /auth/me` está además detrás del mismo rate limiting estricto (5/min) que login/registro. |
| **Divulgación de vulnerabilidades** | [`SECURITY.md`](SECURITY.md) | Canal privado (correo, no issue público) para reportar vulnerabilidades, versiones soportadas, y qué automatización de seguridad ya corre en CI. |
| **Revisión OWASP Top 10** | [`docs/security/owasp-top10.md`](docs/security/owasp-top10.md) | Autoevaluación pública, con hallazgos reales encontrados y resueltos documentados (ej. el XSS almacenado corregido con DOMPurify, ver `CHANGELOG.md` 0.2.1) en vez de una checklist marcada de más. |
| **Licencia** | [`LICENSE`](LICENSE) | MIT. |

**Nota de transparencia, documentada en el comentario de cabecera de cada página legal (código, no visible en el render público):** ambos documentos se redactaron con apoyo de IA (Claude Code) el 14 de agosto de 2026, alineados de buena fe al marco normativo colombiano vigente, y **fueron revisados por asesoría legal externa el 14 de agosto de 2026, que aprobó el texto sin cambios**. Esa aprobación cubre esta versión — cualquier cambio material futuro al tratamiento de datos o a los términos necesita su propia revisión.

## Empezar en local

Requisitos: Node 22+, Docker.

```bash
npm install
npm run db:up             # Postgres + Redis en Docker (localhost:55432 / 6379)
npm run prisma:generate
npm run prisma:migrate
npm run dev                # backend :3000, frontend :3001
```

Documentación interactiva de la API: `http://localhost:3000/api/docs` (Swagger).

### Variables de entorno

| Variable | Dónde | Ejemplo | Para qué |
|---|---|---|---|
| `DATABASE_URL` | raíz, `apps/backend/.env` | `postgresql://prodexa:prodexa@localhost:55432/prodexa` | Conexión a Postgres |
| `BACKEND_PORT` | raíz, `apps/backend/.env` | `3000` | Puerto del backend |
| `CORS_ORIGIN` | raíz, `apps/backend/.env` | `http://localhost:3001` | Origin exacto permitido (cookies cross-origin) |
| `TRUST_PROXY_HOPS` | `apps/backend/.env` | `1` (default) | Cantidad de proxies de confianza delante del backend, para que el rate limiting use la IP real del cliente (Render agrega exactamente uno) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | `apps/backend/.env` | generar con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | Firma de tokens |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL_DAYS` | `apps/backend/.env` | `15m` / `30` | Vida de los tokens |
| `COOKIE_SECURE` | `apps/backend/.env` | `false` en local, `true` en producción | Flag `Secure` de las cookies |
| `UPLOADS_DIR` | `apps/backend/.env` | vacío = `./uploads` | Carpeta de imágenes subidas (editor de preparación); ignorado si las 5 `R2_*` están seteadas |
| `SWAGGER_ENABLED` | `apps/backend/.env` | vacío en producción | `/api/docs` siempre disponible fuera de producción; en producción requiere `true` explícito |
| `SENTRY_DSN` | `apps/backend/.env` | vacío = sin Sentry | Reporta excepciones no controladas del backend; opcional |
| `RESEND_API_KEY` / `MAIL_FROM` | `apps/backend/.env` | vacío = loguea en vez de enviar (desarrollo); **obligatoria en producción** | Envío real del código de recuperación de contraseña |
| `NEXT_PUBLIC_API_URL` | raíz, `apps/frontend/.env.local` | `http://localhost:3000/api/v1` | Base de la API que consume el frontend |
| `NEXT_PUBLIC_SENTRY_DSN` | raíz, `apps/frontend/.env.local` | vacío = sin Sentry | Reporta errores del frontend; opcional |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | raíz `.env` | `prodexa` | Credenciales del contenedor de Postgres |

Copiar cada `.env.example` (raíz, `apps/backend/`, `apps/backend/.env.test.example`, `apps/frontend/`) al archivo real correspondiente antes de arrancar. El Postgres de Docker usa `55432` (no `5432`) para no chocar con una instalación local. Tabla arriba: solo lo esencial para arrancar local — las 5 variables `R2_*` (almacenamiento) y el resto de las opcionales están documentadas con más detalle en cada `.env.example`.

### Docker y scripts

`docker-compose.yml` define 4 servicios — el stack completo corre en contenedores, no solo la base de datos:

| Servicio | Imagen/build | Puerto | Notas |
|---|---|---|---|
| `db` | `postgres:16-alpine` | `55432→5432` | Volumen persistente, healthcheck `pg_isready` |
| `redis` | `redis:7-alpine` | `6379` | Provisionado, no conectado a código todavía |
| `backend` | `apps/backend/Dockerfile` | `3000` | Espera a que `db`/`redis` estén healthy |
| `frontend` | `apps/frontend/Dockerfile` | `3001→3000` | Depende de `backend` |

```bash
npm run compose:up    # levanta los 4 servicios
npm run compose:down
```

Scripts del monorepo (`package.json` raíz):

| Script | Qué hace |
|---|---|
| `npm run dev` | backend + frontend en paralelo (`concurrently`) |
| `npm run build` | build de producción de ambas apps |
| `npm run lint` / `npm run test` | lint / tests de ambas apps |
| `npm run db:up` / `db:down` | solo Postgres + Redis en Docker |
| `npm run prisma:generate` / `prisma:migrate` / `prisma:studio` | cliente Prisma, migraciones, UI de datos |
| `npm run test:coverage` | cobertura del backend (falla si baja del umbral) |
| `npm run badges:update` | regenera los badges de cobertura del README desde el reporte real de Jest |

## Despliegue

**Frontend en [Vercel](https://vercel.com), backend en [Render](https://render.com)**
(Web Service tipo Docker, desde `apps/backend/Dockerfile`), Postgres gestionado por
Render. Detalle completo — variables de entorno de producción, el fix de cookies
cross-site que hizo falta, por qué las migraciones se aplican a mano (no en cada
deploy: el plan Free no soporta migrar + arrancar en un solo comando sin quedarse
sin memoria) y las limitaciones reales del plan gratuito (cold start, uploads no
persistentes) — en
[`docs/deployment/roadmap-despliegue.md`](docs/deployment/roadmap-despliegue.md).

## Testing y cobertura

Pirámide de testing completa, cada nivel corriendo contra algo real (nunca solo mocks):

```bash
npm run test:backend           # backend: 286 unit tests, Jest, contra Prisma mockeado
npm run test:backend:e2e       # backend: 29 tests de integración contra Postgres real (prodexa_test)
npm run test:frontend          # frontend: 59 unit tests, Vitest (lib/costing, lib/format, lib/export, lib/api, lib/calidad, lib/sanitize-html, lib/forecast, lib/sugerencias)
npm run test:frontend:e2e      # frontend: 7 flujos E2E con Playwright + axe-core
npm run test:coverage          # backend con reporte de cobertura (falla si baja de los umbrales, ver abajo)
```

Detalle completo de la estrategia de testing, la convención de specs `_tmp-verify-*.spec.ts` de un solo uso, y qué corre cada workflow de CI en [`docs/testing/`](docs/testing/).

**Quality gate real, no solo aspiracional:** `coverageThreshold` en `apps/backend/package.json` exige >=95% de statements/lines/functions y >=80% de branches. `.github/workflows/test.yml` corre unit + integration/e2e contra un Postgres de servicio + unit tests de frontend en cada push/PR a `main`, además de typecheck y lint en ambas apps y una verificación de que `docs/api/endpoints.md` sigue sincronizado con el código. Antes de eso, un hook de pre-push (husky, `scripts/pre-push-check.sh`) corre lo mismo en local — typecheck, lint, unit, integración y los 7 specs de Playwright reales — para que un push roto se descubra en la propia máquina en vez de en el log de Actions.

## Documentación adicional

| Carpeta | Contenido |
|---|---|
| [`docs/usuario/`](docs/usuario/) | Guía de usuario final, sin jerga técnica, con capturas reales de cada pantalla |
| [`docs/architecture/`](docs/architecture/) | Módulos reales, estructura del monorepo, política de errores |
| [`docs/adr/`](docs/adr/) | Decisiones de arquitectura, incluidas las revertidas |
| [`docs/api/`](docs/api/) | Referencia de endpoints, autenticación, errores, política de versionado/compatibilidad (Swagger vivo en `/api/docs`) |
| [`docs/database/`](docs/database/) | Modelo de datos, decisiones de esquema, migraciones |
| [`docs/diagrams/`](docs/diagrams/) | C4 niveles 1-3, diagrama entidad-relación, despliegue, máquina de estados |
| [`docs/deployment/`](docs/deployment/) | Setup local, Docker, plan de despliegue futuro, [backups de la base de datos](docs/deployment/backups.md) |
| [`docs/testing/`](docs/testing/) | Estrategia de testing y CI |
| [`docs/security/`](docs/security/) | Revisión OWASP Top 10, honesta y con pendientes explícitos |
| [`docs/observability/`](docs/observability/) | Logging, health checks, huecos conocidos |
| [`docs/gestion/`](docs/gestion/) | Visión y alcance, backlog inicial, gobernanza técnica, milestones |
| [`DESIGN.md`](DESIGN.md) / [`PRODUCT.md`](PRODUCT.md) | Sistema de diseño (paleta, tipografía, modos) y propuesta de producto (usuarios, posicionamiento) |

## FAQ y soporte

**¿Por qué Redis está en `docker-compose.yml` pero no se usa?** Está provisionado para cuando haga falta cache o rate-limiting distribuido; conectarlo sin un caso de uso real habría sido complejidad especulativa.

**¿Hay RBAC?** Sí — `ADMIN`, `COORDINADOR` y `MIEMBRO` por organización. Se descartó al principio y se construyó después; la decisión completa está en [ADR-005](docs/adr/ADR-005-rbac-organizaciones-multiusuario.md).

**¿Puedo eliminar mis datos?** Sí, en cualquier momento y sin escribirle a nadie: Configuración → Zona de peligro, con tu contraseña como confirmación. Detalle completo en [Cumplimiento legal y privacidad de datos](#cumplimiento-legal-y-privacidad-de-datos) y en la [Política de tratamiento de datos personales](https://prodexa-iota.vercel.app/legal/privacidad).

**¿Cómo reporto un bug?** Abre un issue con la plantilla de [`.github/ISSUE_TEMPLATE/bug_report.md`](.github/ISSUE_TEMPLATE/bug_report.md).

**¿Cómo reporto una vulnerabilidad de seguridad?** No la reportes como issue público — sigue el proceso de [`SECURITY.md`](SECURITY.md).

**¿Cómo contribuyo?** Ver [`CONTRIBUTING.md`](CONTRIBUTING.md) (setup, convenciones de ramas/commits, checklist de PR).

## Licencia

MIT — ver [`LICENSE`](LICENSE).

## Autor

**Tomás Posada** — [tomasposada67@gmail.com](mailto:tomasposada67@gmail.com)
