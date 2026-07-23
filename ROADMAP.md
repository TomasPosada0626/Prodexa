# Roadmap de Prodexa

## Objetivo

Evolucionar Prodexa de aplicación local a plataforma fullstack profesional, segura y
lista para operar — con cada fase cerrada solo cuando su criterio de salida se cumple
de verdad, no cuando "ya se ve bien".

## Estado por fase

| Fase | Objetivo | Estado |
|---|---|---|
| 0 | Alineación, gobernanza y backlog inicial | ✅ Cerrada |
| 1 | Fundación de arquitectura y repositorio | ✅ Cerrada (con ajustes reales documentados en [`docs/architecture/overview.md`](docs/architecture/overview.md)) |
| 2 | Setup técnico fullstack | ✅ Cerrada |
| 3 | Dominio core de formulaciones y costos | ✅ Cerrada |
| 4 | Seguridad empresarial (incluye RBAC) | ✅ Cerrada — RBAC se descartó y luego se construyó, ver [ADR-005](docs/adr/ADR-005-rbac-organizaciones-multiusuario.md) |
| 5 | UX/UI y dashboard profesional | ✅ Cerrada |
| 6 | Observabilidad y operaciones | ✅ Cerrada en el alcance decidido (métricas técnicas fuera de alcance, ver [`docs/observability/`](docs/observability/)) |
| 7 | Testing total y cobertura ≥85% | ✅ Cerrada (217+27 backend, 42+6 frontend, ≥95% cobertura backend) |
| 8 | DevOps, CI/CD y despliegue real | ⬜ No iniciada |
| 9 | Integración IA (Groq Cloud) | ⬜ Decisión tomada (se descartó Ollama), no construida |
| 10 | Documentación 100% completa | ✅ Esta entrega |
| 11 | Profesionalismo de repositorio y cumplimiento | ✅ Esta entrega (labels/milestones requieren un paso manual, ver [`CONTRIBUTING.md`](CONTRIBUTING.md)) |
| 12 | Cierre final del proyecto | ⬜ Futura |
| 13 | Backlog histórico y continuidad | ⬜ Futura |

## Próximos pasos reales (no aspiracionales)

1. **Activar branch protection en GitHub** ("Require status checks to pass") para que
   el CI existente bloquee merges de verdad — paso de configuración, no de código.
2. **Fase 8**: construir el pipeline de despliegue real — **Vercel (frontend) +
   Render (backend + Postgres gestionado)**, reutilizando el `Dockerfile` ya existente
   del backend. Ver [`docs/deployment/roadmap-despliegue.md`](docs/deployment/roadmap-despliegue.md).
3. **Labels y milestones de GitHub**: aplicar `.github/labels.yml` (requiere `gh` CLI
   autenticado o hacerlo manual una vez, no había acceso a la API en el entorno donde
   se escribió este archivo).

## Cerrado recientemente (ya no son "próximos pasos")

- ~~Sanitizar el HTML de "Preparación"~~ — hecho con DOMPurify en los dos puntos
  reales de renderizado/parseo, ver [ADR-005](docs/adr/ADR-005-rbac-organizaciones-multiusuario.md).
- ~~Matriz de permisos mantenida a mano~~ — ahora se genera del código
  (`apps/backend/scripts/generate-endpoints-doc.mjs`), CI falla si queda desactualizada.
- ~~Cobertura floja en Suppliers/Uploads~~ — cerrada con tests reales, no artificiales.
- ~~500 sin detalle logueado~~ — `HttpExceptionFilter` ahora loguea la causa real del
  lado del servidor sin cambiar lo que ve el cliente.
- ~~Análisis/Reportes/Proveedores/Configuración/Auditoría sin regresión E2E
  permanente~~ — `modulos-avanzados.spec.ts` los cubre a los 5.

## Milestones sugeridos (a crear manualmente en GitHub)

- **v0.2.0 — Documentación, gobernanza y calidad a 9+** (esta entrega): Fases 10-11 +
  cierre de los hallazgos de seguridad/cobertura/testing pendientes.
- **v0.3.0 — Despliegue real**: Fase 8 (Vercel + Render), branch protection.
- **v1.0.0**: cierre formal, Fase 12.
