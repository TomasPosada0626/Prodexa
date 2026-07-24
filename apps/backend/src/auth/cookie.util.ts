import { CookieOptions, Response } from 'express';
import { AuthTokens } from './types';

const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite:
      (process.env.COOKIE_SAMESITE as CookieOptions['sameSite']) ?? 'lax',
    path: '/',
  };
}

export function setAuthCookies(res: Response, tokens: AuthTokens): void {
  const ttlDays = Number(process.env.JWT_REFRESH_TTL_DAYS ?? 30);

  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...baseCookieOptions(),
    maxAge: 15 * 60 * 1000,
  });
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...baseCookieOptions(),
    path: '/api/v1/auth',
    maxAge: ttlDays * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, baseCookieOptions());
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    ...baseCookieOptions(),
    path: '/api/v1/auth',
  });
}

export { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE };
