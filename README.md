<p align="center">
  <b>Prodexa - Calculadora profesional de costos y recetas alimenticias</b><br>
  <i>Legacy Desktop + Plataforma Fullstack (NestJS, Next.js, PostgreSQL, Prisma, Docker)</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.8%2B-blue?logo=python" />
  <img src="https://img.shields.io/badge/Tkinter-GUI-blueviolet" />
  <img src="https://img.shields.io/badge/JSON-Data-lightgrey" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/NestJS-Backend-E0234E?logo=nestjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-Frontend-000000?logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-Cache-DC382D?logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green" />
</p>

# Prodexa - Calculadora de Insumos para Recetas Alimenticias

**Versión de escritorio en Python + Tkinter**

Estado actual de modernizacion:
- Version legacy de escritorio operativa (Python/Tkinter).
- Base fullstack en construccion (NestJS + Next.js + PostgreSQL + Prisma + Docker).

---

## Descripción general

Esta aplicación permite calcular de manera precisa y profesional los insumos, costos y precios de venta de productos alimenticios a partir de recetas personalizadas. Está diseñada para microempresas, emprendimientos gastronómicos, laboratorios de alimentos y cualquier persona que requiera controlar costos y márgenes en la producción de alimentos.

El sistema automatiza el proceso que normalmente se realiza en hojas de cálculo, integrando una interfaz gráfica amigable, cálculos dinámicos y reportes claros para la toma de decisiones.

---

## Características principales

- **Carga y gestión de recetas desde archivo JSON**: Permite definir múltiples recetas, cada una con ingredientes, porcentajes, precios y pasos de preparación.
- **Cálculo automático de insumos**: Ajusta cantidades de ingredientes según el gramaje y la cantidad de envases deseados, incluyendo margen de producción extra.
- **Cálculo de costos y precios**:
  - Costos de formulación, envase, mano de obra, servicios, administrativos y otros.
  - Precio de venta sugerido, margen de utilidad, impuestos y ganancia total.
  - Costo por kilogramo de producción.
- **Simulación de precios variables**: Calcula automáticamente precios con descuento, promociones (NxM), precios mayoristas y precios especiales para clientes.
- **Visualización clara y profesional**: Tablas con intercalado de color, scroll independiente, y campos editables para descuentos y promociones.
- **Visualización de pasos de preparación**: Muestra instrucciones detalladas y registro sanitario de cada receta.
- **Interfaz intuitiva**: Todo se actualiza en tiempo real al cambiar cualquier parámetro (gramaje, cantidad, costo de envase, etc.).

---

## Instalación y requisitos

- **Python 3.8 o superior**
- No requiere dependencias externas (usa solo Tkinter y librerías estándar)

### Pasos de instalación

1. Clona o descarga este repositorio en tu equipo.
2. Asegúrate de tener Python instalado y configurado en tu sistema.
3. Ejecuta la aplicación con:

   ```bash
   python app.py
   ```

---

## Uso de la aplicación

1. **Selecciona la receta** en el menú desplegable.
2. **Ingresa la cantidad de envases, gramaje por envase y costo de envase+tapa**.
3. Haz clic en **Mostrar ingredientes** para ver la tabla de insumos y costos.
4. Consulta las tablas de costos, ganancias y precios variables (descuentos, promociones, mayorista, especial).
5. Haz clic en **Preparación** para ver los pasos detallados y el registro sanitario.
6. Modifica cualquier parámetro y observa cómo se actualizan todos los cálculos en tiempo real.

---

## Estructura del proyecto

- `legacy/desktop-v1/app.py`: Código principal de la versión legacy de escritorio.
- `legacy/desktop-v1/recetas.json`: Datos de recetas de la versión legacy.
- `README.md`: Este archivo de documentación.

## Planificacion y gobierno (Fase 0)

