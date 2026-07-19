import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { method: string; url: string }>();
    const started = Date.now();

    return next.handle().pipe(
      tap(() => {
        const elapsed = Date.now() - started;
        this.logger.log(`${request.method} ${request.url} ${elapsed}ms`);
      }),
    );
  }
}
