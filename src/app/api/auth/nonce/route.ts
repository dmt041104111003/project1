import { NextRequest, NextResponse } from 'next/server';
import { generateNonce } from '@/lib/auth/signature';
import { setNonce } from '@/lib/auth/nonce-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    
    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }
    
    const normalizedAddress = address.toLowerCase();
    
    const nonce = generateNonce();
    setNonce(normalizedAddress, nonce);
    
    const message = `Log in with ${nonce}`;
    
    return NextResponse.json({
      nonce,
      message,
    });
  } catch (error) {
    console.error('Error generating nonce:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

