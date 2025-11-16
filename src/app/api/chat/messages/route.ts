import { NextRequest, NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onValue, off, serverTimestamp, update, remove } from 'firebase/database';

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
    const roomId = searchParams.get('roomId');
    const getRooms = searchParams.get('getRooms');

    if (getRooms === 'true') {
      const userAddress = searchParams.get('userAddress');
      
      if (!userAddress) {
        return NextResponse.json({ error: 'User address is required' }, { status: 400 });
      }
      
      return new Promise<NextResponse>((resolve) => {
        const roomsRef = ref(database, 'chatRooms');
        
        onValue(roomsRef, (snapshot) => {
          const data = snapshot.val();
          let rooms: Array<{
            id: string;
            name: string;
            lastMessage: string;
            chatAccepted: boolean;
            creatorAddress: string;
            participantAddress: string;
          }> = [];
          
          if (data) {
            rooms = Object.entries(data)
              .map(([id, room]) => ({
                id,
                name: (room as Record<string, unknown>).name as string,
                lastMessage: (room as Record<string, unknown>).lastMessage as string,
                chatAccepted: (room as Record<string, unknown>).chatAccepted as boolean,
                creatorAddress: (room as Record<string, unknown>).creatorAddress as string,
                participantAddress: (room as Record<string, unknown>).participantAddress as string || ''
              }))
              .filter(room => 
                room.creatorAddress.toLowerCase() === userAddress.toLowerCase() ||
                (room.participantAddress && room.participantAddress.toLowerCase() === userAddress.toLowerCase())
              );
          }
          
          off(roomsRef, 'value');
          resolve(NextResponse.json({ success: true, rooms }));
        });
      });
    }

    const roomIdForMessages = roomId || 'general';
    return new Promise<NextResponse>((resolve) => {
      const messagesRef = ref(database, `chats/${roomIdForMessages}/messages`);
      
      onValue(messagesRef, (snapshot) => {
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
      });
    });
  } catch {
    return NextResponse.json({ error: 'Không thể lấy dữ liệu' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      roomId, 
      text, 
      sender, 
      senderId,
      replyTo,
      name,
      creatorAddress,
      participantAddress,
      acceptRoom,
      roomIdToAccept
    } = await request.json();

    if (name && creatorAddress) {
      const roomsRef = ref(database, 'chatRooms');

      const newRoom = {
        name,
        participantAddress: participantAddress ? participantAddress.toLowerCase() : '',
        creatorAddress: creatorAddress.toLowerCase(),
        chatAccepted: false,
        createdAt: serverTimestamp(),
        lastMessage: 'Phòng mới được tạo'
      };


      return new Promise<NextResponse>((resolve) => {
        onValue(roomsRef, (snapshot) => {
          const data = snapshot.val();
          let existingRoom = null;
          
          if (data) {
            existingRoom = Object.values(data).find((room) => {
              const r = room as Record<string, unknown>;
              return (r.creatorAddress as string || '').toLowerCase() === creatorAddress.toLowerCase() &&
                     (r.name as string) === name;
            });
          }
          
          off(roomsRef, 'value');
          
          if (existingRoom) {
            resolve(NextResponse.json({ 
              success: false, 
              error: 'Phòng chat với địa chỉ này đã tồn tại' 
            }));
            return;
          }
          
          push(roomsRef, newRoom).then((roomRef) => {
            const newRoomId = roomRef.key;

            resolve(NextResponse.json({ 
              success: true, 
              roomId: newRoomId,
              room: { id: newRoomId, ...newRoom }
            }));
          }).catch((error) => {
            resolve(NextResponse.json({ 
              success: false, 
              error: `Không thể tạo phòng: ${error.message}` 
            }, { status: 500 }));
          });
        });
      });
    }

    if (acceptRoom && roomIdToAccept && senderId) {
      const roomRef = ref(database, `chatRooms/${roomIdToAccept}`);
      
      return new Promise<NextResponse>((resolve) => {
        onValue(roomRef, (snapshot) => {
          const roomData = snapshot.val();
          
          off(roomRef, 'value');
          
          if (!roomData) {
            resolve(NextResponse.json({ 
              success: false, 
              error: 'Room không tồn tại' 
            }));
            return;
          }
          
          const participantAddr = (senderId as string).toLowerCase();
          const creatorAddr = (roomData.creatorAddress as string || '').toLowerCase();
          const expectedParticipantAddr = (roomData.participantAddress as string || '').toLowerCase();
          
          if (participantAddr === creatorAddr) {
            resolve(NextResponse.json({ 
              success: false, 
              error: 'Bạn không thể accept phòng chat của chính mình' 
            }));
            return;
          }
          
          if (expectedParticipantAddr && participantAddr !== expectedParticipantAddr) {
            resolve(NextResponse.json({ 
              success: false, 
              error: 'Bạn không phải người được mời vào phòng chat này' 
            }));
            return;
          }
          
          const updatedRoom = {
            ...roomData,
            chatAccepted: true,
            participantAddress: participantAddr,
            acceptedAt: serverTimestamp()
          };
          
          update(roomRef, updatedRoom).then(() => {
            resolve(NextResponse.json({ 
              success: true, 
              message: 'Room đã được accept' 
            }));
          }).catch((error) => {
            resolve(NextResponse.json({ 
              success: false, 
              error: `Không thể chấp nhận phòng: ${error.message}` 
            }, { status: 500 }));
          });
        });
      });
    }

    if (!text || !sender || !senderId) {
      return NextResponse.json({ error: 'Thiếu các trường bắt buộc' }, { status: 400 });
    }

    const messagesRef = ref(database, `chats/${roomId || 'general'}/messages`);
    
    const newMessage = {
      text: text.trim(),
      sender,
      senderId,
      timestamp: serverTimestamp(),
      replyTo: replyTo || null,
    };

    await push(messagesRef, newMessage);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Không thể gửi tin nhắn' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { messageId, roomId } = await request.json();

    if (!messageId || !roomId) {
      return NextResponse.json({ error: 'Message ID và Room ID là bắt buộc' }, { status: 400 });
    }

    const messageRef = ref(database, `chats/${roomId}/messages/${messageId}`);
    
    await remove(messageRef);

    return NextResponse.json({ success: true, message: 'Đã xóa tin nhắn thành công' });
  } catch {
    return NextResponse.json({ error: 'Không thể xóa tin nhắn' }, { status: 500 });
  }
}
