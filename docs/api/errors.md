# Errores (referencia de API)

Ver [`docs/architecture/politica_errores.md`](../architecture/politica_errores.md)
para la explicación completa (incluido el hueco conocido de los 500 sin detalle
logueado) — este archivo es la versión corta orientada a quien consume la API.

## Sobre de error

```json
{
  "code": "HTTP_ERROR",
  "message": "Credenciales invalidas.",
  "path": "/api/v1/auth/login",
  "requestId": "a3f2c1...",
  "timestamp": "2026-07-23T10:00:00.000Z"
}
```

## Códigos HTTP que puede devolver la API

| Status | Cuándo |
|---|---|
| 400 | Body inválido (`class-validator`), regla de negocio violada (ej. borrar una formulación con lotes) |
| 401 | Sin sesión, o credenciales inválidas en login |
| 403 | Autenticado pero sin el rol requerido (`RolesGuard`) |
| 404 | Recurso inexistente **o de otra organización** — nunca 403 en ese segundo caso, para no confirmar que el recurso existe |
| 409 | Conflicto (ej. email ya registrado, nombre de proveedor duplicado en la misma organización) |
| 429 | Rate limit — 60/min global, 5/min en `/auth/login` y `/auth/register` |
| 500 | Error no controlado — mensaje genérico, ver el hueco documentado en `politica_errores.md` |

## Correlación

Cada response (exitosa o de error) lleva `X-Request-Id`. Es el mismo id que aparece en
los logs JSON estructurados del backend — para reportar un bug, ese id es lo único que
hace falta pedir.
