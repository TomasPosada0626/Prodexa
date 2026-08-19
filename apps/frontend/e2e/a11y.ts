import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Verificacion real de accesibilidad (WCAG 2.1 AA), no una revision visual subjetiva.
// No sustituye un pase manual con lector de pantalla (ver docs/gestion/roadmap-calidad-90.md,
// item 2.2) -- axe-core detecta violaciones estructurales y de contraste, no problemas de
// orden de foco o de que un cambio dinamico se anuncie, que solo expone un lector real.
export async function expectSinViolacionesAccesibilidad(page: Page, contexto: string) {
  const resultados = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(
    resultados.violations,
    `Violaciones de accesibilidad en ${contexto}:\n${resultados.violations
      .map((v) => `- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodo(s))`)
      .join('\n')}`,
  ).toEqual([]);
}
