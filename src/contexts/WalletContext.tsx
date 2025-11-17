"use client";

import React, { createContext, useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type WalletContextType = {
  account: string | null;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  accountType: 'aptos' | null;
  aptosNetwork: string | null;
  getAuthToken: () => Promise<string | null>;
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
  getAuthToken: async () => null,
});

export const useWallet = () => useContext(WalletContext);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [accountType, setAccountType] = useState<'aptos' | null>(null);
  const [aptosNetwork, setAptosNetwork] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    const savedAccount = localStorage.getItem('walletAccount');
    const savedToken = localStorage.getItem('authToken');
    if (savedAccount) {
      setAccount(savedAccount);
    }
    if (savedToken) {
      setAuthToken(savedToken);
    }
    const savedType = localStorage.getItem('walletType');
    if (savedType === 'aptos') {
      setAccountType('aptos');
    }
    const savedNetwork = localStorage.getItem('aptosNetwork');
    if (savedNetwork) {
      setAptosNetwork(savedNetwork);
    }
  }, []);

  useEffect(() => {
    if (accountType === 'aptos' && window.aptos) {
      const handleNetworkChange = (network: string) => {
        setAptosNetwork(network);
        localStorage.setItem('aptosNetwork', network);
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
          localStorage.setItem('aptosNetwork', network);
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
        
        const { token } = await loginRes.json();
        
        setAccount(address);
        setAccountType('aptos');
        setAptosNetwork(network);
        setAuthToken(token);
        localStorage.setItem('walletAccount', address);
        localStorage.setItem('walletType', 'aptos');
        localStorage.setItem('aptosNetwork', network);
        localStorage.setItem('authToken', token);
        
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
    setAuthToken(null);
    localStorage.removeItem('walletAccount');
    localStorage.removeItem('walletType');
    localStorage.removeItem('aptosNetwork');
    localStorage.removeItem('authToken');
  };

  const getAuthToken = async (): Promise<string | null> => {
    return authToken;
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
        getAuthToken,
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
