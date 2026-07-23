import { SetMetadata } from '@nestjs/common';
import type { RolOrganizacion } from './types';

export const ROLES_KEY = 'roles';

/** Restringe un endpoint a los roles indicados. Se usa junto a RolesGuard (requiere JwtAuthGuard antes). */
export const Roles = (...roles: RolOrganizacion[]) =>
  SetMetadata(ROLES_KEY, roles);
