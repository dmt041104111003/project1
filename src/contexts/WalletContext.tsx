"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { usePetraAuth } from '@/hooks/usePetraAuth';

type WalletContextType = {
  account: string | null;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  ensureWallet: () => boolean;
  accountType: 'aptos' | null;
  aptosNetwork: string | null;
};

const WalletContext = createContext<WalletContextType>({
  account: null,
  isConnecting: false,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  ensureWallet: () => false,
  accountType: null,
  aptosNetwork: null,
});

export const useWallet = () => useContext(WalletContext);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<'aptos' | null>(null);
  const [aptosNetwork, setAptosNetwork] = useState<string | null>(null);

  const {
    connectWallet: rawConnectWallet,
    disconnectWallet: rawDisconnectWallet,
    isConnecting,
  } = usePetraAuth({
    accountType,
    setAccount,
    setAccountType,
    setAptosNetwork,
    canAutoRestore: true,
  });

  const connectWallet = useCallback(async () => {
    await rawConnectWallet();
  }, [rawConnectWallet]);

  const disconnectWallet = useCallback(async () => {
    await rawDisconnectWallet();
  }, [rawDisconnectWallet]);

  const ensureWallet = useCallback(() => {
    if (!account) {
      toast.error('Vui lòng kết nối ví Petra trước khi tiếp tục.');
      return false;
    }
    return true;
  }, [account]);

  return (
    <WalletContext.Provider
      value={{
        account,
        isConnecting,
        connectWallet,
        disconnectWallet,
        ensureWallet,
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
      signMessage: (params: {
        message: string;
        nonce: string;
      }) => Promise<{
        address: string;
        publicKey: string;
        signature: string;
        fullMessage: string;
      }>;
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
