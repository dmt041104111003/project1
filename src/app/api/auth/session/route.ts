import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/api/auth/_lib/helpers';

export async function GET(request: NextRequest) {
  return requireAuth(request, async (_, user) => {
    return NextResponse.json({
      authenticated: true,
      address: user.address,
    });
  });
}
