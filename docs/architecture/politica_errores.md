# Politica centralizada de errores

## Objetivo
Unificar el manejo de errores para consistencia operativa, trazabilidad y experiencia de usuario.

## Estructura de error estandar
- code: identificador unico de error.
- message: mensaje legible.
- details: contexto tecnico no sensible.
- traceId: id de correlacion.
- timestamp: fecha y hora.

## Clasificacion
- DOMAIN_VALIDATION_ERROR
- APPLICATION_RULE_ERROR
- INFRASTRUCTURE_ERROR
- AUTHENTICATION_ERROR
- AUTHORIZATION_ERROR
- RATE_LIMIT_ERROR

## Reglas
- No exponer secretos ni stacktrace sensible en respuestas publicas.
- Todo error se registra en log estructurado.
- Los errores de validacion deben indicar el campo afectado.
- Deben existir mensajes claros para usuario final.
