import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/types';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

/** Crear/renombrar/eliminar un proveedor es solo para ADMIN/COORDINADOR; cualquiera de la
 * empresa puede ver la comparacion de precios. */
const PUEDE_GESTIONAR_PROVEEDORES = ['ADMIN', 'COORDINADOR'] as const;

@ApiTags('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
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

  @Post()
  @Roles(...PUEDE_GESTIONAR_PROVEEDORES)
  @ApiOperation({
    summary:
      'Crear un proveedor manualmente (antes de tener un precio registrado)',
  })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(user.organizationId, dto.nombre);
  }

  @Patch(':id')
  @Roles(...PUEDE_GESTIONAR_PROVEEDORES)
  @ApiOperation({ summary: 'Renombrar un proveedor' })
  @ApiParam({ name: 'id', description: 'Id del proveedor' })
  rename(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.rename(user.organizationId, id, dto.nombre);
  }

  @Delete(':id')
  @Roles(...PUEDE_GESTIONAR_PROVEEDORES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Eliminar un proveedor (su historial de precios se conserva, solo pierde el enlace formal)',
  })
  @ApiParam({ name: 'id', description: 'Id del proveedor' })
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.suppliersService.remove(user.organizationId, id);
  }
}
