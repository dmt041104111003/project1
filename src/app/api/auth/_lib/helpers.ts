import 'server-only';
import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
} from './jwt';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

type AuthResult = {
  address: string;
  tokensToSet?: {
    accessToken: string;
    refreshToken: string;
    csrfToken: string;
  };
};

function authenticate(request: NextRequest): AuthResult | null {
  const accessToken = request.cookies.get('auth_token')?.value;
  if (accessToken) {
    const payload = verifyAccessToken(accessToken);
    if (payload?.address) {
      return { address: payload.address };
    }
  }

  const refreshToken = request.cookies.get('refresh_token')?.value;
  if (!refreshToken) {
    return null;
  }

  const refreshPayload = verifyRefreshToken(refreshToken);
  if (!refreshPayload?.address) {
    return null;
  }

  const address = refreshPayload.address;
  const newAccessToken = generateAccessToken(address);
  const existingRefreshToken = refreshToken; // Giữ nguyên refresh token
  const existingCsrfToken = request.cookies.get('csrf_token')?.value || randomBytes(32).toString('hex');

  return {
    address,
    tokensToSet: {
      accessToken: newAccessToken,
      refreshToken: existingRefreshToken,
      csrfToken: existingCsrfToken,
    },
  };
}

function validateCsrf(request: NextRequest): boolean {
  const method = request.method.toUpperCase();
  if (SAFE_METHODS.has(method)) {
    return true;
  }

  const csrfCookie = request.cookies.get('csrf_token')?.value;
  const csrfHeader = request.headers.get('x-csrf-token');

  return Boolean(csrfCookie && csrfHeader && csrfCookie === csrfHeader);
}

export async function requireAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: { address: string }) => Promise<NextResponse>
): Promise<NextResponse> {
  const authResult = authenticate(request);

  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!validateCsrf(request)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  const response = await handler(request, { address: authResult.address });

  if (authResult.tokensToSet) {
    const isProduction = process.env.NODE_ENV === 'production';

    response.cookies.set({
      name: 'auth_token',
      value: authResult.tokensToSet.accessToken,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    response.cookies.set({
      name: 'refresh_token',
      value: authResult.tokensToSet.refreshToken,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    response.cookies.set({
      name: 'csrf_token',
      value: authResult.tokensToSet.csrfToken,
      httpOnly: false,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  }

  return response;
}
