# Política de errores

> La taxonomía de códigos de error propuesta en el diseño inicial (`DOMAIN_VALIDATION_
> ERROR`, `APPLICATION_RULE_ERROR`, etc.) se simplificó en la implementación a favor de
> lo que NestJS ya resuelve bien de forma nativa. Esto es lo que hace
> `HttpExceptionFilter` (`apps/backend/src/common/filters/http-exception.filter.ts`) hoy.

## Estructura real del error

```json
{
  "code": "HTTP_ERROR",
  "message": "Credenciales invalidas.",
  "path": "/api/v1/auth/login",
  "requestId": "a3f2c1...",
  "timestamp": "2026-07-23T10:00:00.000Z"
}
```

- `code` solo tiene dos valores posibles: `HTTP_ERROR` (cualquier `HttpException` de
  Nest — 400/401/403/404/409, etc., con el `message` real de esa excepción, que para
  errores de validación de `class-validator` es un string o un array de strings por
  campo) o `INTERNAL_SERVER_ERROR` (cualquier otra cosa, ver el hueco de abajo).
- `requestId` es el mismo `X-Request-Id` que asigna `pino-http` (se reutiliza si el
  cliente ya lo manda, se genera si no) — el mismo id aparece en los logs
  estructurados, así un reporte de bug se puede rastrear exactamente sin adivinar.
- No hay campo `details`: el `message` de la excepción es la única información
  adicional que se expone al cliente.

## Hueco conocido: los errores no-HTTP (500) no loguean su causa real

Cuando `exception` no es una `HttpException` (ej. una excepción de Prisma, un error de
red, un `undefined` inesperado), el filtro responde siempre el mismo mensaje genérico
("Error interno del servidor") **sin loguear en ningún lado cuál fue la excepción
real**. Esto se descubrió de la peor forma posible durante esta misma fase de trabajo:
Docker Desktop se cayó, Postgres quedó inalcanzable, y el único síntoma visible era un
500 genérico e indistinguible de un bug real de la aplicación — hubo que agregar
temporalmente un `console.error` de depuración para encontrar la causa real
(`ECONNREFUSED`), y luego revertirlo. Detalle completo, con la recomendación de qué
hacer al respecto, en
[`docs/observability/known-gaps.md`](../observability/known-gaps.md).

## Reglas que sí se cumplen

- No se expone stacktrace en ninguna respuesta, nunca (ni en errores HTTP ni en 500).
- `ValidationPipe` global (`whitelist: true`, `forbidNonWhitelisted: true`) rechaza
  cualquier campo no declarado en el DTO antes de llegar a la capa de negocio.
- Los errores de validación de `class-validator` indican el campo afectado en su
  mensaje (comportamiento por defecto de Nest, no un campo `details` custom).
