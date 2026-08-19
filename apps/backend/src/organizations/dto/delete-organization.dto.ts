import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteOrganizationDto {
  @ApiProperty({
    description: 'Contrasena actual del ADMIN, para confirmar la eliminacion.',
  })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({
    description:
      'Nombre exacto de la empresa, escrito por el usuario para confirmar que quiere eliminarla por completo.',
  })
  @IsString()
  @IsNotEmpty()
  confirmacion!: string;
}
