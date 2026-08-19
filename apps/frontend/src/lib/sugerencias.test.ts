import { describe, expect, it } from 'vitest';
import type { Formulation, ProductionOrder } from './api';
import { sugerenciasProduccion } from './sugerencias';

function formulacion(id: string, overrides: Partial<Formulation> = {}): Formulation {
  return {
    id,
    nombreProducto: `Producto ${id}`,
    categoria: null,
    registroSanitario: null,
    registroSanitarioVencimiento: null,
    registroSanitarioEstado: null,
    preparacionHtml: null,
    cantidadBaseKg: '1',
    margenPorcentaje: '20',
    impuestoPorcentaje: '0',
    vidaUtilDias: null,
    tiempoProduccionHoras: null,
    activa: true,
    createdAt: new Date().toISOString(),
    ingredientes: [
      { id: 'i-1', nombre: 'Base', porcentaje: '100', cantidadGramosBase: '1000', cantidadKg: '1', precioKg: '10', precioTotal: '10' },
    ],
    ...overrides,
  };
}

function ordenDe(formulationId: string, hace: { dias?: number; semanas?: number }, estadoProduccion: ProductionOrder['estadoProduccion'] = 'TERMINADO'): ProductionOrder {
  const ms = (hace.dias ?? (hace.semanas ?? 0) * 7) * 24 * 60 * 60 * 1000;
  return {
    id: `po-${formulationId}-${ms}`,
    formulationId,
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
    estadoPago: 'PENDIENTE',
    montoCobrado: '0',
    fechaPago: null,
    estadoProduccion,
    notasCalidad: null,
    createdAt: new Date(Date.now() - ms).toISOString(),
  };
}

describe('sugerenciasProduccion', () => {
  it('descarta formulaciones sin utilidad por kg positiva', () => {
    const rentable = formulacion('f-rentable');
    const noRentable = formulacion('f-no-rentable', { cantidadBaseKg: '0' }); // calculateCost null -> utilidadPorKg 0

    const resultado = sugerenciasProduccion([rentable, noRentable], []);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].formulacion.id).toBe('f-rentable');
  });

  it('ordena de mayor a menor score (utilidad por kg * (1 + lotes recientes))', () => {
    const a = formulacion('f-a');
    const b = formulacion('f-b');
    const ordenes = [
      ordenDe('f-b', { semanas: 1 }),
      ordenDe('f-b', { semanas: 2 }),
      ordenDe('f-b', { semanas: 3 }),
    ];

    const resultado = sugerenciasProduccion([a, b], ordenes);

    expect(resultado[0].formulacion.id).toBe('f-b');
    expect(resultado[0].lotesRecientes).toBe(3);
    expect(resultado[1].formulacion.id).toBe('f-a');
    expect(resultado[1].lotesRecientes).toBe(0);
    expect(resultado[0].score).toBeGreaterThan(resultado[1].score);
  });

  it('solo cuenta como demanda reciente los lotes de las ultimas 8 semanas, no RECHAZADO', () => {
    const f = formulacion('f-x');
    const ordenes = [
      ordenDe('f-x', { semanas: 2 }),
      ordenDe('f-x', { semanas: 9 }), // fuera de la ventana de 8 semanas
      ordenDe('f-x', { semanas: 1 }, 'RECHAZADO'), // no vendido, no cuenta
    ];

    const resultado = sugerenciasProduccion([f], ordenes);

    expect(resultado[0].lotesRecientes).toBe(1);
  });

  it('ignora lotes de otras formulaciones al contar demanda reciente', () => {
    const f = formulacion('f-x');
    const otra = ordenDe('f-otra', { semanas: 1 });

    const resultado = sugerenciasProduccion([f], [otra]);

    expect(resultado[0].lotesRecientes).toBe(0);
  });
});
