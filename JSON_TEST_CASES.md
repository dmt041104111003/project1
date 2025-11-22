

```json
{
  "title": "Phát triển Smart Contract Escrow trên Aptos",
  "description": "Job test để kiểm tra khi reviewUnit khác với unit chính của milestone. Ví dụ: milestone tính bằng ngày nhưng review tính bằng giờ.",
  "requirements": [
    "Move",
    "Aptos",
    "Smart Contract",
    "Blockchain",
    "Security",
    "Testing"
  ],
  "deadline": 30,
  "deadlineUnit": "ngày",
  "milestones": [
    {
      "amount": "0.15",
      "duration": "21",
      "unit": "giây",
      "reviewPeriod": "5",
      "reviewUnit": "ngày"
    },
    {
      "amount": "0.1",
      "duration": "28",
      "unit": "ngày",
      "reviewPeriod": "7",
      "reviewUnit": "giây"
    },
    {
      "amount": "0.2",
      "duration": "14",
      "unit": "ngày",
      "reviewPeriod": "3",
      "reviewUnit": "ngày"
    },
    {
      "amount": "0.12",
      "duration": "7",
      "unit": "ngày",
      "reviewPeriod": "2",
      "reviewUnit": "ngày"
    }
  ]
}
```

---

aptos init --network testnet --profile zkp --assume-yes 

 aptos move publish \
  --profile zkp \
  --named-addresses job_work_board=0x55491d4abd9f4b3c0aa4d09b469ba7f2482523065e116846ef7701ea59bfb842 --assume-yes


pip install -r requirements.txt; pip install face-recognition==1.3.0 --no-deps; pip install Click>=6.0 face-recognition-models>=0.3.0