- `ROADMAP.md`: Hoja de ruta oficial del proyecto.
- `docs/gestion/vision_y_alcance.md`: Vision, propuesta de valor, publico objetivo y alcance.
- `docs/gestion/gobernanza_tecnica.md`: Estrategia de ramas, politica de PR, commits y Definition of Done.
- `docs/gestion/backlog_inicial.md`: Backlog inicial priorizado y epicas por valor.
- `docs/gestion/milestones_y_kanban.md`: Milestones de release, flujo Kanban y limites WIP.

## Arquitectura base (Fase 1)

- `docs/architecture/estructura_monorepo.md`: Estructura de monorepo y convenciones.
- `docs/architecture/clean_architecture_modular.md`: Capas, patrones y flujo de negocio principal.
- `docs/architecture/modulos_y_contextos.md`: Modulos y limites de contexto DDD.
- `docs/architecture/politica_errores.md`: Manejo centralizado de errores.
- `docs/adr/ADR-001-estilo-arquitectonico.md`: Decision de estilo arquitectonico.
- `docs/adr/ADR-002-stack-tecnologico.md`: Decision de stack tecnologico.
- `docs/adr/ADR-003-escalabilidad-futura.md`: Decision de estrategia de escalabilidad.
- `docs/adr/ADR-004-estrategia-testing.md`: Decision de estrategia de pruebas.

## Setup fullstack (Fase 2)

- `apps/backend`: API NestJS con estructura modular inicial.
- `apps/frontend`: Cliente web Next.js con rutas base.
- `apps/backend/prisma/schema.prisma`: Esquema inicial de datos.
- `docker-compose.yml`: Servicios locales (backend, frontend, postgres, redis).
- `docs/deployment/setup_local_fase2.md`: Guia de ejecucion local.

Comandos principales:

```bash
npm run db:up
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Nota: el entorno local de Docker publica PostgreSQL en `localhost:55432` para evitar conflictos con servicios locales ya instalados.

---

## Ejemplo de flujo de trabajo

1. El usuario selecciona "Salsa para Carnes".
2. Ingresa 50 envases de 200g cada uno, con costo de envase+tapa de $300.
3. La app calcula automáticamente:
   - Cantidad exacta de cada ingrediente (con 10% extra de producción)
   - Costos de formulación, envase, mano de obra, etc.
   - Precio de venta sugerido, margen, impuestos y ganancia
   - Costo por kilogramo
   - Precios con descuento, promociones, mayorista y especial
4. El usuario puede simular descuentos, promociones (ej: 2x3), o cambiar la cantidad mínima para mayorista.
5. Puede consultar los pasos de preparación y el registro sanitario.

---

## Ventajas y aplicaciones

- Elimina errores manuales de cálculo en Excel.
- Permite simular escenarios de precios y márgenes en segundos.
- Facilita la toma de decisiones para producción, ventas y promociones.
- Útil para cotizaciones, control de costos y análisis de rentabilidad.
- Adaptable a cualquier tipo de receta alimenticia.

---

## Personalización y extensibilidad

- Puedes agregar nuevas recetas o modificar las existentes editando el archivo `recetas.json`.
- El sistema es fácilmente adaptable a otros tipos de productos o fórmulas.
- Se puede exportar la lógica a otros formatos (Excel, web, etc.) si se requiere.

---

## Proyecto en mejoras constantes y desarrollo activo

Este proyecto está en evolución continua, incorporando nuevas funcionalidades, mejoras de usabilidad y optimizaciones según las necesidades de los usuarios y las tendencias del sector alimenticio. Se reciben sugerencias y aportes para seguir mejorando la herramienta.

---

## Licencia

Este proyecto es de uso libre para fines educativos y empresariales. Puedes modificarlo y adaptarlo según tus necesidades.

---

## Contacto y soporte

**Autor:** Tomás Posada  
**Correo:** tomasposada67@gmail.com  
**LinkedIn:** 

Para sugerencias, mejoras o soporte, puedes abrir un issue en el repositorio o contactar directamente al autor.