import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }
  
  const publicRoutes = [
    '/api/ipfs/get',
    '/api/job/list',
    '/api/job/detail'
  ];
  
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );
  
  if (isPublicRoute) {
    console.log('Middleware: Public route, allowing:', request.nextUrl.pathname);
    return NextResponse.next();
  }
  
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const cookies = request.cookies.getAll();
    console.log('Middleware: Request cookies:', cookies);
    
    const nextAuthCookie = cookies.find(c => c.name.includes('next-auth'));
    console.log('Middleware: NextAuth cookie:', nextAuthCookie);
    
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    console.log('Middleware: Checking token for', request.nextUrl.pathname, 'Token:', token);
    
    if (!token) {
      console.log('Middleware: No token found, returning 401');
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in with wallet.' },
        { status: 401 }
      );
    }
    
    console.log('Middleware: Token found, allowing request');
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
