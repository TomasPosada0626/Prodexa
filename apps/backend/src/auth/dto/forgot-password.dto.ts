import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Correo de la cuenta a recuperar' })
  @IsEmail()
  email!: string;
}
