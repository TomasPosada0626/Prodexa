# Observabilidad

## Logging estructurado

`pino-http` (`apps/backend/src/common/logger/pino.config.ts`) — logs JSON, no texto
plano, listos para un agregador (Loki, CloudWatch, Datadog) el día que exista uno.
Redacta automáticamente credenciales y cookies antes de loguear.

## Correlation id

Cada request lleva un `X-Request-Id`: se reutiliza si el cliente ya lo manda, se
genera si no. Aparece en los logs **y** en el body de cualquier response de error —
un reporte de bug se rastrea con ese id sin tener que adivinar cuál request fue.

## Health checks

| Endpoint | Tipo | Qué valida |
|---|---|---|
| `GET /health` | Liveness | Nada externo — si responde, el proceso está vivo |
| `GET /ready` | Readiness | `SELECT 1` real contra Postgres; 503 si falla |

Ambos quedan **fuera** del prefijo `/api/v1` a propósito: un orquestador los golpea
sin conocer la versión del API.

## Error tracking (Sentry)

Backend (`@sentry/nestjs`, `apps/backend/src/instrument.ts`, importado primero en
`main.ts`) y frontend (`instrumentation-client.ts`, `sentry.server.config.ts`,
`sentry.edge.config.ts`, `instrumentation.ts`, `app/global-error.tsx`) reportan
excepciones no capturadas a Sentry. Ambos gatean en la variable de entorno del DSN
(`SENTRY_DSN` en el backend, `NEXT_PUBLIC_SENTRY_DSN` en el frontend): sin DSN
configurado, `Sentry.init()` nunca se llama — cero llamadas de red, cero overhead, es
el mismo patrón de fallback-a-no-op ya usado para `RESEND_API_KEY` y las variables de
R2. El backend samplea trazas al 10% (`tracesSampleRate: 0.1`); no hay session replay
ni profiling habilitados.

## Qué está deliberadamente fuera de alcance

Prometheus, Grafana, métricas técnicas de infraestructura y alertas automáticas se
evaluaron y se decidió no construirlos. El proyecto ya tiene un ambiente desplegado
real (ver [`docs/deployment/roadmap-despliegue.md`](../deployment/roadmap-despliegue.md)),
pero sigue siendo una sola instancia gratuita en Render, sin tráfico real que
justifique un stack de monitoreo dedicado — sería infraestructura sin nada real que
monitorear. `/health` y `/ready` ya cubren lo que un orquestador necesita para saber
si el servicio está arriba; esto se revisaría si el proyecto pasara a tener carga o
usuarios reales.

## Huecos conocidos

Ver [`known-gaps.md`](known-gaps.md).
