# ADR-002 Stack tecnologico

## Estado
Aprobado

## Contexto
Se necesita stack moderno, mantenible, con buena experiencia de desarrollo y escalabilidad.

## Decision
- Frontend: Next.js + TypeScript.
- Backend: NestJS + TypeScript.
- Base de datos: PostgreSQL + Prisma.
- Cache/colas: Redis + BullMQ.
- Contenedores: Docker + Docker Compose.

## Consecuencias
- Positivas: productividad alta, tipado fuerte, estandares empresariales.
- Negativas: curva de aprendizaje inicial.
- Mitigacion: documentacion por capas y plantillas de modulo.
