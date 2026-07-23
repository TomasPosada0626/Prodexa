import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';
import { PASSWORD_STRENGTH_REGEX } from './register.dto';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Contrasena actual del usuario' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({
    description:
      'Nueva contrasena: minimo 8 caracteres, con al menos una mayuscula, una minuscula, un numero y un caracter especial',
    example: 'ContrasenaSegura123!',
  })
  @IsString()
  @MinLength(8, { message: 'La contrasena debe tener al menos 8 caracteres.' })
  @Matches(PASSWORD_STRENGTH_REGEX, {
    message:
      'La contrasena debe incluir al menos una mayuscula, una minuscula, un numero y un caracter especial.',
  })
  newPassword!: string;
}
