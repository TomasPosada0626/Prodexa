/** Envuelve un valor en comillas si contiene coma, comillas o salto de linea (CSV RFC 4180). */
export function escapeCsvValue(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Genera un CSV en memoria y dispara su descarga en el navegador. */
export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>): void {
  const lines = [headers, ...rows].map((row) => row.map((cell) => escapeCsvValue(String(cell))).join(','));
  // BOM UTF-8 para que Excel abra tildes/enes correctamente.
  const csvContent = `﻿${lines.join('\r\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
