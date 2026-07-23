import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { RequestUser } from './types';

export function extractCurrentUser(
  _data: unknown,
  ctx: ExecutionContext,
): RequestUser {
  const request = ctx
    .switchToHttp()
    .getRequest<Request & { user: RequestUser }>();
  return request.user;
}

export const CurrentUser = createParamDecorator(extractCurrentUser);
