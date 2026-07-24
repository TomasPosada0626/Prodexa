# Diagrama de despliegue

Dos escenarios reales: desarrollo local y producción.

## Local, vía Docker Compose

```mermaid
flowchart TB
    subgraph "Máquina local (Docker Compose)"
        FE["frontend<br/>:3001"]
        API["backend<br/>:3000"]
        PG[("postgres:16-alpine<br/>:55432")]
        REDIS[("redis:7-alpine<br/>:6379<br/>(no conectado)")]

        FE --> API
        API --> PG
        API -.-> REDIS
    end

    DEV["Navegador del desarrollador"] --> FE
```

Un solo comando (`npm run compose:up`) levanta los 4 contenedores. Detalle completo:
[`docs/deployment/docker.md`](../deployment/docker.md).

## Producción: Vercel + Render

```mermaid
flowchart LR
    U["Usuario final"] --> V["Vercel<br/>(frontend Next.js, build nativo)"]
    V -- "fetch credentials:include<br/>CORS + cookies SameSite=None" --> R["Render<br/>(backend NestJS,<br/>Web Service Docker desde<br/>apps/backend/Dockerfile)"]
    R --> N["Postgres gestionado de Render<br/>(misma region: Oregon)"]
```

Sin ambiente de staging separado — un solo entorno de producción, razonable para el
tamaño actual del proyecto. Variables de entorno, el fix de cookies cross-site
necesario para que esto funcione, migraciones en cada deploy y las limitaciones reales
del plan gratuito en
[`docs/deployment/roadmap-despliegue.md`](../deployment/roadmap-despliegue.md).
