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
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuditService } from '../audit/audit.service';
import { AuditEvent } from '../audit/audit.types';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { RequestUser } from './types';
import {
  clearAuthCookies,
  REFRESH_TOKEN_COOKIE,
  setAuthCookies,
} from './cookie.util';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  @Post('register')
  @Throttle({
    default: {
      limit: () => Number(process.env.AUTH_THROTTLE_LIMIT ?? 5),
      ttl: 60_000,
    },
  })
  @ApiOperation({
    summary: 'Registrar una nueva cuenta (no inicia sesion automaticamente)',
  })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const user = await this.authService.register(dto);
    void this.auditService.log(AuditEvent.REGISTER, {
      userId: user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return user;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: () => Number(process.env.AUTH_THROTTLE_LIMIT ?? 5),
      ttl: 60_000,
    },
  })
  @ApiOperation({ summary: 'Iniciar sesion' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const auditContext = { ip: req.ip, userAgent: req.headers['user-agent'] };
    try {
      const { user, tokens } = await this.authService.login(dto, auditContext);
      setAuthCookies(res, tokens);
      void this.auditService.log(AuditEvent.LOGIN_SUCCESS, {
        userId: user.id,
        ...auditContext,
      });
      return user;
    } catch (error) {
      // Sin userId, LOGIN_FAILED no se puede atribuir a ninguna empresa (ver
      // AuditService.listForOrganization) y quedaria invisible en Auditoria/Dashboard aunque el
      // correo si sea de un miembro real: se busca el userId solo para el log, nunca para la
      // respuesta al cliente (no revela si el correo existe).
      const userId = await this.authService.findUserIdByEmail(dto.email);
      void this.auditService.log(AuditEvent.LOGIN_FAILED, {
        ...auditContext,
        userId,
        metadata: { email: dto.email },
      });
      throw error;
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar sesion usando el refresh token rotatorio' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = (
      req.cookies as Record<string, string> | undefined
    )?.[REFRESH_TOKEN_COOKIE];
    if (!rawRefreshToken) {
      throw new UnauthorizedException('No hay sesion activa.');
    }

    const { user, tokens } = await this.authService.refresh(rawRefreshToken, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    setAuthCookies(res, tokens);
    return user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cerrar sesion y revocar el refresh token' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawRefreshToken = (
      req.cookies as Record<string, string> | undefined
    )?.[REFRESH_TOKEN_COOKIE];
    const { userId } = await this.authService.logout(rawRefreshToken);
    clearAuthCookies(res);
    if (userId) {
      void this.auditService.log(AuditEvent.LOGOUT, {
        userId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener el usuario autenticado actual' })
  me(@CurrentUser() user: RequestUser) {
    return this.authService.me(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Actualizar el perfil del usuario autenticado' })
  updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.id, dto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @Throttle({
    default: {
      limit: () => Number(process.env.AUTH_THROTTLE_LIMIT ?? 5),
      ttl: 60_000,
    },
  })
  @ApiOperation({ summary: 'Cambiar la contrasena del usuario autenticado' })
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    await this.authService.changePassword(user.id, dto);
    void this.auditService.log(AuditEvent.CHANGE_PASSWORD, {
      userId: user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: () => Number(process.env.AUTH_THROTTLE_LIMIT ?? 5),
      ttl: 60_000,
    },
  })
  @ApiOperation({
    summary: 'Solicitar un codigo de recuperacion de contrasena por correo',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    await this.authService.forgotPassword(dto);
    // No revela si el correo existe en la respuesta — el userId solo se busca para
    // poder auditar el evento cuando si existe, mismo patron que LOGIN_FAILED arriba.
    const userId = await this.authService.findUserIdByEmail(dto.email);
    if (userId) {
      void this.auditService.log(AuditEvent.PASSWORD_RESET_REQUESTED, {
        userId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }
    return {
      message: 'Si el correo existe, te enviamos un codigo de recuperacion.',
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({
    default: {
      limit: () => Number(process.env.AUTH_THROTTLE_LIMIT ?? 5),
      ttl: 60_000,
    },
  })
  @ApiOperation({
    summary:
      'Confirmar el codigo de recuperacion y establecer una nueva contrasena',
  })
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    await this.authService.resetPassword(dto);
    const userId = await this.authService.findUserIdByEmail(dto.email);
    if (userId) {
      void this.auditService.log(AuditEvent.PASSWORD_RESET_COMPLETED, {
        userId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Listar las sesiones activas del usuario autenticado',
  })
  listSessions(@CurrentUser() user: RequestUser, @Req() req: Request) {
    const rawRefreshToken = (
      req.cookies as Record<string, string> | undefined
    )?.[REFRESH_TOKEN_COOKIE];
    return this.authService.listSessions(user.id, rawRefreshToken);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Revocar una sesion activa (cierra esa sesion en particular)',
  })
  revokeSession(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.authService.revokeSession(user.id, id);
  }
}
