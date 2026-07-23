import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Formulation } from './api';
import { formatCosto, formatKg } from './format';

const BLOCK_TAGS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE']);

/**
 * Convierte el HTML enriquecido de la preparacion a texto plano para el PDF, preservando
 * saltos de linea entre parrafos/items. `element.textContent` NO hace esto: concatena todo
 * el texto sin ningun separador en los limites de <p>/<li>/<br>, por eso antes todo quedaba junto.
 */
function htmlToPlainText(html: string): string {
  const container = document.createElement('div');
  container.innerHTML = html;

  const listCounters: number[] = [];

  function walk(node: ChildNode): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent ?? '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as HTMLElement;

    if (el.tagName === 'BR') return '\n';

    if (el.tagName === 'OL' || el.tagName === 'UL') {
      listCounters.push(0);
      const inner = Array.from(el.childNodes).map(walk).join('');
      listCounters.pop();
      return inner;
    }

    if (el.tagName === 'LI') {
      const ordered = el.parentElement?.tagName === 'OL';
      let marker = '• ';
      if (ordered && listCounters.length > 0) {
        listCounters[listCounters.length - 1] += 1;
        marker = `${listCounters[listCounters.length - 1]}. `;
      }
      const inner = Array.from(el.childNodes).map(walk).join('').trim();
      return `${marker}${inner}\n`;
    }

    const inner = Array.from(el.childNodes).map(walk).join('');
    return BLOCK_TAGS.has(el.tagName) ? `${inner}\n` : inner;
  }

  const texto = Array.from(container.childNodes).map(walk).join('');
  return texto.replace(/\n{3,}/g, '\n\n').trim();
}

const MARGIN_X = 15;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

/** Morado de marca (#8B5CF6) en RGB, para encabezados, lineas de acento y filas de tabla. */
const BRAND = [139, 92, 246] as const;
const INK = [23, 23, 23] as const;
const MUTED = [110, 110, 122] as const;
const HAIRLINE = [225, 225, 232] as const;
const SOFT_FILL = [246, 244, 253] as const;
const GAIN = [5, 150, 105] as const;
/** Una perdida real nunca debe imprimirse en el mismo verde que una ganancia. */
const LOSS = [185, 28, 28] as const;

interface DocMeta {
  title: string;
  subtitle: string;
}

/**
 * Encabezado de marca compartido por todos los documentos: barra de acento, wordmark
 * "PRODEXA", titulo/subtitulo del reporte. Devuelve el cursor Y donde continua el contenido.
 */
function drawHeader(doc: jsPDF, meta: DocMeta): number {
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, PAGE_WIDTH, 3, 'F');

  let y = 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND);
  doc.text('PRODEXA', MARGIN_X, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text('Costeo y rentabilidad de formulaciones', MARGIN_X + 26, y);

  const fecha = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(fecha, PAGE_WIDTH - MARGIN_X, y, { align: 'right' });

  y += 8;
  doc.setDrawColor(...HAIRLINE);
  doc.line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y);
  y += 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text(meta.title, MARGIN_X, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...MUTED);
  doc.text(meta.subtitle, MARGIN_X, y);
  y += 10;

  return y;
}

/** Pie de pagina con numeracion, agregado a TODAS las paginas ya renderizadas de una vez, al final. */
function drawFooters(doc: jsPDF): void {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(...HAIRLINE);
    doc.line(MARGIN_X, PAGE_HEIGHT - 15, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('Generado por Prodexa · documento de uso interno', MARGIN_X, PAGE_HEIGHT - 10);
    doc.text(`Pagina ${i} de ${total}`, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 10, { align: 'right' });
  }
}

