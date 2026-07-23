# Diagrama de despliegue

Dos escenarios, claramente separados: lo que corre hoy y lo que está planeado.

## Hoy: local, vía Docker Compose

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

## Planeado (Fase 8, no construido)

```mermaid
flowchart LR
    U["Usuario final"] --> V["Vercel<br/>(frontend Next.js)"]
    V --> R["Railway / Render<br/>(backend NestJS,<br/>Dockerfile existente)"]
    R --> N["Neon / Railway Postgres<br/>(base de datos gestionada)"]
```

**Nada de este segundo diagrama existe todavía** — no hay ambiente de staging ni de
producción desplegado. Ver el detalle de qué falta en
[`docs/deployment/roadmap-despliegue.md`](../deployment/roadmap-despliegue.md).
