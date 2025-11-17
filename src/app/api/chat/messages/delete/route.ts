import { NextRequest, NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, remove } from 'firebase/database';
import { requireAuth } from '@/app/api/auth/_lib/helpers';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export async function DELETE(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      const { messageId, roomId } = await req.json();

    if (!messageId || !roomId) {
      return NextResponse.json({ error: 'Message ID và Room ID là bắt buộc' }, { status: 400 });
    }

    const messageRef = ref(database, `chats/${roomId}/messages/${messageId}`);
    
    await remove(messageRef);

      return NextResponse.json({ success: true, message: 'Đã xóa tin nhắn thành công' });
    } catch {
      return NextResponse.json({ error: 'Không thể xóa tin nhắn' }, { status: 500 });
    }
  });
}

