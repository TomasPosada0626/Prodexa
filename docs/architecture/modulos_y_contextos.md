# Modulos y limites de contexto (DDD tactico)

## Modulos definidos
- auth: autenticacion y autorizacion.
- users: usuarios, roles y permisos.
- formulations: formulaciones y versiones.
- ingredients: catalogo de ingredientes y precios.
- costing: calculo de costos por lote, unidad y kg.
- pricing: reglas de venta, margen, impuestos y promociones.
- dashboard: indicadores operativos y de negocio.
- audit: trazabilidad de cambios.

## Contexto formulations (nucleo)
Responsable de:
- Crear formulacion con nombre del producto o insumo.
- Guardar registro sanitario.
- Guardar lista de ingredientes con:
  - nombre
  - porcentaje
  - cantidad en gramos (base)
  - cantidad en kg
  - precio por kg
  - precio total
- Guardar preparacion paso a paso (opcional).

## Contexto costing
Responsable de:
- Seleccionar formulacion.
- Recibir cantidad objetivo a preparar.
- Recalcular en tiempo real insumos y cantidades.
- Calcular costo de produccion total y costo unitario.

## Contexto pricing
Responsable de:
- Aplicar margen, impuestos y reglas comerciales.
- Proyectar valor de venta.
- Simular escenarios para decision de precio.

## Contratos entre contextos
- formulations expone datos base para costing.
- costing entrega base economica para pricing.
- audit registra cambios de formulas y simulaciones criticas.
