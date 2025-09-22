export const NAVIGATION = [
  { name: 'Trang chủ', href: '/' },
  { name: 'Việc làm', href: '/jobs' },
  { name: 'Chat', href: '/chat' },
  { name: 'Dashboard', href: '/dashboard' }
];

export const HOW_IT_WORKS_STEPS = [
  {
    id: 1,
    title: "Verify danh tính",
    description: "Xác minh danh tính qua DID để đảm bảo uy tín",
    icon: "shield-check"
  },
  {
    id: 2,
    title: "Nạp Escrow",
    description: "Người thuê nạp tiền vào smart contract escrow",
    icon: "currency-dollar"
  },
  {
    id: 3,
    title: "Ứng tuyển & Stake",
    description: "Freelancer ứng tuyển và stake token để cam kết",
    icon: "users"
  },
  {
    id: 4,
    title: "Nộp & Nhận tiền",
    description: "Hoàn thành công việc và nhận thanh toán tự động",
    icon: "check-circle"
  }
];


export const PERSONAS = {
  poster: {
    title: "Bạn là người thuê việc?",
    benefits: [
      "Bảo vệ thanh toán 100% qua smart contract escrow",
      "Truy cập pool freelancer đã xác minh danh tính",
      "Giải quyết tranh chấp nhanh chóng qua DAO",
      "Tiết kiệm thời gian tìm kiếm và sàng lọc"
    ],
    cta: "Đăng Job ngay",
    icon: "plus"
  },
  freelancer: {
    title: "Bạn là freelancer?",
    benefits: [
      "Nhận thanh toán đảm bảo và minh bạch",
      "Xây dựng uy tín qua DID verification",
      "Tham gia cộng đồng freelancer chất lượng",
      "Tăng thu nhập với mức giá cạnh tranh"
    ],
    cta: "Tạo Profile",
    icon: "user"
  }
};

export const TRUST_STATS = [
  {
    label: "DID Verified",
    value: "1,234+",
    icon: "shield-check",
    color: "text-success"
  },
  {
    label: "Job Escrowed",
    value: "5,678+",
    icon: "currency-dollar",
    color: "text-primary"
  },
  {
    label: "Dispute Resolved",
    value: "99.8%",
    icon: "check-circle",
    color: "text-secondary"
  }
];

export const FAQS = [
  {
    question: "Làm thế nào để xác minh danh tính?",
    answer: "Bạn có thể xác minh danh tính thông qua DID (Decentralized Identity) bằng cách kết nối ví và cung cấp thông tin cần thiết. Quá trình này được thực hiện trên blockchain để đảm bảo tính minh bạch và bảo mật."
  },
  {
    question: "Escrow hoạt động như thế nào?",
    answer: "Khi người thuê đăng job, họ sẽ nạp tiền vào smart contract escrow. Tiền chỉ được giải ngân khi công việc hoàn thành và được xác nhận. Nếu có tranh chấp, DAO sẽ can thiệp để giải quyết."
  },
  {
    question: "Phí dịch vụ là bao nhiêu?",
    answer: "Chúng tôi chỉ thu phí 2% trên mỗi giao dịch thành công. Phí này được sử dụng để duy trì hệ thống và phát triển nền tảng. Không có phí ẩn hay phí đăng ký."
  },
  {
    question: "Làm sao để giải quyết tranh chấp?",
    answer: "Khi có tranh chấp, hệ thống sẽ kích hoạt quy trình DAO. Cộng đồng sẽ bỏ phiếu để quyết định kết quả cuối cùng. Quyết định này được thực hiện tự động thông qua smart contract."
  },
  {
    question: "Có thể rút tiền khi nào?",
    answer: "Freelancer có thể rút tiền ngay sau khi công việc được xác nhận hoàn thành. Quá trình rút tiền được thực hiện tự động thông qua smart contract, không cần chờ đợi thủ tục thủ công."
  },
  {
    question: "Nền tảng có hỗ trợ đa ngôn ngữ không?",
    answer: "Hiện tại chúng tôi hỗ trợ tiếng Việt và tiếng Anh. Chúng tôi đang phát triển thêm các ngôn ngữ khác để phục vụ cộng đồng freelancer toàn cầu."
  }
];

export const FOOTER_LINKS = {
  product: [
    { name: "Docs", href: "/docs" },
    { name: "Contract", href: "/contract" },
    { name: "API", href: "/api" },
    { name: "System Status", href: "/status" }
  ],
  community: [
    { name: "Discord", href: "https://discord.gg" },
    { name: "Telegram", href: "https://t.me" },
    { name: "Twitter", href: "https://twitter.com" },
    { name: "GitHub", href: "https://github.com/dmt041104111003/web2.5Freelancer" }
  ],
  legal: [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
    { name: "Cookie Policy", href: "/cookies" }
  ]
};

export const HERO_DATA = {
  title: "Web2.5 Freelancer",
  subtitle: "Platform",
  description: "Nền tảng freelancer phi tập trung với xác minh danh tính và escrow tự động, đảm bảo an toàn cho cả người thuê và người làm việc.",
  primaryCta: "Đăng Job với Escrow",
  secondaryCta: "Xác minh & Nhận Job",
  trustIndicators: [
    { label: "DID Verified", icon: "shield-check" },
    { label: "Escrow Protected", icon: "lock-closed" }
  ]
};
