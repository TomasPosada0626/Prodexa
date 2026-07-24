import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';
import { PASSWORD_STRENGTH_REGEX } from './register.dto';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Correo de la cuenta a recuperar' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Codigo de 6 digitos enviado por correo' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'El codigo debe tener 6 digitos.' })
  code!: string;

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
