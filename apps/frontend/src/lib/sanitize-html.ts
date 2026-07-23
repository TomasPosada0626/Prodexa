import DOMPurify from 'isomorphic-dompurify';

/**
 * Unica funcion de sanitizacion de HTML del proyecto — usarla en cualquier punto que
 * renderice (dangerouslySetInnerHTML) o parsee (innerHTML, ej. para extraer texto plano)
 * el `preparacionHtml` de una formulacion. Las formulaciones se comparten dentro de una
 * organizacion (ver ADR-005): sin esto, un ADMIN/COORDINADOR podria guardar un payload
 * (ej. `<img src=x onerror="...">`) que se ejecuta en el navegador de cualquier otro
 * miembro que la vea o la exporte a PDF — ver docs/security/owasp-top10.md (A03).
 *
 * Isomorphic (funciona en SSR con jsdom y en el cliente con el DOM real) para que el
 * mismo resultado se produzca sin importar donde se llame, evitando mismatches de hidratacion.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'h1', 'h2', 'h3',
      'blockquote', 'code', 'pre', 'a', 'img', 'span',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'style', 'class', 'target', 'rel'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|\/|#)/i,
  });
}
