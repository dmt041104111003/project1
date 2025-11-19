'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

type DIDVerificationLayoutProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
};

export default function DIDVerificationLayout({ 
  children, 
  title = "Đăng ký vai trò",
  subtitle = "Đăng ký vai trò của bạn để sử dụng các tính năng marketplace"
}: DIDVerificationLayoutProps) {
  const BackToHome = ({ size = "sm" }: { size?: "sm" | "lg" }) => (
    <Link href="/">
      <Button variant="outline" size={size} className="flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" />
        Về trang chủ
      </Button>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6"><BackToHome size="sm" /></div>

          <div className="mb-8 bg-white p-6 rounded-lg shadow-sm">
            <h1 className="text-3xl font-bold text-blue-800 mb-2">{title}</h1>
            <p className="text-lg text-gray-700">{subtitle}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
