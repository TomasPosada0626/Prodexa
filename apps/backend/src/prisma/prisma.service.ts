import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

type QueryExtensionArgs = {
  operation: string;
  args: unknown;
  query: (args: unknown) => Promise<unknown>;
};

// Operaciones de solo lectura -- las unicas candidatas a reintentar. Una escritura
// (create/update/delete/upsert/executeRaw/...) nunca se reintenta a ciegas: si el
// error de conexion llego DESPUES de que el servidor ya aplico el cambio (la
// confirmacion se perdio en la red, no la operacion), reintentarla la duplicaria.
const READ_OPERATIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);

// Codigos de Prisma que significan "no se llego ni a adquirir una conexion" --
// seguros de reintentar porque la operacion nunca toco la base de datos. P1017 (el
// servidor cerro la conexion a mitad de camino) queda deliberadamente afuera: ahi si
// hay ambiguedad real sobre si el servidor ya proceso algo.
const RETRYABLE_CODES = new Set(['P1001', 'P1002', 'P2024']);
const RETRY_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 100;

function isRetryableConnectionError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    RETRYABLE_CODES.has(err.code)
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Extraida del $extends de mas abajo para poder probar el algoritmo de reintento
// (cuenta de intentos, backoff exponencial, que solo reintente errores de conexion)
// sin necesitar una base de datos real ni el motor de Prisma de por medio.
export async function executeWithRetry<T>(
  operation: string,
  query: () => Promise<T>,
  logger: Pick<Logger, 'warn'>,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await query();
    } catch (err) {
      if (attempt >= RETRY_MAX_ATTEMPTS || !isRetryableConnectionError(err)) {
        throw err;
      }
      const delayMs = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      logger.warn(
        `${operation}: fallo transitorio de conexion (intento ${attempt}/${RETRY_MAX_ATTEMPTS}), reintentando en ${delayMs}ms`,
      );
      await sleep(delayMs);
    }
  }
}

// Separada del $extends de mas abajo para poder probar ambas ramas (lectura vs
// escritura) sin pasar por el motor real de Prisma -- un mock de `query` alcanza.
export function createQueryHandler(logger: Pick<Logger, 'warn'>) {
  return ({ operation, query, args }: QueryExtensionArgs) =>
    READ_OPERATIONS.has(operation)
      ? executeWithRetry(operation, () => query(args), logger)
      : query(args);
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

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

    // Prisma ya no tiene $use (middleware, removido) -- $extends es la unica forma
    // real de envolver toda operacion sin tocar cada uno de los servicios que usan
    // este cliente. El mismo tipo de fallo transitorio de conexion causo el
    // ECONNREFUSED de docs/observability/known-gaps.md (Docker Desktop caido,
    // Postgres momentaneamente inalcanzable); esto lo absorbe solo en vez de
    // convertirse en un 500 real. El constructor devuelve el cliente extendido en
    // vez de `this` -- verificado que $extends preserva los metodos de esta
    // subclase (onModuleInit/onModuleDestroy siguen funcionando con la instancia
    // devuelta, ver prisma.service.spec.ts).
    return this.$extends({
      query: {
        $allModels: {
          $allOperations: createQueryHandler(this.logger),
        },
      },
    }) as unknown as PrismaService;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
