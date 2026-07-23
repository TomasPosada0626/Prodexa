import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './create-test-app';
import { PrismaService } from '../src/prisma/prisma.service';

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@integration.test`;
}

// El PNG 1x1 mas pequeno posible (67 bytes), suficiente para probar el flujo real de subida.
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

describe('Uploads (e2e, DB real): subir imagenes para el editor de formulaciones', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const password = 'Contrasena123!';
  const email = uniqueEmail('uploads');
  let cookies: string[];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password,
        nombre: 'Uploads Test',
        nombreEmpresa: 'Empresa Uploads Test',
      })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    cookies = loginRes.headers['set-cookie'] as unknown as string[];
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('rechaza subir una imagen sin autenticacion (401)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/uploads/images')
      .attach('file', PNG_1X1, 'foto.png')
      .expect(401);
  });

  it('rechaza un archivo que no es una imagen soportada (400)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/uploads/images')
      .set('Cookie', cookies)
      .attach('file', Buffer.from('no soy una imagen'), 'notas.txt')
      .expect(400);
  });

  it('sube una imagen y devuelve una URL que sirve el archivo real', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/uploads/images')
      .set('Cookie', cookies)
      .attach('file', PNG_1X1, 'foto.png')
      .expect(201);

    const body = res.body as { url: string };
    expect(body.url).toMatch(/^\/uploads\/images\/.+\.png$/);

    const imagenRes = await request(app.getHttpServer())
      .get(body.url)
      .expect(200);
    expect(imagenRes.headers['content-type']).toContain('image/png');
    expect(Buffer.compare(imagenRes.body as Buffer, PNG_1X1)).toBe(0);
  });
});
