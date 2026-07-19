# ADR-001 Estilo arquitectonico

## Estado
Aprobado

## Contexto
Prodexa debe evolucionar desde una aplicacion local a una plataforma fullstack sin perder velocidad de entrega.

## Decision
Adoptar Modular Monolith con Clean Architecture por modulo.

## Consecuencias
- Positivas: menor complejidad operativa inicial, alta mantenibilidad, pruebas mas simples.
- Negativas: requiere disciplina modular para evitar acoplamiento.
- Mitigacion: reglas estrictas de limites de contexto y puertos.