/** Titulo de seccion con barra de acento a la izquierda, consistente en todos los documentos. */
function drawSectionTitle(doc: jsPDF, titulo: string, y: number): number {
  doc.setFillColor(...BRAND);
  doc.rect(MARGIN_X, y - 3.6, 1.4, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(...INK);
  doc.text(titulo, MARGIN_X + 4, y);
  return y + 7;
}

/**
 * Tarjetas de KPI en fila, con el mismo lenguaje visual que el dashboard de la app.
 * La altura de la fila se calcula segun cuantas lineas necesita la etiqueta mas larga,
 * para que nunca se superponga con el valor (etiquetas cortas y largas conviven bien).
 */
function drawKpiRow(
  doc: jsPDF,
  kpis: Array<{ label: string; value: string; accent?: 'positive' | 'negative' }>,
  y: number,
): number {
  const gap = 4;
  const cardWidth = (CONTENT_WIDTH - gap * (kpis.length - 1)) / kpis.length;
  const labelLineHeight = 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const labelLinesPerCard = kpis.map((kpi) => doc.splitTextToSize(kpi.label.toUpperCase(), cardWidth - 4) as string[]);
  const maxLabelLines = Math.max(...labelLinesPerCard.map((lines) => lines.length));
  const labelBlockHeight = maxLabelLines * labelLineHeight;
  const cardHeight = Math.max(20, 6 + labelBlockHeight + 8);

  kpis.forEach((kpi, index) => {
    const x = MARGIN_X + index * (cardWidth + gap);
    doc.setFillColor(...SOFT_FILL);
    doc.roundedRect(x, y, cardWidth, cardHeight, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(labelLinesPerCard[index], x + 3, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const valueColor: readonly [number, number, number] =
      kpi.accent === 'positive' ? GAIN : kpi.accent === 'negative' ? LOSS : INK;
    doc.setTextColor(...valueColor);
    doc.text(kpi.value, x + 3, y + 6 + labelBlockHeight + 5);
  });

  return y + cardHeight + 10;
}

const TABLE_THEME = {
  headStyles: {
    fillColor: BRAND as unknown as [number, number, number],
    textColor: [255, 255, 255] as [number, number, number],
    fontStyle: 'bold' as const,
    fontSize: 8.5,
    halign: 'left' as const,
  },
  alternateRowStyles: { fillColor: [250, 249, 253] as [number, number, number] },
  styles: { fontSize: 8.5, textColor: INK as unknown as [number, number, number], cellPadding: 2.5 },
  margin: { left: MARGIN_X, right: MARGIN_X },
};

function nombreArchivoDesde(texto: string): string {
  return (
    texto
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'documento'
  );
}

// ---------------------------------------------------------------------------
// Ficha tecnica de formulacion
// ---------------------------------------------------------------------------

/** Genera y descarga la ficha tecnica (PDF) de una formulacion: datos, ingredientes y preparacion. */
export function exportFichaTecnicaPdf(formulacion: Formulation): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = drawHeader(doc, { title: formulacion.nombreProducto, subtitle: 'Ficha tecnica de formulacion' });

  const costoBaseTotal = formulacion.ingredientes.reduce((total, i) => total + Number(i.precioTotal), 0);

  y = drawKpiRow(
    doc,
    [
      { label: 'Lote base', value: `${formatKg(Number(formulacion.cantidadBaseKg))} kg` },
      { label: 'Costo del lote base', value: formatCosto(costoBaseTotal) },
      { label: 'Margen', value: `${Number(formulacion.margenPorcentaje)}%` },
      { label: 'Impuesto (IVA)', value: `${Number(formulacion.impuestoPorcentaje)}%` },
    ],
    y,
  );

  if (formulacion.registroSanitario || formulacion.vidaUtilDias) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    const detalles = [
      formulacion.registroSanitario ? `Registro sanitario: ${formulacion.registroSanitario}` : null,
      formulacion.vidaUtilDias ? `Vida util: ${formulacion.vidaUtilDias} dias` : null,
    ]
      .filter(Boolean)
      .join('   ·   ');
    doc.text(detalles, MARGIN_X, y);
    y += 8;
  }

  y = drawSectionTitle(doc, `Ingredientes (${formulacion.ingredientes.length})`, y);

  autoTable(doc, {
    startY: y,
    head: [['Ingrediente', '% formula', 'Gramos', 'Kg', 'Precio/kg', 'Precio total']],
    body: formulacion.ingredientes.map((i) => [
      i.nombre,
      `${Number(i.porcentaje)}%`,
      formatKg(Number(i.cantidadGramosBase)),
      formatKg(Number(i.cantidadKg)),
      formatCosto(Number(i.precioKg)),
      formatCosto(Number(i.precioTotal)),
    ]),
    foot: [['', '', '', '', 'Total', formatCosto(costoBaseTotal)]],
    footStyles: { fillColor: SOFT_FILL as unknown as [number, number, number], textColor: INK as unknown as [number, number, number], fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
    ...TABLE_THEME,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;

  if (formulacion.preparacionHtml) {
    const texto = htmlToPlainText(formulacion.preparacionHtml);
    if (texto) {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      y = drawSectionTitle(doc, 'Preparacion', y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...INK);
      const lineas = doc.splitTextToSize(texto, CONTENT_WIDTH);
      lineas.forEach((linea: string) => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(linea, MARGIN_X, y);
        y += 5.5;
      });
    }
  }

  drawFooters(doc);
  doc.save(`ficha-tecnica-${nombreArchivoDesde(formulacion.nombreProducto)}.pdf`);
}

// ---------------------------------------------------------------------------
// Reporte financiero (produccion real)
// ---------------------------------------------------------------------------

interface FilaFinancieraReporte {
  nombre: string;
  lotes: number;
  kgProducidos: number;
  costoReal: number;
  ingresoReal: number;
  utilidadReal: number;
  margenRealPorcentaje: number;
}

interface TotalesFinancieroReporte {
  lotes: number;
  kgProducidos: number;
  costoReal: number;
  ingresoReal: number;
  utilidadReal: number;
}

/** Genera y descarga el reporte financiero (PDF) con las ganancias y gastos reales de lo que ya se produjo. */
export function exportReporteFinancieroPdf(filas: FilaFinancieraReporte[], totales: TotalesFinancieroReporte): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = drawHeader(doc, {
    title: 'Reporte financiero de produccion',
    subtitle: `${totales.lotes} lote${totales.lotes === 1 ? '' : 's'} producido${totales.lotes === 1 ? '' : 's'} · ${filas.length} formulacion${filas.length === 1 ? '' : 'es'}`,
  });

  const margenGlobal = totales.ingresoReal > 0 ? (totales.utilidadReal / totales.ingresoReal) * 100 : 0;

  y = drawKpiRow(
    doc,
    [
      { label: 'Kg producidos', value: `${formatKg(totales.kgProducidos)} kg` },
      { label: 'Gastos (costo real)', value: formatCosto(totales.costoReal) },
      { label: 'Ingresos (ventas)', value: formatCosto(totales.ingresoReal) },
      {
        label: totales.utilidadReal < 0 ? 'Perdidas (utilidad real)' : 'Ganancias (utilidad real)',
        value: formatCosto(totales.utilidadReal),
        accent: totales.utilidadReal < 0 ? 'negative' : 'positive',
      },
      {
        label: 'Margen real',
        value: `${margenGlobal.toFixed(1)}%`,
        accent: margenGlobal < 0 ? 'negative' : 'positive',
      },
    ],
    y,
  );

  y = drawSectionTitle(doc, 'Detalle por formulacion', y);

  autoTable(doc, {
    startY: y,
    head: [['Formulacion', 'Lotes', 'Kg producidos', 'Gastos', 'Ingresos', 'Ganancias', 'Margen']],
    body: filas.map((fila) => [
      fila.nombre,
      String(fila.lotes),
      formatKg(fila.kgProducidos),
      formatCosto(fila.costoReal),
      formatCosto(fila.ingresoReal),
      formatCosto(fila.utilidadReal),
      `${fila.margenRealPorcentaje.toFixed(1)}%`,
    ]),
    foot: [
      [
        'Total',
        String(totales.lotes),
        formatKg(totales.kgProducidos),
        formatCosto(totales.costoReal),
        formatCosto(totales.ingresoReal),
        formatCosto(totales.utilidadReal),
        `${margenGlobal.toFixed(1)}%`,
      ],
    ],
    footStyles: { fillColor: SOFT_FILL as unknown as [number, number, number], textColor: INK as unknown as [number, number, number], fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
    ...TABLE_THEME,
  });

  drawFooters(doc);
  const fecha = new Date().toISOString().slice(0, 10);
  doc.save(`reporte-financiero-${fecha}.pdf`);
}

// ---------------------------------------------------------------------------
// Ficha de rendimiento (Analisis)
// ---------------------------------------------------------------------------

interface AnalisisKpis {
  costoEscalado: number;
  precioVentaSugerido: number;
  margenPorcentaje: number;
  utilidadEstimada: number;
  utilidadRealAcumulada: number | null;
  puntoEquilibrioPorcentaje: number;
}

interface DesgloseIngredienteReporte {
  nombre: string;
  porcentaje: number;
  costo: number;
}

/** Genera y descarga la ficha de rendimiento (PDF) de una formulacion: KPIs y desglose de costo por ingrediente. */
export function exportAnalisisPdf(
  formulacion: Formulation,
  kpis: AnalisisKpis,
  desglose: DesgloseIngredienteReporte[],
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = drawHeader(doc, { title: formulacion.nombreProducto, subtitle: 'Ficha de rendimiento' });

  y = drawKpiRow(
    doc,
    [
      { label: 'Costo de produccion (lote base)', value: formatCosto(kpis.costoEscalado) },
      { label: 'Precio de venta sugerido', value: formatCosto(kpis.precioVentaSugerido) },
      { label: 'Margen', value: `${kpis.margenPorcentaje.toFixed(1)}%` },
      {
        label: 'Utilidad (lote base)',
        value: formatCosto(kpis.utilidadEstimada),
        accent: kpis.utilidadEstimada < 0 ? 'negative' : 'positive',
      },
      { label: 'Punto de equilibrio', value: `${kpis.puntoEquilibrioPorcentaje.toFixed(0)}%` },
    ],
    y,
  );

  if (kpis.utilidadRealAcumulada !== null) {
    doc.setFillColor(...SOFT_FILL);
    doc.roundedRect(MARGIN_X, y, CONTENT_WIDTH, 12, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text('Utilidad real acumulada en ordenes de produccion registradas', MARGIN_X + 3, y + 7.5);
    doc.setFont('helvetica', 'bold');
    const colorUtilidadReal: readonly [number, number, number] = kpis.utilidadRealAcumulada < 0 ? LOSS : GAIN;
    doc.setTextColor(...colorUtilidadReal);
    doc.text(formatCosto(kpis.utilidadRealAcumulada), PAGE_WIDTH - MARGIN_X - 3, y + 7.5, { align: 'right' });
    y += 18;
  } else {
    y += 4;
  }

  y = drawSectionTitle(doc, 'Desglose de costo por ingrediente', y);

  autoTable(doc, {
    startY: y,
    head: [['Ingrediente', '% del costo', 'Costo']],
    body: desglose.map((i) => [i.nombre, `${i.porcentaje.toFixed(1)}%`, formatCosto(i.costo)]),
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
    },
    ...TABLE_THEME,
  });

  drawFooters(doc);
  doc.save(`analisis-${nombreArchivoDesde(formulacion.nombreProducto)}.pdf`);
}
