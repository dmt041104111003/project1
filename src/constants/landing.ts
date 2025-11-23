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
    title: "Xác minh danh tính với xác minh không kiến thức",
    description: "Upload CCCD, xác minh khuôn mặt với AI, tạo xác minh không kiến thức để đảm bảo mỗi người chỉ có 1 ví",
    icon: "shield-check"
  },
  {
    id: 2,
    title: "Đăng ký vai trò",
    description: "Chọn vai trò Người làm tự do, Người thuê hoặc Đánh giá viên và upload hồ sơ lên IPFS",
    icon: "user-circle"
  },
  {
    id: 3,
    title: "Tạo công việc với cột mốc",
    description: "Người thuê tạo công việc, chia thành nhiều cột mốc, gửi tiền vào ký quỹ và đặt cọc",
    icon: "briefcase"
  },
  {
    id: 4,
    title: "Ứng tuyển & Đặt cọc",
    description: "Người làm tự do ứng tuyển, đặt cọc 1 APT để cam kết và bắt đầu làm việc",
    icon: "hand-raised"
  },
  {
    id: 5,
    title: "Nộp & Đánh giá cột mốc",
    description: "Người làm tự do nộp bài từng cột mốc, Người thuê duyệt hoặc từ chối. Mỗi cột mốc được chấp nhận = +1 điểm uy tín",
    icon: "document-check"
  },
  {
    id: 6,
    title: "Thanh toán tự động",
    description: "Khi milestone được accept, tiền tự động chuyển từ ký quỹ đến Người làm tự do",
    icon: "currency-dollar"
  },
  {
    id: 7,
    title: "Giải quyết tranh chấp",
    description: "Nếu có tranh chấp, phân cấp 3 đánh giá viên uy tín đã xác minh sẽ bỏ phiếu để quyết định",
    icon: "scale"
  }
];


export const PERSONAS = {
  poster: {
    title: "Bạn là khách hàng?",
    benefits: [
      "Bảo vệ thanh toán 100% qua ký quỹ với cột mốc",
      "Chỉ làm việc với người làm tự do đã xác minh danh tính (xác minh không kiến thức)",
      "Kiểm soát từng cột mốc, duyệt hoặc từ chối trước khi thanh toán",
      "Giải quyết tranh chấp công bằng với 3 đánh giá viên đã xác minh",
      "Xây dựng uy tín qua hệ thống điểm danh tiếng"
    ],
    cta: "Đăng công việc",
    icon: "plus"
  },
  freelancer: {
    title: "Bạn là người làm tự do?",
    benefits: [
      "Thanh toán tự động khi cột mốc được chấp nhận",
      "Xác minh danh tính một lần với xác minh không kiến thức, dùng cho mọi vai trò",
      "Nhận thanh toán từng cột mốc, không cần chờ công việc hoàn thành",
      "Xây dựng uy tín qua điểm danh tiếng (mỗi cột mốc +1 điểm)",
      "Tham gia giải quyết tranh chấp với vai trò Đánh giá viên để kiếm thêm điểm"
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
    answer: "Khi Người thuê tạo công việc, họ chia thành nhiều cột mốc và gửi tiền vào ký quỹ. Người làm tự do ứng tuyển và đặt cọc 1 APT. Khi Người làm tự do nộp cột mốc, Người thuê có thể chấp nhận hoặc từ chối. Nếu chấp nhận, tiền tự động chuyển từ ký quỹ đến Người làm tự do và cả 2 bên nhận +1 điểm uy tín. Nếu từ chối, chuyển sang tranh chấp."
  },
  {
    question: "Phí là bao nhiêu?",
    answer: "Người thuê trả 1.2 APT phí khi tạo công việc (ngoài tiền ký quỹ và cọc 1 APT). Người làm tự do trả 0.1 APT phí khi ứng tuyển công việc (ngoài cọc 1 APT). Không có phí ẩn hoặc phí đăng ký."
  },
  {
    question: "Tranh chấp được giải quyết như thế nào?",
    answer: "Khi Người thuê reject milestone, hệ thống tự động chọn 3 đánh giá viên đã xác minh (1 có điểm < người khởi tạo, 1 có điểm > người khởi tạo, 1 có điểm cao nhất). Mỗi đánh giá viên bỏ phiếu. Nếu 2/3 đánh giá viên đồng ý, quyết định được thực thi tự động. Đánh giá viên vote đúng +2 điểm, vote sai -1 điểm."
  },
  {
    question: "Khi nào tôi có thể nhận thanh toán?",
    answer: "Người làm tự do nhận thanh toán ngay khi cột mốc được chấp nhận. Tiền tự động chuyển từ ký quỹ đến ví của Người làm tự do. Không cần chờ công việc hoàn thành, mỗi cột mốc được thanh toán độc lập."
  },
  {
    question: "Hệ thống điểm uy tín hoạt động như thế nào?",
    answer: "Mỗi cột mốc được chấp nhận = +1 điểm cho cả Người làm tự do và Người thuê. Công việc hoàn thành = không có điểm thêm (vì đã cộng điểm từng cột mốc). Thắng tranh chấp = +2 điểm, thua = -1 điểm. Đánh giá viên bỏ phiếu đúng = +2 điểm, bỏ phiếu sai = -1 điểm. Điểm uy tín giúp bạn được ưu tiên trong tranh chấp và tăng độ tin cậy."
  },
  {
    question: "Tôi có thể đăng ký nhiều vai trò không?",
    answer: "Có, bạn có thể đăng ký cả 3 vai trò: Người làm tự do, Người thuê và Đánh giá viên. Mỗi vai trò chỉ đăng ký 1 lần. Bạn chỉ cần xác minh danh tính 1 lần với xác minh không kiến thức, sau đó có thể đăng ký nhiều vai trò."
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
  description: "Marketplace phi tập trung với xác minh danh tính bằng xác minh không kiến thức, ký quỹ với cột mốc, và giải quyết tranh chấp công bằng. Mỗi người chỉ có 1 ví, mỗi cột mốc được thanh toán tự động.",
  primaryCta: "Đăng Công việc với Ký quỹ",
  secondaryCta: "Xác Minh & Nhận Công việc",
  trustIndicators: [
    { label: "Xác minh không kiến thức", icon: "shield-check" },
    { label: "Ký quỹ với Cột mốc", icon: "lock-closed" },
    { label: "Thanh toán tự động", icon: "currency-dollar" }
  ]
};
