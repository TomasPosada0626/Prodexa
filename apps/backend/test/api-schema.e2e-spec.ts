import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createTestApp } from './create-test-app';

/**
 * Snapshot del contrato REAL de la API (generado en runtime desde los decoradores de
 * class-validator/@ApiProperty, el mismo documento que sirve /api/docs) -- no una
 * lectura de texto del codigo fuente. Ver docs/api/versioning.md para que cuenta como
 * cambio compatible vs incompatible y que hacer cuando este test falla: no es un bug,
 * es la senal de que el contrato de la API cambio y hay que decidir conscientemente
 * si eso esta bien (actualizar el snapshot) o rompe algo (necesita una estrategia de
 * version).
 */
describe('Contrato de la API (schema OpenAPI)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('coincide con el snapshot committeado -- si falla, ver docs/api/versioning.md', () => {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Prodexa API')
      .setDescription(
        'API de formulaciones, ingredientes y simulacion de costos de Prodexa',
      )
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);

    expect(document.paths).toMatchSnapshot('paths');
    expect(document.components?.schemas).toMatchSnapshot('schemas');
  });
});
