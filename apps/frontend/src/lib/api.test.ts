import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, getFormulations, login } from './api';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('request (401 retry-via-refresh)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('login con credenciales invalidas no reintenta via /auth/refresh (su 401 no es un access token vencido)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(401, { message: 'Credenciales invalidas.' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(login({ email: 'a@a.com', password: 'mala' })).rejects.toBeInstanceOf(ApiError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('/auth/login');
  });

  it('un endpoint autenticado con 401 si reintenta tras refrescar la sesion', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { message: 'No autorizado.' }))
      .mockResolvedValueOnce(jsonResponse(200, {}))
      .mockResolvedValueOnce(jsonResponse(200, []));
    vi.stubGlobal('fetch', fetchMock);

    await getFormulations();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const urls = fetchMock.mock.calls.map((call) => call[0] as string);
    expect(urls[1]).toContain('/auth/refresh');
  });

  it('dos llamadas paralelas con 401 a la vez comparten un solo refresh, no uno cada una', async () => {
    // El refresh token es rotatorio: si cada llamada dispara su propio /auth/refresh, la
    // primera invalida el token para la segunda. Con el access token vencido y varios
    // widgets pidiendo datos al montar el Dashboard, esto pasaba en producción.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { message: 'No autorizado.' }))
      .mockResolvedValueOnce(jsonResponse(401, { message: 'No autorizado.' }))
      .mockResolvedValueOnce(jsonResponse(200, {}))
      .mockResolvedValueOnce(jsonResponse(200, []))
      .mockResolvedValueOnce(jsonResponse(200, []));
    vi.stubGlobal('fetch', fetchMock);

    await Promise.all([getFormulations(), getFormulations()]);

    const refreshCalls = fetchMock.mock.calls.filter((call) => (call[0] as string).includes('/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});
