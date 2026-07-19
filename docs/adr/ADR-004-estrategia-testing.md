# ADR-004 Estrategia de testing

## Estado
Aprobado

## Contexto
El proyecto exige calidad continua y cobertura superior a 85%.

## Decision
- Unit testing para dominio y aplicacion.
- Integration testing para repositorios y endpoints.
- E2E testing para flujos criticos.
- Gate de cobertura minimo global >= 85% en CI.

## Consecuencias
- Positivas: menor riesgo de regresion y mayor confianza para desplegar.
- Negativas: mayor esfuerzo inicial en pruebas.
- Mitigacion: plantillas de pruebas por modulo y automatizacion en pipeline.
