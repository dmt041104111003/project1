"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { NAVIGATION } from '@/constants/landing';
import { useWallet } from '@/contexts/WalletContext';
import { toast } from 'sonner';
import { formatAddress, copyAddress } from '@/utils/addressUtils';
export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
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

  const handleCopyAddress = () => {
    if (account) {
      copyAddress(account);
    }
  };


  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white border-b-2 border-blue-800 shadow-md">
      <Container>
        <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <Image 
                src="/images/landing/logo_full.png" 
                alt="Marketplace2vn Logo" 
                width={32}
                height={32}
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
                   className={`font-medium no-underline text-lg ${
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
              <Button 
                onClick={connectWallet}
                disabled={isConnecting}
                variant="primary"
                size="sm"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </Button>
            ) : (
              <div className="relative">
                <Button 
                  onClick={() => setShowWalletMenu(!showWalletMenu)}
                  variant="primary"
                  size="sm"
                  className="bg-green-600 border-green-600"
                >
                  <span className="hidden sm:inline font-mono">
                    {formatAddress(account)}
                  </span>
                  <span className="sm:hidden">Wallet</span>
                </Button>
                
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
                    className="px-3 py-2 bg-white text-black border-2 border-black hover:bg-gray-100"
                    onClick={connectWallet}
                    disabled={isConnecting}
                  >
                    {isConnecting ? 'Đang kết nối...' : 'Kết nối ví'}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm p-3 bg-white border-2 border-gray-300">
                      <div className="font-medium text-gray-700">Địa chỉ ví</div>
                      <div 
                        className="text-gray-500 font-bold text-sm cursor-pointer hover:bg-gray-50 px-1 py-1 hover:text-blue-800 hover:underline"
                        onClick={handleCopyAddress}
                        title="Click to copy"
                      >
                        {formatAddress(account)}
                      </div>
                    </div>
                    <Link href="/auth/did-verification" onClick={() => setIsMobileMenuOpen(false)}>
                      <button className="w-full px-3 py-2 bg-white text-black border-2 border-black hover:bg-gray-100">
                        Xác minh DID
                      </button>
                    </Link>
                    <button 
                      className="w-full px-3 py-2 bg-white text-black border-2 border-black hover:bg-gray-100"
                      onClick={disconnectWallet}
                    >
                      Ngắt kết nối
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
              <div className="font-bold text-blue-800">Địa chỉ ví</div>
              <div 
                className="text-gray-600 font-bold text-sm cursor-pointer hover:bg-blue-50 px-2 py-2 border-2 border-blue-800 bg-blue-50 hover:text-blue-800 hover:underline"
                onClick={handleCopyAddress}
                title="Click to copy"
              >
                {formatAddress(account)}
              </div>
            </div>
            <div className="text-sm">
              <div className="font-bold text-blue-800">Mạng</div>
              <div className="text-gray-700 font-medium">
                {aptosNetwork || 'Không xác định'}
              </div>
            </div>
            <div className="pt-2 border-t-2 border-blue-800 space-y-1">
              <Link href="/auth/did-verification" onClick={() => setShowWalletMenu(false)}>
                <button className="w-full px-3 py-2 bg-white text-black border-2 border-black hover:bg-gray-100 font-medium">
                  Xác minh DID
                </button>
              </Link>
           
              <button
                className="w-full px-3 py-2 bg-white text-black border-2 border-black hover:bg-gray-100 font-medium"
                onClick={disconnectWallet}
              >
                Ngắt kết nối
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}


    </header>
  );
}
