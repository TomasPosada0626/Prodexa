import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({
    description: 'Nombre del proveedor',
    example: 'Distribuidora XYZ',
  })
  @IsString()
  @IsNotEmpty()
  nombre!: string;
}
