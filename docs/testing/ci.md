# CI

Dos workflows de GitHub Actions, ambos en `main` (push y PR):

## `.github/workflows/test.yml`

| Job | Qué hace |
|---|---|
| `backend` | `npx tsc --noEmit`, `npx eslint src`, `npm run test:cov` (falla si la cobertura baja del umbral) |
| `backend-integration` | Levanta un Postgres 16 de servicio, aplica migraciones (`prisma migrate deploy`), corre `npm run test:e2e` |
| `frontend` | Typecheck, lint, `npm run test:cov` |

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

## Lo único que falta para que esto bloquee un merge de verdad

`.github/workflows/test.yml` corre en cada push/PR, pero nada en el repo obliga a que
pase para poder mergear — falta activar **"Require status checks to pass"** en la
configuración de protección de rama de GitHub (Settings → Branches). Es un paso de
configuración del repositorio, no de código.
