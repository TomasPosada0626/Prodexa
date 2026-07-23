import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import type { Logger } from 'pino';

/** request.id y request.log los asigna pino-http (ver common/logger/pino.config.ts):
 * id es el correlation id, log es el logger de esta request especifica. */
type RequestWithId = Request & { id?: string; log?: Logger };

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // El cliente siempre recibe el mismo mensaje generico para un error no-HTTP (nunca se
    // expone el detalle interno) — pero el detalle real SI queda logueado del lado del
    // servidor, con el mismo requestId que ve el cliente, para poder diagnosticarlo sin
    // adivinar. Antes de este fix, un 500 no-HTTP no dejaba ningun rastro de su causa real
    // (ver docs/observability/known-gaps.md).
    if (!isHttp) {
      request.log?.error({ err: exception }, 'Excepcion no controlada');
    }

    const base = {
      code: isHttp ? 'HTTP_ERROR' : 'INTERNAL_SERVER_ERROR',
      message: isHttp ? exception.message : 'Error interno del servidor',
      path: request.url,
      requestId: request.id,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(base);
  }
}
