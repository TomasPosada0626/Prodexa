# Modelo de datos — visión general

Esquema completo: `apps/backend/prisma/schema.prisma`. Diagrama entidad-relación:
[`docs/diagrams/er-diagrama.md`](../diagrams/er-diagrama.md). Este documento explica
las decisiones detrás del esquema, no repite los campos uno por uno.

## Multi-tenancy por `organizationId`

Todo lo que pertenece a una empresa lleva `organizationId`: `User`, `Formulation`,
`ProductionOrder`, `Supplier`, `Invitation`. No hay una tabla intermedia de
"membresía" — la relación es directa porque un usuario pertenece exactamente a una
organización a la vez (no hay caso de uso hoy de una persona en dos empresas
distintas con la misma cuenta).

## `Decimal`, no `Float`, para todo lo que es dinero o cantidad física

Todos los campos de plata (`precioKg`, `costoEscalado`, `montoCobrado`, etc.) y de
cantidad física (`cantidadBaseKg`, `porcentaje`) son `Decimal` con precisión explícita
(ej. `@db.Decimal(14, 2)` para dinero, `@db.Decimal(14, 4)` para kilogramos) — nunca
`Float`, para no acumular error de redondeo en cálculos financieros encadenados
(escalar una fórmula, sumar costos operativos, aplicar margen e impuesto).

## `rol`, `estadoPago`, `estadoProduccion`, `registroSanitarioEstado` son `String`, no enums de Postgres

Estos cuatro campos tienen un conjunto fijo de valores válidos (`ADMIN`/`COORDINADOR`/
`MIEMBRO`; `PENDIENTE`/`PARCIAL`/`PAGADO`; `PLANIFICADO`/`EN_PROCESO`/`EN_CALIDAD`/
`TERMINADO`/`RECHAZADO`; etc.) pero **el contrato se enforce en el código de
aplicación** (DTOs de class-validator, la máquina de estados en
`TRANSICIONES_ESTADO_PRODUCCION`), no como un `enum` nativo de Postgres/Prisma. Esto es
deliberado por flexibilidad de migración (agregar un valor nuevo no requiere una
migración de esquema de tipo enum), pero significa que el diagrama ER no debe leerse
como si la base de datos rechazara un valor fuera de lista por sí sola.

## Archivar, no borrar — el patrón se repite dos veces

- `Formulation.activa`: borrar una formulación con `ProductionOrder` asociadas
  perdería historial financiero real vía cascada; se bloquea y se ofrece archivar.
- `Supplier` → `SupplierPrice.supplierId` es `onDelete: SetNull`, no `Cascade`:
  eliminar un proveedor conserva el historial de precios, solo desvincula la
  referencia formal.

## `AuditLog.userId` es nullable

Un evento `LOGIN_FAILED` contra un correo que no existe no tiene ningún usuario al
cual atribuirse — el campo es opcional y `onDelete: SetNull` para que el log
sobreviva aunque el usuario asociado se elimine después.

## `FormulationVersion.snapshot` es un `Json`, no columnas normalizadas

Guardar un snapshot completo (ingredientes, margen, preparación, registro sanitario)
como JSON en cada edición es más barato que versionar cada tabla hija por separado, y
es exactamente lo que se necesita mostrar (el estado completo de "antes" de un
cambio), no algo que se vaya a consultar con filtros SQL.

## No hay seed script

Un clone nuevo del repo arranca con la base de datos vacía — hoy no existe
`prisma/seed.ts` ni datos de ejemplo. Alguien que clone el proyecto tiene que
registrarse y crear formulaciones a mano para ver la app con datos reales.
