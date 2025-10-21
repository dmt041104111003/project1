// Interfaces
export interface Job {
  id: number;
  title: string;
  description: string;
  budget: string | number;
  duration: string;
  skills: string[];
  category: string;
  escrow: boolean;
  verified: boolean;
  postedBy: string;
  postedDate: string;
  requirements?: string;
  escrowed_amount?: number;
  milestones?: number[];
  cid?: string;
  duration_days?: number;
  created_at?: string;
}

export interface JobCardProps {
  job: Job;
}

export interface JobFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  showEscrowOnly: boolean;
  setShowEscrowOnly: (value: boolean) => void;
  categories: Array<{ value: string; label: string }>;
}

export const MOCK_JOBS = [
  {
    id: 1,
    title: "Design UI/UX for mobile application",
    description: "Need to design UI/UX for mobile fintech application with focus on user experience.",
    budget: "2,000 - 5,000 USD",
    duration: "2-4 weeks",
    skills: ["Figma", "Adobe XD", "UI/UX Design", "Mobile Design"],
    category: "Design",
    escrow: true,
    verified: true,
    postedBy: "TechCorp Inc.",
    postedDate: "2 days ago"
  },
  {
    id: 2,
    title: "Develop Smart Contract on Aptos",
    description: "Build smart contract for escrow system and manage freelancer payments.",
    budget: "3,000 - 8,000 USD",
    duration: "4-6 weeks",
    skills: ["Move", "Aptos", "Smart Contracts", "Web3"],
    category: "Development",
    escrow: true,
    verified: true,
    postedBy: "BlockchainDAO",
    postedDate: "1 day ago"
  },
  {
    id: 3,
    title: "Write content marketing for Web3 project",
    description: "Create high-quality content marketing for blockchain project, including blog, social media and whitepaper.",
    budget: "1,500 - 3,000 USD",
    duration: "3-5 weeks",
    skills: ["Content Writing", "Marketing", "Web3", "SEO"],
    category: "Marketing",
    escrow: false,
    verified: false,
    postedBy: "CryptoStartup",
    postedDate: "3 days ago"
  },
  {
    id: 4,
    title: "Develop Frontend React/Next.js",
    description: "Build responsive web interface with React and Next.js for freelancer platform.",
    budget: "2,500 - 6,000 USD",
    duration: "3-4 weeks",
    skills: ["React", "Next.js", "TypeScript", "Tailwind CSS"],
    category: "Development",
    escrow: true,
    verified: true,
    postedBy: "WebStudio",
    postedDate: "5 days ago"
  }
];

export const CATEGORIES = [
    { value: "all", label: "All" },
  { value: "development", label: "Development" },
  { value: "design", label: "Design" },
  { value: "marketing", label: "Marketing" },
  { value: "writing", label: "Writing" },
  { value: "translation", label: "Translation" }
];
