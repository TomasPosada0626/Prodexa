import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/types';
import { SuppliersService } from './suppliers.service';

@ApiTags('suppliers')
@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @ApiOperation({
    summary:
      'Listar los proveedores de la empresa con su historial de precios, para comparar cual conviene',
  })
  findAll(@CurrentUser() user: RequestUser) {
    return this.suppliersService.listForOrganization(user.organizationId);
  }
}
