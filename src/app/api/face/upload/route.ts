import { NextRequest, NextResponse } from 'next/server';

const VERIFICATION_API_URL = process.env.NEXT_PUBLIC_FACE_API_BASE_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
    try {
      const formData = await request.formData();
      const imageFile = formData.get('image') as File | null;

      if (!imageFile) {
        return NextResponse.json(
          { error: 'Không có ảnh' },
          { status: 400 }
        );
      }

      const pythonFormData = new FormData();
      pythonFormData.append('image', imageFile);

      const response = await fetch(`${VERIFICATION_API_URL}/face/upload_id_card`, {
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
      console.error('Face Upload API Error:', error);
      return NextResponse.json(
        { error: (error as Error).message || 'Lỗi khi xử lý upload face' },
        { status: 500 }
      );
    }
}

