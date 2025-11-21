import { NextRequest, NextResponse } from 'next/server';

const VERIFICATION_API_URL = process.env.VERIFICATION_API_URL || 'http://localhost:5000';

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
      const response = await fetch(`${VERIFICATION_API_URL}/ocr/extract`, {
        method: 'POST',
        body: pythonFormData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Lỗi OCR từ API Python' }));
        return NextResponse.json(
          { error: errorData.error || 'Lỗi OCR từ API Python' },
          { status: response.status }
        );
      }

      const data = await response.json();

      if (!data.success || !data.data) {
        return NextResponse.json(
          { error: 'Không đọc được thông tin từ ảnh' },
          { status: 500 }
        );
      }

      if (data.data.expiry_status === 'expired') {
        return NextResponse.json(
          { 
            error: 'CCCD không chuẩn vì hết hiệu lực',
            expiry_message: data.data.expiry_message 
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        id_number: data.data.id_number,
        name: data.data.name,
        date_of_birth: data.data.date_of_birth,
        gender: data.data.gender,
        nationality: data.data.nationality,
        date_of_expiry: data.data.date_of_expiry,
        expiry_status: data.data.expiry_status,
        expiry_message: data.data.expiry_message,
      });
    } catch (error: unknown) {
      console.error('OCR API Error:', error);
      return NextResponse.json(
        { error: (error as Error).message || 'Lỗi khi xử lý OCR' },
        { status: 500 }
      );
    }
}