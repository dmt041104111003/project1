import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/api/auth/_lib/helpers';

export async function POST(request: NextRequest) {
  return requireAuth(request, async () => {
    const response = NextResponse.json({ success: true });
    const isProduction = process.env.NODE_ENV === 'production';
    const expired = new Date(0);

    response.cookies.set({
      name: 'auth_token',
      value: '',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      expires: expired,
    });

    response.cookies.set({
      name: 'csrf_token',
      value: '',
      httpOnly: false,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      expires: expired,
    });

    response.cookies.set({
      name: 'refresh_token',
      value: '',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      expires: expired,
    });

    return response;
  });
}


