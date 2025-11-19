#!/usr/bin/env node

/**
 * Test script cho `/api/ipfs/upload` (upload file evidence).
 *
 * Cách dùng nhanh:
 *   node test-ipfs-upload-file.js <đường_dẫn_file> <auth_token> <csrf_token> [--type=milestone_evidence] [--job=ID]
 *
 * Hoặc chạy không tham số → script sẽ hỏi lần lượt:
 *   - Dùng file hay gõ text (tạo file tạm)
 *   - auth_token / csrf_token (nếu chưa đặt env AUTH_COOKIE & CSRF_HEADER)
 *   - jobId (bắt buộc với milestone/dispute evidence)
 *
 * Env hỗ trợ:
 *   API_BASE      - default http://localhost:3000
 *   AUTH_COOKIE   - ví dụ "auth_token=...; csrf_token=..."
 *   CSRF_HEADER   - giá trị csrf_token
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const AUTH_COOKIE = process.env.AUTH_COOKIE;
const CSRF_HEADER = process.env.CSRF_HEADER;

const TYPE_REQUIRES_JOB = new Set(['milestone_evidence', 'dispute_evidence']);

const args = process.argv.slice(2);
let filePathArg = null;
let inlineText = null;
let authTokenArg = null;
let csrfTokenArg = null;
let jobIdArg = null;
let typeArg = 'milestone_evidence';

for (const arg of args) {
  if (arg.startsWith('--text=')) {
    inlineText = arg.slice('--text='.length);
  } else if (arg.startsWith('--type=')) {
    typeArg = arg.slice('--type='.length) || typeArg;
  } else if (arg.startsWith('--job=')) {
    jobIdArg = arg.slice('--job='.length);
  } else if (!filePathArg) {
    filePathArg = arg;
  } else if (!authTokenArg) {
    authTokenArg = arg;
  } else if (!csrfTokenArg) {
    csrfTokenArg = arg;
  }
}

let authCookie = AUTH_COOKIE;
let csrfHeader = CSRF_HEADER;

if (authTokenArg && csrfTokenArg) {
  authCookie = `auth_token=${authTokenArg}; csrf_token=${csrfTokenArg}`;
  csrfHeader = csrfTokenArg;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question) =>
  new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });

async function ensureInputs() {
  if (!filePathArg && inlineText === null) {
    console.log('⚙️  Chọn nguồn dữ liệu:');
    console.log('  1) Nhập đường dẫn file');
    console.log('  2) Nhập nội dung text (tạo file tạm)');
    const choice = await ask('Chọn 1 hoặc 2 [1]: ');
    if ((choice || '1').startsWith('2')) {
      inlineText = await ask('Nhập nội dung text: ');
    } else {
      filePathArg = await ask('Nhập đường dẫn file: ');
    }
  }

  if (!authCookie || !csrfHeader) {
    if (!authCookie) {
      const token = await ask('Nhập auth_token: ');
      const csrf = await ask('Nhập csrf_token: ');
      authCookie = `auth_token=${token}; csrf_token=${csrf}`;
      csrfHeader = csrf;
    } else if (!csrfHeader) {
      const csrf = await ask('Nhập csrf_token: ');
      csrfHeader = csrf;
    }
  }

  if (!authCookie || !csrfHeader) {
    console.error('❌ Thiếu auth token hoặc csrf token.');
    process.exit(1);
  }

  if (TYPE_REQUIRES_JOB.has(typeArg)) {
    if (!jobIdArg) {
      jobIdArg = await ask('Nhập jobId (bắt buộc cho loại file này): ');
    }
    if (!jobIdArg) {
      console.error('❌ jobId là bắt buộc cho loại file hiện tại.');
      process.exit(1);
    }
  }
}

const logDivider = () => console.log('============================================================');

function createTempFile(content) {
  const tmpPath = path.join(process.cwd(), `temp-upload-${Date.now()}.txt`);
  fs.writeFileSync(tmpPath, content ?? `Dummy upload ${new Date().toISOString()}`);
  return tmpPath;
}

function getFileStream(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Không tìm thấy file: ${filePath}`);
  }
  return fs.createReadStream(filePath);
}

async function main() {
  await ensureInputs();
  rl.close();

  let filePath = filePathArg;
  let cleanup = false;

  try {
    if (!filePath) {
      cleanup = true;
      filePath = createTempFile(inlineText ?? undefined);
    } else if (inlineText !== null) {
      cleanup = true;
      filePath = createTempFile(inlineText);
    }

    const formData = new FormData();
    const fileStream = getFileStream(filePath);
    formData.append('file', fileStream, path.basename(filePath));
    formData.append('type', typeArg);
    if (jobIdArg) {
      formData.append('jobId', jobIdArg);
    }

    logDivider();
    console.log(`🧪 Upload file ${filePath} (type=${typeArg})`);

    const res = await fetch(`${API_BASE}/api/ipfs/upload`, {
      method: 'POST',
      headers: {
        'x-csrf-token': csrfHeader,
        Cookie: authCookie,
      },
      body: formData,
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
  } finally {
    if (cleanup && filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

