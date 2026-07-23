import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadCsv, escapeCsvValue } from './export';

describe('escapeCsvValue', () => {
  it('deja el valor igual si no tiene coma, comillas ni salto de linea', () => {
    expect(escapeCsvValue('Salsa BBQ')).toBe('Salsa BBQ');
  });

  it('envuelve en comillas si el valor contiene una coma', () => {
    expect(escapeCsvValue('Salsa, picante')).toBe('"Salsa, picante"');
  });

  it('escapa comillas dobles duplicandolas y envuelve el valor', () => {
    expect(escapeCsvValue('Ingrediente "especial"')).toBe('"Ingrediente ""especial"""');
  });

  it('envuelve en comillas si el valor contiene un salto de linea', () => {
    expect(escapeCsvValue('linea1\nlinea2')).toBe('"linea1\nlinea2"');
  });
});

describe('downloadCsv', () => {
  const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:mock-url');
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('URL', { ...globalThis.URL, createObjectURL, revokeObjectURL });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
  });

  it('genera el blob, dispara la descarga con el nombre correcto y libera el objectURL', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadCsv(
      'reporte.csv',
      ['Nombre', 'Costo'],
      [
        ['Salsa BBQ', 100],
        ['Crema, hidratante', 200],
      ],
    );

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const [blob] = createObjectURL.mock.calls[0] as [Blob];
    expect(blob.type).toBe('text/csv;charset=utf-8;');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    clickSpy.mockRestore();
  });
});
