import { JwtStrategy, extractFromCookie } from './jwt.strategy';

describe('extractFromCookie', () => {
  it('devuelve el access_token cuando la cookie existe', () => {
    const req = { cookies: { access_token: 'token-123' } } as never;
    expect(extractFromCookie(req)).toBe('token-123');
  });

  it('devuelve null cuando no hay cookies', () => {
    const req = {} as never;
    expect(extractFromCookie(req)).toBeNull();
  });

  it('devuelve null cuando la cookie de access_token no esta presente', () => {
    const req = { cookies: {} } as never;
    expect(extractFromCookie(req)).toBeNull();
  });
});

describe('JwtStrategy', () => {
  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'test-secret';
  });

  it('validate mapea el payload del JWT al RequestUser', () => {
    const strategy = new JwtStrategy();

    const result = strategy.validate({
      sub: 'user-1',
      email: 'a@a.com',
      organizationId: 'org-1',
      rol: 'ADMIN',
    });

    expect(result).toEqual({
      id: 'user-1',
      email: 'a@a.com',
      organizationId: 'org-1',
      rol: 'ADMIN',
    });
  });

  it('sin JWT_ACCESS_SECRET configurado, cae al string vacio por defecto y passport-jwt rechaza construirse', () => {
    // Documenta el comportamiento real: `?? ''` evita un `undefined`, pero passport-jwt
    // igual exige un secreto no vacio, asi que en produccion esto fallaria en el arranque
    // (rapido y ruidoso) en vez de arrancar con un secreto invalido silenciosamente.
    const previo = process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_ACCESS_SECRET;

    expect(() => new JwtStrategy()).toThrow('secret or key');

    process.env.JWT_ACCESS_SECRET = previo;
  });
});
