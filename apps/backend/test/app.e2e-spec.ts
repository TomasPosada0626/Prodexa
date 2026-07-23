import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './create-test-app';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1 (GET) responde el estado basico del servicio', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          status: 'ok',
          service: 'prodexa-backend',
        });
      });
  });

  it('/health (GET) responde liveness sin el prefijo /api/v1', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({ status: 'ok' });
      });
  });

  it('/ready (GET) responde readiness con la base de datos real conectada', () => {
    return request(app.getHttpServer())
      .get('/ready')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          status: 'ok',
          checks: { database: 'ok' },
        });
      });
  });
});
