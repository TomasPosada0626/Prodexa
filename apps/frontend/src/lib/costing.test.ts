import { describe, expect, it } from 'vitest';
import type { ProductionOrder } from './api';
import { calculateCost, diasPendiente, nivelCartera } from './costing';

function ordenDeHace(dias: number, estadoPago: ProductionOrder['estadoPago'] = 'PENDIENTE'): ProductionOrder {
  const createdAt = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
  return {
    id: 'po-1',
    formulationId: 'f-1',
    numeroLote: 'LOTE-1',
    cantidadObjetivoKg: '1',
    costoEscalado: '10',
    precioVentaSugerido: '20',
    utilidadEstimada: '10',
    margenPorcentaje: '30',
    tamanoPresentacion: null,
    unidadPresentacion: null,
    fechaVencimiento: null,
    costoEmpaque: '0',
    costoEtiqueta: '0',
    esMaquila: false,
    maquilaIncluyeEmpaque: false,
    costoManoObra: '0',
    costoEnergia: '0',
    tiempoProduccionHoras: null,
    costoGastosGenerales: '0',
    costoTransporte: '0',
    costoMermas: '0',
    precioVentaReal: null,
    estadoPago,
    montoCobrado: '0',
    fechaPago: null,
    estadoProduccion: 'TERMINADO',
    notasCalidad: null,
    createdAt,
  };
}

describe('calculateCost', () => {
  it('escala el costo y calcula precio de venta con margen e impuesto', () => {
    const result = calculateCost({
      costoBaseTotal: 10,
      cantidadBaseKg: 1,
      cantidadObjetivoKg: 5,
      margenPorcentaje: 20,
      impuestoPorcentaje: 10,
    });

    expect(result).not.toBeNull();
    expect(result?.costoPorKg).toBe(10);
    expect(result?.costoEscalado).toBe(50);
    expect(result?.precioVentaSugerido).toBe(62.5);
    expect(result?.precioConImpuesto).toBe(68.75);
    expect(result?.utilidadEstimada).toBe(12.5);
  });

  it('aplica el descuento mayorista sobre el precio con impuesto', () => {
    const result = calculateCost({
      costoBaseTotal: 100,
      cantidadBaseKg: 10,
      cantidadObjetivoKg: 10,
      margenPorcentaje: 50,
      impuestoPorcentaje: 0,
      descuentoMayoristaPorcentaje: 10,
    });

    expect(result?.precioVentaSugerido).toBe(200);
    expect(result?.precioMayorista).toBe(180);
  });

  it('asume impuesto y descuento en 0 cuando no se envian', () => {
    const result = calculateCost({
      costoBaseTotal: 10,
      cantidadBaseKg: 1,
      cantidadObjetivoKg: 1,
      margenPorcentaje: 20,
    });

    expect(result?.precioConImpuesto).toBe(result?.precioVentaSugerido);
    expect(result?.precioMayorista).toBe(result?.precioConImpuesto);
  });

  it('devuelve null si la cantidad base no es valida', () => {
    const result = calculateCost({
      costoBaseTotal: 10,
      cantidadBaseKg: 0,
      cantidadObjetivoKg: 1,
      margenPorcentaje: 20,
    });

    expect(result).toBeNull();
  });

  it('devuelve null si el margen es 100% o mas', () => {
    const result = calculateCost({
      costoBaseTotal: 10,
      cantidadBaseKg: 1,
      cantidadObjetivoKg: 1,
      margenPorcentaje: 100,
    });

    expect(result).toBeNull();
  });

  it('devuelve null si la cantidad objetivo no es valida', () => {
    const result = calculateCost({
      costoBaseTotal: 10,
      cantidadBaseKg: 1,
      cantidadObjetivoKg: 0,
      margenPorcentaje: 20,
    });

    expect(result).toBeNull();
  });

  it('redondea a 2 decimales', () => {
    const result = calculateCost({
      costoBaseTotal: 10,
      cantidadBaseKg: 3,
      cantidadObjetivoKg: 1,
      margenPorcentaje: 33,
    });

    expect(result?.costoPorKg).toBe(3.33);
  });
});

describe('diasPendiente', () => {
  it('cuenta los dias desde createdAt cuando esta pendiente', () => {
    expect(diasPendiente(ordenDeHace(10))).toBe(10);
  });

  it('es 0 para un lote ya pagado, sin importar su antiguedad', () => {
    expect(diasPendiente(ordenDeHace(45, 'PAGADO'))).toBe(0);
  });
});

describe('nivelCartera', () => {
  it('normal hasta 15 dias', () => {
    expect(nivelCartera(0)).toBe('normal');
    expect(nivelCartera(15)).toBe('normal');
  });

  it('atencion entre 16 y 30 dias', () => {
    expect(nivelCartera(16)).toBe('atencion');
    expect(nivelCartera(30)).toBe('atencion');
  });

  it('vencida pasando 30 dias', () => {
    expect(nivelCartera(31)).toBe('vencida');
  });
});
