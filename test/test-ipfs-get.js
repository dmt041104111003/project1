//node test-ipfs-get.js "enc:JTvOzl8UfB4hP1DR:C4d/xEJWbfqXfzza2b7ZaizS9iH2WeLSTXjDW5mlGaM8bDuPG7qaJJe3T5GO6FPvo+ucRzSQREhDFJiOsNRQ58vYz5XMwpFELUgv"

const fetch = globalThis.fetch ?? (await import('node-fetch')).default;

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';
const CID = process.argv[2] || process.env.TEST_CID;
const AUTH_COOKIE = process.argv[3] || process.env.AUTH_COOKIE;
const CSRF_COOKIE = process.argv[4] || process.env.CSRF_TOKEN;

if (!CID || !AUTH_COOKIE || !CSRF_COOKIE) {
  console.error('❌ Thiếu tham số.');
  console.error('Chạy: node test-ipfs-get.js <cid> <auth_token> <csrf_token>');
  process.exit(1);
}

async function callApi({ decodeOnly }) {
  const params = new URLSearchParams({ cid: CID });
  if (decodeOnly) {
    params.set('decodeOnly', 'true');
  }
  const url = `${API_BASE}/api/ipfs/get?${params.toString()}`;

  const headers = new Headers();
  headers.set('Cookie', `auth_token=${AUTH_COOKIE}; csrf_token=${CSRF_COOKIE}`);
  headers.set('x-csrf-token', CSRF_COOKIE);

  console.log('\n📡 Gọi:', url);
  const res = await fetch(url, { headers, method: 'GET' });
  const body = await res.json().catch(() => null);
  console.log('Status:', res.status);
  console.log('Body  :', body);
  return { res, body };
}

async function main() {
  console.log('=== Test decodeOnly ===');
  await callApi({ decodeOnly: true });

  console.log('\n=== Test fetch full data ===');
  await callApi({ decodeOnly: false });
}

main().catch(err => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});

