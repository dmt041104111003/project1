
const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const JOB_ID = process.argv[2] || process.env.JOB_ID;
const ATTACK_CID = process.argv[3] || process.env.ATTACK_CID;

const logDivider = () => {
  console.log('============================================================');
};

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

async function testLegitAccess(jobId) {
  logDivider();
  console.log(`🧪 Test 1: Public access by jobId (${jobId})`);
  const url = `${API_BASE}/api/ipfs/job?jobId=${encodeURIComponent(jobId)}`;
  console.log('📡 GET', url);
  const result = await safeFetch(url);
  console.log(`🔎 Status: ${result.status}`);
  console.log('📦 Body  :', prettyJson(result.body));
}

async function testCidAbuse(cid) {
  logDivider();
  console.log('🧪 Test 2: Attempt to decode arbitrary CID (should fail)');
  const attempts = [
    `${API_BASE}/api/ipfs/job?cid=${encodeURIComponent(cid)}`,
    `${API_BASE}/api/ipfs/job?cid=${encodeURIComponent(cid)}&decodeOnly=true`,
    `${API_BASE}/api/ipfs/job?cid=${encodeURIComponent(cid)}&jobId=fake`
  ];

  for (const url of attempts) {
    console.log('📡 GET', url);
    const result = await safeFetch(url);
    console.log(`🔎 Status: ${result.status}`);
    console.log('📦 Body  :', prettyJson(result.body));
  }
}

async function main() {
  if (!JOB_ID) {
    console.error('❌ Missing jobId. Pass it as argv[2] or set JOB_ID env var.');
    process.exit(1);
  }

  await testLegitAccess(JOB_ID);

  if (ATTACK_CID) {
    await testCidAbuse(ATTACK_CID);
  } else {
    console.log('⚠️  Skipping CID abuse tests (set ATTACK_CID or pass as argv[3]).');
  }

  logDivider();
  console.log('✅ Done');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

