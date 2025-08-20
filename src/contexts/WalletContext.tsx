"use client";

import React, { createContext, useState, useContext, useEffect } from 'react';
import { toast } from 'sonner';

type WalletContextType = {
  account: string | null;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  accountType: 'aptos' | null;
  aptosNetwork: string | null;
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
});

export const useWallet = () => useContext(WalletContext);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [accountType, setAccountType] = useState<'aptos' | null>(null);
  const [aptosNetwork, setAptosNetwork] = useState<string | null>(null);

  useEffect(() => {
    const savedAccount = localStorage.getItem('walletAccount');
    if (savedAccount) {
      setAccount(savedAccount);
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
        await wallet.connect();
        const acc = await wallet.account();
        const network = await wallet.network();
        setAccount(acc.address);
        setAccountType('aptos');
        setAptosNetwork(network);
        localStorage.setItem('walletAccount', acc.address);
        localStorage.setItem('walletType', 'aptos');
        localStorage.setItem('aptosNetwork', network);
        toast.success(`Kết nối ví Petra thành công! Địa chỉ: ${acc.address.slice(0, 6)}...${acc.address.slice(-4)}`);
      } catch (err) {
        console.error('Wallet connection error:', err);
        toast.error('Kết nối ví Petra thất bại. Vui lòng thử lại.');
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
      } catch (err) {
        console.error('Wallet disconnection error:', err);
        toast.error('Lỗi khi ngắt kết nối ví');
      }
    }
    setAccount(null);
    setAccountType(null);
    setAptosNetwork(null);
    localStorage.removeItem('walletAccount');
    localStorage.removeItem('walletType');
    localStorage.removeItem('aptosNetwork');
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
    };
  }
}
