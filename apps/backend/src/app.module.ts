import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
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
