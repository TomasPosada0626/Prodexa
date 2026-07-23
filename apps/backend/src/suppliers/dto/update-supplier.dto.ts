import { PickType } from '@nestjs/swagger';
import { CreateSupplierDto } from './create-supplier.dto';

export class UpdateSupplierDto extends PickType(CreateSupplierDto, [
  'nombre',
] as const) {}
