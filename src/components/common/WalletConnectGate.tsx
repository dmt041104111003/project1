"use client";

import React from 'react';
import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';

interface WalletConnectGateProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  connectLabel?: string;
  backHref?: string;
  backLabel?: string;
}

export const WalletConnectGate: React.FC<WalletConnectGateProps> = ({
  children,
  title = 'Yêu cầu kết nối ví',
  description = 'Vui lòng kết nối ví Petra để tiếp tục',
  connectLabel = 'Kết nối ví Petra',
  backHref = '/',
  backLabel = 'Về trang chủ'
}) => {
  const { account, connectWallet, isConnecting } = useWallet();

  if (!account) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-4">
        <div className="space-y-6">
          <Wallet className="w-16 h-16 mx-auto text-gray-600" />
          <div>
            <h2 className="text-3xl font-bold text-blue-800 mb-3">{title}</h2>
            <p className="text-lg text-gray-700">{description}</p>
          </div>
          <div className="space-y-4">
            <Button
              size="lg"
              onClick={connectWallet}
              disabled={isConnecting}
              className="flex items-center gap-2 mx-auto"
            >
              {isConnecting ? 'Đang kết nối...' : connectLabel}
            </Button>
            {backHref && (
              <div className="text-sm text-gray-600">
                Hoặc{' '}
                <Link href={backHref} className="text-blue-800 hover:underline">
                  {backLabel}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

