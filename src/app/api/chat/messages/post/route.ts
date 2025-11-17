import { NextRequest, NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onValue, off, serverTimestamp, update, remove } from 'firebase/database';
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

export async function POST(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
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
      roomIdToAccept,
      deleteRoom,
      roomIdToDelete,
      updateRoomName,
      roomIdToUpdate,
      newName,
      updateLastViewed,
      roomIdForLastViewed,
      userAddress,
      lastViewedTimestamp
      } = await req.json();

    if (name && creatorAddress) {
      const roomsRef = ref(database, 'chatRooms');

      const newRoom = {
        name,
        participantAddress: participantAddress ? participantAddress.toLowerCase() : '',
        creatorAddress: creatorAddress.toLowerCase(),
        chatAccepted: false,
        createdAt: serverTimestamp(),
        lastMessage: ''
      };

      return new Promise<NextResponse>((resolve) => {
        onValue(roomsRef, (snapshot) => {
          const data = snapshot.val();
          let existingRoom = null;
          
          if (data) {
            const creatorAddrLower = creatorAddress.toLowerCase();
            const participantAddrLower = participantAddress ? participantAddress.toLowerCase() : '';
            
            existingRoom = Object.values(data).find((room) => {
              const r = room as Record<string, unknown>;
              const rCreator = (r.creatorAddress as string || '').toLowerCase();
              const rParticipant = (r.participantAddress as string || '').toLowerCase();
              
              if (participantAddrLower) {
                return (rCreator === creatorAddrLower && rParticipant === participantAddrLower) ||
                       (rCreator === participantAddrLower && rParticipant === creatorAddrLower);
              }
              return false;
            });
          }
          
          off(roomsRef, 'value');
          
          if (existingRoom) {
            resolve(NextResponse.json({ 
              success: false, 
              error: 'Đã tồn tại phòng chat giữa 2 địa chỉ này' 
            }));
            return;
          }
          
          push(roomsRef, newRoom).then((roomRef) => {
            const newRoomId = roomRef.key;
            const short = (id: string) => id ? `${id.slice(0, 6)}...${id.slice(-4)}` : '';
            const shortId = short(newRoomId || '');
            const finalName = `${shortId} ${name.trim()}`;
            
            update(roomRef, { name: finalName }).catch(() => {});

            resolve(NextResponse.json({ 
              success: true, 
              roomId: newRoomId,
              room: { id: newRoomId, ...newRoom, name: finalName }
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

    if (updateLastViewed && roomIdForLastViewed && userAddress && lastViewedTimestamp) {
      const lastViewedRef = ref(database, `chatLastViewed/${userAddress.toLowerCase()}/${roomIdForLastViewed}`);
      
      return new Promise<NextResponse>((resolve) => {
        update(lastViewedRef, lastViewedTimestamp).then(() => {
          resolve(NextResponse.json({ 
            success: true, 
            message: 'Đã cập nhật lastViewed' 
          }));
        }).catch((error) => {
          resolve(NextResponse.json({ 
            success: false, 
            error: `Không thể cập nhật lastViewed: ${error.message}` 
          }, { status: 500 }));
        });
      });
    }

    if (updateRoomName && roomIdToUpdate && newName && senderId) {
      const roomRef = ref(database, `chatRooms/${roomIdToUpdate}`);
      
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
          
          const userAddr = (senderId as string).toLowerCase();
          const creatorAddr = (roomData.creatorAddress as string || '').toLowerCase();
          const participantAddr = (roomData.participantAddress as string || '').toLowerCase();
          
          if (userAddr !== creatorAddr && userAddr !== participantAddr) {
            resolve(NextResponse.json({ 
              success: false, 
              error: 'Bạn không có quyền sửa phòng này' 
            }));
            return;
          }
          
          const updatedRoom = {
            ...roomData,
            name: newName
          };
          
          update(roomRef, updatedRoom).then(() => {
            resolve(NextResponse.json({ 
              success: true, 
              message: 'Đã cập nhật tên phòng' 
            }));
          }).catch((error) => {
            resolve(NextResponse.json({ 
              success: false, 
              error: `Không thể cập nhật tên phòng: ${error.message}` 
            }, { status: 500 }));
          });
        });
      });
    }

    if (deleteRoom && roomIdToDelete && senderId) {
      const roomRef = ref(database, `chatRooms/${roomIdToDelete}`);
      
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
          
          const userAddr = (senderId as string).toLowerCase();
          const creatorAddr = (roomData.creatorAddress as string || '').toLowerCase();
          const participantAddr = (roomData.participantAddress as string || '').toLowerCase();
          
          if (userAddr !== creatorAddr && userAddr !== participantAddr) {
            resolve(NextResponse.json({ 
              success: false, 
              error: 'Bạn không có quyền xóa phòng này' 
            }));
            return;
          }
          
          remove(roomRef).then(() => {
            const messagesRef = ref(database, `chats/${roomIdToDelete}/messages`);
            remove(messagesRef).catch(() => {});
            
            resolve(NextResponse.json({ 
              success: true, 
              message: 'Đã xóa phòng chat' 
            }));
          }).catch((error) => {
            resolve(NextResponse.json({ 
              success: false, 
              error: `Không thể xóa phòng: ${error.message}` 
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

    const roomRef = ref(database, `chatRooms/${roomId || 'general'}`);
    
    return new Promise<NextResponse>((resolve) => {
      onValue(roomRef, async (snapshot) => {
        const roomData = snapshot.val();
        off(roomRef, 'value');
        
        if (roomData) {
          await update(roomRef, { 
            lastMessage: text.trim(),
            lastMessageSender: senderId.toLowerCase()
          });
        }
        
        resolve(NextResponse.json({ success: true }));
      }, (error) => {
        off(roomRef, 'value');
        resolve(NextResponse.json({ success: true }));
      });
    });
    } catch {
      return NextResponse.json({ error: 'Không thể gửi tin nhắn' }, { status: 500 });
    }
  });
}

