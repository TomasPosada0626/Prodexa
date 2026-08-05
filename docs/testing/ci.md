# CI

Dos capas: un hook local que corre antes de dejar hacer `git push`, y dos workflows
de GitHub Actions que corren después, ya en el remoto.

## Hook de pre-push (local, `.husky/pre-push`)

Nació de un caso real: un locator ambiguo en un spec de Playwright pasó todas las
verificaciones locales que sí se corrían a mano (tsc, eslint, tests unitarios) y
solo salió rojo cuando CI corrió la suite en un navegador real. `scripts/pre-push-check.sh`
corre, en este orden, antes de que git transmita nada al remoto:

| Paso | Qué hace |
|---|---|
| 1-2 | Backend: `tsc --noEmit`, `eslint src` |
| 3 | Backend: `test:cov` (unitarios, con cobertura) |
| 4 | Backend: `test:e2e` contra Postgres real (requiere que esté arriba en `localhost:55432`) |
| 5-6 | Frontend: `tsc --noEmit`, `eslint src`, `test:cov` |
| 7 | Frontend: los 7 specs de Playwright reales — build real (`next build`) + `next start` (no `next dev`, que tiene un lock de una sola instancia por carpeta) contra un backend recién levantado en un puerto propio (3900/3901, para no chocar con un `npm run dev` que ya esté corriendo) |

Si cualquier paso falla, el push se cancela ahí — nada se sube. Escape hatch para
cuando hace falta pushear sin la parte de Playwright (ej. Postgres no está arriba,
o la máquina no tiene memoria libre para el ciclo de build+navegador):

```bash
SKIP_E2E_PLAYWRIGHT=1 git push
```

Los pasos 1-6 se siguen corriendo igual — el skip es solo del paso 7. `.gitattributes`
fuerza LF en `.husky/*` y `scripts/*.sh`: con CRLF (el default de git en Windows) el
shebang queda inválido y el hook falla en silencio en un clon fresco.

## `.github/workflows/test.yml`

| Job | Qué hace |
|---|---|
| `backend` | `npx tsc --noEmit`, `npx eslint src`, `npm run test:cov` (falla si la cobertura baja del umbral) |
| `backend-integration` | Levanta un Postgres 16 de servicio, aplica migraciones (`prisma migrate deploy`), corre `npm run test:e2e` |
| `frontend` | Typecheck, lint, `npm run test:cov` |
| `frontend-e2e` | Levanta Postgres de servicio + backend y frontend reales en background dentro del job, y corre los 7 specs de Playwright (`npx playwright test`) contra ellos. Sube `AUTH_THROTTLE_LIMIT=1000` solo en este job para que la suite completa no choque con el límite real de 5/min (ver `docs/testing/e2e.md`). Sube el reporte de Playwright y los logs (incluido `backend.log`, que `recuperar-contrasena.spec.ts` necesita para leer el código de recuperación) como artifact si algo falla. |

## `.github/workflows/security.yml`

| Job | Qué hace |
|---|---|
| `secret-scan` | `gitleaks/gitleaks-action` sobre todo el historial (`fetch-depth: 0`) |
| `dependency-audit` | `npm audit --audit-level=high --omit=dev`, matrix backend/frontend — se excluyen devDependencies a proposito, ver `docs/security/owasp-top10.md` A06 |

Corre en push/PR a `main` **y** semanalmente (cron), para detectar vulnerabilidades
nuevas en dependencias que ya estaban instaladas, no solo en cada cambio de código.

## Dependabot

`.github/dependabot.yml`: actualizaciones semanales de npm para `apps/backend`,
`apps/frontend`, y de las propias GitHub Actions usadas en los workflows. Las
actualizaciones minor/patch de cada ecosistema se agrupan en una sola PR
(`groups: minor-and-patch`) para no acumular una PR por paquete; los bumps de
major siguen llegando aislados, ya que ahí sí vale la pena revisar cada uno
(precedente: la migración de eslint 9→10 se evaluó a mano, no se automatizó).

## Branch protection

Activado en GitHub (Rulesets → `main`): PR obligatorio, los 4 jobs de `test.yml` como
status checks requeridos (`Backend (unit tests + cobertura >= 95%)`, `Backend
(integration/e2e contra Postgres real)`, `Frontend (typecheck + lint + unit tests)`,
`Frontend (E2E, Playwright)`), borrado y force-push bloqueados, con el rol de
administrador en la lista de bypass para poder seguir iterando directo sin depender
de un PR en cada cambio.
