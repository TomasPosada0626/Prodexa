import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Correo del usuario' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Contrasena' })
  @IsString()
  password!: string;
}
