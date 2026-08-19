import { describe, expect, it } from 'vitest';
import type { ProductionOrder } from './api';
import { proyeccionProximaSemana, proyeccionProximoMes, serieMensual, serieSemanal } from './forecast';

function fechaHaceSemanas(semanas: number): string {
  return new Date(Date.now() - semanas * 7 * 24 * 60 * 60 * 1000).toISOString();
}

function fechaHaceMeses(meses: number, dia = 15): string {
  const ahora = new Date();
  return new Date(ahora.getFullYear(), ahora.getMonth() - meses, dia).toISOString();
}

function orden(createdAt: string, cantidadObjetivoKg: string, overrides: Partial<ProductionOrder> = {}): ProductionOrder {
  return {
    id: 'po-1',
    formulationId: 'f-1',
    numeroLote: 'LOTE-1',
    cantidadObjetivoKg,
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
    estadoProduccion: 'TERMINADO',
    notasCalidad: null,
    createdAt,
    ...overrides,
  };
}

describe('serieSemanal', () => {
  it('agrupa por semana ISO, suma kg/ingreso/utilidad y ordena de mas antigua a mas reciente', () => {
    const ordenes = [
      orden(fechaHaceSemanas(3), '2'),
      orden(fechaHaceSemanas(3), '3'),
      orden(fechaHaceSemanas(1), '1'),
    ];

    const serie = serieSemanal(ordenes);

    expect(serie).toHaveLength(2);
    expect(serie[0].kg).toBe(5);
    expect(serie[0].ingreso).toBe(40);
    expect(serie[0].utilidad).toBe(20);
    expect(serie[1].kg).toBe(1);
    expect(serie[0].semana < serie[1].semana).toBe(true);
  });

  it('excluye los lotes RECHAZADO', () => {
    const ordenes = [
      orden(fechaHaceSemanas(1), '1', { estadoProduccion: 'TERMINADO' }),
      orden(fechaHaceSemanas(1), '100', { estadoProduccion: 'RECHAZADO' }),
    ];

    const serie = serieSemanal(ordenes);

    expect(serie).toHaveLength(1);
    expect(serie[0].kg).toBe(1);
  });
});

describe('proyeccionProximaSemana', () => {
  it('es null con menos de 2 semanas completas', () => {
    expect(proyeccionProximaSemana([])).toBeNull();
    expect(proyeccionProximaSemana(serieSemanal([orden(fechaHaceSemanas(1), '1')]))).toBeNull();
  });

  it('excluye la semana en curso de la base de calculo', () => {
    const ordenes = [orden(fechaHaceSemanas(0), '999'), orden(fechaHaceSemanas(1), '1')];
    expect(proyeccionProximaSemana(serieSemanal(ordenes))).toBeNull();
  });

  it('promedia como maximo las ultimas 6 semanas completas, descartando las mas viejas', () => {
    const ordenes = Array.from({ length: 7 }, (_, i) => orden(fechaHaceSemanas(i + 1), String(10 * (i + 1))));
    const proyeccion = proyeccionProximaSemana(serieSemanal(ordenes));

    expect(proyeccion?.semanasBase).toBe(6);
    // La semana mas vieja (7 semanas atras, kg=70) queda fuera del promedio.
    expect(proyeccion?.kgProyectado).toBeCloseTo((10 + 20 + 30 + 40 + 50 + 60) / 6, 5);
  });

  it('detecta tendencia subiendo cuando la utilidad de la segunda mitad supera a la primera en mas de 10%', () => {
    const ordenes = [
      orden(fechaHaceSemanas(4), '1', { precioVentaSugerido: '20', costoEscalado: '10' }),
      orden(fechaHaceSemanas(3), '1', { precioVentaSugerido: '20', costoEscalado: '10' }),
      orden(fechaHaceSemanas(2), '1', { precioVentaSugerido: '50', costoEscalado: '10' }),
      orden(fechaHaceSemanas(1), '1', { precioVentaSugerido: '50', costoEscalado: '10' }),
    ];
    expect(proyeccionProximaSemana(serieSemanal(ordenes))?.tendencia).toBe('subiendo');
  });

  it('detecta tendencia estable cuando la variacion es menor al 10%', () => {
    const ordenes = [
      orden(fechaHaceSemanas(4), '1', { precioVentaSugerido: '20', costoEscalado: '10' }),
      orden(fechaHaceSemanas(3), '1', { precioVentaSugerido: '20', costoEscalado: '10' }),
      orden(fechaHaceSemanas(2), '1', { precioVentaSugerido: '21', costoEscalado: '10' }),
      orden(fechaHaceSemanas(1), '1', { precioVentaSugerido: '21', costoEscalado: '10' }),
    ];
    expect(proyeccionProximaSemana(serieSemanal(ordenes))?.tendencia).toBe('estable');
  });
});

describe('serieMensual', () => {
  it('agrupa por mes calendario y suma kg/ingreso/utilidad', () => {
    const ordenes = [
      orden(fechaHaceMeses(2), '2'),
      orden(fechaHaceMeses(2), '3'),
      orden(fechaHaceMeses(1), '1'),
    ];

    const serie = serieMensual(ordenes);

    expect(serie).toHaveLength(2);
    expect(serie[0].kg).toBe(5);
    expect(serie[1].kg).toBe(1);
    expect(serie[0].mes < serie[1].mes).toBe(true);
  });
});

describe('proyeccionProximoMes', () => {
  it('es null con menos de 2 meses completos', () => {
    expect(proyeccionProximoMes([])).toBeNull();
    expect(proyeccionProximoMes(serieMensual([orden(fechaHaceMeses(1), '1')]))).toBeNull();
  });

  it('excluye el mes en curso de la base de calculo', () => {
    const ordenes = [orden(fechaHaceMeses(0), '999'), orden(fechaHaceMeses(1), '1')];
    expect(proyeccionProximoMes(serieMensual(ordenes))).toBeNull();
  });

  it('calcula variacionVolumenPorcentaje y marca creciendo cuando el ultimo mes supera el promedio anterior en mas de 10%', () => {
    const ordenes = [
      orden(fechaHaceMeses(3), '10'),
      orden(fechaHaceMeses(2), '10'),
      orden(fechaHaceMeses(1), '20'),
    ];

    const proyeccion = proyeccionProximoMes(serieMensual(ordenes));

    expect(proyeccion?.mesesBase).toBe(3);
    expect(proyeccion?.variacionVolumenPorcentaje).toBeCloseTo(100, 5);
    expect(proyeccion?.tendenciaVolumen).toBe('creciendo');
  });

  it('marca cayendo cuando el ultimo mes cae mas de 10% frente al promedio anterior', () => {
    const ordenes = [orden(fechaHaceMeses(2), '20'), orden(fechaHaceMeses(1), '5')];
    expect(proyeccionProximoMes(serieMensual(ordenes))?.tendenciaVolumen).toBe('cayendo');
  });
});
