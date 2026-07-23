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
    listSessions: jest.fn(),
    revokeSession: jest.fn(),
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

  it('login fallido audita LOGIN_FAILED y relanza el error', async () => {
    authService.login.mockRejectedValue(new UnauthorizedException());
    const res = mockResponse();

    await expect(
      controller.login(
        { email: 'a@a.com', password: 'x' },
        mockRequest(),
        res as never,
      ),
    ).rejects.toThrow(UnauthorizedException);
    expect(auditService.log).toHaveBeenCalledWith(
      AuditEvent.LOGIN_FAILED,
      expect.objectContaining({ metadata: { email: 'a@a.com' } }),
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

  it('listSessions delega en el servicio con el userId', async () => {
    await controller.listSessions(user);
    expect(authService.listSessions).toHaveBeenCalledWith('user-1');
  });

  it('revokeSession delega en el servicio con el userId y el id de sesion', async () => {
    await controller.revokeSession(user, 'session-1');
    expect(authService.revokeSession).toHaveBeenCalledWith(
      'user-1',
      'session-1',
    );
  });
});
