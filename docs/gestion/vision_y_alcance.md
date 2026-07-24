# Vision y alcance de Prodexa

> Documento de planificacion original de Fase 0. Dos puntos de su alcance
> evolucionaron con decisiones tomadas mas adelante y ya construidas: RBAC/
> multi-tenant (ver [ADR-005](../adr/ADR-005-rbac-organizaciones-multiusuario.md))
> e integracion IA (Groq Cloud en vez de Ollama). Este archivo se actualizo
> para reflejar ese estado real en vez de dejarlo contradictorio; el estado
> vigente por fase completa esta en [`ROADMAP.md`](../../ROADMAP.md).

## Vision
Prodexa sera la plataforma de referencia para gestionar formulaciones alimenticias y cosmeticas, costeo y decisiones de precio con trazabilidad, reduciendo errores manuales y acelerando la toma de decisiones de negocio.

## Propuesta de valor
- Centraliza formulas, costos y simulaciones en una sola herramienta.
- Reduce dependencia de hojas de calculo manuales y errores operativos.
- Permite evaluar rentabilidad por formulacion, lote, unidad y kilogramo.
- Facilita decisiones comerciales con reglas de promociones y escenarios.

## Publico objetivo
- Microempresas y pymes de alimentos.
- Emprendimientos gastronomicos con produccion recurrente.
- Laboratorios y plantas pequeñas de formulacion alimentaria.
- Equipos comerciales que requieren cotizaciones rapidas y confiables.

## Casos de uso priorizados
1. Calcular costo total de una formulacion por lote.
2. Obtener costo por unidad y costo por kilogramo.
3. Simular precio de venta con margen, impuestos y promociones.
4. Versionar cambios de formulacion y mantener historial de costos.
5. Consultar tablero de KPIs de costo y margen.

## Alcance MVP
- Gestion basica de formulaciones e ingredientes.
- Simulador de costeo por lote/unidad/kg.
- Reglas basicas de precio (margen e impuestos).
- API versionada v1 para formulaciones y simulacion.
- Interfaz web inicial responsive (movil, tablet y desktop).

## Alcance v1.0
- RBAC completo por roles y permisos — **construido**, ver
  [ADR-005](../adr/ADR-005-rbac-organizaciones-multiusuario.md): organizaciones
  multiusuario con roles ADMIN/COORDINADOR/MIEMBRO.
- Dashboard operativo con filtros por periodo y categoria.
- Auditoria de cambios criticos de negocio.
- Integracion IA (Groq Cloud) como asistencia — decision tomada, pendiente de
  construir (ver estado real en [`ROADMAP.md`](../../ROADMAP.md), Fase 9).
- Exportacion de reportes CSV/PDF.
- Observabilidad base (health, logs estructurados, metricas).

## Fuera de alcance temporal
- Arquitectura de microservicios distribuida.
- Integraciones ERP de terceros.
- Apps moviles nativas.
