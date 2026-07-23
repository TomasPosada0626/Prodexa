import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from './roles.decorator';
import type { RequestUser, RolOrganizacion } from './types';

/**
 * Debe usarse DESPUES de JwtAuthGuard (necesita request.user ya poblado). Si el endpoint
 * no tiene @Roles(), deja pasar a cualquier usuario autenticado, sin restriccion adicional.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesPermitidos = this.reflector.getAllAndOverride<
      RolOrganizacion[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!rolesPermitidos || rolesPermitidos.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: RequestUser }>();
    const rolUsuario = request.user?.rol;

    if (!rolUsuario || !rolesPermitidos.includes(rolUsuario)) {
      throw new ForbiddenException(
        'No tienes permiso para hacer esto. Pidele a un administrador o coordinador que lo haga.',
      );
    }

    return true;
  }
}
