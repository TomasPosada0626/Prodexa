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
