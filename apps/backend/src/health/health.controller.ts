import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Endpoints de infraestructura, fuera del prefijo /api/v1 (ver setGlobalPrefix
 * en main.ts) porque orquestadores y balanceadores los golpean sin versionar.
 * Sin rate limiting: un orquestador puede sondear cada pocos segundos.
 */
@ApiExcludeController()
@SkipThrottle()
@Controller()
export class HealthController {
  private readonly startedAt = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  /** Liveness: el proceso esta arriba y respondiendo. No depende de nada externo. */
  @Get('health')
  liveness() {
    return {
      status: 'ok',
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  /** Readiness: el proceso puede atender trafico real (la base de datos responde). */
  @Get('ready')
  async readiness(@Res() res: Response) {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      res.status(HttpStatus.OK).json({
        status: 'ok',
        checks: { database: 'ok' },
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'error',
        checks: { database: 'error' },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
