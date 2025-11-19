"use client";

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/utils/api';

type WalletContextType = {
  account: string | null;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  accountType: 'aptos' | null;
  aptosNetwork: string | null;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  refreshSession: () => Promise<void>;
};

type WalletEventListener = (network: string) => void;
type WalletEventTarget = {
  addEventListener?: (event: string, callback: WalletEventListener) => void;
  removeEventListener?: (event: string, callback: WalletEventListener) => void;
};

const WalletContext = createContext<WalletContextType>({
  account: null,
  isConnecting: false,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  accountType: null,
  aptosNetwork: null,
  isAuthenticated: false,
  isAuthReady: false,
  refreshSession: async () => {},
});

export const useWallet = () => useContext(WalletContext);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [accountType, setAccountType] = useState<'aptos' | null>(null);
  const [aptosNetwork, setAptosNetwork] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store',
          Pragma: 'no-cache',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        if (data?.address) {
          setAccount(data.address);
          setAccountType('aptos');
        }
      } else {
        setIsAuthenticated(false);
        setAccount(null);
        setAccountType(null);
        setAptosNetwork(null);
      }
    } catch {
      setIsAuthenticated(false);
      setAccount(null);
      setAccountType(null);
      setAptosNetwork(null);
    } finally {
      setIsAuthReady(true);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshSession();
      }
    };

    window.addEventListener('focus', refreshSession);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', refreshSession);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshSession]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const intervalId = setInterval(() => {
      refreshSession();
    }, 4000);

    return () => clearInterval(intervalId);
  }, [isAuthenticated, refreshSession]);

  useEffect(() => {
    if (accountType === 'aptos' && window.aptos) {
      const handleNetworkChange: WalletEventListener = (network) => {
        setAptosNetwork(network);
      };
      
      if (window.aptos.on) {
        window.aptos.on('networkChange', handleNetworkChange);
        window.aptos.on('networkChanged', handleNetworkChange);
      }
      
      const aptosWallet = window.aptos as WalletEventTarget;
      if (aptosWallet.addEventListener) {
        aptosWallet.addEventListener('networkChange', handleNetworkChange);
        aptosWallet.addEventListener('networkChanged', handleNetworkChange);
      }
      
      if (window.aptos.network) {
        window.aptos.network().then((network: string) => {
          setAptosNetwork(network);
        });
      }
      
      return () => {
        if (window.aptos?.removeListener) {
          window.aptos.removeListener('networkChange', handleNetworkChange);
          window.aptos.removeListener('networkChanged', handleNetworkChange);
        }
        
        const aptosWallet = window.aptos as WalletEventTarget;
        if (aptosWallet.removeEventListener) {
          aptosWallet.removeEventListener('networkChange', handleNetworkChange);
          aptosWallet.removeEventListener('networkChanged', handleNetworkChange);
        }
      };
    }
  }, [accountType]);

  const connectWallet = async () => {
    setIsConnecting(true);
    if ('aptos' in window) {
      try {
        const wallet = window.aptos!;
        try {
          await wallet.account();
        } catch {
          await wallet.connect();
        }
        const acc = await wallet.account();
        const network = await wallet.network();
        const address = acc.address.toLowerCase();
        
        const nonceRes = await fetch(`/api/auth/nonce?address=${encodeURIComponent(address)}`);
        if (!nonceRes.ok) {
          throw new Error('Không thể lấy nonce từ server');
        }
        const { nonce, message } = await nonceRes.json();
        
        if (!wallet.signMessage) {
          throw new Error('Wallet không hỗ trợ sign message');
        }
        
        const signResult = await wallet.signMessage({
          message: message,
          nonce: nonce,
        });
        
        console.log('Sign result:', {
          signature: signResult.signature?.substring(0, 20) + '...',
          fullMessage: signResult.fullMessage,
          message: signResult.message,
          nonce: signResult.nonce,
        });
        
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            address: address,
            signature: signResult.signature,
            publicKey: acc.publicKey,
            fullMessage: signResult.fullMessage,
            message: signResult.message,
            nonce: signResult.nonce,
          }),
        });
        
        if (!loginRes.ok) {
          const error = await loginRes.json();
          throw new Error(error.error || 'Đăng nhập thất bại');
        }
        
        await loginRes.json();
        
        setAccount(address);
        setAccountType('aptos');
        setAptosNetwork(network);
        setIsAuthenticated(true);
        setIsAuthReady(true);
        await refreshSession();
        
        toast.success(`Đã kết nối ví Petra thành công! Địa chỉ: ${address.slice(0, 6)}...${address.slice(-4)}`);
        router.push('/');
      } catch (error: any) {
        console.error('Connect wallet error:', error);
        toast.error(error?.message || 'Không thể kết nối ví Petra. Vui lòng thử lại.');
      } finally {
        setIsConnecting(false);
      }
    } else {
      toast.error('Vui lòng cài đặt ví Petra để kết nối. Truy cập: https://petra.app');
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      await fetchWithAuth('/api/auth/logout', {
        method: 'POST',
      });
    } catch {
      // ignore
    }

    if (accountType === 'aptos' && 'aptos' in window) {
      try {
        const wallet = window.aptos!;
        await wallet.disconnect();
        toast.success('Đã ngắt kết nối ví Petra thành công');
      } catch {
        toast.error('Lỗi khi ngắt kết nối ví');
      }
    }
    
    setAccount(null);
    setAccountType(null);
    setAptosNetwork(null);
    setIsAuthenticated(false);
  };

  return (
    <WalletContext.Provider
      value={{
        account,
        isConnecting,
        connectWallet,
        disconnectWallet,
        accountType,
        aptosNetwork,
        isAuthenticated,
        isAuthReady,
        refreshSession,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

declare global {
  interface Window {
    aptos?: {
      connect: () => Promise<{ address: string; publicKey: string }>;
      disconnect: () => Promise<void>;
      account: () => Promise<{ address: string; publicKey: string }>;
      network: () => Promise<string>;
      on?: (event: string, callback: (network: string) => void) => void;
      removeListener?: (event: string, callback: (network: string) => void) => void;
      addEventListener?: (event: string, callback: (network: string) => void) => void;
      removeEventListener?: (event: string, callback: (network: string) => void) => void;
      signAndSubmitTransaction: (transaction: {
        type: string;
        function: string;
        type_arguments: string[];
        arguments: unknown[];
      }) => Promise<{ hash: string }>;
      signMessage?: (payload: { 
        message: string;
        nonce?: string;
        address?: boolean;
        application?: boolean;
        chainId?: boolean;
      }) => Promise<{
        signature: string;
        fullMessage: string;
        message: string;
        nonce: string;
        address: string;
        application: string;
        chainId: number;
        prefix: string;
      }>;
    };
  }
}

