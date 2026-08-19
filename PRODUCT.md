# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dueños y equipos operativos de microempresas y pymes de alimentos y cosméticos en Colombia: emprendimientos gastronómicos con producción recurrente, laboratorios/plantas pequeñas de formulación, y los equipos comerciales de esos negocios que necesitan cotizar rápido y con confianza. Trabajan en equipo por organización, con roles diferenciados (ADMIN, COORDINADOR, MIEMBRO) — no son usuarios individuales aislados, son varias personas tocando las mismas formulaciones y lotes.

Hoy Prodexa es una demo/portafolio pública (ver Evidence on Hand), pero está por entrar en pruebas piloto con clientes finales reales (confirmado 2026-08-14) — el diseño y el hardening de aquí en adelante deben tratarse como pre-lanzamiento real, no como ejercicio de portafolio.

## Product Purpose

Prodexa reemplaza la hoja de cálculo de costeo con la que estos negocios operan hoy — que se vuelve inconsistente apenas hay más de un producto y más de una persona editándola — por una plataforma real y multiusuario. Cubre el ciclo completo: formular, costear, producir con control de calidad obligatorio, y analizar rentabilidad por producto. Éxito significa que el dueño del negocio puede responder con confianza "cuánto deja cada producto" y confiar en que el número es el mismo en todas partes de la app, con trazabilidad completa de quién cambió qué y cuándo.

## Positioning

A diferencia de una hoja de cálculo o de una herramienta de inventario genérica, Prodexa mantiene un único motor de costeo (el mismo cálculo, espejado entre backend y frontend) usado consistentemente en el simulador de precios, el dashboard, el análisis de rentabilidad y las órdenes de producción reales — nunca hay dos números distintos para lo mismo. Combina eso con una máquina de estados de producción que hace el control de calidad obligatorio antes de dar un lote por terminado, e historial de versiones completo por formulación (snapshot en cada edición). Ninguna hoja de cálculo ni herramienta de inventario genérica ofrece esa combinación de costeo consistente + trazabilidad + calidad obligatoria para este dominio específico.

## Operating Context

Flujos reales de la app (ver README para detalle completo): Dashboard (KPIs de margen/utilidad, alertas de vencimiento, alertas de seguridad para ADMIN), Formulaciones (CRUD con historial de versiones y de precios), Producción/Preparar (escalado de formulación a lote real, máquina de estados PLANIFICADO → EN_PROCESO → EN_CALIDAD → TERMINADO/RECHAZADO), Costos (simulador de precio de venta), Análisis (ficha de rendimiento exportable a PDF), Calidad (estado de registro sanitario), Reportes (financiero + cartera por cobrar), Proveedores, Configuración (perfil, sesiones activas, equipo), Auditoría (bitácora de seguridad y negocio, solo ADMIN), y recuperación de contraseña de dos fases.

El "registro sanitario" de cada formulación referencia específicamente el marco regulatorio colombiano (INVIMA) — la terminología y el ciclo de vida (vigente / por vencer / vencido) asumen ese contexto regulatorio, no uno genérico.

Predecesor real: `legacy/desktop-v1/` es una calculadora de escritorio en Python de un solo archivo, sin persistencia ni multiusuario, con la que arrancó esta idea. Prodexa es su reemplazo completo.

## Capabilities and Constraints

- Multiusuario real por organización con RBAC (ADMIN/COORDINADOR/MIEMBRO) — decisión construida después de descartarla inicialmente (ver ADR-005).
- Interfaz web responsive (móvil, tablet, desktop); explícitamente sin apps móviles nativas.
- Fuera de alcance deliberado (por ahora): integraciones ERP de terceros, arquitectura de microservicios.
- Integración de IA (Groq Cloud) como asistencia está decidida en la visión del producto pero no construida todavía.
- Backend en plan gratuito de Render: se duerme tras inactividad, primera petición puede tardar 50+ segundos en despertar — una realidad de producto que la UI de demo debe poder comunicar (loading states honestos), no ocultar.
- Almacenamiento de archivos abstraído: disco local por defecto, Cloudflare R2 si está configurado.

## Brand Commitments

- Nombre del producto: **Prodexa**.
- Autor: Tomás Posada (tomasposada67@gmail.com).
- Licencia MIT, código abierto.

## Evidence on Hand

- Demo pública en vivo: prodexa-iota.vercel.app (frontend Vercel, backend Render con cold start).
- GIF de demo grabado con Playwright: `docs/demo/prodexa-demo.gif`.
- Capturas reales de pantallas: `docs/assets/*.png` (dashboard, costos, análisis, reportes) y `docs/usuario/` con guía paso a paso para usuario final.
- Estado real del proyecto: demo/portafolio de un solo autor hoy, a punto de iniciar pruebas piloto con clientes finales reales (aún sin organizaciones de clientes onboarded al momento de escribir esto). Trabajo futuro no debe fabricar testimonios, logos de clientes, casos de estudio ni cifras de negocio que todavía no existen — cualquier prueba social debe ser honesta sobre el estado real en el momento en que se construye, y debe poder actualizarse fácilmente cuando el primer piloto real arranque.
- Cobertura de tests real y verificable: 300 tests pasando, >99% statements/lines, corriendo contra Postgres real en CI (no solo mocks) — es evidencia legítima de calidad técnica que sí puede mostrarse.

## Product Principles

1. Un solo número por cálculo: el motor de costeo nunca diverge entre las vistas que lo muestran; cualquier feature nueva reutiliza el mismo cálculo en vez de reimplementarlo.
2. La calidad no es opcional: ningún lote llega a TERMINADO sin pasar por control de calidad explícito; el diseño debe hacer ese gate visible, no un checkbox que se puede saltar mentalmente.
3. Trazabilidad honesta: cada cambio material (formulación, precio, rol, tarifa) queda auditado y visible — el diseño no debe ocultar historial detrás de fricción innecesaria.
4. No aparentar lo que no existe: sin datos de clientes reales, sin métricas de negocio inventadas, sin ocultar las limitaciones reales del plan gratuito (cold start) cuando afectan la experiencia.
5. Multiusuario primero: cualquier pantalla nueva asume que varias personas con roles distintos tocan los mismos datos, no un usuario aislado.

## Accessibility & Inclusion

Mejor esfuerzo, sin estándar formal exigido: pruebas automatizadas de accesibilidad con Playwright + axe-core corren en CI como red de seguridad, pero no hay un compromiso de cumplimiento WCAG explícito. Diseño nuevo debe seguir manteniendo limpios esos checks automatizados, no bajar el nivel actual.
