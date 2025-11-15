export const NAVIGATION = [
  { name: 'Trang chủ', href: '/' },
  { name: 'Công việc', href: '/jobs' },
  { name: 'Chat', href: '/chat' },
  { name: 'Bảng điều khiển', href: '/dashboard' },
  { name: 'Tranh chấp', href: '/disputes' },
  { name: 'Danh tiếng', href: '/reputation' }
];

export const HOW_IT_WORKS_STEPS = [
  {
    id: 1,
    title: "Xác minh danh tính",
    description: "Xác minh danh tính với DID để xây dựng uy tín",
    icon: "shield-check"
  },
  {
    id: 2,
    title: "Gửi tiền vào escrow",
    description: "Khách hàng gửi tiền vào hợp đồng thông minh escrow",
    icon: "currency-dollar"
  },
  {
    id: 3,
    title: "Ứng tuyển & Đặt cọc",
    description: "Freelancer ứng tuyển và đặt cọc token để cam kết",
    icon: "users"
  },
  {
    id: 4,
    title: "Nộp bài & Nhận thanh toán",
    description: "Hoàn thành công việc và nhận thanh toán tự động",
    icon: "check-circle"
  }
];


export const PERSONAS = {
  poster: {
    title: "Bạn là khách hàng?",
    benefits: [
      "Bảo vệ thanh toán 100% qua hợp đồng thông minh escrow",
      "Truy cập nhóm freelancer đã xác minh",
      "Giải quyết tranh chấp nhanh chóng qua DAO",
      "Tiết kiệm thời gian tìm kiếm và sàng lọc"
    ],
    cta: "Đăng công việc",
    icon: "plus"
  },
  freelancer: {
    title: "Bạn là freelancer?",
    benefits: [
      "Thanh toán an toàn và minh bạch",
      "Xây dựng uy tín qua xác minh DID",
      "Tham gia cộng đồng freelancer chất lượng cao",
      "Tăng thu nhập với mức giá cạnh tranh"
    ],
    cta: "Tạo hồ sơ",
    icon: "user"
  }
};

export const TRUST_STATS = [
  {
    label: "Đã xác minh DID",
    value: "1,234+",
    icon: "shield-check",
    color: "text-success"
  },
  {
    label: "Công việc đã escrow",
    value: "5,678+",
    icon: "currency-dollar",
    color: "text-primary"
  },
  {
    label: "Tranh chấp đã giải quyết",
    value: "99.8%",
    icon: "check-circle",
    color: "text-secondary"
  }
];

export const FAQS = [
  {
    question: "Làm thế nào để xác minh danh tính?",
    answer: "Bạn có thể xác minh danh tính qua DID bằng cách kết nối ví và cung cấp thông tin cần thiết. Quy trình chạy trên blockchain để đảm bảo minh bạch và an toàn."
  },
  {
    question: "Escrow hoạt động như thế nào?",
    answer: "Khi khách hàng đăng công việc, họ gửi tiền vào escrow. Tiền được giải phóng sau khi hoàn thành và xác nhận. Tranh chấp được giải quyết bởi DAO."
  },
  {
    question: "Phí là bao nhiêu?",
    answer: "Chúng tôi thu phí 2% cho mỗi giao dịch thành công để duy trì và phát triển nền tảng. Không có phí ẩn hoặc phí đăng ký."
  },
  {
    question: "Tranh chấp được giải quyết như thế nào?",
    answer: "Khi có tranh chấp, quy trình DAO được kích hoạt. Cộng đồng bỏ phiếu và việc thực thi được thực thi bởi hợp đồng thông minh."
  },
  {
    question: "Khi nào tôi có thể rút tiền?",
    answer: "Freelancer có thể rút tiền ngay sau khi công việc được xác nhận hoàn thành. Việc rút tiền được tự động hóa qua hợp đồng thông minh."
  },
  {
    question: "Có hỗ trợ đa ngôn ngữ không?",
    answer: "Chúng tôi hiện hỗ trợ tiếng Việt và tiếng Anh, với nhiều ngôn ngữ khác sắp ra mắt."
  }
];

export const FOOTER_LINKS = {
  product: [
    { name: "Tài liệu", href: "/docs" },
    { name: "Hợp đồng", href: "/contract" },
    { name: "API", href: "/api" },
    { name: "Trạng thái hệ thống", href: "/status" }
  ],
  community: [
    { name: "Discord", href: "https://discord.gg" },
    { name: "Telegram", href: "https://t.me" },
    { name: "Twitter", href: "https://twitter.com" },
    { name: "GitHub", href: "https://github.com/dmt041104111003/marketplace2vn" }
  ],
  legal: [
    { name: "Chính sách bảo mật", href: "/privacy" },
    { name: "Điều khoản dịch vụ", href: "/terms" },
    { name: "Chính sách cookie", href: "/cookies" }
  ]
};

export const HERO_DATA = {
  title: "Marketplace2vn",
  subtitle: "Tạo Website Hoàn Hảo",
  description: "Nền tảng freelancer phi tập trung với xác minh DID và escrow tự động để đảm bảo an toàn và minh bạch.",
  primaryCta: "Đăng Job với Escrow",
  secondaryCta: "Xác Minh & Nhận Job",
  trustIndicators: [
    { label: "Đã xác minh DID", icon: "shield-check" },
    { label: "Được bảo vệ bởi Escrow", icon: "lock-closed" }
  ]
};
