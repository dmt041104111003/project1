import { useCallback } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { toast } from 'sonner';

export const useProofVerification = () => {
  const { account } = useWallet();

  const checkProof = useCallback(async (): Promise<boolean> => {
    if (!account) {
      toast.error('Bạn chưa kết nối ví. Vui lòng kết nối ví trước.');
      return false;
    }

    try {
      const res = await fetch(`/api/zk/verify?address=${encodeURIComponent(account)}`);
      if (!res.ok) {
        toast.error('Không thể kiểm tra trạng thái xác minh.');
        return false;
      }
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || 'Không thể kiểm tra trạng thái xác minh.');
        return false;
      }
      if (!data.hasProof) {
        toast.error('Bạn chưa có xác minh không kiến thức. Vui lòng xác minh định danh tài khoản trước.');
        return false;
      }
      if (data.verified !== true) {
        toast.error(data.message || 'Bạn cần hoàn tất xác minh danh tính trước.');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error checking proof:', error);
      toast.error('Không thể kiểm tra trạng thái xác minh.');
      return false;
    }
  }, [account]);

  const checkMultipleProofs = useCallback(async (addresses: string[]): Promise<Record<string, boolean>> => {
    const results: Record<string, boolean> = {};
    
    await Promise.all(
      addresses.map(async (addr) => {
        try {
          const res = await fetch(`/api/zk/verify?address=${encodeURIComponent(addr)}&verify=false`);
          if (res.ok) {
            const data = await res.json();
            results[addr] = data.success && data.hasProof;
          } else {
            results[addr] = false;
          }
        } catch {
          results[addr] = false;
        }
      })
    );
    
    return results;
  }, []);

  return {
    checkProof,
    checkMultipleProofs,
  };
};


