"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { NAVIGATION } from '@/constants/landing';
import { useWallet } from '@/contexts/WalletContext';
import { Wallet, LogOut, ChevronDown, Copy, Check, Shield, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

// const dancingScript = {
//   fontFamily: "'Dancing Script', cursive",
//   fontWeight: 700,
// };
const robotoCondensed = {
    fontFamily: "'Roboto Condensed', sans-serif",
    fontWeight: 400,
    fontStyle: 'normal',
  };
export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const pathname = usePathname();
  const { account, isConnecting, connectWallet, disconnectWallet, aptosNetwork } = useWallet();

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700&family=Roboto+Condensed:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

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
    <header className="fixed top-0 left-0 right-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
      <Container>
        <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <img 
                src="/images/landing/logo_full.png" 
                alt="Marketplace2vn Logo" 
                className="h-8 object-contain"
              />
              <span 
                style={robotoCondensed}
                className="text-xl text-primary"
              >
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
                   className={`transition-colors font-medium relative no-underline ${
                     isActive 
                       ? 'text-primary' 
                       : 'text-text-primary hover:text-primary'
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
                variant="outline" 
                size="sm" 
                onClick={connectWallet}
                disabled={isConnecting}
                className="flex items-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                                {isConnecting ? 'Connecting...' : 'Connect Petra wallet'}
              </Button>
            ) : (
              <div className="relative">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowWalletMenu(!showWalletMenu)}
                  className="flex items-center gap-2"
                >
                  <Wallet className="w-4 h-4" />
                                     <span className="hidden sm:inline font-mono">
                     {account.slice(0, 6)}...{account.slice(-4)}
                   </span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
                
                {showWalletMenu && null}
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Toggle mobile menu"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? '✕' : '☰'}
            </Button>
          </div>
        </div>

        {isMobileMenuOpen && (
                     <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col space-y-4">
                {NAVIGATION.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                                              className={`transition-colors font-medium flex items-center no-underline ${
                         isActive 
                           ? 'text-primary' 
                           : 'text-text-primary hover:text-primary'
                       }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              <div className="flex flex-col gap-2 pt-4">
                {!account ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={connectWallet}
                    disabled={isConnecting}
                    className="justify-start"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                                         {isConnecting ? 'Đang kết nối...' : 'Kết nối ví Petra'}
                  </Button>
                                 ) : (
                   <div className="space-y-2">
                    <div className="text-sm p-2 bg-muted rounded">
                      <div className="font-medium">Wallet address</div>
                      <div 
                        className="text-muted-foreground font-mono text-xs break-all cursor-pointer hover:bg-background/50 rounded px-1 py-0.5"
                        onClick={handleCopyAddress}
                        title="Click to copy"
                      >
                        {account}
                      </div>
                    </div>
                                        <Link href="/auth/did-verification" onClick={() => setIsMobileMenuOpen(false)}>
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="w-full justify-start text-primary"
                       >
                         <Shield className="w-4 h-4 mr-2" />
                        DID verification
                         <ExternalLink className="w-3 h-3 ml-auto" />
                       </Button>
                     </Link>
                     <Button 
                       variant="ghost" 
                       size="sm" 
                       onClick={disconnectWallet}
                      className="w-full justify-start text-red-600"
                     >
                       <LogOut className="w-4 h-4 mr-2" />
                      Disconnect
                     </Button>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </Container>
      {showWalletMenu && typeof window !== 'undefined' && createPortal(
        <div className="fixed right-4 top-16 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-[60] backdrop-blur-none">
          <div className="p-4 space-y-3">
            <div className="text-sm">
              <div className="font-medium">Wallet address</div>
              <div 
                className="text-muted-foreground font-mono text-xs break-all cursor-pointer hover:bg-background/50 rounded px-1 py-0.5"
                onClick={handleCopyAddress}
                title="Click to copy"
              >
                {account}
              </div>
            </div>
            <div className="text-sm">
              <div className="font-medium">Network</div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {aptosNetwork || 'Unknown'}
                </span>
                <div className={`w-2 h-2 rounded-full ${
                  aptosNetwork === 'Testnet' ? 'bg-yellow-500' : 
                  aptosNetwork === 'Mainnet' ? 'bg-green-500' : 'bg-gray-500'
                }`} />
              </div>
            </div>
            <div className="pt-2 border-t border-border space-y-1">
              <Link href="/auth/did-verification" onClick={() => setShowWalletMenu(false)}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start text-primary hover:text-primary/80 hover:bg-primary/10"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  DID verification
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </Button>
              </Link>
           
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={disconnectWallet}
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}


    </header>
  );
}
