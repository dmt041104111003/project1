#!/usr/bin/env node

/**
 * Script test các API backend đang query on-chain table handles (RoleStore, EscrowStore, DisputeStore, Reputation).
 *
 * Cách dùng nhanh:
 *   node test-table-handles.js \
 *     --baseUrl=http://localhost:3000 \
 *     --address=0xabc... \
 *     --jobId=1 \
 *     --disputeId=1 \
 *     --disputeRole=poster \
 *     --disputeSide=poster \
 *     --authCookie="auth_token=...; csrf_token=..." \
 *     --csrfToken=xyz
 *
 * Có thể đặt qua ENV:
 *   BASE_URL, ADDRESS, JOB_ID, DISPUTE_ID, DISPUTE_ROLE, DISPUTE_SIDE, AUTH_COOKIE, CSRF_TOKEN
 *
 * Lưu ý: /api/ipfs/dispute cần cookie auth_token + csrf_token để backend xác thực người dùng.
 */

const args = process.argv.slice(2);
const argMap = new Map(
  args
    .filter((arg) => arg.startsWith('--'))
    .map((arg) => {
      const [key, ...rest] = arg.substring(2).split('=');
      return [key, rest.length ? rest.join('=') : 'true'];
    })
);

const BASE_URL = argMap.get('baseUrl') || process.env.BASE_URL || 'http://localhost:3000';
const ADDRESS = argMap.get('address') || process.env.ADDRESS || '';
const JOB_ID = argMap.get('jobId') || process.env.JOB_ID || '';
const DISPUTE_ID = argMap.get('disputeId') || process.env.DISPUTE_ID || '';
const DISPUTE_ROLE = (argMap.get('disputeRole') || process.env.DISPUTE_ROLE || 'poster').toLowerCase();
const DISPUTE_SIDE = (argMap.get('disputeSide') || process.env.DISPUTE_SIDE || 'poster').toLowerCase();
const AUTH_COOKIE = argMap.get('authCookie') || process.env.AUTH_COOKIE || '';
const CSRF_TOKEN = argMap.get('csrfToken') || process.env.CSRF_TOKEN || '';

const safeJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return await res.text();
  }
};

const request = async (path, options = {}) => {
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };
  if (AUTH_COOKIE) headers.Cookie = AUTH_COOKIE;
  if (CSRF_TOKEN) headers['x-csrf-token'] = CSRF_TOKEN;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    ...options,
    headers,
  });
  const data = await safeJson(res);
  return { ok: res.ok, status: res.status, data };
};

const logResult = (label, result) => {
  const statusEmoji = result.ok ? '✅' : '❌';
  console.log(`\n${statusEmoji} ${label} → ${result.status}`);
  console.dir(result.data, { depth: null, colors: true });
};

async function run() {
  console.log('=== Test table-handle APIs ===');
  console.log(`BASE_URL: ${BASE_URL}`);

  if (ADDRESS) {
    const roleRes = await request(`/api/role?address=${encodeURIComponent(ADDRESS)}`);
    logResult('GET /api/role', roleRes);

    const profileRes = await request(`/api/profile?address=${encodeURIComponent(ADDRESS)}`);
    logResult('GET /api/profile', profileRes);

    const reputationRes = await request(`/api/reputation?address=${encodeURIComponent(ADDRESS)}`);
    logResult('GET /api/reputation', reputationRes);
  } else {
    console.warn('⚠️  Bỏ qua role/profile/reputation vì chưa truyền --address');
  }

  if (JOB_ID) {
    const jobRes = await request(`/api/ipfs/job?jobId=${encodeURIComponent(JOB_ID)}`);
    logResult('GET /api/ipfs/job', jobRes);
  } else {
    console.warn('⚠️  Bỏ qua /api/ipfs/job vì chưa truyền --jobId');
  }

  if (DISPUTE_ID) {
    if (!AUTH_COOKIE) {
      console.warn('⚠️  /api/ipfs/dispute cần --authCookie (và csrf)');
    }
    const params = new URLSearchParams({
      disputeId: String(DISPUTE_ID),
      role: DISPUTE_ROLE,
    });
    if (DISPUTE_ROLE === 'reviewer') {
      params.set('side', DISPUTE_SIDE === 'freelancer' ? 'freelancer' : 'poster');
    }
    const disputeRes = await request(`/api/ipfs/dispute?${params.toString()}`);
    logResult('GET /api/ipfs/dispute', disputeRes);
  } else {
    console.warn('⚠️  Bỏ qua /api/ipfs/dispute vì chưa truyền --disputeId');
  }

  console.log('\n=== Hoàn tất ===');
}

run().catch((err) => {
  console.error('❌ Lỗi script:', err);
  process.exit(1);
});

