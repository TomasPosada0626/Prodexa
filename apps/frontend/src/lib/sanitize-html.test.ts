import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from './sanitize-html';

describe('sanitizeHtml', () => {
  it('elimina un <script> completo', () => {
    const resultado = sanitizeHtml('<p>Hola</p><script>alert(1)</script>');
    expect(resultado).not.toContain('<script');
    expect(resultado).not.toContain('alert(1)');
    expect(resultado).toContain('Hola');
  });

  it('elimina un handler onerror en una imagen (el vector real: se dispara al parsear, no solo al mostrar)', () => {
    const resultado = sanitizeHtml('<img src="x" onerror="fetch(\'https://evil.test\')">');
    expect(resultado).not.toContain('onerror');
    expect(resultado).not.toContain('evil.test');
  });

  it('elimina un href javascript:', () => {
    const resultado = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(resultado.toLowerCase()).not.toContain('javascript:');
  });

  it('elimina onclick y otros atributos de evento en cualquier tag permitido', () => {
    const resultado = sanitizeHtml('<p onclick="alert(1)">texto</p>');
    expect(resultado).not.toContain('onclick');
    expect(resultado).toContain('texto');
  });

  it('conserva el formato legitimo que produce el editor (negrita, listas, imagenes propias)', () => {
    const resultado = sanitizeHtml(
      '<p><strong>Mezclar</strong> bien los <em>ingredientes</em>.</p><ul><li>Paso 1</li></ul><img src="/uploads/images/abc.png" alt="foto">',
    );
    expect(resultado).toContain('<strong>Mezclar</strong>');
    expect(resultado).toContain('<em>ingredientes</em>');
    expect(resultado).toContain('<li>Paso 1</li>');
    expect(resultado).toContain('src="/uploads/images/abc.png"');
  });

  it('conserva un link http/https/mailto legitimo', () => {
    const resultado = sanitizeHtml('<a href="https://ejemplo.com">ver</a>');
    expect(resultado).toContain('href="https://ejemplo.com"');
  });
});
