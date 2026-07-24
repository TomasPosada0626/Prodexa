import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuditService } from '../audit/audit.service';
import { AuditEvent } from '../audit/audit.types';
import { REFRESH_TOKEN_COOKIE } from './cookie.util';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    me: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    listSessions: jest.fn(),
    revokeSession: jest.fn(),
    findUserIdByEmail: jest.fn(),
  };
  const auditService = { log: jest.fn() };
  const user = {
    id: 'user-1',
    email: 'a@a.com',
    organizationId: 'org-1',
    rol: 'ADMIN' as const,
  };

  function mockRequest(cookies: Record<string, string> = {}) {
    return {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest-test' },
      cookies,
    } as never;
  }

  function mockResponse() {
    return { cookie: jest.fn(), clearCookie: jest.fn() };
  }

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    controller = module.get(AuthController);
  });

  it('register audita REGISTER con el userId creado', async () => {
    authService.register.mockResolvedValue({ id: 'user-1' });
    const dto = { email: 'a@a.com', password: 'Contrasena123!' };

    const result = await controller.register(dto, mockRequest());

    expect(result).toEqual({ id: 'user-1' });
    expect(auditService.log).toHaveBeenCalledWith(
      AuditEvent.REGISTER,
      expect.objectContaining({ userId: 'user-1' }),
    );
  });

  it('login exitoso pone las cookies y audita LOGIN_SUCCESS', async () => {
    authService.login.mockResolvedValue({
      user,
      tokens: { accessToken: 'a', refreshToken: 'r' },
    });
    const res = mockResponse();

    const result = await controller.login(
      { email: 'a@a.com', password: 'x' },
      mockRequest(),
      res as never,
    );

    expect(result).toEqual(user);
    expect(res.cookie).toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      AuditEvent.LOGIN_SUCCESS,
      expect.objectContaining({ userId: 'user-1' }),
    );
  });

  it('login fallido contra un correo real audita LOGIN_FAILED con el userId de esa cuenta', async () => {
    authService.login.mockRejectedValue(new UnauthorizedException());
    authService.findUserIdByEmail.mockResolvedValue('user-1');
    const res = mockResponse();

    await expect(
      controller.login(
        { email: 'a@a.com', password: 'x' },
        mockRequest(),
        res as never,
      ),
    ).rejects.toThrow(UnauthorizedException);
    expect(authService.findUserIdByEmail).toHaveBeenCalledWith('a@a.com');
    expect(auditService.log).toHaveBeenCalledWith(
      AuditEvent.LOGIN_FAILED,
      expect.objectContaining({
        userId: 'user-1',
        metadata: { email: 'a@a.com' },
      }),
    );
  });

  it('login fallido contra un correo que no existe audita LOGIN_FAILED sin userId', async () => {
    authService.login.mockRejectedValue(new UnauthorizedException());
    authService.findUserIdByEmail.mockResolvedValue(undefined);
    const res = mockResponse();

    await expect(
      controller.login(
        { email: 'no-existe@a.com', password: 'x' },
        mockRequest(),
        res as never,
      ),
    ).rejects.toThrow(UnauthorizedException);
    expect(auditService.log).toHaveBeenCalledWith(
      AuditEvent.LOGIN_FAILED,
      expect.objectContaining({
        userId: undefined,
        metadata: { email: 'no-existe@a.com' },
      }),
    );
  });

  it('refresh lanza UnauthorizedException si no hay cookie de refresh', async () => {
    await expect(
      controller.refresh(mockRequest(), mockResponse() as never),
    ).rejects.toThrow(UnauthorizedException);
    expect(authService.refresh).not.toHaveBeenCalled();
  });

  it('refresh emite nuevas cookies cuando el token es valido', async () => {
    authService.refresh.mockResolvedValue({
      user,
      tokens: { accessToken: 'a2', refreshToken: 'r2' },
    });
    const res = mockResponse();

    const result = await controller.refresh(
      mockRequest({ [REFRESH_TOKEN_COOKIE]: 'token-valido' }),
      res as never,
    );

    expect(result).toEqual(user);
    expect(res.cookie).toHaveBeenCalled();
  });

  it('logout limpia cookies y audita solo si habia una sesion activa', async () => {
    authService.logout.mockResolvedValue({ userId: 'user-1' });
    const res = mockResponse();

    await controller.logout(
      mockRequest({ [REFRESH_TOKEN_COOKIE]: 'token-valido' }),
      res as never,
    );

    expect(res.clearCookie).toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      AuditEvent.LOGOUT,
      expect.objectContaining({ userId: 'user-1' }),
    );
  });

  it('logout no audita si no habia sesion activa', async () => {
    authService.logout.mockResolvedValue({ userId: null });

    await controller.logout(mockRequest(), mockResponse() as never);

    expect(auditService.log).not.toHaveBeenCalled();
  });

  it('me delega en el servicio con el userId del token', async () => {
    await controller.me(user);
    expect(authService.me).toHaveBeenCalledWith('user-1');
  });

  it('updateProfile delega en el servicio con el userId y el dto', async () => {
    const dto = { nombre: 'Nuevo' };
    await controller.updateProfile(user, dto);
    expect(authService.updateProfile).toHaveBeenCalledWith('user-1', dto);
  });

  it('changePassword audita CHANGE_PASSWORD tras cambiar la contrasena', async () => {
    const dto = { currentPassword: 'a', newPassword: 'b' };

    await controller.changePassword(user, dto, mockRequest());

    expect(authService.changePassword).toHaveBeenCalledWith('user-1', dto);
    expect(auditService.log).toHaveBeenCalledWith(
      AuditEvent.CHANGE_PASSWORD,
      expect.objectContaining({ userId: 'user-1' }),
    );
  });

  it('forgotPassword audita PASSWORD_RESET_REQUESTED cuando el correo pertenece a una cuenta real', async () => {
    authService.findUserIdByEmail.mockResolvedValue('user-1');

    const result = await controller.forgotPassword(
      { email: 'a@a.com' },
      mockRequest(),
    );

    expect(authService.forgotPassword).toHaveBeenCalledWith({
      email: 'a@a.com',
    });
    expect(result).toEqual({
      message: 'Si el correo existe, te enviamos un codigo de recuperacion.',
    });
    expect(auditService.log).toHaveBeenCalledWith(
      AuditEvent.PASSWORD_RESET_REQUESTED,
      expect.objectContaining({ userId: 'user-1' }),
    );
  });

  it('forgotPassword no audita nada si el correo no pertenece a ninguna cuenta (no revela si existe)', async () => {
    authService.findUserIdByEmail.mockResolvedValue(undefined);

    const result = await controller.forgotPassword(
      { email: 'no-existe@a.com' },
      mockRequest(),
    );

    expect(result).toEqual({
      message: 'Si el correo existe, te enviamos un codigo de recuperacion.',
    });
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it('resetPassword audita PASSWORD_RESET_COMPLETED tras resetear la contrasena', async () => {
    authService.findUserIdByEmail.mockResolvedValue('user-1');
    const dto = { email: 'a@a.com', code: '123456', newPassword: 'Nueva123!' };

    await controller.resetPassword(dto, mockRequest());

    expect(authService.resetPassword).toHaveBeenCalledWith(dto);
    expect(auditService.log).toHaveBeenCalledWith(
      AuditEvent.PASSWORD_RESET_COMPLETED,
      expect.objectContaining({ userId: 'user-1' }),
    );
  });

  it('listSessions delega en el servicio con el userId y el refresh token actual', async () => {
    await controller.listSessions(
      user,
      mockRequest({ [REFRESH_TOKEN_COOKIE]: 'token-actual' }),
    );
    expect(authService.listSessions).toHaveBeenCalledWith(
      'user-1',
      'token-actual',
    );
  });

  it('listSessions funciona sin cookie de refresh token (ninguna sesion queda marcada como actual)', async () => {
    await controller.listSessions(user, mockRequest());
    expect(authService.listSessions).toHaveBeenCalledWith('user-1', undefined);
  });

  it('revokeSession delega en el servicio con el userId y el id de sesion', async () => {
    await controller.revokeSession(user, 'session-1');
    expect(authService.revokeSession).toHaveBeenCalledWith(
      'user-1',
      'session-1',
    );
  });
});
