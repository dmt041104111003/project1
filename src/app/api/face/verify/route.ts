import { NextRequest, NextResponse } from 'next/server';

const VERIFICATION_API_URL = process.env.NEXT_PUBLIC_FACE_API_BASE_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
    try {
      const formData = await request.formData();
      const imageFile = formData.get('image') as File | null;
      const sessionId = formData.get('session_id') as string | null;

      if (!imageFile) {
        return NextResponse.json(
          { error: 'Không có ảnh' },
          { status: 400 }
        );
      }

      if (!sessionId) {
        return NextResponse.json(
          { error: 'Không có session_id' },
          { status: 400 }
        );
      }

      console.debug('[Face Verify] Proceeding with face matching...');
      const verifyFormData = new FormData();
      verifyFormData.append('image', imageFile);
      verifyFormData.append('session_id', sessionId);

      const verifyResponse = await fetch(`${VERIFICATION_API_URL}/face/verify`, {
        method: 'POST',
        body: verifyFormData,
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json().catch(() => ({ error: 'Lỗi từ API Python (face matching)' }));
        return NextResponse.json(
          { error: errorData.error || 'Lỗi khi kiểm tra face matching' },
          { status: verifyResponse.status }
        );
      }

      const verifyData = await verifyResponse.json();

      return NextResponse.json({
        success: verifyData.success,
        verified: verifyData.verified,
        similarity: verifyData.similarity,
        threshold: verifyData.threshold,
        message: verifyData.message,
      });
    } catch (error: unknown) {
      console.error('Face Verify API Error:', error);
      return NextResponse.json(
        { error: (error as Error).message || 'Lỗi khi xử lý face verification' },
        { status: 500 }
      );
    }
}

