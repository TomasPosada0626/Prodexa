import { describe, expect, it } from 'vitest';
import type { Formulation } from './api';
import { calcularEstadoRegistro, DIAS_ALERTA_VENCIMIENTO } from './calidad';

function formulacionCon(overrides: Partial<Formulation>): Formulation {
  return {
    id: 'f-1',
    nombreProducto: 'Producto Test',
    categoria: null,
    registroSanitario: null,
    registroSanitarioVencimiento: null,
    registroSanitarioEstado: null,
    preparacionHtml: null,
    cantidadBaseKg: '1',
    margenPorcentaje: '30',
    impuestoPorcentaje: '19',
    vidaUtilDias: null,
    tiempoProduccionHoras: null,
    activa: true,
    createdAt: new Date().toISOString(),
    ingredientes: [],
    ...overrides,
  };
}

function fechaEnDias(dias: number): string {
  return new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();
}

describe('calcularEstadoRegistro', () => {
  it('sin-registro: no hay numero de registro sanitario', () => {
    const resultado = calcularEstadoRegistro(formulacionCon({ registroSanitario: null }));
    expect(resultado).toEqual({ estado: 'sin-registro', diasRestantes: null });
  });

  it('sin-fecha: hay registro pero no fecha de vencimiento', () => {
    const resultado = calcularEstadoRegistro(
      formulacionCon({ registroSanitario: 'RS-123', registroSanitarioVencimiento: null }),
    );
    expect(resultado).toEqual({ estado: 'sin-fecha', diasRestantes: null });
  });

  it('vigente: vencimiento mas alla de la ventana de alerta', () => {
    const resultado = calcularEstadoRegistro(
      formulacionCon({
        registroSanitario: 'RS-123',
        registroSanitarioVencimiento: fechaEnDias(DIAS_ALERTA_VENCIMIENTO + 10),
      }),
    );
    expect(resultado.estado).toBe('vigente');
    expect(resultado.diasRestantes).toBeGreaterThan(DIAS_ALERTA_VENCIMIENTO);
  });

  it('por-vencer: dentro de la ventana de alerta (limite exacto de 120 dias)', () => {
    const resultado = calcularEstadoRegistro(
      formulacionCon({
        registroSanitario: 'RS-123',
        registroSanitarioVencimiento: fechaEnDias(DIAS_ALERTA_VENCIMIENTO),
      }),
    );
    expect(resultado.estado).toBe('por-vencer');
  });

  it('por-vencer: un dia antes de vencer', () => {
    const resultado = calcularEstadoRegistro(
      formulacionCon({ registroSanitario: 'RS-123', registroSanitarioVencimiento: fechaEnDias(1) }),
    );
    expect(resultado.estado).toBe('por-vencer');
    expect(resultado.diasRestantes).toBe(1);
  });

  it('vencido: la fecha ya paso', () => {
    const resultado = calcularEstadoRegistro(
      formulacionCon({ registroSanitario: 'RS-123', registroSanitarioVencimiento: fechaEnDias(-5) }),
    );
    expect(resultado.estado).toBe('vencido');
    expect(resultado.diasRestantes).toBeLessThan(0);
  });

  it('en-tramite: el override manual gana aunque la fecha este vigente', () => {
    const resultado = calcularEstadoRegistro(
      formulacionCon({
        registroSanitario: 'RS-123',
        registroSanitarioVencimiento: fechaEnDias(300),
        registroSanitarioEstado: 'EN_TRAMITE',
      }),
    );
    expect(resultado).toEqual({ estado: 'en-tramite', diasRestantes: null });
  });

  it('suspendido: el override manual gana aunque no haya fecha de vencimiento', () => {
    const resultado = calcularEstadoRegistro(
      formulacionCon({
        registroSanitario: 'RS-123',
        registroSanitarioVencimiento: null,
        registroSanitarioEstado: 'SUSPENDIDO',
      }),
    );
    expect(resultado).toEqual({ estado: 'suspendido', diasRestantes: null });
  });

  it('suspendido tiene prioridad sobre en-tramite si por alguna razon coincidieran', () => {
    // No deberian coexistir en la practica, pero el orden de los if define la prioridad real:
    // SUSPENDIDO se revisa primero en calcularEstadoRegistro.
    const resultado = calcularEstadoRegistro(
      formulacionCon({ registroSanitarioEstado: 'SUSPENDIDO', registroSanitario: 'RS-123' }),
    );
    expect(resultado.estado).toBe('suspendido');
  });
});
