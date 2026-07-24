# Capturas de pantalla

Imágenes estáticas referenciadas desde otros documentos — el GIF animado del README
vive en [`docs/demo/`](../demo/) por separado. Capturadas con Playwright contra la app
real (no mockups), mismo criterio que el resto del proyecto: nada de datos falsos que
no se pueden reproducir corriendo la app en local.

| Archivo | Pantalla |
|---|---|
| `dashboard.png` | Dashboard con KPIs de margen/utilidad, lote esperando calidad y proyecciones |
| `costos.png` | Simulador de Costos con el botón "Registrar como orden de producción" |
| `analisis.png` | Ficha de rendimiento por formulación en Análisis, con tasa de rechazo real |
| `reportes.png` | Reporte financiero y cartera por cobrar, con lotes reales pendientes de cobro |

## `usuario/`

Capturas de cada pantalla de la aplicación para [`docs/usuario/guia-usuario.md`](../usuario/guia-usuario.md)
(registro, login, formulaciones, preparar, calidad, proveedores, configuración,
auditoría) — mismo criterio, mismo origen (Playwright contra la app real).

Para regenerarlas: escribir un spec temporal de Playwright que navegue a la pantalla y
llame `page.screenshot()`, correrlo una vez, borrar el spec — mismo patrón que los
specs `_tmp-verify-*` documentados en [`docs/testing/e2e.md`](../testing/e2e.md).
