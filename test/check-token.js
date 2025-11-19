const token = process.argv[2] || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZGRyZXNzIjoiMHg5ZjkxY2Q5MjcwNWU2OWQ3Mzg3YmEzYTRkNDcwM2NiYTFhOTRmOTcwODZiMGY3MjczNDU5YTkzODEzNWIyM2Y1IiwiaWF0IjoxNzYzNDUzMDEwLCJleHAiOjE3NjQwNTc4MTB9.4jHNJ7PH4vNQKKBIO3yX-acxk3tU0JyPkhNdimnpVXc";

if (!token) {
  console.error('❌ Không có token. Truyền token qua CLI: node check-token.js <JWT> hoặc set AUTH_TOKEN.');
  process.exit(1);
}

console.log('=== PHÂN TÍCH JWT TOKEN ===\n');

// Tách token thành 3 phần
const parts = token.split('.');
if (parts.length !== 3) {
  console.error('Token không hợp lệ!');
  process.exit(1);
}

// Decode Header
const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
console.log('📋 HEADER:');
console.log(JSON.stringify(header, null, 2));
console.log('');

// Decode Payload
const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
console.log('📦 PAYLOAD (Dữ liệu trong token):');
console.log(JSON.stringify(payload, null, 2));
console.log('');

// Phân tích thông tin
console.log('🔍 PHÂN TÍCH CHI TIẾT:');
console.log('─'.repeat(50));

// Kiểm tra các trường nhạy cảm
const sensitiveFields = [
  'password', 'pass', 'pwd', 'secret', 'privateKey', 'private_key',
  'apiKey', 'api_key', 'accessKey', 'access_key', 'secretKey', 'secret_key',
  'token', 'auth', 'credential', 'credential', 'key', 'keys',
  'email', 'phone', 'ssn', 'creditCard', 'card', 'cvv',
  'bank', 'account', 'pin', 'otp', 'code'
];

const foundSensitive = [];
const allFields = Object.keys(payload);

allFields.forEach(field => {
  const lowerField = field.toLowerCase();
  sensitiveFields.forEach(sensitive => {
    if (lowerField.includes(sensitive)) {
      foundSensitive.push(field);
    }
  });
});

// Hiển thị từng trường
allFields.forEach(field => {
  const value = payload[field];
  const isSensitive = foundSensitive.includes(field);
  const marker = isSensitive ? '⚠️  [NHẠY CẢM]' : '✅ [AN TOÀN]';
  
  console.log(`${marker} ${field}:`);
  
  if (field === 'iat' || field === 'exp') {
    const date = new Date(value * 1000);
    console.log(`   Giá trị: ${value} (${date.toISOString()})`);
  } else if (field === 'address') {
    console.log(`   Giá trị: ${value}`);
    console.log(`   ⚠️  LƯU Ý: Address là thông tin công khai trên blockchain`);
  } else {
    console.log(`   Giá trị: ${value}`);
  }
  console.log('');
});

// Đánh giá tổng thể
console.log('─'.repeat(50));
console.log('📊 ĐÁNH GIÁ BẢO MẬT:');
console.log('');

if (foundSensitive.length > 0) {
  console.log('❌ CẢNH BÁO: Token chứa các trường có thể nhạy cảm:');
  foundSensitive.forEach(field => {
    console.log(`   - ${field}`);
  });
  console.log('');
} else {
  console.log('✅ Token KHÔNG chứa thông tin nhạy cảm rõ ràng');
  console.log('');
}

// Kiểm tra thời hạn
if (payload.exp) {
  const expDate = new Date(payload.exp * 1000);
  const now = new Date();
  const isExpired = now > expDate;
  const daysLeft = Math.floor((expDate - now) / (1000 * 60 * 60 * 24));
  
  console.log('⏰ THỜI HẠN TOKEN:');
  console.log(`   Hết hạn: ${expDate.toISOString()}`);
  console.log(`   Trạng thái: ${isExpired ? '❌ ĐÃ HẾT HẠN' : `✅ Còn ${daysLeft} ngày`}`);
  console.log('');
}

// Kết luận
console.log('─'.repeat(50));
console.log('💡 KẾT LUẬN:');

const hasOnlyPublicInfo = allFields.every(field => 
  field === 'address' || field === 'iat' || field === 'exp' || field === 'iss' || field === 'sub'
);

if (hasOnlyPublicInfo && allFields.length <= 5) {
  console.log('✅ Token này CHỈ chứa thông tin công khai (address) và metadata (thời gian)');
  console.log('✅ Mức độ rủi ro: THẤP');
  console.log('✅ Phù hợp cho hệ thống blockchain/web3');
} else {
  console.log('⚠️  Token chứa nhiều thông tin, cần xem xét kỹ');
}

console.log('');
console.log('📝 LƯU Ý:');
console.log('   - Token có thể decode được (không cần secret)');
console.log('   - Nhưng không thể giả mạo được (cần secret để sign)');
console.log('   - Nếu token bị đánh cắp, kẻ tấn công có thể dùng nó đến khi hết hạn');
console.log('   - Nên rút ngắn thời hạn token nếu chứa thông tin nhạy cảm');

