# C4 — Nivel 2: Contenedores

Los bloques desplegables que componen Prodexa y cómo se comunican. Versión completa
del diagrama simplificado del [README](../../README.md).

```mermaid
flowchart LR
    subgraph Usuario
        Browser["Navegador"]
    end

    subgraph "Contenedor: Frontend"
        FE["Next.js 16 (App Router)<br/>React 19 + Tailwind v4<br/>Puerto 3001"]
    end

    subgraph "Contenedor: Backend"
        API["NestJS 11<br/>REST + Swagger<br/>Puerto 3000, prefijo /api/v1"]
    end

    subgraph "Contenedor: Datos"
        PG[("PostgreSQL 16<br/>via Prisma 7<br/>Puerto 55432")]
        REDIS[("Redis 7<br/>provisionado, no conectado<br/>Puerto 6379")]
    end

    Browser -- "HTTPS" --> FE
    FE -- "fetch credentials:include" --> API
    API -- "Prisma Client" --> PG
    API -. "sin cliente de Redis en el código" .-> REDIS
```

## Qué corre en cada contenedor

- **Frontend**: solo cliente — no tiene API routes propias ni lógica de servidor más
  allá de lo que Next.js necesita para renderizar. Todo el estado remoto viene del
  backend.
- **Backend**: único proceso NestJS. Todos los módulos (`auth`, `organizations`,
  `formulations`, `production`, `suppliers`, `audit`, `simulation`, `uploads`,
  `health`) corren en el mismo proceso — ver
  [Nivel 3](c4-nivel3-componentes.md) para su descomposición interna.
- **PostgreSQL**: única fuente de verdad persistente.
- **Redis**: contenedor levantado y con healthcheck en `docker-compose.yml`, pero sin
  ningún cliente de Redis en las dependencias del proyecto — ver
  [`docs/deployment/docker.md`](../deployment/docker.md).
