

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

aptos init --profile zkp --assume-yes


 aptos move publish \
  --profile zkp \
  --named-addresses job_work_board=0x35efd12cc6311a16245671fb8855a10e282908f773ab019b830409bbba2d849a --assume-yes


pip install -r requirements.txt; pip install face-recognition==1.3.0 --no-deps; pip install Click>=6.0 face-recognition-models>=0.3.0