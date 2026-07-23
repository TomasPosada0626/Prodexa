# Referencia de endpoints

> **Generado automaticamente desde los decoradores reales de cada controller**
> (`@Controller`, `@Get`/`@Post`/`@Patch`/`@Delete`, `@Roles`, `@UseGuards`,
> `@ApiOperation summary`) — no se edita a mano. Para regenerar:
> `node apps/backend/scripts/generate-endpoints-doc.mjs`. CI falla si este
> archivo queda desactualizado respecto al codigo (`--check`).

Todas las rutas viven bajo `/api/v1` salvo `health`. "Rol" es el minimo
requerido — "—" significa que cualquier usuario autenticado de la
organizacion puede llamarlo (incluido `MIEMBRO`). Request/response
completos: Swagger en `/api/docs`.

## `app`

| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| GET | `/` | público | Endpoint raiz, para verificar rapido que el API responde (sin ser un health check formal). |

## `audit-log`

| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| GET | `/audit-log` | ADMIN | Listar eventos de seguridad de la empresa (login, logout, registro, cambio de contrasena) |

## `auth`

| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| POST | `/auth/register` | público | Registrar una nueva cuenta (no inicia sesion automaticamente) |
| POST | `/auth/login` | público | Iniciar sesion |
| POST | `/auth/refresh` | público | Renovar sesion usando el refresh token rotatorio |
| POST | `/auth/logout` | público | Cerrar sesion y revocar el refresh token |
| GET | `/auth/me` | — | Obtener el usuario autenticado actual |
| PATCH | `/auth/me` | — | Actualizar el perfil del usuario autenticado |
| POST | `/auth/change-password` | — | Cambiar la contrasena del usuario autenticado |
| GET | `/auth/sessions` | — | Listar las sesiones activas del usuario autenticado |
| DELETE | `/auth/sessions/:id` | — | Revocar una sesion activa (cierra esa sesion en particular) |

## `formulations`

| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| POST | `/formulations` | ADMIN, COORDINADOR | Crear una nueva formulacion con sus ingredientes y preparacion |
| GET | `/formulations` | — | Listar las formulaciones de la empresa del usuario autenticado |
| GET | `/formulations/:id` | — | Obtener una formulacion por id |
| PATCH | `/formulations/:id` | ADMIN, COORDINADOR | Actualizar nombre, registro sanitario, preparacion o margenes de una formulacion |
| DELETE | `/formulations/:id` | ADMIN, COORDINADOR | Eliminar una formulacion |
| PATCH | `/formulations/:id/ingredients/:ingredientId/price` | ADMIN, COORDINADOR | Actualizar el precio de un ingrediente (registra el cambio en el historial) |
| GET | `/formulations/:id/ingredients/:ingredientId/price-history` | — | Historial de precios de un ingrediente |
| GET | `/formulations/:id/versions` | — | Historial de versiones (snapshots completos) de una formulacion |

## `health`

| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| GET | `/health` | público | Liveness: el proceso esta arriba y respondiendo. No depende de nada externo. |
| GET | `/ready` | público | Readiness: el proceso puede atender trafico real (la base de datos responde). |

## `organizations`

| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| GET | `/organizations/members` | — | Listar los miembros activos de la empresa |
| PATCH | `/organizations/settings` | ADMIN, COORDINADOR | Actualizar las tarifas por hora (mano de obra, energia) de la empresa |
| PATCH | `/organizations/members/:id/role` | ADMIN, COORDINADOR | Cambiar el rol de un miembro de la empresa |
| DELETE | `/organizations/members/:id` | ADMIN, COORDINADOR | Remover a un miembro de la empresa |
| POST | `/organizations/invitations` | ADMIN, COORDINADOR | Generar un link de invitacion para sumar gente a la empresa |
| GET | `/organizations/invitations` | ADMIN, COORDINADOR | Listar las invitaciones vigentes de la empresa |
| DELETE | `/organizations/invitations/:id` | ADMIN, COORDINADOR | Revocar una invitacion antes de que se use |

## `production-orders`

| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| POST | `/production-orders` | — | Registrar una orden de produccion (lote realmente producido) |
| GET | `/production-orders` | — | Listar ordenes de produccion de la empresa, mas reciente primero |
| PATCH | `/production-orders/:id` | — | Corregir una orden de produccion ya registrada |
| DELETE | `/production-orders/:id` | ADMIN, COORDINADOR | Anular una orden de produccion registrada por error |
| POST | `/production-orders/:id/pagos` | — | Registrar un abono/pago parcial contra un lote (recalcula PENDIENTE/PARCIAL/PAGADO) |
| GET | `/production-orders/:id/pagos` | — | Listar los abonos registrados de un lote |
| DELETE | `/production-orders/:id/pagos/:pagoId` | ADMIN, COORDINADOR | Borrar un abono mal ingresado (recalcula el estado del lote) |

## `simulations`

| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| POST | `/simulations` | — | Simular costo y precio de venta al escalar una formulacion a una cantidad objetivo |

## `suppliers`

| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| GET | `/suppliers` | — | Listar los proveedores de la empresa con su historial de precios, para comparar cual conviene |
| POST | `/suppliers` | ADMIN, COORDINADOR | Crear un proveedor manualmente (antes de tener un precio registrado) |
| PATCH | `/suppliers/:id` | ADMIN, COORDINADOR | Renombrar un proveedor |
| DELETE | `/suppliers/:id` | ADMIN, COORDINADOR | Eliminar un proveedor (su historial de precios se conserva, solo pierde el enlace formal) |

## `uploads`

| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| POST | `/uploads/images` | — | Subir una imagen (usada por el editor de preparacion de formulaciones) |
