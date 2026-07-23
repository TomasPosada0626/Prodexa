import { describe, expect, it } from 'vitest';
import { formatCosto, formatGramos, formatKg } from './format';

describe('formatGramos', () => {
  it('redondea y agrega separador de miles', () => {
    expect(formatGramos(38880)).toBe('38,880');
    expect(formatGramos(1000.6)).toBe('1,001');
  });

  it('redondea decimales pequenos a 0', () => {
    expect(formatGramos(0.4)).toBe('0');
  });
});

describe('formatKg', () => {
  it('usa separador de miles y hasta 4 decimales sin ceros de sobra', () => {
    expect(formatKg(38.88)).toBe('38.88');
    expect(formatKg(0.005)).toBe('0.005');
    expect(formatKg(1000)).toBe('1,000');
  });
});

describe('formatCosto', () => {
  it('antepone $ y redondea a entero con separador de miles', () => {
    expect(formatCosto(58320)).toBe('$58,320');
    expect(formatCosto(58320.6)).toBe('$58,321');
    expect(formatCosto(0)).toBe('$0');
  });
});
