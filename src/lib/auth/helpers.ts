import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './jwt';

export function verifyAuth(request: NextRequest): { address: string } | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  
  if (!payload || !payload.address) {
    return null;
  }
  
  return { address: payload.address };
}

export function requireAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: { address: string }) => Promise<NextResponse>
): Promise<NextResponse> {
  const user = verifyAuth(request);
  
  if (!user) {
    return Promise.resolve(
      NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    );
  }
  
  return handler(request, user);
}

