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
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';
import { OrganizationsService } from './organizations.service';

/** Gestionar el equipo (invitar, cambiar roles, remover) es solo para ADMIN/COORDINADOR. */
const PUEDE_GESTIONAR_EQUIPO = ['ADMIN', 'COORDINADOR'] as const;

@ApiTags('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('members')
  @ApiOperation({ summary: 'Listar los miembros activos de la empresa' })
  listMembers(@CurrentUser() user: RequestUser) {
    return this.organizationsService.listMembers(user.organizationId);
  }

  @Patch('settings')
  @Roles(...PUEDE_GESTIONAR_EQUIPO)
  @ApiOperation({
    summary:
      'Actualizar las tarifas por hora (mano de obra, energia) de la empresa',
  })
  updateSettings(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateOrganizationSettingsDto,
  ) {
    return this.organizationsService.updateSettings(user.organizationId, dto);
  }

  @Patch('members/:id/role')
  @Roles(...PUEDE_GESTIONAR_EQUIPO)
  @ApiOperation({ summary: 'Cambiar el rol de un miembro de la empresa' })
  @ApiParam({ name: 'id', description: 'Id del usuario miembro' })
  updateMemberRole(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.organizationsService.updateMemberRole(
      user.organizationId,
      id,
      user.id,
      dto,
    );
  }

  @Delete('members/:id')
  @Roles(...PUEDE_GESTIONAR_EQUIPO)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover a un miembro de la empresa' })
  @ApiParam({ name: 'id', description: 'Id del usuario miembro' })
  removeMember(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.organizationsService.removeMember(
      user.organizationId,
      id,
      user.id,
    );
  }

  @Post('invitations')
  @Roles(...PUEDE_GESTIONAR_EQUIPO)
  @ApiOperation({
    summary: 'Generar un link de invitacion para sumar gente a la empresa',
  })
  createInvitation(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.organizationsService.createInvitation(
      user.organizationId,
      user.id,
      dto,
    );
  }

  @Get('invitations')
  @Roles(...PUEDE_GESTIONAR_EQUIPO)
  @ApiOperation({ summary: 'Listar las invitaciones vigentes de la empresa' })
  listPendingInvitations(@CurrentUser() user: RequestUser) {
    return this.organizationsService.listPendingInvitations(
      user.organizationId,
    );
  }

  @Delete('invitations/:id')
  @Roles(...PUEDE_GESTIONAR_EQUIPO)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revocar una invitacion antes de que se use' })
  @ApiParam({ name: 'id', description: 'Id de la invitacion' })
  revokeInvitation(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.organizationsService.revokeInvitation(user.organizationId, id);
  }
}
