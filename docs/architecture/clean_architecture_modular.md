# Clean Architecture modular en Prodexa

## Principios
- SOLID
- DRY
- KISS
- Separacion de responsabilidades
- Dependencias hacia adentro (dominio no depende de infraestructura)

## Capas
- Dominio: entidades, value objects, reglas.
- Aplicacion: casos de uso, puertos, DTOs.
- Infraestructura: persistencia, servicios externos, ORM.
- Presentacion: controladores API y contratos HTTP.

## Patrones obligatorios
- Repository Pattern
- Service Layer (casos de uso)
- DTO Pattern
- Dependency Injection

## Flujo principal de negocio
1. Usuario crea una formulacion.
2. Define nombre del producto o insumo y registro sanitario.
3. Agrega ingredientes con porcentaje, gramos base, cantidad en kg, precio por kg y precio total.
4. Opcionalmente agrega pasos de preparacion.
5. En simulacion selecciona formulacion y cantidad a preparar.
6. El sistema recalcula inmediatamente cada insumo y costo total.
7. Se muestran costos de produccion, venta y margen.

## Reglas del dominio para formulacion
- La formulacion debe tener nombre y al menos 1 ingrediente.
- Cada ingrediente debe tener porcentaje mayor a 0.
- Los costos deben ser no negativos.
- Los campos de conversion (gramos a kg y costo total) deben poder recalcularse de forma determinista.
- El paso a paso es opcional.

## Manejo de errores centralizado
- Errores de dominio: validaciones y reglas de negocio.
- Errores de aplicacion: casos de uso y orquestacion.
- Errores de infraestructura: persistencia y servicios externos.
- Respuesta HTTP estandarizada con codigo, mensaje y detalle.
