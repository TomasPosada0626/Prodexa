import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/types';
import { AuditService } from './audit.service';

/** Ver la bitacora de seguridad de la empresa es solo para ADMIN: expone quien entro, cuando, desde donde. */
@ApiTags('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-log')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({
    summary:
      'Listar eventos de seguridad de la empresa (login, logout, registro, cambio de contrasena)',
  })
  list(@CurrentUser() user: RequestUser) {
    return this.auditService.listForOrganization(user.organizationId);
  }
}
