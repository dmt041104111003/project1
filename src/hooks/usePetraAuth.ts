"use client";

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

type UsePetraAuthArgs = {
  accountType: 'aptos' | null;
  setAccount: (value: string | null) => void;
  setAccountType: (value: 'aptos' | null) => void;
  setAptosNetwork: (value: string | null) => void;
  canAutoRestore?: boolean;
};

export function usePetraAuth({
  accountType,
  setAccount,
  setAccountType,
  setAptosNetwork,
  canAutoRestore = false,
}: UsePetraAuthArgs) {
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    if (!('aptos' in window)) {
      toast.error('Vui lòng cài đặt ví Petra để kết nối. Truy cập https://petra.app');
      setIsConnecting(false);
      return;
    }

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

      setAccount(address);
      setAccountType('aptos');
      setAptosNetwork(network);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('wallet_address', address);
      }

      toast.success(`Đã kết nối ví Petra: ${address.slice(0, 6)}...${address.slice(-4)}`);
    } catch (error) {
      console.error('Connect wallet error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể kết nối ví Petra');
    } finally {
      setIsConnecting(false);
    }
  }, [setAccount, setAccountType, setAptosNetwork]);

  const disconnectWallet = useCallback(async () => {
    if (accountType === 'aptos' && 'aptos' in window) {
      try {
        const wallet = window.aptos!;
        await wallet.disconnect();
      } catch (error) {
        console.error('Disconnect wallet error:', error);
      }
    }

    setAccount(null);
    setAccountType(null);
    setAptosNetwork(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('wallet_address');
    }
    toast.success('Đã ngắt kết nối ví Petra');
  }, [accountType, setAccount, setAccountType, setAptosNetwork]);

  useEffect(() => {
    if (typeof window === 'undefined' || !canAutoRestore) {
      return;
    }

    const storedAddress = window.localStorage.getItem('wallet_address');
    if (!storedAddress || !('aptos' in window)) {
      return;
    }

    let cancelled = false;

    const restoreConnection = async () => {
      try {
        const wallet = window.aptos!;
        try {
          await (wallet.connect as any)?.({ onlyIfTrusted: true });
        } catch {
          await wallet.account();
        }
        const acc = await wallet.account();
        const network = await wallet.network();
        if (cancelled) return;
        const address = acc.address.toLowerCase();
        
        setAccount(address);
        setAccountType('aptos');
        setAptosNetwork(network);
      } catch (error) {
        console.error('Restore wallet connection failed:', error);
        window.localStorage.removeItem('wallet_address');
      }
    };

    restoreConnection();

    return () => {
      cancelled = true;
    };
  }, [canAutoRestore, setAccount, setAccountType, setAptosNetwork]);

  return {
    connectWallet,
    disconnectWallet,
    isConnecting,
  };
}