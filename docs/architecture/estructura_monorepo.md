# Estructura monorepo de Prodexa

## Objetivo
Definir una estructura escalable para evolucionar de la aplicacion actual a una plataforma fullstack profesional.

## Estructura definida
- apps/
  - backend/
  - frontend/
- packages/
  - shared/
- docs/
  - architecture/
  - adr/
  - gestion/
- templates/
  - module-template/

## Convencion de modulos de dominio (backend)
Dentro de backend/src se usara esta estructura por modulo:
- domain/
- application/
- infrastructure/
- presentation/

## Convencion de nombres
- Archivos: kebab-case.
- Clases: PascalCase.
- Funciones y variables: camelCase.
- DTOs: sufijo dto.
- Casos de uso: verbo + caso de uso (ejemplo: crear-formulacion.use-case.ts).
- Repositorios: sufijo repository.

## Plantilla base de modulo
Ver carpeta templates/module-template para la base minima reutilizable.
