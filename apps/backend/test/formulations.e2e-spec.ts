import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './create-test-app';
import { PrismaService } from '../src/prisma/prisma.service';

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@integration.test`;
}

async function registrarYLoguear(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string[]> {
  await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      email,
      password,
      nombre: 'Test',
      nombreEmpresa: `Empresa ${email}`,
    })
    .expect(201);
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);
  return res.headers['set-cookie'] as unknown as string[];
}

interface FormulationBody {
  id: string;
  nombreProducto: string;
  ingredientes: unknown[];
}

interface FormulationVersionBody {
  snapshot: { nombreProducto: string };
}

const dtoFormulacionValida = {
  nombreProducto: 'Formulacion Integracion',
  cantidadBaseKg: 1,
  ingredientes: [
    {
      nombre: 'Agua',
      porcentaje: 100,
      cantidadGramosBase: 1000,
      cantidadKg: 1,
      precioKg: 5,
      precioTotal: 5,
    },
  ],
};

describe('Formulations (e2e, DB real): endpoints, permisos y errores', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const password = 'Contrasena123!';
  const ownerEmail = uniqueEmail('owner');
  const otherEmail = uniqueEmail('other');
  let ownerCookies: string[];
  let otherCookies: string[];
  let formulacionId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    ownerCookies = await registrarYLoguear(app, ownerEmail, password);
    otherCookies = await registrarYLoguear(app, otherEmail, password);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [ownerEmail, otherEmail] } },
    });
    await app.close();
  });

  it('rechaza cualquier acceso sin autenticacion (401)', async () => {
    await request(app.getHttpServer()).get('/api/v1/formulations').expect(401);
  });

  it('rechaza crear una formulacion con datos invalidos (400: falta cantidadBaseKg)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/formulations')
      .set('Cookie', ownerCookies)
      .send({ nombreProducto: 'Sin cantidad', ingredientes: [] })
      .expect(400);
  });

  it('crea una formulacion para el usuario autenticado', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/formulations')
      .set('Cookie', ownerCookies)
      .send(dtoFormulacionValida)
      .expect(201);

    const body = res.body as FormulationBody;
    expect(body.nombreProducto).toBe('Formulacion Integracion');
    expect(body.ingredientes).toHaveLength(1);
    formulacionId = body.id;
  });

  it('lista solo las formulaciones del usuario autenticado (aislamiento entre cuentas)', async () => {
    const ownerRes = await request(app.getHttpServer())
      .get('/api/v1/formulations')
      .set('Cookie', ownerCookies)
      .expect(200);
    const ownerBody = ownerRes.body as FormulationBody[];
    expect(ownerBody.some((f) => f.id === formulacionId)).toBe(true);

    const otherRes = await request(app.getHttpServer())
      .get('/api/v1/formulations')
      .set('Cookie', otherCookies)
      .expect(200);
    const otherBody = otherRes.body as FormulationBody[];
    expect(otherBody.some((f) => f.id === formulacionId)).toBe(false);
  });

  it('otro usuario no puede ver, editar ni eliminar una formulacion ajena (404, no 403 — no revela que existe)', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/formulations/${formulacionId}`)
      .set('Cookie', otherCookies)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/v1/formulations/${formulacionId}`)
      .set('Cookie', otherCookies)
      .send({ nombreProducto: 'Hackeada' })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/v1/formulations/${formulacionId}`)
      .set('Cookie', otherCookies)
      .expect(404);
  });

  it('devuelve 404 al pedir una formulacion inexistente', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/formulations/id-que-no-existe')
      .set('Cookie', ownerCookies)
      .expect(404);
  });

  it('el dueno si puede actualizar su formulacion, y el cambio genera un snapshot de version', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/formulations/${formulacionId}`)
      .set('Cookie', ownerCookies)
      .send({ nombreProducto: 'Formulacion Actualizada' })
      .expect(200)
      .expect((res) => {
        const body = res.body as FormulationBody;
        expect(body.nombreProducto).toBe('Formulacion Actualizada');
      });

    const versionesRes = await request(app.getHttpServer())
      .get(`/api/v1/formulations/${formulacionId}/versions`)
      .set('Cookie', ownerCookies)
      .expect(200);
    const versiones = versionesRes.body as FormulationVersionBody[];
    expect(versiones.length).toBeGreaterThanOrEqual(1);
    expect(versiones[0].snapshot.nombreProducto).toBe(
      'Formulacion Integracion',
    );
  });

  it('el dueno puede eliminar su propia formulacion, y luego deja de existir', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/formulations/${formulacionId}`)
      .set('Cookie', ownerCookies)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/v1/formulations/${formulacionId}`)
      .set('Cookie', ownerCookies)
      .expect(404);
  });
});
