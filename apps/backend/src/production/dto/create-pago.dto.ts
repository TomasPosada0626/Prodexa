import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreatePagoDto {
  @ApiProperty({ description: 'Monto abonado a este lote', example: 50000 })
  @IsNumber()
  @Min(0.01)
  monto!: number;

  @ApiPropertyOptional({
    description: 'Fecha del abono. Si no se envia, se usa la fecha actual.',
  })
  @IsOptional()
  @IsDateString()
  fecha?: string;
}
