// Script test cookie-based auth flow (HttpOnly JWT + CSRF). Node.js 18+ required.

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const AUTH_COOKIE = process.argv[2] || process.env.AUTH_COOKIE || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZGRyZXNzIjoiMHg5ZjkxY2Q5MjcwNWU2OWQ3Mzg3YmEzYTRkNDcwM2NiYTFhOTRmOTcwODZiMGY3MjczNDU5YTkzODEzNWIyM2Y1IiwiaWF0IjoxNzYzNDUzMDEwLCJleHAiOjE3NjQwNTc4MTB9.4jHNJ7PH4vNQKKBIO3yX-acxk3tU0JyPkhNdimnpVXc';
const CSRF_COOKIE = process.argv[3] || process.env.CSRF_TOKEN || 'e2c265b419b7764bade764a12d1dfdd9a15336867e845791a9528226dc64db8a';

if (!AUTH_COOKIE || !CSRF_COOKIE) {
  console.error('❌ Thiếu auth cookie hoặc csrf cookie. Truyền như sau:');
  console.error('   node test-token-login.js <auth_token> <csrf_token>');
  console.error('   hoặc set AUTH_COOKIE / CSRF_TOKEN trong environment.');
  process.exit(1);
}

if (typeof fetch === 'undefined') {
  try {
    const nodeFetch = require('node-fetch');
    global.fetch = nodeFetch;
  } catch {
    console.error('❌ Cần Node.js 18+ (có fetch built-in) hoặc cài node-fetch.');
    process.exit(1);
  }
}

function buildHeaders(extra = {}) {
  const headers = new Headers(extra);
  headers.set('Cookie', `auth_token=${AUTH_COOKIE}; csrf_token=${CSRF_COOKIE}`);
  headers.set('x-csrf-token', CSRF_COOKIE);
  return headers;
}

async function callAPI(endpoint, options = {}) {
  const headers = buildHeaders(options.headers);
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

async function testSession() {
  console.log('\n📋 Test 1: /api/auth/session');
  const { response, data } = await callAPI('/api/auth/session');
  console.log(`   Status: ${response.status}`);
  console.log('   Body  :', data);
}

async function testChatRooms() {
  console.log('\n📋 Test 2: /api/chat/messages?getRooms=true');
  const { response, data } = await callAPI('/api/chat/messages?getRooms=true', {
    method: 'GET',
  });
  console.log(`   Status: ${response.status}`);
  console.log('   Body  :', data);
}

async function testRole(address) {
  console.log('\n📋 Test 3: /api/role');
  const { response, data } = await callAPI(`/api/role?address=${encodeURIComponent(address)}`);
  console.log(`   Status: ${response.status}`);
  console.log('   Body  :', data);
}

async function testCsrfFailure() {
  console.log('\n📋 Test 4: CSRF missing header (expect 403)');
  const headers = new Headers();
  headers.set('Cookie', `auth_token=${AUTH_COOKIE}; csrf_token=${CSRF_COOKIE}`);
  const response = await fetch(`${API_BASE_URL}/api/chat/messages/post`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'ping' }),
  });
  const data = await response.json().catch(() => null);
  console.log(`   Status: ${response.status}`);
  console.log('   Body  :', data);
}

async function main() {
  console.log('='.repeat(60));
  console.log('🧪 TEST COOKIE-BASED AUTH');
  console.log('='.repeat(60));

  await testSession();
  await testChatRooms();

  // Lấy address từ session cho test role
  const sessionRes = await callAPI('/api/auth/session');
  if (sessionRes.response.ok && sessionRes.data?.address) {
    await testRole(sessionRes.data.address);
  } else {
    console.log('⚠️  Không lấy được address từ session, bỏ qua test role.');
  }

  await testCsrfFailure();

  console.log('\n' + '='.repeat(60));
  console.log('✅ HOÀN TẤT TEST!');
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});

