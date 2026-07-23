# Diagramas de Prodexa

Fuente única de los diagramas del proyecto — otros documentos enlazan aquí en vez de
reincrustar los mismos diagramas en varios archivos.

| Diagrama | Qué muestra |
|---|---|
| [`c4-nivel1-contexto.md`](c4-nivel1-contexto.md) | Usuarios y el sistema, sin integraciones externas todavía |
| [`c4-nivel2-contenedores.md`](c4-nivel2-contenedores.md) | Frontend, backend, Postgres, Redis |
| [`c4-nivel3-componentes.md`](c4-nivel3-componentes.md) | Módulos internos del backend NestJS |
| [`er-diagrama.md`](er-diagrama.md) | Modelo de datos y sus relaciones clave |
| [`despliegue.md`](despliegue.md) | Docker Compose local (real) vs. destino planeado (Fase 8) |
| [`estado-produccion-uml.md`](estado-produccion-uml.md) | Máquina de estados de `estadoProduccion` |

Todos los diagramas usan sintaxis Mermaid (`flowchart`, `erDiagram`, `stateDiagram-v2`)
compatible con el renderizado nativo de GitHub — deliberadamente no se usa la sintaxis
`C4Context`/`C4Container` de Mermaid para los niveles C4 por su soporte inconsistente
en distintos visores de Markdown.
