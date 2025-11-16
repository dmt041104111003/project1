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
    title: "Xác minh danh tính với ZK Proof",
    description: "Upload CCCD, xác minh khuôn mặt với AI, tạo ZK proof để đảm bảo mỗi người chỉ có 1 ví",
    icon: "shield-check"
  },
  {
    id: 2,
    title: "Đăng ký vai trò",
    description: "Chọn vai trò Freelancer, Poster hoặc Reviewer và upload hồ sơ lên IPFS",
    icon: "user-circle"
  },
  {
    id: 3,
    title: "Tạo job với milestones",
    description: "Poster tạo job, chia thành nhiều milestones, gửi tiền vào escrow và đặt cọc",
    icon: "briefcase"
  },
  {
    id: 4,
    title: "Apply & Đặt cọc",
    description: "Freelancer ứng tuyển, đặt cọc 1 APT để cam kết và bắt đầu làm việc",
    icon: "hand-raised"
  },
  {
    id: 5,
    title: "Submit & Review milestones",
    description: "Freelancer nộp bài từng milestone, Poster duyệt hoặc từ chối. Mỗi milestone được accept = +1 điểm uy tín",
    icon: "document-check"
  },
  {
    id: 6,
    title: "Thanh toán tự động",
    description: "Khi milestone được accept, tiền tự động chuyển từ escrow đến Freelancer",
    icon: "currency-dollar"
  },
  {
    id: 7,
    title: "Giải quyết tranh chấp",
    description: "Nếu có tranh chấp, phân cấp 3 reviewer uy tín đã xác minh sẽ bỏ phiếu để quyết định",
    icon: "scale"
  }
];


export const PERSONAS = {
  poster: {
    title: "Bạn là khách hàng?",
    benefits: [
      "Bảo vệ thanh toán 100% qua escrow với milestones",
      "Chỉ làm việc với freelancer đã xác minh danh tính (ZK proof)",
      "Kiểm soát từng milestone, duyệt hoặc từ chối trước khi thanh toán",
      "Giải quyết tranh chấp công bằng với 3 reviewer đã xác minh",
      "Xây dựng uy tín qua hệ thống điểm danh tiếng"
    ],
    cta: "Đăng công việc",
    icon: "plus"
  },
  freelancer: {
    title: "Bạn là freelancer?",
    benefits: [
      "Thanh toán tự động khi milestone được accept",
      "Xác minh danh tính một lần với ZK proof, dùng cho mọi vai trò",
      "Nhận thanh toán từng milestone, không cần chờ job hoàn thành",
      "Xây dựng uy tín qua điểm danh tiếng (mỗi milestone +1 điểm)",
      "Tham gia giải quyết tranh chấp với vai trò Reviewer để kiếm thêm điểm"
    ],
    cta: "Tạo hồ sơ",
    icon: "user"
  }
};

export const TRUST_STATS = [
  {
    label: "Đã xác minh với ZK Proof",
    value: "1,234+",
    icon: "shield-check",
    color: "text-success"
  },
  {
    label: "Milestones đã hoàn thành",
    value: "5,678+",
    icon: "document-check",
    color: "text-primary"
  },
  {
    label: "Tranh chấp đã giải quyết",
    value: "99.8%",
    icon: "scale",
    color: "text-secondary"
  }
];

export const FAQS = [
  {
    question: "Làm thế nào để xác minh danh tính?",
    answer: "Bạn cần upload ảnh CCCD/CMND, hệ thống sẽ đọc thông tin bằng OCR. Sau đó chụp ảnh khuôn mặt qua webcam để so khớp với ảnh trên CCCD. Hệ thống tạo ZK proof để chứng minh bạn đã xác minh mà không lộ thông tin CCCD. Mỗi CCCD chỉ được gắn với 1 ví duy nhất."
  },
  {
    question: "Escrow hoạt động như thế nào?",
    answer: "Khi Poster tạo job, họ chia thành nhiều milestones và gửi tiền vào escrow. Freelancer apply và đặt cọc 1 APT. Khi Freelancer submit milestone, Poster có thể accept hoặc reject. Nếu accept, tiền tự động chuyển từ escrow đến Freelancer và cả 2 bên nhận +1 điểm uy tín. Nếu reject, chuyển sang tranh chấp."
  },
  {
    question: "Phí là bao nhiêu?",
    answer: "Poster trả 1.2 APT phí khi tạo job (ngoài tiền escrow và stake 1 APT). Freelancer trả 0.1 APT phí khi apply job (ngoài stake 1 APT). Không có phí ẩn hoặc phí đăng ký."
  },
  {
    question: "Tranh chấp được giải quyết như thế nào?",
    answer: "Khi Poster reject milestone, hệ thống tự động chọn 3 reviewer đã xác minh (1 có điểm < người khởi tạo, 1 có điểm > người khởi tạo, 1 có điểm cao nhất). Mỗi reviewer bỏ phiếu. Nếu 2/3 reviewer đồng ý, quyết định được thực thi tự động. Reviewer vote đúng +2 điểm, vote sai -1 điểm."
  },
  {
    question: "Khi nào tôi có thể nhận thanh toán?",
    answer: "Freelancer nhận thanh toán ngay khi milestone được accept. Tiền tự động chuyển từ escrow đến ví của Freelancer. Không cần chờ job hoàn thành, mỗi milestone được thanh toán độc lập."
  },
  {
    question: "Hệ thống điểm uy tín hoạt động như thế nào?",
    answer: "Mỗi milestone được accept = +1 điểm cho cả Freelancer và Poster. Job hoàn thành = không có điểm thêm (vì đã cộng điểm từng milestone). Thắng tranh chấp = +2 điểm, thua = -1 điểm. Reviewer vote đúng = +2 điểm, vote sai = -1 điểm. Điểm uy tín giúp bạn được ưu tiên trong disputes và tăng độ tin cậy."
  },
  {
    question: "Tôi có thể đăng ký nhiều vai trò không?",
    answer: "Có, bạn có thể đăng ký cả 3 vai trò: Freelancer, Poster và Reviewer. Mỗi vai trò chỉ đăng ký 1 lần. Bạn chỉ cần xác minh danh tính 1 lần với ZK proof, sau đó có thể đăng ký nhiều vai trò."
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
  subtitle: "Nền tảng Freelancer Web3",
  description: "Marketplace phi tập trung với xác minh danh tính bằng ZK Proof, escrow với milestones, và giải quyết tranh chấp công bằng. Mỗi người chỉ có 1 ví, mỗi milestone được thanh toán tự động.",
  primaryCta: "Đăng Job với Escrow",
  secondaryCta: "Xác Minh & Nhận Job",
  trustIndicators: [
    { label: "Xác minh ZK Proof", icon: "shield-check" },
    { label: "Escrow với Milestones", icon: "lock-closed" },
    { label: "Thanh toán tự động", icon: "currency-dollar" }
  ]
};
