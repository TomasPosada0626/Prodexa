# Capturas de pantalla

Imágenes estáticas referenciadas desde otros documentos — el GIF animado del README
vive en [`docs/demo/`](../demo/) por separado. Capturadas con Playwright contra la app
real (no mockups), mismo criterio que el resto del proyecto: nada de datos falsos que
no se pueden reproducir corriendo la app en local.

| Archivo | Pantalla |
|---|---|
| `dashboard.png` | Dashboard con KPIs de margen/utilidad y gráficos |
| `costos.png` | Simulador de Costos con el botón "Registrar como orden de producción" |
| `analisis.png` | Ficha de rendimiento por formulación en Análisis |
| `reportes.png` | Reporte financiero y cartera por cobrar |

Para regenerarlas: escribir un spec temporal de Playwright que navegue a la pantalla y
llame `page.screenshot()`, correrlo una vez, borrar el spec — mismo patrón que los
specs `_tmp-verify-*` documentados en [`docs/testing/e2e.md`](../testing/e2e.md).
