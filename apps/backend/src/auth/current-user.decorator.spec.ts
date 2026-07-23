import { ExecutionContext } from '@nestjs/common';
import { extractCurrentUser } from './current-user.decorator';

describe('extractCurrentUser', () => {
  it('devuelve el usuario adjuntado al request por JwtAuthGuard', () => {
    const user = { id: 'user-1', email: 'a@a.com' };
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;

    expect(extractCurrentUser(undefined, ctx)).toBe(user);
  });
});
