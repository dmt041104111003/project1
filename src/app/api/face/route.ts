import { NextRequest, NextResponse } from 'next/server';

const VERIFICATION_API_URL = process.env.VERIFICATION_API_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const action = formData.get('action') as string || 'upload_id_card';

    if (!imageFile) {
      return NextResponse.json(
        { error: 'Không có ảnh' },
        { status: 400 }
      );
    }

    const pythonFormData = new FormData();
    pythonFormData.append('image', imageFile);

    let endpoint = '';
    if (action === 'upload_id_card') {
      endpoint = '/face/upload_id_card';
    } else if (action === 'verify') {
      endpoint = '/face/verify';
      const sessionId = formData.get('session_id') as string;
      if (!sessionId) {
        return NextResponse.json(
          { error: 'Không có session_id' },
          { status: 400 }
        );
      }
      pythonFormData.append('session_id', sessionId);
    } else {
      return NextResponse.json(
        { error: 'Action không hợp lệ' },
        { status: 400 }
      );
    }

    const response = await fetch(`${VERIFICATION_API_URL}${endpoint}`, {
      method: 'POST',
      body: pythonFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Lỗi từ API Python' }));
      return NextResponse.json(
        { error: errorData.error || 'Lỗi từ API Python' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);

  } catch (error: unknown) {
    console.error('Face Verification API Error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Lỗi khi xử lý face verification' },
      { status: 500 }
    );
  }
}

