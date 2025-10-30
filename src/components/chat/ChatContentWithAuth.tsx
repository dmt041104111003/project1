"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { ChatContent } from './ChatContent';

export const ChatContentWithAuth: React.FC = () => {
  const { account, connectWallet, isConnecting } = useWallet();

  if (!account) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="mb-8">
          <h1 className="text-4xl lg:text-5xl font-bold text-blue-800 mb-4">
            Connect wallet to access Chat
          </h1>
          <p className="text-xl text-gray-700 mb-8">
            You need to connect Petra wallet to use the chat feature
          </p>
        </div>
        <div className="space-y-4">
          <Button size="lg" onClick={connectWallet} disabled={isConnecting} className="flex items-center gap-2 mx-auto">
            {isConnecting ? 'Connecting...' : 'Connect Petra Wallet'}
          </Button>
          <div className="text-sm text-gray-600">
            Or <Link href="/" className="text-blue-800 hover:underline">go back to home</Link>
          </div>
        </div>
      </div>
    );
  }

  return <ChatContent />;
};
