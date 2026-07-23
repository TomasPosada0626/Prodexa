import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import {
  UPLOADS_DIR,
  UPLOADS_URL_PREFIX,
} from '../src/uploads/uploads.constants';

/**
 * Crea la app de Nest para tests de integracion/e2e con la MISMA configuracion
 * que main.ts aplica en produccion (prefijo, cookies, validacion, filtro de
 * errores, archivos estaticos subidos) — sin esto, un test "e2e" solo probaria
 * los controllers desnudos, sin el pipeline real que ve una request de verdad.
 * Se omiten helmet/pino (no cambian el comportamiento funcional que estos
 * tests verifican).
 */
export async function createTestApp(): Promise<NestExpressApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<NestExpressApplication>();

  app.use(cookieParser());
  app.useStaticAssets(UPLOADS_DIR, { prefix: UPLOADS_URL_PREFIX });
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'ready'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();
  return app;
}
