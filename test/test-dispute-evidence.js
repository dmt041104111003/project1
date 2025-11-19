#!/usr/bin/env node

/**
 * Test script cho `/api/ipfs/dispute`.
 *
 * Cách dùng:
 *   node test-dispute-evidence.js <disputeId> <address> <auth_token> <csrf_token> [--side=poster] [--decode]
 *
 * address tự xác định role dựa trên dữ liệu on-chain (poster, freelancer, reviewer).
 * Nếu địa chỉ là reviewer, cần thêm --side=poster|freelancer để chọn bằng chứng.
 *
 * Env hỗ trợ:
 *   API_BASE      - default http://localhost:3000
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

const args = process.argv.slice(2);
const disputeId = args[0];
const userAddress = args[1];
const authToken = args[2];
const csrfToken = args[3];

if (!disputeId || !userAddress || !authToken || !csrfToken) {
  console.error('❌ Thiếu tham số.');
  console.error('Cách dùng: node test-dispute-evidence.js <disputeId> <address> <auth_token> <csrf_token> [--side=poster] [--decode]');
  process.exit(1);
}

let side = 'poster';
let decodeOnly = false;
let cidParam = null;

for (const arg of args.slice(4)) {
  if (arg.startsWith('--side=')) {
    side = arg.slice('--side='.length).toLowerCase();
  } else if (arg === '--decode') {
    decodeOnly = true;
  } else if (arg.startsWith('--cid=')) {
    cidParam = arg.slice('--cid='.length);
  }
}

(async () => {
  try {
    // Fetch dispute to determine role
    const metaUrl = `${API_BASE}/api/dispute?action=get_evidence&dispute_id=${disputeId}`;
    const metaRes = await fetch(metaUrl, { headers: { 'x-api-key': process.env.APTOS_API_KEY || '' } });
    if (!metaRes.ok) {
      const txt = await metaRes.text().catch(() => '');
      throw new Error(`Không fetch được dispute metadata: ${txt || metaRes.statusText}`);
    }
    const metaData = await metaRes.json();

    const statusUrl = `${API_BASE}/api/dispute?action=get_reviewers&dispute_id=${disputeId}`;
    const reviewersRes = await fetch(statusUrl, { headers: { 'x-api-key': process.env.APTOS_API_KEY || '' } });
    const reviewersJson = reviewersRes.ok ? await reviewersRes.json() : {};

    const normalizedAddr = (addr) => {
      if (!addr) return '';
      return addr.toLowerCase().startsWith('0x') ? addr.toLowerCase() : `0x${addr.toLowerCase()}`;
    };

    const addr = normalizedAddr(userAddress);
    const posterAddr = normalizedAddr(metaData.poster || metaData.poster_address);
    const freelancerAddr = normalizedAddr(metaData.freelancer || metaData.freelancer_address);
    const reviewers = Array.isArray(reviewersJson?.selected_reviewers)
      ? reviewersJson.selected_reviewers.map(normalizedAddr)
      : [];

    let role = '';
    if (addr === posterAddr) {
      role = 'poster';
    } else if (addr === freelancerAddr) {
      role = 'freelancer';
    } else if (reviewers.includes(addr)) {
      role = 'reviewer';
    } else {
      throw new Error('Địa chỉ không nằm trong tranh chấp (poster/freelancer/reviewer)');
    }

    if (role === 'reviewer' && side !== 'poster' && side !== 'freelancer') {
      console.error('❌ Reviewer cần truyền --side=poster|freelancer');
      process.exit(1);
    }

    const params = new URLSearchParams({
      disputeId,
      role,
    });

    if (role === 'reviewer') {
      params.set('side', side);
    }
    if (decodeOnly) {
      params.set('decodeOnly', 'true');
    }
    if (cidParam) {
      params.set('cid', cidParam);
    }

    const url = `${API_BASE}/api/ipfs/dispute?${params.toString()}`;
    console.log('📡 GET', url);

    const res = await fetch(url, {
      headers: {
        'x-csrf-token': csrfToken,
        Cookie: `auth_token=${authToken}; csrf_token=${csrfToken}`,
      },
      credentials: 'include',
    });

    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }

    console.log(`🔎 Status: ${res.status}`);
    console.log('📦 Body  :', body);
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
  }
})();

