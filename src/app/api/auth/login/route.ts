import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { verifyAptosSignature } from '@/app/api/auth/_lib/signature';
import { generateAccessToken, generateRefreshToken, ACCESS_TOKEN_MAX_AGE, REFRESH_TOKEN_MAX_AGE } from '@/app/api/auth/_lib/jwt';
import { getNonce, deleteNonce } from '@/app/api/auth/_lib/nonce-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, signature, publicKey, fullMessage, message, nonce } = body;
    
    if (!address || !signature || !publicKey || !fullMessage) {
      return NextResponse.json(
        { error: 'Missing required fields: address, signature, publicKey, fullMessage' },
        { status: 400 }
      );
    }
    
    const normalizedAddress = address.toLowerCase();
    
    const nonceToCheck = nonce || (message ? message.match(/^Log in with (.+)$/)?.[1] : null);
    
    if (!nonceToCheck) {
      return NextResponse.json(
        { error: 'Invalid message format or missing nonce' },
        { status: 400 }
      );
    }
    
    const storedData = getNonce(normalizedAddress);
    
    console.log('Login attempt:', {
      address: normalizedAddress,
      nonce: nonceToCheck,
      storedNonce: storedData?.nonce,
      hasStoredData: !!storedData,
    });
    
    if (!storedData || storedData.nonce !== nonceToCheck) {
      console.error('Nonce mismatch:', {
        expected: storedData?.nonce,
        received: nonceToCheck,
      });
      return NextResponse.json(
        { error: 'Invalid or expired nonce' },
        { status: 401 }
      );
    }
    
    const nonceAge = Date.now() - storedData.timestamp;
    if (nonceAge > 5 * 60 * 1000) {
      deleteNonce(normalizedAddress);
      return NextResponse.json(
        { error: 'Nonce expired' },
        { status: 401 }
      );
    }
    
    console.log('Verifying signature:', {
      fullMessage: fullMessage.substring(0, 50) + '...',
      fullMessageLength: fullMessage.length,
      signature: signature.substring(0, 20) + '...',
      publicKey: publicKey.substring(0, 20) + '...',
    });
    
    const isValid = verifyAptosSignature(fullMessage, signature, publicKey);
    
    if (!isValid) {
      console.error('Signature verification failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
    
    const accessToken = generateAccessToken(normalizedAddress);
    const refreshToken = generateRefreshToken(normalizedAddress);
    const csrfToken = randomBytes(32).toString('hex');
    const response = NextResponse.json({
      success: true,
      address: normalizedAddress,
    });

    const isProduction = process.env.NODE_ENV === 'production';

    response.cookies.set({
      name: 'auth_token',
      value: accessToken,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    response.cookies.set({
      name: 'refresh_token',
      value: refreshToken,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    response.cookies.set({
      name: 'csrf_token',
      value: csrfToken,
      httpOnly: false,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
    
    deleteNonce(normalizedAddress);
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


