import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { RolOrganizacion } from '../../auth/types';
import { ROLES_INVITABLES } from './create-invitation.dto';

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: 'Nuevo rol del miembro dentro de la empresa',
    enum: ROLES_INVITABLES,
    example: 'COORDINADOR',
  })
  @IsIn(ROLES_INVITABLES)
  rol!: RolOrganizacion;
}
