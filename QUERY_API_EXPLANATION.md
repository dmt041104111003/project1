# Tại sao Query phải làm ở Backend API?

## ✅ Lý do chính:

### 1. **API Key Security** 🔐
- Backend đang dùng `APTOS_API_KEY` để gọi Aptos node API
- **KHÔNG NÊN** expose API key ra frontend (bảo mật)
- Frontend không có API key → không thể gọi Aptos node API trực tiếp (nếu cần API key)

### 2. **Parse Logic Phức Tạp** 🔧
Backend có nhiều logic parse data từ blockchain:
- `parseState()` - Parse enum JobState
- `parseOptionAddress()` - Parse Option<address>
- `parseMilestoneStatus()` - Parse enum MilestoneStatus
- Parse nested structures (vec, __variant__, etc.)

Frontend có thể tự parse, nhưng:
- Logic phức tạp, dễ lỗi
- Backend tập trung hóa logic → dễ maintain

### 3. **Data Transformation** 📊
Backend transform raw blockchain data thành format dễ dùng:
- Convert types (string → number)
- Flatten nested structures
- Combine data từ nhiều nguồn
- Format dates, amounts, etc.

### 4. **Caching & Performance** ⚡
- Backend có thể cache data để giảm requests
- Giảm load lên Aptos node
- Faster response time

### 5. **Rate Limiting** 🚦
- Tránh spam requests từ frontend
- Control số lượng requests đến Aptos node
- Tránh bị block bởi Aptos API

## ❓ Có thể làm ở Frontend không?

### Có, NHƯNG:
1. **Không có API key** → Phải dùng public Aptos node (có thể chậm/không ổn định)
2. **Phải tự parse** → Logic phức tạp, dễ lỗi
3. **Không có caching** → Mỗi lần query đều gọi Aptos node
4. **Không có rate limiting** → Có thể bị block

### Nếu muốn làm ở Frontend:
```typescript
// Frontend có thể query trực tiếp (không cần API key cho public node)
const res = await fetch('https://api.testnet.aptoslabs.com/v1/tables/{handle}/item', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key_type: 'u64', value_type: '...', key: jobId })
});
```

## 📝 Kết luận:

**Nên giữ Query APIs ở Backend vì:**
- ✅ Bảo mật API key
- ✅ Parse logic tập trung, dễ maintain
- ✅ Có thể cache và optimize
- ✅ Rate limiting và error handling tốt hơn

**Chỉ nên bỏ nếu:**
- Dùng public Aptos node (không cần API key)
- Chấp nhận parse logic ở frontend
- Không cần caching/rate limiting

