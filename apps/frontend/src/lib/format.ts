/** Redondea a entero y agrega separador de miles: 38880 -> "38,880". */
export function formatGramos(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** Separador de miles, hasta 4 decimales pero sin ceros de sobra: 38.8800 -> "38.88", 0.005 -> "0.005". */
export function formatKg(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}

/** Redondea a entero y agrega separador de miles: 58320 -> "$58,320". */
export function formatCosto(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

/** Clase de color para una utilidad/margen: rojo si es negativa (perdida), verde si no. Una
 * perdida nunca debe verse igual que una ganancia, sin importar donde se muestre. */
export function utilidadClassName(valor: number): string {
  return valor < 0
    ? 'text-red-600 dark:text-red-400'
    : 'text-emerald-700 dark:text-emerald-400';
}
