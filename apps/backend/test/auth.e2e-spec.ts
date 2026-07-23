import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './create-test-app';
import { PrismaService } from '../src/prisma/prisma.service';

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@integration.test`;
}

/**
 * Los tests corren en orden contra la MISMA cuenta primaria para mantenerse muy
 * por debajo del rate limit real de /auth/register y /auth/login (5/min cada uno,
 * ver Fase 4 hardening) — un test de integracion no debe necesitar debilitar la
 * seguridad para poder correr.
 */
describe('Auth (e2e, DB real)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const password = 'Contrasena123!';
  const primaryEmail = uniqueEmail('primaria');
  const emailsCreados: string[] = [primaryEmail];
  let sessionCookies: string[];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: primaryEmail,
        password,
        nombre: 'Cuenta Primaria',
        nombreEmpresa: 'Empresa Primaria',
      })
      .expect(201);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emailsCreados } } });
    await app.close();
  });

  it('rechaza el registro con un correo ya usado (409)', async () => {
    const email = uniqueEmail('duplicado');
    emailsCreados.push(email);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password,
        nombre: 'Original',
        nombreEmpresa: 'Empresa Original',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password,
        nombre: 'Repetido',
        nombreEmpresa: 'Empresa Repetida',
      })
      .expect(409);
  });

  it('rechaza el registro con una contrasena que no cumple la politica (400)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail('debil'),
        password: '123',
        nombre: 'Debil',
        nombreEmpresa: 'Empresa Debil',
      })
      .expect(400);
  });

  it('rechaza el registro sin nombreEmpresa ni invitationToken (400)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail('sin-empresa'),
        password,
        nombre: 'Sin Empresa',
      })
      .expect(400);
  });

  it('login: rechaza contrasena incorrecta (401) y acepta la correcta emitiendo cookies httpOnly', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: primaryEmail, password: 'incorrecta' })
      .expect(401);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: primaryEmail, password })
      .expect(200);

    sessionCookies = loginRes.headers['set-cookie'] as unknown as string[];
    expect(
      sessionCookies.some(
        (c) => c.startsWith('access_token=') && c.includes('HttpOnly'),
      ),
    ).toBe(true);
    expect(
      sessionCookies.some(
        (c) => c.startsWith('refresh_token=') && c.includes('HttpOnly'),
      ),
    ).toBe(true);
  });

  it('/auth/me: 401 sin cookie de sesion, 200 con una valida', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);

    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', sessionCookies)
      .expect(200);
    const body = meRes.body as { email: string };
    expect(body.email).toBe(primaryEmail);
  });

  it('logout revoca el refresh token (el access token, por ser stateless, sigue viviendo hasta expirar)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', sessionCookies)
      .expect(204);

    // El refresh token ya fue revocado: intentar renovar la sesion con el mismo debe fallar.
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', sessionCookies)
      .expect(401);
  });
});
