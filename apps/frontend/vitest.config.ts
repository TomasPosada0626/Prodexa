import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/use-formulations.ts', 'src/lib/api.ts', 'src/lib/pdf.ts'],
      // Gate real, no aspiracional: calibrado por debajo de lo que hoy se logra
      // (statements 93.8%, branches 81.7%, functions 87%, lines 92.6% al agregar
      // forecast.test.ts y sugerencias.test.ts) para que un regreso real rompa el
      // build sin que un cambio menor lo vuelva flaky. Mismo criterio que
      // apps/backend/package.json, con el mismo alcance limitado (src/lib/**).
      thresholds: {
        statements: 90,
        branches: 75,
        functions: 80,
        lines: 90,
      },
    },
  },
});
