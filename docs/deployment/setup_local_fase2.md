# Setup local - Fase 2

## Requisitos
- Node.js 22+
- npm 11+
- Docker Desktop (para Postgres y Redis)

## Variables de entorno
1. Copiar `.env.example` a `.env` en la raiz.
2. Copiar `apps/backend/.env.example` a `apps/backend/.env`.
3. Copiar `apps/frontend/.env.example` a `apps/frontend/.env.local`.

Nota: El Postgres de Docker usa el puerto `55432` para evitar conflictos con instalaciones locales de PostgreSQL.

## Levantar servicios de datos
```bash
npm run db:up
```

## Generar cliente Prisma y aplicar migraciones
```bash
npm run prisma:generate
npm run prisma:migrate
```

## Levantar entorno de desarrollo
```bash
npm run dev
```

## Endpoints base
- Backend health: `http://localhost:3000/api/v1`
- Frontend: `http://localhost:3001`
- Endpoints de formulaciones: `http://localhost:3000/api/v1/formulations`

## Nota de operacion
Si Docker no esta iniciado, los comandos de base de datos fallaran. Iniciar Docker Desktop antes de ejecutar `db:up` y migraciones.
