import { NextRequest, NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import { requireAuth } from '@/lib/auth/helpers';

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
  return requireAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    const getRooms = searchParams.get('getRooms');
    const getLastViewed = searchParams.get('getLastViewed');
    const userAddress = searchParams.get('userAddress');

    if (getRooms === 'true') {
      const userAddressForRooms = searchParams.get('userAddress');
      
      if (!userAddressForRooms) {
        return NextResponse.json({ error: 'User address is required' }, { status: 400 });
      }
      
      return new Promise<NextResponse>((resolve) => {
        const roomsRef = ref(database, 'chatRooms');
        let resolved = false;
        
        const unsubscribe = onValue(roomsRef, (snapshot) => {
          if (resolved) return;
          resolved = true;
          
          const data = snapshot.val();
          let rooms: Array<{
            id: string;
            name: string;
            lastMessage: string;
            lastMessageSender?: string;
            lastMessageTime: number;
            chatAccepted: boolean;
            creatorAddress: string;
            participantAddress: string;
          }> = [];
          
          if (data) {
            rooms = Object.entries(data)
              .map(([id, room]) => {
                const roomData = room as Record<string, unknown>;
                return {
                  id,
                  name: roomData.name as string,
                  lastMessage: roomData.lastMessage as string || '',
                  lastMessageSender: roomData.lastMessageSender as string || '',
                  lastMessageTime: 0,
                  chatAccepted: roomData.chatAccepted as boolean,
                  creatorAddress: roomData.creatorAddress as string,
                  participantAddress: roomData.participantAddress as string || ''
                };
              })
              .filter(room => 
                room.creatorAddress.toLowerCase() === userAddressForRooms.toLowerCase() ||
                (room.participantAddress && room.participantAddress.toLowerCase() === userAddressForRooms.toLowerCase())
              );
          }
          
          off(roomsRef, 'value');
          resolve(NextResponse.json({ success: true, rooms }));
        }, (error) => {
          if (resolved) return;
          resolved = true;
          off(roomsRef, 'value');
          resolve(NextResponse.json({ error: 'Không thể lấy danh sách phòng' }, { status: 500 }));
        });
      });
    }

    if (getLastViewed === 'true' && userAddress && roomId) {
      const lastViewedRef = ref(database, `chatLastViewed/${userAddress.toLowerCase()}/${roomId}`);
      
      return new Promise<NextResponse>((resolve) => {
        onValue(lastViewedRef, (snapshot) => {
          const data = snapshot.val();
          off(lastViewedRef, 'value');
          
          resolve(NextResponse.json({ 
            success: true, 
            lastViewed: data || 0 
          }));
        });
      });
    }

    const roomIdForMessages = roomId || 'general';
    return new Promise<NextResponse>((resolve) => {
      const messagesRef = ref(database, `chats/${roomIdForMessages}/messages`);
      let resolved = false;
      
      onValue(messagesRef, (snapshot) => {
        if (resolved) return;
        resolved = true;
        
        const data = snapshot.val();
        let messages: Array<{
          id: string;
          text: string;
          sender: string;
          timestamp: number;
          senderId: string;
          replyTo: string | null;
        }> = [];
        
        if (data) {
          messages = Object.entries(data).map(([id, message]) => ({
            id,
            text: (message as Record<string, unknown>).text as string,
            sender: (message as Record<string, unknown>).sender as string,
            timestamp: (message as Record<string, unknown>).timestamp as number,
            senderId: (message as Record<string, unknown>).senderId as string,
            replyTo: ((message as Record<string, unknown>).replyTo as string) || null,
          }));
          
          messages.sort((a, b) => a.timestamp - b.timestamp);
        }
        
        off(messagesRef, 'value');
        resolve(NextResponse.json({ messages }));
      }, (error) => {
        if (resolved) return;
        resolved = true;
        off(messagesRef, 'value');
        resolve(NextResponse.json({ messages: [] }));
      });
    });
    } catch {
      return NextResponse.json({ error: 'Không thể lấy dữ liệu' }, { status: 500 });
    }
  });
}
