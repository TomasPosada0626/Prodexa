import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const PASSWORD_STRENGTH_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export class RegisterDto {
  @ApiProperty({
    description: 'Correo del usuario',
    example: 'usuario@ejemplo.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description:
      'Contrasena: minimo 8 caracteres, con al menos una mayuscula, una minuscula, un numero y un caracter especial',
    example: 'ContrasenaSegura123!',
  })
  @IsString()
  @MinLength(8, { message: 'La contrasena debe tener al menos 8 caracteres.' })
  @Matches(PASSWORD_STRENGTH_REGEX, {
    message:
      'La contrasena debe incluir al menos una mayuscula, una minuscula, un numero y un caracter especial.',
  })
  password!: string;

  @ApiPropertyOptional({ description: 'Nombre completo del usuario' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({
    description:
      'Nombre de la empresa a crear. Obligatorio si no se envia un token de invitacion (en ese caso te unes a la empresa de la invitacion en vez de crear una nueva).',
  })
  @ValidateIf((dto: RegisterDto) => !dto.invitationToken)
  @IsString()
  @IsNotEmpty({ message: 'Ingresa el nombre de tu empresa.' })
  nombreEmpresa?: string;

  @ApiPropertyOptional({
    description:
      'Token de invitacion para unirte a una empresa existente en vez de crear una nueva.',
  })
  @ValidateIf((dto: RegisterDto) => !dto.nombreEmpresa)
  @IsOptional()
  @IsString()
  invitationToken?: string;
}
