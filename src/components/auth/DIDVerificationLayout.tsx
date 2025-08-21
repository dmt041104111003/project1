'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Wallet } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { DIDVerificationLayoutProps } from '@/constants/did-verification';

const robotoCondensed = {
  fontFamily: "'Roboto Condensed', sans-serif",
  fontWeight: 400,
  fontStyle: 'normal',
};

export default function DIDVerificationLayout({ 
  children, 
  title = "Xác minh Danh tính (DID)",
  subtitle = "Xác minh danh tính của bạn để tham gia nền tảng Web2.5 Freelancer"
}: DIDVerificationLayoutProps) {
  const { account, connectWallet, isConnecting } = useWallet();

  if (!account) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link href="/">
              <Button variant="ghost" size="sm" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
                Quay về trang chủ
              </Button>
            </Link>
          </div>

          <div className="text-center py-20">
            <div className="space-y-4">
              <Wallet className="w-16 h-16 mx-auto text-gray-400" />
              <h2 className="text-2xl font-bold">Cần kết nối ví</h2>
              <p className="text-muted-foreground">
                Vui lòng kết nối ví Petra để tiếp tục xác minh DID
              </p>
              <div className="flex justify-center space-x-4">
                <Button onClick={connectWallet} disabled={isConnecting}>
                  {isConnecting ? 'Đang kết nối...' : 'Kết nối ví Petra'}
                </Button>
                <Link href="/">
                  <Button variant="outline">
                    Quay về trang chủ
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Quay về trang chủ
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 style={robotoCondensed} className="text-3xl font-bold mb-2">{title}</h1>
          <p style={robotoCondensed} className="text-muted-foreground">
            {subtitle}
          </p>
          <div className="mt-2 text-sm text-blue-600">
            Ví đã kết nối: {account.slice(0, 6)}...{account.slice(-4)}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
