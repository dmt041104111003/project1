import { NextRequest, NextResponse } from 'next/server';
import { ref, push, serverTimestamp, update, get, set } from 'firebase/database';
import { getFirebaseDatabase } from '@/app/api/chat/_lib/firebaseServer';
import { getProofStoredEvents } from '@/lib/aptosClient';

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
  const normalizedAddress = normalizeAddress(address);
  if (members[normalizedAddress] === true) return true;
  const creatorAddress = normalizeAddress(roomData?.creatorAddress);
  const participantAddress = normalizeAddress(roomData?.participantAddress);
  return normalizedAddress === creatorAddress || normalizedAddress === participantAddress;
};

const ensureRoomMembership = (roomData: any, address: string) => userIsMember(roomData, address);

const proofCache = new Map<string, { hasProof: boolean; timestamp: number }>();
const PROOF_CACHE_TTL = 30000; // 30 seconds

const hasProof = async (address: string): Promise<boolean> => {
  const normalizedAddr = normalizeAddress(address);
  
  const cached = proofCache.get(normalizedAddr);
  const now = Date.now();
  if (cached && (now - cached.timestamp) < PROOF_CACHE_TTL) {
    return cached.hasProof;
  }
  
  try {
    const events = await getProofStoredEvents(200);
    
    const hasProofResult = events.some((event: any) => {
      const eventAddr = String(event.data?.address || '').toLowerCase();
      return eventAddr === normalizedAddr;
    });
    
    proofCache.set(normalizedAddr, { hasProof: hasProofResult, timestamp: now });
    
    return hasProofResult;
  } catch (error) {
    console.error('Error checking proof from events:', error);
    return false;
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      roomId, 
      text,
      address: userAddress,
      sender, 
      replyTo,
      name,
      creatorAddress,
      participantAddress,
      acceptRoom,
      roomIdToAccept,
      updateRoomName,
      roomIdToUpdate,
      newName,
      updateLastViewed,
      roomIdForLastViewed,
      lastViewedTimestamp
    } = body;

    const requester = normalizeAddress(userAddress);
    if (!requester) {
      return NextResponse.json({ success: false, error: 'Thiếu địa chỉ ví (address parameter)' }, { status: 400 });
    }

    if (name && creatorAddress) {
      const creatorAddr = normalizeAddress(creatorAddress);
      if (creatorAddr !== requester) {
        return NextResponse.json({ success: false, error: 'Creator address không hợp lệ' }, { status: 403 });
      }

      const participantAddr = normalizeAddress(participantAddress);
      if (!participantAddr || participantAddr === creatorAddr) {
        return NextResponse.json({ success: false, error: 'participantAddress không hợp lệ' }, { status: 400 });
      }

      const [creatorHasProof, participantHasProof] = await Promise.all([
        hasProof(creatorAddr),
        hasProof(participantAddr),
      ]);

      if (!creatorHasProof) {
        return NextResponse.json({ success: false, error: 'Bạn chưa có xác minh không kiến thức. Vui lòng xác minh định danh tài khoản trước.' }, { status: 403 });
      }
      if (!participantHasProof) {
        return NextResponse.json({ success: false, error: 'Người nhận chưa có proof. Không thể tạo phòng.' }, { status: 400 });
      }

      const roomsSnapshot = await get(ref(database, 'chatRooms'));
      const roomsData = roomsSnapshot.val() || {};
      const duplicateRoom = Object.entries<any>(roomsData).find(([, room]) => {
        const existingCreator = normalizeAddress(room?.creatorAddress);
        const existingParticipant = normalizeAddress(room?.participantAddress);
        const members = room?.members || {};
        const hasPair =
          (existingCreator === creatorAddr && existingParticipant === participantAddr) ||
          (existingCreator === participantAddr && existingParticipant === creatorAddr);
        const membersPair = members[creatorAddr] && members[participantAddr];
        return hasPair || membersPair;
      });

      if (duplicateRoom) {
        return NextResponse.json({ success: false, error: 'Đã tồn tại phòng chat giữa 2 địa chỉ này' }, { status: 409 });
      }

      const roomsRef = ref(database, 'chatRooms');
      const roomRef = push(roomsRef);
      const roomId = roomRef.key;
      if (!roomId) {
        return NextResponse.json({ success: false, error: 'Không thể tạo phòng' }, { status: 500 });
      }

      const shortId = `${roomId.slice(0, 6)}...${roomId.slice(-4)}`;
      const displayName = `${shortId} ${name.trim()}`;

      const newRoom = {
        name: displayName,
        participantAddress: participantAddr,
        creatorAddress: creatorAddr,
        chatAccepted: false,
        createdAt: serverTimestamp(),
        lastMessage: '',
        members: {
          [creatorAddr]: true
        }
      };

      await set(roomRef, newRoom);

      return NextResponse.json({
        success: true,
        roomId,
        room: { id: roomId, ...newRoom }
      });
    }

    if (acceptRoom && roomIdToAccept) {
      const roomRef = ref(database, `chatRooms/${roomIdToAccept}`);
      const roomSnapshot = await get(roomRef);
      if (!roomSnapshot.exists()) {
        return NextResponse.json({ success: false, error: 'Room không tồn tại' }, { status: 404 });
      }
      const roomData = roomSnapshot.val();
      const expectedParticipant = normalizeAddress(roomData?.participantAddress);
      if (!expectedParticipant) {
        return NextResponse.json({ success: false, error: 'Room không hợp lệ' }, { status: 400 });
      }
      if (expectedParticipant !== requester) {
        return NextResponse.json({ success: false, error: 'Bạn không phải người được mời vào room này' }, { status: 403 });
      }
      if (normalizeAddress(roomData?.creatorAddress) === requester) {
        return NextResponse.json({ success: false, error: 'Không thể accept phòng của chính bạn' }, { status: 400 });
      }

      if (!(await hasProof(requester))) {
        return NextResponse.json({ success: false, error: 'Bạn chưa có proof nên không thể accept phòng' }, { status: 403 });
      }

      await update(roomRef, {
        chatAccepted: true,
        acceptedAt: serverTimestamp()
      });
      await update(ref(database, `chatRooms/${roomIdToAccept}/members`), {
        [requester]: true
      });

      return NextResponse.json({ success: true, message: 'Room đã được accept' });
    }

    if (updateLastViewed && roomIdForLastViewed && userAddress && lastViewedTimestamp) {
      if (normalizeAddress(userAddress) !== requester) {
        return NextResponse.json({ success: false, error: 'Không thể cập nhật lastViewed cho user khác' }, { status: 403 });
      }
      const lastViewedRef = ref(database, `chatLastViewed/${requester}/${roomIdForLastViewed}`);
      await set(lastViewedRef, lastViewedTimestamp);
      return NextResponse.json({ success: true, message: 'Đã cập nhật lastViewed' });
    }

    if (updateRoomName && roomIdToUpdate && newName) {
      const roomData = await fetchRoomData(roomIdToUpdate);
      if (!roomData) {
        return NextResponse.json({ success: false, error: 'Room không tồn tại' }, { status: 404 });
      }
      if (!ensureRoomMembership(roomData, requester)) {
        return NextResponse.json({ success: false, error: 'Bạn không có quyền sửa phòng này' }, { status: 403 });
      }
      const trimmedName = String(newName).trim();
      if (!trimmedName) {
        return NextResponse.json({ success: false, error: 'Tên phòng không hợp lệ' }, { status: 400 });
      }
      await update(ref(database, `chatRooms/${roomIdToUpdate}`), { name: trimmedName });
      return NextResponse.json({ success: true, message: 'Đã cập nhật tên phòng' });
    }

    if (!text || !roomId) {
      return NextResponse.json({ error: 'Thiếu roomId hoặc text' }, { status: 400 });
    }

    const roomData = await fetchRoomData(roomId);
    if (!roomData) {
      return NextResponse.json({ error: 'Room không tồn tại' }, { status: 404 });
    }
    if (!ensureRoomMembership(roomData, requester)) {
      return NextResponse.json({ error: 'Bạn không thể gửi tin trong phòng này' }, { status: 403 });
    }

    const messagesRef = ref(database, `chats/${roomId}/messages`);
    
    const newMessage = {
      text: text.trim(),
      sender: sender || requester,
      senderId: requester,
      timestamp: serverTimestamp(),
      replyTo: replyTo || null,
    };

    await push(messagesRef, newMessage);

    await update(ref(database, `chatRooms/${roomId}`), {
      lastMessage: text.trim(),
      lastMessageSender: requester,
      lastMessageAt: serverTimestamp()
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Không thể gửi tin nhắn' }, { status: 500 });
  }
}

