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

## Tamaño de las imágenes

Medido de verdad (`docker build` + `docker images`), no estimado — el ítem 1.5 de
[`roadmap-calidad-90.md`](../gestion/roadmap-calidad-90.md) pedía exactamente esto.

### Backend

| | Tamaño | `node_modules` |
|---|---:|---:|
| Antes | 1.13 GB | 749 MB |
| Después | **896 MB** | 540 MB |

**Por qué pesaba tanto:** el runtime copiaba `node_modules` completo desde el stage de
build (`COPY --from=build /app/node_modules ./node_modules`), que a su vez lo había
heredado del stage `deps` — y `deps` corre `npm ci` sin `--omit=dev`, así que el
`node_modules` completo incluía **todas las devDependencies**: `eslint`, `jest`,
`typescript`, `ts-node`, `ts-loader`, `@nestjs/cli`, `@nestjs/testing`, `prisma` (el CLI,
no `@prisma/client`), `autocannon`, `prettier`, `supertest`, etc. — todo lo necesario para
compilar, nada de lo necesario para correr `node dist/src/main.js`.

**Arreglo aplicado:** una línea en `apps/backend/Dockerfile`, `RUN npm prune --omit=dev`
al final del stage de build, antes de que el runtime copie `node_modules`. Reduce el
`node_modules` copiado en 209 MB (749 MB → 540 MB) y el total de la imagen en 234 MB
(1.13 GB → 896 MB) — verificado que el backend sigue arrancando y respondiendo `/health`
igual después del cambio.

**Por qué no baja más:** los 540 MB restantes de `node_modules` son en su mayoría
dependencias de producción reales, no grasa — sobre todo los binarios del motor de
consultas de `@prisma/client` (Prisma no genera un binario liviano; empaqueta el motor
real de Rust) y `@aws-sdk/client-s3`. Reducir esto más allá requeriría cambiar de
estrategia (ej. el `output` "standalone" no aplica igual a NestJS que a Next.js, o fijar
`binaryTargets` de Prisma a un solo target en vez del set por defecto) — no es el mismo
tipo de arreglo de una línea que el prune de devDependencies, así que queda fuera del
alcance de este ítem.

### Frontend

| | Tamaño |
|---|---:|
| Total | **391 MB** |

El Dockerfile del frontend (`apps/frontend/Dockerfile`) ya usa Next.js
[`output: 'standalone'`](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
en su stage de build, que solo copia el subconjunto de `node_modules` que la app
realmente necesita en producción (no el árbol completo con devDependencies) — por eso no
tiene el mismo problema que tenía el backend antes de este arreglo, y no se le aplicó
ningún cambio.

### Metodología

```bash
# Desde la raiz del repo:
docker build -f apps/backend/Dockerfile -t prodexa-backend:size-check .
docker build -f apps/frontend/Dockerfile -t prodexa-frontend:size-check .
docker images prodexa-backend:size-check --format "{{.Size}}"
docker images prodexa-frontend:size-check --format "{{.Size}}"

# Para ver que capa pesa mas (ej. confirmar el efecto de un cambio en el Dockerfile):
docker history prodexa-backend:size-check --no-trunc --format "{{.Size}}\t{{.CreatedBy}}"
```

Medido en una máquina de desarrollo compartida (Windows, Docker Desktop) — un intento
anterior falló por timeout de red con la máquina saturada por contenedores de otro
proyecto corriendo en paralelo; los números de esta página se midieron en una corrida
limpia. Los tamaños reales en el registry de Render pueden variar levemente por la
arquitectura del runner de build, pero el orden de magnitud y el efecto relativo del
`npm prune` son representativos.
