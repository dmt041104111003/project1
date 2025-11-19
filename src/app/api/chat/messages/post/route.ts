import { NextRequest, NextResponse } from 'next/server';
import { ref, push, serverTimestamp, update, remove, get, set } from 'firebase/database';
import { requireAuth } from '@/app/api/auth/_lib/helpers';
import { getFirebaseDatabase } from '@/app/api/chat/_lib/firebaseServer';
import { fetchContractResourceData, queryTableItem } from '@/app/api/onchain/_lib/tableClient';
import { CONTRACT_ADDRESS } from '@/constants/contracts';

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

let cachedProofHandle: string | null | undefined;

const getProofHandle = async (): Promise<string | null> => {
  if (cachedProofHandle === undefined) {
    const roleStore = await fetchContractResourceData('role::RoleStore');
    cachedProofHandle = roleStore?.proofs?.handle || null;
  }
  return cachedProofHandle ?? null;
};

const hasProof = async (address: string): Promise<boolean> => {
  const handle = await getProofHandle();
  if (!handle) return false;
  const proof = await queryTableItem({
    handle,
    keyType: 'address',
    valueType: `${CONTRACT_ADDRESS}::role::CCCDProof`,
    key: address,
  });
  return !!proof;
};

export async function POST(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      const { 
      roomId, 
      text, 
      sender, 
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

    const requester = normalizeAddress(user.address);

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
        return NextResponse.json({ success: false, error: 'Bạn chưa có proof. Vui lòng xác minh DID trước.' }, { status: 403 });
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

    if (deleteRoom && roomIdToDelete) {
      const roomData = await fetchRoomData(roomIdToDelete);
      if (!roomData) {
        return NextResponse.json({ success: false, error: 'Room không tồn tại' }, { status: 404 });
      }
      if (!ensureRoomMembership(roomData, requester)) {
        return NextResponse.json({ success: false, error: 'Bạn không có quyền xóa phòng này' }, { status: 403 });
      }
      await remove(ref(database, `chatRooms/${roomIdToDelete}`));
      await remove(ref(database, `chats/${roomIdToDelete}/messages`)).catch(() => {});
      return NextResponse.json({ success: true, message: 'Đã xóa phòng chat' });
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
  });
}

