# CI

Dos workflows de GitHub Actions, ambos en `main` (push y PR):

## `.github/workflows/test.yml`

| Job | Qué hace |
|---|---|
| `backend` | `npx tsc --noEmit`, `npx eslint src`, `npm run test:cov` (falla si la cobertura baja del umbral) |
| `backend-integration` | Levanta un Postgres 16 de servicio, aplica migraciones (`prisma migrate deploy`), corre `npm run test:e2e` |
| `frontend` | Typecheck, lint, `npm run test:cov` |
| `frontend-e2e` | Levanta Postgres de servicio + backend y frontend reales en background dentro del job, y corre los 6 specs de Playwright (`npx playwright test`) contra ellos. Sube `AUTH_THROTTLE_LIMIT=1000` solo en este job para que la suite completa no choque con el límite real de 5/min (ver `docs/testing/e2e.md`). Sube el reporte de Playwright y los logs como artifact si algo falla. |

## `.github/workflows/security.yml`

| Job | Qué hace |
|---|---|
| `secret-scan` | `gitleaks/gitleaks-action` sobre todo el historial (`fetch-depth: 0`) |
| `dependency-audit` | `npm audit --audit-level=high`, matrix backend/frontend |

Corre en push/PR a `main` **y** semanalmente (cron), para detectar vulnerabilidades
nuevas en dependencias que ya estaban instaladas, no solo en cada cambio de código.

## Dependabot

`.github/dependabot.yml`: actualizaciones semanales de npm para `apps/backend`,
`apps/frontend`, y de las propias GitHub Actions usadas en los workflows.

## Branch protection

Activado en GitHub (Rulesets → `main`): PR obligatorio, status checks requeridos
(`Backend (unit tests + cobertura >= 95%)`, `Backend (integration/e2e contra Postgres
real)`, `Frontend (typecheck + lint + unit tests)`), borrado y force-push bloqueados,
con el rol de administrador en la lista de bypass para poder seguir iterando directo
sin depender de un PR en cada cambio. **Pendiente**: agregar `Frontend (E2E,
Playwright)` (el job `frontend-e2e`, agregado después de configurar el ruleset) a la
lista de checks requeridos — mismo lugar en GitHub, paso manual.
