"use client";

import React, { createContext, useContext, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useWallet as useAptosWallet } from '@aptos-labs/wallet-adapter-react';

type LegacyTransactionPayload = {
  type: 'entry_function_payload';
  function: string;
  type_arguments: string[];
  arguments: unknown[];
};

type NewTransactionPayload = {
  data: {
    function: string;
    functionArguments: unknown[];
    typeArguments?: string[];
  };
};

type TransactionPayload = LegacyTransactionPayload | NewTransactionPayload;

type WalletContextType = {
  account: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  connectWallet: (walletName?: string) => Promise<void>;
  disconnectWallet: () => Promise<void>;
  ensureWallet: () => boolean;
  accountType: 'aptos' | null;
  aptosNetwork: string | null;
  wallets: readonly { name: string; icon: string; url: string }[];
  wallet: { name: string; icon: string; url: string } | null;
  signAndSubmitTransaction: (transaction: TransactionPayload) => Promise<{ hash: string }>;
  signMessage: (message: { message: string; nonce: string }) => Promise<{
    signature: string;
    fullMessage: string;
  }>;
};

const WalletContext = createContext<WalletContextType>({
  account: null,
  isConnecting: false,
  isConnected: false,
  connectWallet: async () => {},
  disconnectWallet: async () => {},
  ensureWallet: () => false,
  accountType: null,
  aptosNetwork: null,
  wallets: [],
  wallet: null,
  signAndSubmitTransaction: async () => ({ hash: '' }),
  signMessage: async () => ({ signature: '', fullMessage: '' }),
});

export const useWallet = () => useContext(WalletContext);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    account: aptosAccount,
    connected,
    disconnect,
    connect,
    wallets,
    wallet,
    network,
    signAndSubmitTransaction: aptosSignAndSubmit,
    signMessage: aptosSignMessage,
  } = useAptosWallet();
  
  const [isConnecting, setIsConnecting] = useState(false);

  const account = useMemo(() => {
    return aptosAccount?.address?.toString()?.toLowerCase() ?? null;
  }, [aptosAccount]);

  const aptosNetwork = useMemo(() => {
    return network?.name ?? null;
  }, [network]);

  const accountType = useMemo(() => {
    return connected ? 'aptos' : null;
  }, [connected]);

  const connectWallet = useCallback(async (walletName: string = 'Petra') => {
    try {
      setIsConnecting(true);
      await connect(walletName);
      toast.success(`Đã kết nối ví ${walletName}`);
    } catch (error) {
      console.error('Connect wallet error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể kết nối ví');
    } finally {
      setIsConnecting(false);
    }
  }, [connect]);

  const disconnectWallet = useCallback(async () => {
    try {
      await disconnect();
      toast.success('Đã ngắt kết nối ví');
    } catch (error) {
      console.error('Disconnect wallet error:', error);
      toast.error('Không thể ngắt kết nối ví');
    }
  }, [disconnect]);

  const ensureWallet = useCallback(() => {
    if (!connected || !account) {
      toast.error('Vui lòng kết nối ví trước khi tiếp tục.');
      return false;
    }
    return true;
  }, [connected, account]);

  const signAndSubmitTransaction = useCallback(async (transaction: TransactionPayload) => {
    if (!account) {
      throw new Error('Wallet not connected');
    }
    
    const isLegacy = 'type' in transaction && 'arguments' in transaction;
    
    let functionName: string;
    let functionArguments: unknown[];
    let typeArguments: string[] | undefined;
    
    if (isLegacy) {
      const legacy = transaction as LegacyTransactionPayload;
      functionName = legacy.function;
      functionArguments = legacy.arguments;
      typeArguments = legacy.type_arguments;
    } else {
      const newFormat = transaction as NewTransactionPayload;
      functionName = newFormat.data.function;
      functionArguments = newFormat.data.functionArguments;
      typeArguments = newFormat.data.typeArguments;
    }
    
    const response = await aptosSignAndSubmit({
      sender: account,
      data: {
        function: functionName as `${string}::${string}::${string}`,
        functionArguments: functionArguments as any[],
        typeArguments,
      },
    });
    
    return { hash: response.hash };
  }, [account, aptosSignAndSubmit]);

  const signMessage = useCallback(async (message: { message: string; nonce: string }) => {
    const response = await aptosSignMessage(message);
    return {
      signature: String(response.signature),
      fullMessage: response.fullMessage,
    };
  }, [aptosSignMessage]);

  const formattedWallets = useMemo(() => {
    return wallets.map((w: { name: string; icon: string; url: string }) => ({
      name: w.name,
      icon: w.icon,
      url: w.url,
    }));
  }, [wallets]);

  const formattedWallet = useMemo(() => {
    if (!wallet) return null;
    return {
      name: wallet.name,
      icon: wallet.icon,
      url: wallet.url,
    };
  }, [wallet]);

  return (
    <WalletContext.Provider
      value={{
        account,
        isConnecting,
        isConnected: connected,
        connectWallet,
        disconnectWallet,
        ensureWallet,
        accountType,
        aptosNetwork,
        wallets: formattedWallets,
        wallet: formattedWallet,
        signAndSubmitTransaction,
        signMessage,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
