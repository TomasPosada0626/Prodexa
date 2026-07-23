import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

/** request.id lo asigna pino-http (ver common/logger/pino.config.ts) como correlation id. */
type RequestWithId = Request & { id?: string };

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
