export const NAVIGATION = [
  { name: 'Home', href: '/' },
  { name: 'Jobs', href: '/jobs' },
  { name: 'Chat', href: '/chat' },
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Event Dispute', href: '/disputes' },
  { name: 'Reputation', href: '/reputation' }
];

export const HOW_IT_WORKS_STEPS = [
  {
    id: 1,
    title: "Verify identity",
    description: "Verify identity with DID to build credibility",
    icon: "shield-check"
  },
  {
    id: 2,
    title: "Fund escrow",
    description: "Clients deposit funds into the escrow smart contract",
    icon: "currency-dollar"
  },
  {
    id: 3,
    title: "Apply & Stake",
    description: "Freelancers apply and stake tokens as commitment",
    icon: "users"
  },
  {
    id: 4,
    title: "Submit & Get paid",
    description: "Complete work and receive automatic payment",
    icon: "check-circle"
  }
];


export const PERSONAS = {
  poster: {
    title: "Are you a client?",
    benefits: [
      "100% payment protection via escrow smart contract",
      "Access verified freelancer pool",
      "Fast dispute resolution via DAO",
      "Save time searching and screening"
    ],
    cta: "Post a Job",
    icon: "plus"
  },
  freelancer: {
    title: "Are you a freelancer?",
    benefits: [
      "Secure and transparent payments",
      "Build credibility via DID verification",
      "Join a high-quality freelancer community",
      "Increase earnings with competitive rates"
    ],
    cta: "Create Profile",
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
    question: "How do I verify my identity?",
    answer: "You can verify your identity via DID by connecting your wallet and providing required info. The process runs on-chain for transparency and security."
  },
  {
    question: "How does escrow work?",
    answer: "When a client posts a job, they deposit funds into escrow. Funds are released upon completion and confirmation. Disputes are resolved by the DAO."
  },
  {
    question: "What are the fees?",
    answer: "We charge a 2% fee per successful transaction to maintain and develop the platform. No hidden or signup fees."
  },
  {
    question: "How are disputes resolved?",
    answer: "When a dispute occurs, the DAO process is triggered. The community votes and execution is enforced by smart contracts."
  },
  {
    question: "When can I withdraw?",
    answer: "Freelancers can withdraw immediately after the work is confirmed complete. Withdrawals are automated via smart contracts."
  },
  {
    question: "Is multilingual supported?",
    answer: "We currently support Vietnamese and English, with more languages coming soon."
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
    { name: "GitHub", href: "https://github.com/dmt041104111003/marketplace2vn" }
  ],
  legal: [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
    { name: "Cookie Policy", href: "/cookies" }
  ]
};

export const HERO_DATA = {
  title: "Marketplace2vn",
  subtitle: "Tạo Website Hoàn Hảo",
  description: "Nền tảng freelancer phi tập trung với xác minh DID và escrow tự động để đảm bảo an toàn và minh bạch.",
  primaryCta: "Đăng Job với Escrow",
  secondaryCta: "Xác Minh & Nhận Job",
  trustIndicators: [
    { label: "DID Verified", icon: "shield-check" },
    { label: "Escrow Protected", icon: "lock-closed" }
  ]
};
