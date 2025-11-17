"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { DisputesContent } from './DisputesContent';

export const DisputesContentWithAuth: React.FC = () => {
  const { account, connectWallet, isConnecting, getAuthToken } = useWallet();
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    const checkToken = async () => {
      if (!account) {
        setHasToken(false);
        return;
      }
      const token = await getAuthToken();
      setHasToken(!!token);
    };
    checkToken();
  }, [account, getAuthToken]);

  if (!account || hasToken === false) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="mb-8">
          <h1 className="text-4xl lg:text-5xl font-bold text-blue-800 mb-4">
            Kết nối ví để truy cập Tranh chấp
          </h1>
          <p className="text-xl text-gray-700 mb-8">
            Bạn cần kết nối Petra wallet và đăng nhập để sử dụng tính năng tranh chấp
          </p>
        </div>
        <div className="space-y-4">
          <Button size="lg" onClick={connectWallet} disabled={isConnecting} className="flex items-center gap-2 mx-auto">
            {isConnecting ? 'Đang kết nối...' : 'Kết nối Petra Wallet'}
          </Button>
          <div className="text-sm text-gray-600">
            Hoặc <Link href="/" className="text-blue-800 hover:underline">quay về trang chủ</Link>
          </div>
        </div>
      </div>
    );
  }

  if (hasToken === null) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="text-gray-700">Đang kiểm tra xác thực...</div>
      </div>
    );
  }

  return <DisputesContent />;
};

