"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { NAVIGATION } from '@/constants/landing';
import { useWallet } from '@/contexts/WalletContext';
import { formatAddress } from '@/utils/addressUtils';
import { useRoles } from '@/contexts/RolesContext';

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const {
    account,
    isConnecting,
    connectWallet,
    disconnectWallet,
  } = useWallet();
  const { hasReviewerRole } = useRoles();

  const accountButtonLabel = isConnecting
    ? 'Đang kết nối...'
    : account
      ? formatAddress(account)
      : 'Kết nối ví';

  const handleAccountButtonClick = () => {
    if (!account) {
      connectWallet();
    } else {
      setShowWalletMenu(prev => !prev);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setShowWalletMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            {NAVIGATION.filter((item) => {
              if (item.href === '/dashboard') {
                return Boolean(account);
              }
              if (item.href === '/disputes') {
                return hasReviewerRole;
              }
              return true;
            }).map((item) => {
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

          <div className="hidden md:flex items-center gap-3">
            <div className="relative" ref={accountMenuRef}>
              <Button
                onClick={handleAccountButtonClick}
                variant="secondary"
                size="sm"
                disabled={isConnecting}
              >
                {accountButtonLabel}
              </Button>
              {account && showWalletMenu && (
                <div className="absolute right-0 mt-2 w-60 bg-white border-2 border-blue-800 shadow-lg z-50 p-3 space-y-2">
                  <div className="text-sm text-gray-600 pb-2 border-b">
                    {formatAddress(account)}
                  </div>
                  <Link href="/auth/did-verification" onClick={() => setShowWalletMenu(false)}>
                    <Button variant="outline" size="sm" className="w-full">
                      Xác minh định danh tài khoản
                    </Button>
                  </Link>
                  <Button
                    onClick={() => {
                      setShowWalletMenu(false);
                      disconnectWallet();
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Ngắt kết nối
                  </Button>
                </div>
              )}
            </div>
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
              {NAVIGATION.filter((item) => {
                if (item.href === '/dashboard') {
                  return Boolean(account);
                }
                if (item.href === '/disputes') {
                  return hasReviewerRole;
                }
                return true;
              }).map((item) => {
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
                  <>
                    <div className="px-3 py-2 text-sm text-gray-600">
                      {formatAddress(account)}
                    </div>
                    <Link href="/auth/did-verification" onClick={() => setIsMobileMenuOpen(false)}>
                      <button className="w-full px-3 py-2 bg-white text-black border-2 border-black hover:bg-gray-100">
                        Xác minh định danh tài khoản
                      </button>
                    </Link>
                    <button
                      className="px-3 py-2 bg-white text-black border-2 border-black hover:bg-gray-100"
                      onClick={disconnectWallet}
                    >
                      Ngắt kết nối
                    </button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </Container>
    </header>
  );
}
