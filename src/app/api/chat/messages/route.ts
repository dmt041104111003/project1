import { NextRequest, NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onValue, off, serverTimestamp } from 'firebase/database';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId') || 'general';

    return new Promise((resolve) => {
      const messagesRef = ref(database, `chats/${roomId}/messages`);
      
      onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        let messages: any[] = [];
        
        if (data) {
          messages = Object.entries(data).map(([id, message]: [string, any]) => ({
            id,
            text: message.text,
            sender: message.sender,
            timestamp: message.timestamp,
            senderId: message.senderId,
          }));
          
          messages.sort((a, b) => a.timestamp - b.timestamp);
        }
        
        off(messagesRef, 'value');
        resolve(NextResponse.json({ messages }));
      });
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { roomId, text, sender, senderId } = await request.json();

    if (!text || !sender || !senderId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const messagesRef = ref(database, `chats/${roomId || 'general'}/messages`);
    
    const newMessage = {
      text: text.trim(),
      sender,
      senderId,
      timestamp: serverTimestamp(),
    };

    await push(messagesRef, newMessage);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
