import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
        // Sin esto, pg.Pool corre con su default (10) sin que nadie lo haya elegido a
        // proposito. La prueba de carga real (docs/testing/load-testing.md) encontro el
        // costo concreto: a 100 conexiones concurrentes contra POST /simulations, la
        // latencia media se disparo de 27ms a 174ms (6x) porque las peticiones se
        // encolaban esperando una conexion libre del pool, no porque el calculo en si
        // fuera lento (GET /health, que no toca Postgres, se mantuvo igual de rapido a
        // esa misma concurrencia). 20 es un numero elegido con esos datos, no el default
        // sin revisar -- configurable porque el numero correcto real depende del limite
        // de conexiones del Postgres de destino (el plan gratuito de Render lo limita).
        max: Number(process.env.DATABASE_POOL_MAX ?? 20),
      }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
