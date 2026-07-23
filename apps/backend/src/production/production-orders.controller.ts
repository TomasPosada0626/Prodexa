import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/types';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { UpdateProductionOrderDto } from './dto/update-production-order.dto';
import { CreatePagoDto } from './dto/create-pago.dto';
import { ProductionOrdersService } from './production-orders.service';

/** Anular un lote o borrar un abono es irreversible y afecta directamente costo/ingreso/cartera
 * ya registrados: se restringe a quien administra o coordina, igual que editar formulaciones. */
const PUEDE_ANULAR = ['ADMIN', 'COORDINADOR'] as const;

@ApiTags('production-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('production-orders')
export class ProductionOrdersController {
  constructor(
    private readonly productionOrdersService: ProductionOrdersService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar una orden de produccion (lote realmente producido)',
  })
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateProductionOrderDto,
  ) {
    return this.productionOrdersService.create(
      user.id,
      user.organizationId,
      dto,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Listar ordenes de produccion de la empresa, mas reciente primero',
  })
  @ApiQuery({ name: 'formulationId', required: false })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('formulationId') formulationId?: string,
  ) {
    return this.productionOrdersService.findAll(
      user.organizationId,
      formulationId,
    );
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Corregir una orden de produccion ya registrada',
  })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductionOrderDto,
  ) {
    return this.productionOrdersService.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @Roles(...PUEDE_ANULAR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Anular una orden de produccion registrada por error',
  })
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.productionOrdersService.remove(
      user.organizationId,
      id,
      user.id,
    );
  }

  @Post(':id/pagos')
  @ApiOperation({
    summary:
      'Registrar un abono/pago parcial contra un lote (recalcula PENDIENTE/PARCIAL/PAGADO)',
  })
  addPago(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: CreatePagoDto,
  ) {
    return this.productionOrdersService.addPago(user.organizationId, id, dto);
  }

  @Get(':id/pagos')
  @ApiOperation({ summary: 'Listar los abonos registrados de un lote' })
  listPagos(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.productionOrdersService.listPagos(user.organizationId, id);
  }

  @Delete(':id/pagos/:pagoId')
  @Roles(...PUEDE_ANULAR)
  @ApiOperation({
    summary: 'Borrar un abono mal ingresado (recalcula el estado del lote)',
  })
  removePago(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('pagoId') pagoId: string,
  ) {
    return this.productionOrdersService.removePago(
      user.organizationId,
      id,
      pagoId,
      user.id,
    );
  }
}
