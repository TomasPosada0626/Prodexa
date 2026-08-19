import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SentryModule } from '@sentry/nestjs/setup';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { FormulationsModule } from './formulations/formulations.module';
import { SimulationModule } from './simulation/simulation.module';
import { ProductionOrdersModule } from './production/production-orders.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { UploadsModule } from './uploads/uploads.module';
import { AuditModule } from './audit/audit.module';
import { HealthModule } from './health/health.module';
import { SuppliersModule } from './suppliers/suppliers.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    // GLOBAL_THROTTLE_LIMIT existe solo para poder correr una prueba de carga real
    // (docs/testing/load-testing.md) sin que el limite global de 60/min por IP la tape
    // antes de medir nada -- mismo patron que AUTH_THROTTLE_LIMIT en auth.controller.ts.
    // Sin la variable, el default de produccion sigue siendo 60, sin cambios.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: Number(process.env.GLOBAL_THROTTLE_LIMIT ?? 60),
      },
    ]),
    PrismaModule,
    AuditModule,
    AuthModule,
    FormulationsModule,
    SimulationModule,
    ProductionOrdersModule,
    OrganizationsModule,
    UploadsModule,
    SuppliersModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
