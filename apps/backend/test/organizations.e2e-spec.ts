import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './create-test-app';
import { PrismaService } from '../src/prisma/prisma.service';

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@integration.test`;
}

interface MemberBody {
  id: string;
  email: string;
  rol: string;
}

interface InvitationBody {
  id: string;
  token: string;
  rol: string;
}

describe('Organizations (e2e, DB real): equipo, roles e invitaciones', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const password = 'Contrasena123!';
  const adminEmail = uniqueEmail('admin');
  const emailsCreados: string[] = [adminEmail];
  let adminCookies: string[];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: adminEmail,
        password,
        nombre: 'Admin',
        nombreEmpresa: 'Empresa Organizations Test',
      })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password })
      .expect(200);
    adminCookies = loginRes.headers['set-cookie'] as unknown as string[];
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emailsCreados } } });
    await app.close();
  });

  it('rechaza cualquier acceso sin autenticacion (401)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/organizations/members')
      .expect(401);
  });

  it('el ADMIN aparece como unico miembro justo despues de registrarse', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/organizations/members')
      .set('Cookie', adminCookies)
      .expect(200);
    const body = res.body as MemberBody[];
    expect(body).toHaveLength(1);
    expect(body[0].email).toBe(adminEmail);
    expect(body[0].rol).toBe('ADMIN');
  });

  it('el ADMIN puede generar una invitacion, y con ella un usuario nuevo se une a la MISMA empresa', async () => {
    const invRes = await request(app.getHttpServer())
      .post('/api/v1/organizations/invitations')
      .set('Cookie', adminCookies)
      .send({ rol: 'MIEMBRO' })
      .expect(201);
    const invitation = invRes.body as InvitationBody;
    expect(invitation.rol).toBe('MIEMBRO');

    const memberEmail = uniqueEmail('miembro');
    emailsCreados.push(memberEmail);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: memberEmail,
        password,
        nombre: 'Miembro',
        invitationToken: invitation.token,
      })
      .expect(201);

    const membersRes = await request(app.getHttpServer())
      .get('/api/v1/organizations/members')
      .set('Cookie', adminCookies)
      .expect(200);
    const members = membersRes.body as MemberBody[];
    expect(
      members.some((m) => m.email === memberEmail && m.rol === 'MIEMBRO'),
    ).toBe(true);
  });

  it('rechaza un invitationToken invalido o ya usado (400)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail('token-invalido'),
        password,
        invitationToken: 'token-que-no-existe',
      })
      .expect(400);
  });

  it('un MIEMBRO no puede crear ni editar formulaciones (403), pero si puede leerlas', async () => {
    const memberEmail = uniqueEmail('lector');
    emailsCreados.push(memberEmail);

    const invRes = await request(app.getHttpServer())
      .post('/api/v1/organizations/invitations')
      .set('Cookie', adminCookies)
      .send({ rol: 'MIEMBRO' })
      .expect(201);
    const invitation = invRes.body as InvitationBody;

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: memberEmail,
        password,
        nombre: 'Lector',
        invitationToken: invitation.token,
      })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: memberEmail, password })
      .expect(200);
    const memberCookies = loginRes.headers['set-cookie'] as unknown as string[];

    await request(app.getHttpServer())
      .post('/api/v1/formulations')
      .set('Cookie', memberCookies)
      .send({
        nombreProducto: 'No deberia crearse',
        cantidadBaseKg: 1,
        ingredientes: [],
      })
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/v1/formulations')
      .set('Cookie', memberCookies)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/organizations/invitations')
      .set('Cookie', memberCookies)
      .send({ rol: 'MIEMBRO' })
      .expect(403);
  });

  it('el ADMIN puede cambiar el rol de un miembro y luego removerlo del equipo', async () => {
    const memberEmail = uniqueEmail('ascendido');
    emailsCreados.push(memberEmail);

    const invRes = await request(app.getHttpServer())
      .post('/api/v1/organizations/invitations')
      .set('Cookie', adminCookies)
      .send({ rol: 'MIEMBRO' })
      .expect(201);
    const invitation = invRes.body as InvitationBody;

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: memberEmail,
        password,
        nombre: 'Ascendido',
        invitationToken: invitation.token,
      })
      .expect(201);

    const membersRes = await request(app.getHttpServer())
      .get('/api/v1/organizations/members')
      .set('Cookie', adminCookies)
      .expect(200);
    const members = membersRes.body as MemberBody[];
    const miembro = members.find((m) => m.email === memberEmail)!;

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/members/${miembro.id}/role`)
      .set('Cookie', adminCookies)
      .send({ rol: 'COORDINADOR' })
      .expect(200)
      .expect((res) => {
        const body = res.body as MemberBody;
        expect(body.rol).toBe('COORDINADOR');
      });

    await request(app.getHttpServer())
      .delete(`/api/v1/organizations/members/${miembro.id}`)
      .set('Cookie', adminCookies)
      .expect(204);

    const membersAfterRes = await request(app.getHttpServer())
      .get('/api/v1/organizations/members')
      .set('Cookie', adminCookies)
      .expect(200);
    const membersAfter = membersAfterRes.body as MemberBody[];
    expect(membersAfter.some((m) => m.email === memberEmail)).toBe(false);

    // Al usuario removido se le desactiva el acceso: ya no puede iniciar sesion.
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: memberEmail, password })
      .expect(401);
  });

  it('el ADMIN no puede removerse ni cambiar su propio rol, y no se puede quedar la empresa sin ningun ADMIN', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/organizations/members')
      .set('Cookie', adminCookies)
      .expect(200)
      .expect((res) => {
        const body = res.body as MemberBody[];
        const yo = body.find((m) => m.email === adminEmail)!;
        expect(yo).toBeDefined();
      });

    const membersRes = await request(app.getHttpServer())
      .get('/api/v1/organizations/members')
      .set('Cookie', adminCookies)
      .expect(200);
    const yo = (membersRes.body as MemberBody[]).find(
      (m) => m.email === adminEmail,
    )!;

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/members/${yo.id}/role`)
      .set('Cookie', adminCookies)
      .send({ rol: 'MIEMBRO' })
      .expect(400);

    await request(app.getHttpServer())
      .delete(`/api/v1/organizations/members/${yo.id}`)
      .set('Cookie', adminCookies)
      .expect(400);
  });
});
