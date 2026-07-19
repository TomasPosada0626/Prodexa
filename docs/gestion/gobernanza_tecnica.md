# Gobernanza tecnica de Prodexa

## Estrategia de ramas
Se define estrategia trunk-based simplificada:
- main: rama protegida y estable.
- feat/*: nuevas funcionalidades.
- fix/*: correcciones.
- chore/*: mantenimiento tecnico.
- docs/*: cambios documentales.

Reglas:
- No se trabaja directo en main.
- Todo cambio entra por Pull Request.
- Merge solo si pasan checks obligatorios.

## Politica de Pull Request
- Minimo 1 aprobacion.
- CI en verde (lint, pruebas, cobertura definida para fase).
- Descripcion obligatoria con contexto, alcance y evidencia.
- Checklist de impacto tecnico y de seguridad.

## Convencion de commits
Se adopta Conventional Commits en espanol para mensajes cortos:
- feat: nueva funcionalidad.
- fix: correccion de error.
- docs: documentacion.
- refactor: mejora interna sin cambiar comportamiento.
- test: pruebas.
- chore: tareas tecnicas generales.
- ci: cambios de pipeline.

Ejemplos:
- feat: crea modulo de recetas
- fix: corrige calculo de margen
- docs: agrega alcance del mvp

## Definition of Done
Un item se considera terminado solo si cumple todo:
- Codigo implementado con convenciones del proyecto.
- Pruebas requeridas agregadas y ejecutadas.
- Sin errores criticos en validaciones locales.
- Documentacion actualizada si aplica.
- Revisado y aprobado por PR.
- Integrado en main con checks en verde.
