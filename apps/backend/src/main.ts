// Debe ser el primer import del archivo: Sentry necesita inicializarse antes de
// que se cargue cualquier otro modulo para poder instrumentarlo automaticamente.
import './instrument';

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { pinoHttpOptions } from './common/logger/pino.config';
import { UPLOADS_DIR, UPLOADS_URL_PREFIX } from './uploads/uploads.constants';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Detras de un proxy/balanceador (Render en produccion), Express calcula req.ip del
  // socket del proxy, no del cliente real, salvo que se le diga explicitamente en
  // cuantos saltos de proxy confiar. Sin esto, TODAS las peticiones comparten la misma
  // IP "vista" por el backend — y como ThrottlerGuard (rate limiting de login/registro/
  // reset de contrasena) usa req.ip como clave por defecto, un solo atacante satura ese
  // balde compartido y bloquea el login de cualquier usuario real indefinidamente.
  // TRUST_PROXY_HOPS (default 1) es la cantidad de proxies de confianza delante del
  // proceso; Render agrega exactamente uno.
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));

  // 'cross-origin' porque el frontend (otro origen) carga estas imagenes en <img>;
  // el default de helmet ('same-origin') las bloquearia.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());
  app.use(pinoHttp(pinoHttpOptions));
  app.useStaticAssets(UPLOADS_DIR, { prefix: UPLOADS_URL_PREFIX });
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'ready'] });
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  // Fuera de produccion siempre esta disponible; en produccion requiere el opt-in
  // explicito SWAGGER_ENABLED=true (mismo patron que COOKIE_SAMESITE/COOKIE_SECURE:
  // default seguro, override explicito si de verdad se necesita expuesto).
  const swaggerHabilitado =
    process.env.NODE_ENV !== 'production' ||
    process.env.SWAGGER_ENABLED === 'true';
  if (swaggerHabilitado) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Prodexa API')
      .setDescription(
        'API de formulaciones, ingredientes y simulacion de costos de Prodexa',
      )
      .setVersion('1.0')
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, swaggerDocument);
  }

  await app.listen(process.env.BACKEND_PORT ?? 3000);
}
void bootstrap();
