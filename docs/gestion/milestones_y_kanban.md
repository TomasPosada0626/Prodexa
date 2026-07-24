# Milestones y Kanban de Prodexa

## Milestones por release

M0-M4 fueron la agrupacion original de planificacion (Fase 0), antes de que
existiera un solo tag de git en el repositorio. Los milestones que realmente
se crean en GitHub usan un esquema de versiones (`v0.2.0`, `v0.3.0`, `v1.0.0`),
atado a tags reales. La tabla siguiente mapea uno contra el otro para que
ningun lector se quede con la duda de cual manda:

| Agrupacion original | Fases que cubre | Milestone/tag real en GitHub |
|---|---|---|
| M0 — Fundacion tecnica | Fases 0-2 | (previo a `v0.1.0`, sin tag) |
| M1 — Core funcional | Fase 3 | (previo a `v0.1.0`, sin tag) |
| M2 — Seguridad y control de acceso | Fase 4 (RBAC revertido y reconstruido) | incluido en `v0.2.0` |
| M3 — Dashboard y experiencia de usuario | Fase 5 | incluido en `v0.2.0` |
| M4 — Observabilidad, hardening y release v1.0.0 | Fases 6-7 y 10-13 | `v0.2.0` (6-7, 10-11) + `v0.3.0` (8) + `v1.0.0` (12) |

## Kanban operativo
Columnas:
- Backlog
- Ready
- En progreso
- En revision
- En pruebas
- Listo para merge
- Hecho

## Limites WIP
- En progreso: maximo 2 issues por persona.
- En revision: maximo 3 issues simultaneas.
- En pruebas: maximo 3 issues simultaneas.

## Reglas de flujo
- Ninguna tarea pasa a En progreso sin criterios de entrada claros.
- Ninguna tarea pasa a Hecho sin cumplir Definition of Done.
- Si un item queda bloqueado mas de 24h, se reporta y se crea accion de desbloqueo.
