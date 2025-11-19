import { NextRequest, NextResponse } from 'next/server';
import { ref, get } from 'firebase/database';
import { requireAuth } from '@/app/api/auth/_lib/helpers';
import { getFirebaseDatabase } from '@/app/api/chat/_lib/firebaseServer';

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

const userIsMember = (roomData: any, address: string) => {
  if (!roomData) return false;
  const members = roomData?.members || {};
  if (members[address] === true) return true;
  const creatorAddress = normalizeAddress(roomData?.creatorAddress);
  const participantAddress = normalizeAddress(roomData?.participantAddress);
  const normalizedAddress = normalizeAddress(address);
  return normalizedAddress === creatorAddress || normalizedAddress === participantAddress;
};

export async function GET(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const roomId = searchParams.get('roomId');
      const getRooms = searchParams.get('getRooms');
      const getLastViewed = searchParams.get('getLastViewed');
      const requestedUserAddress = searchParams.get('userAddress');

      const requester = normalizeAddress(user.address);

      if (getRooms === 'true') {
        if (requestedUserAddress && normalizeAddress(requestedUserAddress) !== requester) {
          return NextResponse.json({ error: 'Không thể xem phòng của user khác' }, { status: 403 });
        }

        const snapshot = await get(ref(database, 'chatRooms'));
        const data = snapshot.val() || {};

        const rooms = Object.entries<any>(data)
          .filter(([, room]) => userIsMember(room, requester))
          .map(([id, room]) => ({
            id,
            name: room?.name || '',
            lastMessage: room?.lastMessage || '',
            lastMessageSender: room?.lastMessageSender || '',
            lastMessageTime: room?.lastMessageAt || 0,
            chatAccepted: !!room?.chatAccepted,
            creatorAddress: room?.creatorAddress || '',
            participantAddress: room?.participantAddress || '',
          }));

        return NextResponse.json({ success: true, rooms });
      }

      if (getLastViewed === 'true') {
        if (!roomId) {
          return NextResponse.json({ error: 'roomId là bắt buộc' }, { status: 400 });
        }
        if (requestedUserAddress && normalizeAddress(requestedUserAddress) !== requester) {
          return NextResponse.json({ error: 'Không thể lấy lastViewed của user khác' }, { status: 403 });
        }
        const snapshot = await get(ref(database, `chatLastViewed/${requester}/${roomId}`));
        return NextResponse.json({
          success: true,
          lastViewed: snapshot.exists() ? snapshot.val() : 0,
        });
      }

      if (!roomId) {
        return NextResponse.json({ error: 'roomId là bắt buộc' }, { status: 400 });
      }

      const roomData = await fetchRoomData(roomId);
      if (!roomData) {
        return NextResponse.json({ error: 'Room không tồn tại' }, { status: 404 });
      }
      if (!userIsMember(roomData, requester)) {
        return NextResponse.json({ error: 'Bạn không có quyền truy cập phòng này' }, { status: 403 });
      }

      const snapshot = await get(ref(database, `chats/${roomId}/messages`));
      const data = snapshot.val() || {};
      const messages = Object.entries<any>(data)
        .map(([id, message]) => ({
          id,
          text: message?.text || '',
          sender: message?.sender || '',
          timestamp: Number(message?.timestamp || 0),
          senderId: message?.senderId || '',
          replyTo: message?.replyTo || null,
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      return NextResponse.json({ success: true, messages });
    } catch (error: any) {
      return NextResponse.json({ error: error?.message || 'Không thể lấy dữ liệu' }, { status: 500 });
    }
  });
}
