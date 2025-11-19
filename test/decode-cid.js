// Script dùng để giải mã CID được mã hóa bằng AES-GCM (enc:iv:cipherText)
// Sử dụng biến môi trường CID_SECRET_B64 (base64 key giống backend)
//node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
//khóa AES-GCM dạng base64 dùng để mã hóa/giải mã CID.
const { webcrypto } = require('node:crypto');
const crypto = globalThis.crypto || webcrypto;

// Điền CID_SECRET_B64 trực tiếp vào đây nếu không muốn dùng env
//const INLINE_SECRET = 'Xgmfwqs8ZYMQUmef/SSCN19XALrHwl9suRKHGcq8QEw='; // key giải mã sai
const INLINE_SECRET='bT8xUfyrSovtk+O3MThIrzv/Mc80VyRzURbuQSC1aHw='; // key giải mã đúng

const CID_SECRET_B64 =
  INLINE_SECRET ||
  process.env.CID_SECRET_B64 ||
  (() => {
    console.error('❌ [CONFIG] Chưa có CID_SECRET_B64. Dán vào INLINE_SECRET hoặc set env.');
    process.exit(1);
  })();

const encryptedCid =
  process.argv[2] ||
  'enc:JTvOzl8UfB4hP1DR:C4d/xEJWbfqXfzza2b7ZaizS9iH2WeLSTXjDW5mlGaM8bDuPG7qaJJe3T5GO6FPvo+ucRzSQREhDFJiOsNRQ58vYz5XMwpFELUgv';

async function importKey() {
  try {
    const raw = Buffer.from(CID_SECRET_B64, 'base64');
    return await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt']);
  } catch (error) {
    console.error('❌ [KEY] Không thể import CID_SECRET_B64. Kiểm tra chuỗi base64 hợp lệ.');
    throw error;
  }
}

async function decryptCid(encCid) {
  if (!encCid.startsWith('enc:')) {
    console.log('ℹ️ [INFO] CID không được mã hóa, trả về nguyên gốc.');
    return encCid;
  }

  const parts = encCid.split(':');
  if (parts.length !== 3) {
    throw new Error('Sai định dạng enc:iv:cipherText');
  }

  const [, ivB64, ctB64] = parts;

  let key;
  try {
    key = await importKey();
  } catch (error) {
    console.error('❌ [KEY] Import key thất bại:', error.message);
    throw error;
  }

  let iv, cipherBytes;
  try {
    iv = Buffer.from(ivB64, 'base64');
    cipherBytes = Buffer.from(ctB64, 'base64');
  } catch (error) {
    console.error('❌ [BASE64] Không thể decode IV hoặc ciphertext. Kiểm tra chuỗi enc.');
    throw error;
  }

  let plainBuffer;
  try {
    plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherBytes
    );
  } catch (error) {
    console.error('❌ [DECRYPT] AES-GCM decrypt thất bại. Có thể IV/secret sai hoặc dữ liệu bị lỗi.');
    throw error;
  }

  return Buffer.from(plainBuffer).toString('utf8');
}

decryptCid(encryptedCid)
  .then((cid) => {
    console.log('✅ [SUCCESS] Decrypt thành công!');
    console.log('📦 CID gốc:', cid);
    const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
    console.log('🔗 URL IPFS (nếu cần):', `${gateway}/${cid}`);
  })
  .catch((err) => {
    console.error('❌ [FAILED] Lỗi decrypt CID:', err.message);
    if (err.stack) {
      console.error('📄 Stack trace:', err.stack);
    }
    process.exit(1);
  });

