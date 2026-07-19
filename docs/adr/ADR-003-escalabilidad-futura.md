# ADR-003 Estrategia de escalabilidad futura

## Estado
Aprobado

## Contexto
Prodexa debe crecer en usuarios, funcionalidades y carga sin reescribir todo.

## Decision
Escalar por etapas:
1. Modular Monolith bien desacoplado.
2. Extraer modulos a microservicios solo si hay necesidad real.
3. Priorizar extraccion de modulos con alta carga o dependencia externa.

## Consecuencias
- Positivas: menor costo inicial y ruta clara de crecimiento.
- Negativas: requiere observabilidad y metricas para decidir extraccion.
- Mitigacion: definir indicadores tecnicos y de negocio desde etapas tempranas.
