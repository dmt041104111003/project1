'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Wallet } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import type { ReactNode } from 'react';

type DIDVerificationLayoutProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
};

export default function DIDVerificationLayout({ 
  children, 
  title = "Role registration",
  subtitle = "Register your roles to use marketplace features"
}: DIDVerificationLayoutProps) {
  const { account, connectWallet, isConnecting } = useWallet();

  const BackToHome = ({ size = "sm" }: { size?: "sm" | "lg" }) => (
    <Link href="/">
      <Button variant="outline" size={size} className="flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back to home
      </Button>
    </Link>
  );

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-4xl mx-auto">

            <div className="text-center py-20 bg-white rounded-lg shadow-sm">
              <div className="space-y-6">
                <Wallet className="w-16 h-16 mx-auto text-gray-600" />
                <h2 className="text-3xl font-bold text-blue-800">Wallet connection required</h2>
                <p className="text-lg text-gray-700">Please connect your Petra wallet to continue</p>
                <div className="flex justify-center gap-4">
                  <Button variant="primary" size="lg" onClick={connectWallet} disabled={isConnecting}>
                    {isConnecting ? 'Connecting...' : 'Connect Petra wallet'}
                  </Button>
                  <BackToHome size="lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6"><BackToHome size="sm" /></div>

          <div className="mb-8 bg-white p-6 rounded-lg shadow-sm">
            <h1 className="text-3xl font-bold text-blue-800 mb-2">{title}</h1>
            <p className="text-lg text-gray-700">{subtitle}</p>
            <div className="mt-2 text-sm font-bold text-blue-800">Connected wallet: {account.slice(0, 6)}...{account.slice(-4)}</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
