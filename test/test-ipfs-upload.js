#!/usr/bin/env node

/**
 * Test script cho `/api/ipfs/upload`.
 *
 * Yêu cầu:
 *   - Server đang chạy tại API_BASE
 *   - Cookie auth_token/csrf_token hợp lệ (lấy sau khi login)
 *
 * Cách dùng:
 *   node test-ipfs-upload.js job                 (payload job mẫu)
 *   node test-ipfs-upload.js profile             (payload profile mẫu)
 *   node test-ipfs-upload.js apply <jobCid>      (cần jobCid hợp lệ)
 *   node test-ipfs-upload.js finalize <jobCid> <freelancerIdHash>
 *
 * Env vars:
 *   API_BASE     - default http://localhost:3000
 *   AUTH_COOKIE  - chuỗi "auth_token=...; csrf_token=..."
 *   CSRF_HEADER  - giá trị csrf_token (dùng cho header x-csrf-token)
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const AUTH_COOKIE = process.env.AUTH_COOKIE;
const CSRF_HEADER = process.env.CSRF_HEADER;
const [modeArg, arg1, arg2] = process.argv.slice(2);

if (!AUTH_COOKIE || !CSRF_HEADER) {
  console.error('❌ Cần set AUTH_COOKIE và CSRF_HEADER để test upload.');
  console.error('VD: set AUTH_COOKIE="auth_token=...; csrf_token=..."');
  console.error('    set CSRF_HEADER=abcdef123456');
  process.exit(1);
}

const logDivider = () => console.log('============================================================');
const prettyJson = (data) => JSON.stringify(data, null, 2);

const jobPayload = () => ({
  type: 'job',
  title: 'Demo Job',
  description: 'Test upload job metadata',
  requirements: ['Aptos', 'React']
});

const profilePayload = () => ({
  type: 'profile',
  skills: ['Solidity', 'Rust'],
  about: 'Profile test metadata'
});

const disputePayload = () => ({
  type: 'dispute',
  escrow_id: '123',
  milestone_index: 0,
  reason: 'Poster không thanh toán',
  poster_evidence: 'Poster evidence example',
  freelancer_evidence: 'Freelancer evidence example'
});

const applyPayload = (jobCid) => ({
  type: 'apply',
  job_cid: jobCid,
  freelancer_address: '0xFreelancerAddr'
});

const finalizePayload = (jobCid, freelancerIdHash) => ({
  type: 'finalize',
  job_cid: jobCid,
  freelancer_id_hash: freelancerIdHash
});

function buildPayload() {
  switch ((modeArg || 'job').toLowerCase()) {
    case 'job':
      return jobPayload();
    case 'profile':
      return profilePayload();
    case 'dispute':
      return disputePayload();
    case 'apply':
      if (!arg1) throw new Error('Thiếu jobCid cho mode apply');
      return applyPayload(arg1);
    case 'finalize':
      if (!arg1 || !arg2) throw new Error('Thiếu jobCid hoặc freelancerIdHash cho mode finalize');
      return finalizePayload(arg1, arg2);
    default:
      throw new Error(`Mode không hỗ trợ: ${modeArg}`);
  }
}

async function safeFetch(url, options) {
  const headers = new Headers(options?.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('x-csrf-token', CSRF_HEADER);
  headers.set('Cookie', AUTH_COOKIE);

  try {
    const res = await fetch(url, { ...options, headers, credentials: 'include' });
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

async function main() {
  try {
    const payload = buildPayload();
    logDivider();
    console.log(`🧪 Gọi /api/ipfs/upload (mode=${modeArg || 'job'})`);
    console.log('📤 Payload:', prettyJson(payload));

    const result = await safeFetch(`${API_BASE}/api/ipfs/upload`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    console.log(`🔎 Status: ${result.status}`);
    console.log('📦 Body  :', prettyJson(result.body));
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

