import { NextRequest, NextResponse } from 'next/server';
import { ref, remove, get } from 'firebase/database';
import { getFirebaseDatabase } from '@/lib/firebaseServer';

const database = getFirebaseDatabase();

const normalizeAddress = (addr?: string | null): string => {
  if (!addr) return '';
  const lower = addr.toLowerCase();
  return lower.startsWith('0x') ? lower : `0x${lower}`;
};

const fetchRoomData = async (roomId: string) => {
  const snapshot = await get(ref(database, `chatRooms/${roomId}`));
  return snapshot.exists() ? snapshot.val() : null;
};

export async function DELETE(request: NextRequest) {
    try {
    const { messageId, roomId, address } = await request.json();

    if (!messageId || !roomId) {
      return NextResponse.json({ error: 'Message ID và Room ID là bắt buộc' }, { status: 400 });
    }

    const requester = normalizeAddress(address);
    if (!requester) {
      return NextResponse.json({ error: 'Thiếu địa chỉ ví (address parameter)' }, { status: 400 });
    }

    const roomData = await fetchRoomData(roomId);
    if (!roomData) {
      return NextResponse.json({ error: 'Phòng không tồn tại' }, { status: 404 });
    }
    
    const members = roomData?.members || {};
    const creatorAddress = normalizeAddress(roomData?.creatorAddress);
    const participantAddress = normalizeAddress(roomData?.participantAddress);
    const isMember = members[requester] === true || 
                     requester === creatorAddress || 
                     requester === participantAddress;
    
    if (!isMember) {
      return NextResponse.json({ error: 'Bạn không có quyền với phòng này' }, { status: 403 });
    }

    const messageRef = ref(database, `chats/${roomId}/messages/${messageId}`);
    const messageSnapshot = await get(messageRef);
    if (!messageSnapshot.exists()) {
      return NextResponse.json({ error: 'Tin nhắn không tồn tại' }, { status: 404 });
    }
    const messageData = messageSnapshot.val();
    const senderId = normalizeAddress(messageData?.senderId);
    if (senderId && senderId !== requester) {
      return NextResponse.json({ error: 'Bạn chỉ có thể xóa tin nhắn của mình' }, { status: 403 });
    }

    await remove(messageRef);

      return NextResponse.json({ success: true, message: 'Đã xóa tin nhắn thành công' });
    } catch {
      return NextResponse.json({ error: 'Không thể xóa tin nhắn' }, { status: 500 });
    }
}

