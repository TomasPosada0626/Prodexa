import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { RolOrganizacion } from '../../auth/types';

export const ROLES_INVITABLES: RolOrganizacion[] = [
  'ADMIN',
  'COORDINADOR',
  'MIEMBRO',
];

export class CreateInvitationDto {
  @ApiProperty({
    description: 'Rol con el que se unira la persona invitada',
    enum: ROLES_INVITABLES,
    example: 'MIEMBRO',
  })
  @IsIn(ROLES_INVITABLES)
  rol!: RolOrganizacion;
}
