import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({
    description:
      'Contrasena actual del usuario, para confirmar la eliminacion.',
  })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
