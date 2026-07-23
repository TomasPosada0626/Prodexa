import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from './roles.decorator';
import type { RequestUser } from './types';

function buildContext(user: RequestUser | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('deja pasar si el endpoint no tiene @Roles()', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = buildContext({
      id: 'u-1',
      email: 'a@a.com',
      organizationId: 'org-1',
      rol: 'MIEMBRO',
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('deja pasar si el rol del usuario esta permitido', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['ADMIN', 'COORDINADOR']);
    const context = buildContext({
      id: 'u-1',
      email: 'a@a.com',
      organizationId: 'org-1',
      rol: 'COORDINADOR',
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('lanza ForbiddenException si el rol del usuario no esta permitido', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['ADMIN', 'COORDINADOR']);
    const context = buildContext({
      id: 'u-1',
      email: 'a@a.com',
      organizationId: 'org-1',
      rol: 'MIEMBRO',
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('lanza ForbiddenException si no hay usuario en el request', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const context = buildContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('usa la ROLES_KEY correcta para leer los metadatos', () => {
    const spy = jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(undefined);
    const context = buildContext({
      id: 'u-1',
      email: 'a@a.com',
      organizationId: 'org-1',
      rol: 'ADMIN',
    });

    guard.canActivate(context);

    expect(spy).toHaveBeenCalledWith(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });
});
