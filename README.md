<p align="center">
  <b>Prodexa</b><br>
  <i>Plataforma de costeo, producción y rentabilidad para fabricantes de alimentos y cosméticos</i>
</p>

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
  <br/>
  <img src="https://img.shields.io/badge/JWT-black?logo=jsonwebtokens&logoColor=white" />
  <img src="https://img.shields.io/badge/Argon2-password_hashing-black" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/GitHub_Actions-CI%2FCD-2088FF?logo=githubactions&logoColor=white" />
  <img src="https://img.shields.io/badge/Jest-unit_tests-C21325?logo=jest&logoColor=white" />
  <img src="https://img.shields.io/badge/Vitest-unit_tests-6E9F18?logo=vitest&logoColor=white" />
  <img src="https://img.shields.io/badge/Playwright-E2E-2EAD33?logo=playwright&logoColor=white" />
  <img src="https://img.shields.io/badge/ESLint-4B32C3?logo=eslint&logoColor=white" />
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" />
  <img src="https://img.shields.io/badge/tests-292%20passing-brightgreen" />
</p>

<div align="center">

| Statements                  | Branches                | Functions                 | Lines             |
| :---------------------------: | :----------------------: | :-------------------------: | :------------------: |
| ![Statements](https://img.shields.io/badge/statements-99.7%25-brightgreen.svg?style=flat) | ![Branches](https://img.shields.io/badge/branches-88.39%25-yellow.svg?style=flat) | ![Functions](https://img.shields.io/badge/functions-99.32%25-brightgreen.svg?style=flat) | ![Lines](https://img.shields.io/badge/lines-99.68%25-brightgreen.svg?style=flat) |

</div>

---

## Índice

- [Qué problema resuelve](#qué-problema-resuelve)
- [Demo](#demo)
- [Recorrido por la aplicación](#recorrido-por-la-aplicación)
- [Arquitectura](#arquitectura)
- [Stack técnico](#stack-técnico)
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

El proyecto tiene un predecesor real: `legacy/desktop-v1/` es la calculadora de escritorio en Python con la que arrancó esta idea (un solo archivo, sin persistencia real, sin multiusuario). Prodexa es su reemplazo completo.

## Demo

**En vivo**: [prodexa-iota.vercel.app](https://prodexa-iota.vercel.app) (frontend en
Vercel, API en Render — el backend gratuito se duerme tras inactividad, la primera
petición puede tardar 50+ segundos en despertar).

![Demo de Prodexa](docs/demo/prodexa-demo.gif)

*(Registro → crear formulación → analizar costos → registrar el lote → avanzarlo por control de calidad → auditoría, sesiones activas, proveedores y cartera por cobrar. Grabado en local con un script de Playwright propio — ver [`apps/frontend/scripts/record-demo.mjs`](apps/frontend/scripts/record-demo.mjs), `npm run demo:record` para volver a generarlo.)*

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
| **Configuración** | Perfil, margen por defecto, cambio de contraseña, tarifas de producción de la empresa, **sesiones activas** (ver y revocar cada dispositivo con sesión iniciada) y gestión de equipo (roles, invitaciones). |
| **Auditoría** | Bitácora de seguridad y de negocio: login/logout/registro, cambios de rol, remoción de miembros, cambios de precio, ediciones de formulación y de tarifas — cada evento con su detalle específico visible en la tabla. Solo ADMIN. |

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
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Framer Motion |
| Backend | NestJS 11, Prisma 7 (driver adapter `@prisma/adapter-pg`), class-validator |
| Datos | PostgreSQL 16 |
| Auth | JWT (access 15 min) + refresh token opaco rotatorio, Argon2, cookies httpOnly, RBAC por organización |
| Observabilidad | pino-http (logs JSON estructurados + correlation id), `/health` y `/ready` |
| Calidad | Jest (backend), Playwright + axe-core (E2E y accesibilidad, frontend) |
| CI | GitHub Actions: tests + typecheck + lint + quality gate de cobertura (`test.yml`), gitleaks, `npm audit`, Dependabot (`security.yml`) |

> Redis está provisionado en `docker-compose.yml` para cuando se necesite cache o un store de rate-limiting distribuido, pero hoy no está conectado a ningún código — se documenta así en vez de aparentar que ya se usa.

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
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | `apps/backend/.env` | generar con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | Firma de tokens |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL_DAYS` | `apps/backend/.env` | `15m` / `30` | Vida de los tokens |
| `COOKIE_SECURE` | `apps/backend/.env` | `false` en local, `true` en producción | Flag `Secure` de las cookies |
| `UPLOADS_DIR` | `apps/backend/.env` | vacío = `./uploads` | Carpeta de imágenes subidas (editor de preparación) |
| `NEXT_PUBLIC_API_URL` | raíz, `apps/frontend/.env.local` | `http://localhost:3000/api/v1` | Base de la API que consume el frontend |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | raíz `.env` | `prodexa` | Credenciales del contenedor de Postgres |

Copiar cada `.env.example` (raíz, `apps/backend/`, `apps/backend/.env.test.example`, `apps/frontend/`) al archivo real correspondiente antes de arrancar. El Postgres de Docker usa `55432` (no `5432`) para no chocar con una instalación local.

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
cross-site que hizo falta, migraciones en cada deploy, y las limitaciones reales del
plan gratuito (cold start, uploads no persistentes) — en
[`docs/deployment/roadmap-despliegue.md`](docs/deployment/roadmap-despliegue.md).

## Testing y cobertura

Pirámide de testing completa, cada nivel corriendo contra algo real (nunca solo mocks):

```bash
npm run test:backend           # backend: 217 unit tests, Jest, contra Prisma mockeado
npm run test:backend:e2e       # backend: 27 tests de integración contra Postgres real (prodexa_test)
npm run test:frontend          # frontend: 42 unit tests, Vitest (lib/costing, lib/format, lib/export, lib/api, lib/calidad, lib/sanitize-html)
npm run test:frontend:e2e      # frontend: 6 flujos E2E con Playwright + axe-core
npm run test:coverage          # backend con reporte de cobertura (falla si baja de los umbrales, ver abajo)
```

Detalle completo de la estrategia de testing, la convención de specs `_tmp-verify-*.spec.ts` de un solo uso, y qué corre cada workflow de CI en [`docs/testing/`](docs/testing/).

**Quality gate real, no solo aspiracional:** `coverageThreshold` en `apps/backend/package.json` exige >=95% de statements/lines/functions y >=80% de branches. `.github/workflows/test.yml` corre unit + integration/e2e contra un Postgres de servicio + unit tests de frontend en cada push/PR a `main`, además de typecheck y lint en ambas apps.

## Documentación adicional

| Carpeta | Contenido |
|---|---|
| [`docs/usuario/`](docs/usuario/) | Guía de usuario final, sin jerga técnica, con capturas reales de cada pantalla |
| [`docs/architecture/`](docs/architecture/) | Módulos reales, estructura del monorepo, política de errores |
| [`docs/adr/`](docs/adr/) | Decisiones de arquitectura, incluidas las revertidas |
| [`docs/api/`](docs/api/) | Referencia de endpoints, autenticación, errores (Swagger vivo en `/api/docs`) |
| [`docs/database/`](docs/database/) | Modelo de datos, decisiones de esquema, migraciones |
| [`docs/diagrams/`](docs/diagrams/) | C4 niveles 1-3, diagrama entidad-relación, despliegue, máquina de estados |
| [`docs/deployment/`](docs/deployment/) | Setup local, Docker, plan de despliegue futuro |
| [`docs/testing/`](docs/testing/) | Estrategia de testing y CI |
| [`docs/security/`](docs/security/) | Revisión OWASP Top 10, honesta y con pendientes explícitos |
| [`docs/observability/`](docs/observability/) | Logging, health checks, huecos conocidos |

## FAQ y soporte

**¿Por qué Redis está en `docker-compose.yml` pero no se usa?** Está provisionado para cuando haga falta cache o rate-limiting distribuido; conectarlo sin un caso de uso real habría sido complejidad especulativa.

**¿Hay RBAC?** Sí — `ADMIN`, `COORDINADOR` y `MIEMBRO` por organización. Se descartó al principio y se construyó después; la decisión completa está en [ADR-005](docs/adr/ADR-005-rbac-organizaciones-multiusuario.md).

**¿Cómo reporto un bug?** Abre un issue con la plantilla de [`.github/ISSUE_TEMPLATE/bug_report.md`](.github/ISSUE_TEMPLATE/bug_report.md).

**¿Cómo reporto una vulnerabilidad de seguridad?** No la reportes como issue público — sigue el proceso de [`SECURITY.md`](SECURITY.md).

**¿Cómo contribuyo?** Ver [`CONTRIBUTING.md`](CONTRIBUTING.md) (setup, convenciones de ramas/commits, checklist de PR).

## Licencia

MIT — ver [`LICENSE`](LICENSE).

## Autor

**Tomás Posada** — [tomasposada67@gmail.com](mailto:tomasposada67@gmail.com)
