"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { NAVIGATION } from '@/constants/landing';
import { useWallet } from '@/contexts/WalletContext';
import { toast } from 'sonner';
export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const pathname = usePathname();
  const { account, isConnecting, connectWallet, disconnectWallet, aptosNetwork } = useWallet();


  useEffect(() => {
    const handleClickOutside = () => {
      if (showWalletMenu) {
        setShowWalletMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showWalletMenu]);

  useEffect(() => {
    if (copiedAddress) {
      const timer = setTimeout(() => {
        setCopiedAddress(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedAddress]);

  const handleCopyAddress = async () => {
    if (!account) return;
    
    try {
      await navigator.clipboard.writeText(account);
      setCopiedAddress(true);
      toast.success('Wallet address copied to clipboard!');
    } catch (err) {
      console.error('Copy address error:', err);
      toast.error('Unable to copy wallet address');
    }
  };


  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white border-b-2 border-blue-800 shadow-md">
      <Container>
        <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <img 
                src="/images/landing/logo_full.png" 
                alt="Marketplace2vn Logo" 
                className="h-8 object-contain"
              />
              <span className="text-xl font-bold text-blue-800">
                Marketplace2vn
              </span>
            </Link>

           <nav className="hidden md:flex items-center gap-8">
             {NAVIGATION.map((item) => {
               const isActive = pathname === item.href;
               return (
                 <Link
                   key={item.name}
                   href={item.href}
                   className={`font-medium no-underline ${
                     isActive 
                       ? 'text-blue-800 border-b-2 border-blue-800 pb-1' 
                       : 'text-gray-700 hover:text-blue-800'
                   }`}
                 >
                   {item.name}
                 </Link>
               );
             })}
           </nav>

          <div className="hidden md:flex items-center gap-4">
            {!account ? (
              <button 
                onClick={connectWallet}
                disabled={isConnecting}
                className="px-4 py-2 bg-blue-800 text-white border border-blue-800 hover:bg-blue-900 disabled:opacity-50"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            ) : (
              <div className="relative">
                <button 
                  onClick={() => setShowWalletMenu(!showWalletMenu)}
                  className="px-4 py-2 bg-green-600 text-white border border-green-600 hover:bg-green-700"
                >
                  <span className="hidden sm:inline font-mono">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </span>
                  <span className="sm:hidden">Wallet</span>
                </button>
                
                {showWalletMenu && null}
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2">
            <button
              className="p-2 text-gray-700 hover:text-blue-800 hover:bg-gray-100"
              aria-label="Toggle mobile menu"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t-2 border-blue-800 bg-gray-50">
            <nav className="flex flex-col space-y-3">
              {NAVIGATION.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`font-medium no-underline py-2 px-3 ${
                      isActive 
                        ? 'text-blue-800 bg-blue-100 border-l-4 border-blue-800' 
                        : 'text-gray-700 hover:text-blue-800 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                );
              })}
              <div className="flex flex-col gap-2 pt-4 border-t-2 border-blue-800">
                {!account ? (
                  <button 
                    className="px-3 py-2 bg-blue-800 text-white hover:bg-blue-900"
                    onClick={connectWallet}
                    disabled={isConnecting}
                  >
                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm p-3 bg-white border-2 border-gray-300">
                      <div className="font-medium text-gray-700">Wallet address</div>
                      <div 
                        className="text-gray-500 font-mono text-xs break-all cursor-pointer hover:bg-gray-50 px-1 py-1"
                        onClick={handleCopyAddress}
                        title="Click to copy"
                      >
                        {account}
                      </div>
                    </div>
                    <Link href="/auth/did-verification" onClick={() => setIsMobileMenuOpen(false)}>
                      <button className="w-full px-3 py-2 text-blue-800 hover:bg-blue-100 border-l-4 border-blue-800">
                        DID verification
                      </button>
                    </Link>
                    <button 
                      className="w-full px-3 py-2 text-red-600 hover:bg-red-100 border-l-4 border-red-600"
                      onClick={disconnectWallet}
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </Container>
      {showWalletMenu && typeof window !== 'undefined' && createPortal(
        <div className="fixed right-4 top-16 mt-2 w-64 bg-white border-2 border-blue-800 shadow-lg z-[60]">
          <div className="p-4 space-y-3">
            <div className="text-sm">
              <div className="font-bold text-blue-800">Wallet address</div>
              <div 
                className="text-gray-600 font-mono text-xs break-all cursor-pointer hover:bg-blue-50 px-2 py-2 border-2 border-blue-800 bg-blue-50"
                onClick={handleCopyAddress}
                title="Click to copy"
              >
                {account}
              </div>
            </div>
            <div className="text-sm">
              <div className="font-bold text-blue-800">Network</div>
              <div className="text-gray-700 font-medium">
                {aptosNetwork || 'Unknown'}
              </div>
            </div>
            <div className="pt-2 border-t-2 border-blue-800 space-y-1">
              <Link href="/auth/did-verification" onClick={() => setShowWalletMenu(false)}>
                <button className="w-full px-3 py-2 text-blue-800 hover:bg-blue-100 border-l-4 border-blue-800 font-medium">
                  DID verification
                </button>
              </Link>
           
              <button 
                className="w-full px-3 py-2 text-red-600 hover:bg-red-100 border-l-4 border-red-600 font-medium"
                onClick={disconnectWallet}
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}


    </header>
  );
}
