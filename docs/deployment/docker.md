# Docker (stack completo, local)

`docker-compose.yml` (raíz del repo) define 4 servicios — **no es solo la base de
datos**, el stack completo es buildable y corrible en contenedores hoy mismo, en local:

| Servicio | Imagen / build | Puerto host | Depende de |
|---|---|---|---|
| `db` | `postgres:16-alpine` | `55432→5432` | — |
| `redis` | `redis:7-alpine` | `6379→6379` | — |
| `backend` | build de `apps/backend/Dockerfile` | `3000→3000` | `db` y `redis` healthy |
| `frontend` | build de `apps/frontend/Dockerfile` | `3001→3000` | `backend` |

```bash
npm run compose:up     # levanta los 4 servicios
npm run compose:down
```

Ambos Dockerfiles existen y son multi-stage (`apps/backend/Dockerfile`,
`apps/frontend/Dockerfile`) — se puede construir y correr la aplicación completa sin
tener Node instalado en el host, solo Docker.

## Por qué `55432` y no `5432`

El Postgres de Docker se expone en `55432` para no chocar con una instalación local de
PostgreSQL que ya esté usando el puerto estándar — ver `docker-compose.yml` y
`.env.example`.

## Redis: provisionado, no conectado

`redis` está en el compose y tiene su propio healthcheck, pero ningún código del
backend o frontend lo usa todavía — no hay cliente de Redis en ninguna dependencia. Se
documenta así en vez de aparentar que ya cumple una función (cache, rate-limiting
distribuido) que hoy no cumple.

## Esto no es lo mismo que "el despliegue real"

Este stack de Docker Compose corre **en local**, en la máquina de quien lo levanta —
distinto del despliegue real en Vercel + Render, que reutiliza `apps/backend/Dockerfile`
tal cual pero no corre `docker-compose.yml` en absoluto (Render construye la imagen
directo desde el Dockerfile, Vercel ni siquiera usa Docker). Ver
[`docs/deployment/roadmap-despliegue.md`](roadmap-despliegue.md) para el estado real de
producción.
