# Diagrama entidad-relación

Esquema completo: `apps/backend/prisma/schema.prisma`. Decisiones de diseño detrás de
este modelo: [`docs/database/overview.md`](../database/overview.md).

```mermaid
erDiagram
    ORGANIZATION ||--o{ USER : "usuarios"
    ORGANIZATION ||--o{ FORMULATION : "formulaciones"
    ORGANIZATION ||--o{ PRODUCTION_ORDER : "ordenes"
    ORGANIZATION ||--o{ SUPPLIER : "proveedores"
    ORGANIZATION ||--o{ INVITATION : "invitaciones"
    USER ||--o{ FORMULATION : "crea"
    USER ||--o{ REFRESH_TOKEN : "sesiones"
    USER ||--o{ AUDIT_LOG : "genera (nullable, SetNull)"
    USER ||--o{ INVITATION : "crea"
    FORMULATION ||--o{ INGREDIENT : "contiene"
    FORMULATION ||--o{ FORMULATION_VERSION : "snapshots"
    FORMULATION ||--o{ PRODUCTION_ORDER : "escala a lote"
    PRODUCTION_ORDER ||--o{ PAGO : "abonos"
    INGREDIENT ||--o{ SUPPLIER_PRICE : "historial de precio"
    SUPPLIER ||--o{ SUPPLIER_PRICE : "precios (SetNull on delete)"
```

## Notas que el diagrama no puede mostrar por sí solo

- **`organizationId`** aparece en `User`, `Formulation`, `ProductionOrder`, `Supplier`
  e `Invitation` — es la columna que de verdad implementa el aislamiento
  multi-tenant; toda query de negocio filtra por ella.
- **`Supplier → SupplierPrice` es `SetNull`, no `Cascade`.** Eliminar un proveedor
  conserva el historial de precios — mismo patrón "archivar/desvincular, no borrar"
  que `Formulation.activa`.
- **`AuditLog.userId` es nullable + `SetNull`.** Un evento `LOGIN_FAILED` contra un
  correo que no existe no tiene usuario al cual atribuirse.
- **`FormulationVersion.snapshot` es un `Json`**, no columnas normalizadas — full
  snapshot del estado anterior a cada edición, no algo que se consulte con filtros SQL.
- **`rol`, `estadoPago`, `estadoProduccion`, `registroSanitarioEstado` son `String`**,
  con su conjunto de valores válidos enforced en el código de aplicación (DTOs, la
  máquina de estados), no como `enum` nativo de Postgres. Ver
  [`estado-produccion-uml.md`](estado-produccion-uml.md) para el caso más elaborado.
