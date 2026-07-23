# Política de seguridad

## Reportar una vulnerabilidad

Si encuentras una vulnerabilidad de seguridad en Prodexa, **no la reportes como un
issue público de GitHub**. Escribe directamente a
[tomasposada67@gmail.com](mailto:tomasposada67@gmail.com) con:

- Una descripción de la vulnerabilidad y su impacto potencial.
- Pasos para reproducirla.
- Versión/commit afectado, si lo sabes.

Se confirmará la recepción en un plazo razonable y se trabajará en un fix antes de
cualquier divulgación pública.

## Versiones soportadas

Este proyecto no tiene todavía un ciclo de releases con soporte de versiones
múltiples — solo se da seguimiento a la última versión de `main`. Ver
[`CHANGELOG.md`](CHANGELOG.md) para el historial de versiones.

## Revisión de seguridad propia

El proyecto mantiene una autoevaluación honesta contra el OWASP Top 10 en
[`docs/security/owasp-top10.md`](docs/security/owasp-top10.md), con sus hallazgos y
su resolución documentados explícitamente — por ejemplo, el XSS almacenado en el
campo de preparación de una formulación, encontrado y luego sanitizado con DOMPurify
(ver `CHANGELOG.md` 0.2.1). Reportar algo que ese documento ya cubre no hace falta
hacerlo por este canal; sí es bienvenido reportar algo que no haya cubierto.

## Automatización de seguridad ya activa

- `npm audit --audit-level=high` en cada push/PR a `main` y semanalmente
  (`.github/workflows/security.yml`).
- Escaneo de secretos con `gitleaks` en cada push/PR.
- Dependabot actualiza dependencias vulnerables semanalmente.
