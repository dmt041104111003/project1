"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { ChatContent } from './ChatContent';

export const ChatContentWithAuth: React.FC = () => {
  const { account, connectWallet, isConnecting } = useWallet();
  const [isDIDVerified, setIsDIDVerified] = useState(false);
  const [isCheckingDID, setIsCheckingDID] = useState(false);

  const checkDIDVerification = async () => {
    if (!account) return;
    
    setIsCheckingDID(true);
    try {
      const response = await fetch(`/api/blockchain/commitment?address=${account}`);
      
      const data = await response.json();
      
      if (data.success) {
        setIsDIDVerified(data.verified);
      } else {
        setIsDIDVerified(false);
      }
    } catch (error) {
      console.error('DID verification error:', error);
      setIsDIDVerified(false);
    } finally {
      setIsCheckingDID(false);
    }
  };

  useEffect(() => {
    if (account) {
      checkDIDVerification();
    }
  }, [account]);

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

  // Connected but checking DID
  if (isCheckingDID) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="mb-8">
          <h1 className="text-4xl lg:text-5xl font-bold text-blue-800 mb-4">
            Verifying DID...
          </h1>
          <p className="text-xl text-gray-700 mb-8">
            Please wait while we verify your DID credentials
          </p>
        </div>
      </div>
    );
  }

  // Connected but DID not verified
  if (!isDIDVerified) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="mb-8">
          <h1 className="text-4xl lg:text-5xl font-bold text-blue-800 mb-4">
            DID Verification Required
          </h1>
          <p className="text-xl text-gray-700 mb-8">
            You need to verify your DID to access the chat feature
          </p>
        </div>
        <div className="space-y-4">
          <Button size="lg" onClick={checkDIDVerification} className="flex items-center gap-2 mx-auto">
            Verify DID
          </Button>
          <div className="text-sm text-gray-600">
            Or <a href="/auth/did-verification" className="text-blue-800 hover:underline">go to DID verification page</a>
          </div>
        </div>
      </div>
    );
  }

  return <ChatContent />;
};
