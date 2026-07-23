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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/types';
import { CreateFormulationDto } from './dto/create-formulation.dto';
import { UpdateFormulationDto } from './dto/update-formulation.dto';
import { UpdateIngredientPriceDto } from './dto/update-ingredient-price.dto';
import { FormulationsService } from './formulations.service';

/** Solo ADMIN/COORDINADOR pueden crear/editar/eliminar formulaciones. MIEMBRO solo lee. */
const PUEDE_EDITAR_FORMULAS = ['ADMIN', 'COORDINADOR'] as const;

@ApiTags('formulations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('formulations')
export class FormulationsController {
  constructor(private readonly formulationsService: FormulationsService) {}

  @Post()
  @Roles(...PUEDE_EDITAR_FORMULAS)
  @ApiOperation({
    summary: 'Crear una nueva formulacion con sus ingredientes y preparacion',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Formulacion creada',
  })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateFormulationDto) {
    return this.formulationsService.create(user.id, user.organizationId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar las formulaciones de la empresa del usuario autenticado',
  })
  @ApiQuery({
    name: 'incluirArchivadas',
    required: false,
    description: 'Si es "true", incluye tambien las formulaciones archivadas',
  })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('incluirArchivadas') incluirArchivadas?: string,
  ) {
    return this.formulationsService.findAll(
      user.organizationId,
      incluirArchivadas === 'true',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una formulacion por id' })
  @ApiParam({ name: 'id', description: 'Id de la formulacion' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Formulacion no encontrada',
  })
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.formulationsService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  @Roles(...PUEDE_EDITAR_FORMULAS)
  @ApiOperation({
    summary:
      'Actualizar nombre, registro sanitario, preparacion o margenes de una formulacion',
  })
  @ApiParam({ name: 'id', description: 'Id de la formulacion' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Formulacion no encontrada',
  })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateFormulationDto,
  ) {
    return this.formulationsService.update(
      user.organizationId,
      id,
      dto,
      user.id,
    );
  }

  @Delete(':id')
  @Roles(...PUEDE_EDITAR_FORMULAS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una formulacion' })
  @ApiParam({ name: 'id', description: 'Id de la formulacion' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Formulacion no encontrada',
  })
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.formulationsService.remove(user.organizationId, id);
  }

  @Patch(':id/ingredients/:ingredientId/price')
  @Roles(...PUEDE_EDITAR_FORMULAS)
  @ApiOperation({
    summary:
      'Actualizar el precio de un ingrediente (registra el cambio en el historial)',
  })
  @ApiParam({ name: 'id', description: 'Id de la formulacion' })
  @ApiParam({ name: 'ingredientId', description: 'Id del ingrediente' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Formulacion o ingrediente no encontrado',
  })
  updateIngredientPrice(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('ingredientId') ingredientId: string,
    @Body() dto: UpdateIngredientPriceDto,
  ) {
    return this.formulationsService.updateIngredientPrice(
      user.organizationId,
      id,
      ingredientId,
      dto,
      user.id,
    );
  }

  @Get(':id/ingredients/:ingredientId/price-history')
  @ApiOperation({ summary: 'Historial de precios de un ingrediente' })
  @ApiParam({ name: 'id', description: 'Id de la formulacion' })
  @ApiParam({ name: 'ingredientId', description: 'Id del ingrediente' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Formulacion o ingrediente no encontrado',
  })
  getIngredientPriceHistory(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('ingredientId') ingredientId: string,
  ) {
    return this.formulationsService.getIngredientPriceHistory(
      user.organizationId,
      id,
      ingredientId,
    );
  }

  @Get(':id/versions')
  @ApiOperation({
    summary: 'Historial de versiones (snapshots completos) de una formulacion',
  })
  @ApiParam({ name: 'id', description: 'Id de la formulacion' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Formulacion no encontrada',
  })
  getVersions(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.formulationsService.getVersions(user.organizationId, id);
  }
}
