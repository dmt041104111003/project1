#!/usr/bin/env node

/**
 * Script test `/api/profile`:
 *   node test-profile.js <address> [role] [attackCid]
 *   node test-profile.js <attackCid>            (mode lạm dụng nhanh)
 *
 * Env:
 *   API_BASE      - default http://localhost:3000
 *   PROFILE_ADDR  - fallback address
 *   PROFILE_ROLE  - poster|freelancer (optional)
 *   ATTACK_CID    - optional CID to thử lạm dụng (kỳ vọng bị chặn)
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

const args = process.argv.slice(2);

const looksLikeCid = (value) =>
  typeof value === 'string' && (value.startsWith('enc:') || value.startsWith('bafy'));

let addressArg;
let roleArg;
let cidArg;

if (args.length > 0) {
  if (looksLikeCid(args[0])) {
    cidArg = args[0];
    addressArg = args[1];
    roleArg = args[2];
  } else {
    addressArg = args[0];
    roleArg = args[1];
    cidArg = args[2];
  }
}

const ADDRESS = addressArg || process.env.PROFILE_ADDR;
const ROLE = roleArg || process.env.PROFILE_ROLE;
const ATTACK_CID = cidArg || process.env.ATTACK_CID;

const logDivider = () => console.log('============================================================');
const prettyJson = (data) => JSON.stringify(data, null, 2);

async function safeFetch(url, options) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return { ok: false, status: 0, body: { error: err.message } };
  }
}

async function testProfile(address, role) {
  logDivider();
  console.log(`🧪 Test 1: Lấy profile public (address=${address}${role ? `, role=${role}` : ''})`);

  const params = new URLSearchParams({ address });
  if (role) params.set('role', role);
  const url = `${API_BASE}/api/profile?${params.toString()}`;
  console.log('📡 GET', url);

  const result = await safeFetch(url);
  console.log(`🔎 Status: ${result.status}`);
  console.log('📦 Body  :', prettyJson(result.body));
}

async function testAbuse(address, cid) {
  logDivider();
  console.log('🧪 Test 2: Thử nhét CID tùy ý (phải bị chặn)');

  const attempts = [
    `${API_BASE}/api/profile?cid=${encodeURIComponent(cid)}`
  ];

  if (address) {
    attempts.push(
      `${API_BASE}/api/profile?address=${encodeURIComponent(address)}&cid=${encodeURIComponent(cid)}`
    );
    attempts.push(
      `${API_BASE}/api/profile?address=${encodeURIComponent(address)}&role=poster&cid=${encodeURIComponent(cid)}`
    );
  }

  for (const url of attempts) {
    console.log('📡 GET', url);
    const result = await safeFetch(url);
    console.log(`🔎 Status: ${result.status}`);
    console.log('📦 Body  :', prettyJson(result.body));
  }
}

async function main() {
  if (ADDRESS) {
    await testProfile(ADDRESS, ROLE);
  } else {
    console.log('ℹ️  Không có address → bỏ qua Test 1.');
  }

  if (ATTACK_CID) {
    await testAbuse(ADDRESS, ATTACK_CID);
  } else {
    console.log('⚠️  Bỏ qua Test 2 (set ATTACK_CID hoặc truyền cid).');
  }

  logDivider();
  console.log('✅ Done');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

