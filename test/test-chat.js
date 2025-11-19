#!/usr/bin/env node

/**
 * Test chat API flow:
 * 1. Tạo phòng giữa creator và participant (đã có proof)
 * 2. Lấy danh sách phòng cho creator
 * 3. Participant accept phòng
 * 4. Gửi tin nhắn từ creator / participant
 * 5. Lấy message list
 * 6. Xóa tin nhắn
 * 7. Xóa phòng
 *
 * Dùng cookie auth + csrf để gọi các endpoint Next.js.
 *
 * Chạy:
 *   node test-chat.js --baseUrl=http://localhost:3000 \
 *     --creator=0x123... --participant=0xabc... \
 *     --creatorCookie="auth_token=...; csrf_token=..." \
 *     --creatorCsrf=csrf123 \
 *     --participantCookie="..." --participantCsrf="..."
 */

const args = process.argv.slice(2);

const parseArgs = () =>
  args.reduce((acc, arg) => {
    if (!arg.startsWith('--')) return acc;
    const [key, ...rest] = arg.substring(2).split('=');
    acc[key] = rest.length ? rest.join('=') : 'true';
    return acc;
  }, {});

const opts = parseArgs();

const BASE_URL = opts.baseUrl || process.env.BASE_URL || 'http://localhost:3000';
const CREATOR = opts.creator || process.env.CHAT_CREATOR || '';
const PARTICIPANT = opts.participant || process.env.CHAT_PARTICIPANT || '';
const CREATOR_COOKIE = opts.creatorCookie || process.env.CHAT_CREATOR_COOKIE || '';
const CREATOR_CSRF = opts.creatorCsrf || process.env.CHAT_CREATOR_CSRF || '';
const PARTICIPANT_COOKIE = opts.participantCookie || process.env.CHAT_PARTICIPANT_COOKIE || '';
const PARTICIPANT_CSRF = opts.participantCsrf || process.env.CHAT_PARTICIPANT_CSRF || '';

if (!CREATOR || !PARTICIPANT) {
  console.error('❌ creator và participant là bắt buộc');
  process.exit(1);
}

const send = async (path, { method = 'GET', body, user = 'creator' } = {}) => {
  const cookie = user === 'creator' ? CREATOR_COOKIE : PARTICIPANT_COOKIE;
  const csrf = user === 'creator' ? CREATOR_CSRF : PARTICIPANT_CSRF;
  const headers = {
    Accept: 'application/json',
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(cookie ? { Cookie: cookie } : {}),
    ...(csrf ? { 'x-csrf-token': csrf } : {}),
  };
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { res, data };
};

const pretty = (label, payload) => {
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(payload, null, 2));
};

const main = async () => {
  console.log('=== Test Chat API Flow ===');

  // 1. Tạo phòng
  console.log('\n[1] Tạo phòng...');
  const createPayload = {
    name: 'Room test',
    creatorAddress: CREATOR,
    participantAddress: PARTICIPANT,
  };
  const createRes = await send('/api/chat/messages/post', {
    method: 'POST',
    body: createPayload,
    user: 'creator',
  });
  pretty('Create Room response', createRes);
  if (!createRes.data?.success) {
    console.error('❌ Không thể tạo phòng, dừng script');
    process.exit(1);
  }
  const roomId = createRes.data?.roomId;
  if (!roomId) {
    console.error('❌ Không lấy được roomId');
    process.exit(1);
  }

  // 2. Lấy danh sách phòng cho creator
  console.log('\n[2] Creator lấy danh sách phòng...');
  const roomsCreator = await send(
    `/api/chat/messages?getRooms=true&userAddress=${encodeURIComponent(CREATOR)}`,
    { user: 'creator' }
  );
  pretty('Rooms (creator)', roomsCreator);

  // 3. Participant accept phòng
  console.log('\n[3] Participant accept phòng...');
  const acceptRes = await send('/api/chat/messages/post', {
    method: 'POST',
    body: { acceptRoom: true, roomIdToAccept: roomId },
    user: 'participant',
  });
  pretty('Accept Room response', acceptRes);

  // 4. Gửi tin nhắn từ creator & participant
  console.log('\n[4] Gửi tin nhắn...');
  const sendMessage = async (userLabel, content) => {
    const payload = {
      roomId,
      text: content,
      sender: userLabel,
      senderId: userLabel,
    };
    return send('/api/chat/messages/post', {
      method: 'POST',
      body: payload,
      user: userLabel === 'creator' ? 'creator' : 'participant',
    });
  };
  const msg1 = await sendMessage('creator', 'Xin chào từ creator');
  pretty('Send message (creator)', msg1);
  const msg2 = await sendMessage('participant', 'Chào bạn, mình là participant');
  pretty('Send message (participant)', msg2);

  // 5. Lấy messages
  console.log('\n[5] Lấy danh sách tin nhắn (creator)...');
  const messagesRes = await send(`/api/chat/messages?roomId=${encodeURIComponent(roomId)}`, {
    user: 'creator',
  });
  pretty('Messages (creator)', messagesRes);
  const firstMessageId = messagesRes.data?.messages?.[0]?.id;

  // 6. Xóa tin nhắn (nếu có)
  if (firstMessageId) {
    console.log('\n[6] Xóa tin nhắn đầu tiên (creator)...');
    const deleteRes = await send('/api/chat/messages/delete', {
      method: 'DELETE',
      body: { messageId: firstMessageId, roomId },
      user: 'creator',
    });
    pretty('Delete message response', deleteRes);
  } else {
    console.warn('⚠️ Không có tin nhắn để xóa.');
  }

  // 7. Xóa phòng
  console.log('\n[7] Xóa phòng...');
  const deleteRoomRes = await send('/api/chat/messages/post', {
    method: 'POST',
    body: { deleteRoom: true, roomIdToDelete: roomId },
    user: 'creator',
  });
  pretty('Delete room response', deleteRoomRes);

  console.log('\n=== Hoàn tất ===');
};

main().catch((err) => {
  console.error('❌ Error running chat test:', err);
  process.exit(1);
});

