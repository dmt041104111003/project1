import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useWallet } from '@/contexts/WalletContext';

interface Role {
  name: string;
  cids?: string[];
}

export default function DIDActionsPanel() {
  const { account } = useWallet();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [message, setMessage] = useState('');
  const [role, setRole] = useState('');
  const [desc, setDesc] = useState('');

  useEffect(() => {
    if (!account) {
      setRoles([]);
      return;
    }
    setLoadingRoles(true);
    fetch(`/api/role?address=${encodeURIComponent(account)}`)
      .then(res => res.json())
      .then(data => {
        setRoles(data.roles || []);
      })
      .catch(() => {
        setRoles([]);
      })
      .finally(() => setLoadingRoles(false));
  }, [account]);

  const handleRegister = async () => {
    if (!role || !window.aptos) return;
    setLoading(true);
    setMessage('');
    try {
      let cid = '';
      
      if ((role === 'freelancer' || role === 'poster') && desc.trim()) {
        const ipfsRes = await fetch('/api/ipfs/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'profile', about: desc })
        });
        const ipfsData = await ipfsRes.json();
        if (!ipfsData.success) throw new Error(ipfsData.error || 'Tải lên IPFS thất bại');
        cid = ipfsData.encCid || ipfsData.ipfsHash || '';
        if (!cid) throw new Error('CID là bắt buộc cho freelancer và poster');
      }
      
      const { roleHelpers } = await import('@/utils/contractHelpers');
      
      let payload;
      if (role === 'freelancer') {
        payload = roleHelpers.registerFreelancer(cid);
      } else if (role === 'poster') {
        payload = roleHelpers.registerPoster(cid);
      } else if (role === 'reviewer') {
        payload = roleHelpers.registerReviewer();
      } else {
        throw new Error('Vai trò không hợp lệ');
      }
      
      await window.aptos.signAndSubmitTransaction(payload);
      
      setMessage('Đăng ký thành công!');
      setRole('');
      setDesc('');
      
      setLoadingRoles(true);
      const refreshRes = await fetch(`/api/role?address=${encodeURIComponent(account!)}`);
      const refreshData = await refreshRes.json();
      setRoles(refreshData.roles || []);
      setLoadingRoles(false);
    } catch (error: any) {
      setMessage(error?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="outlined" className="space-y-4 mt-6 bg-white p-4">
      <div className="text-lg font-bold text-blue-800">Đăng ký vai trò</div>
      <div className="text-sm text-gray-700">
        Ví: {account ? `${account.slice(0,6)}...${account.slice(-4)}` : 'Chưa kết nối'}
      </div>
      
      {loadingRoles ? (
        <div className="text-xs text-gray-500">Đang tải vai trò...</div>
      ) : roles.length > 0 ? (
        <div className="my-2">
          {roles.map(r => (
            <div key={r.name} className="rounded p-2 text-xs mb-1 bg-blue-50 text-blue-900">
              Đã đăng ký: <b>{r.name}</b>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-gray-500">Chưa đăng ký vai trò nào</div>
      )}
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-1">Vai trò</label>
          <select
            className="w-full px-3 py-2 border border-gray-400 bg-white text-sm"
            value={role}
            onChange={e => {
              setRole(e.target.value);
              if (e.target.value === 'reviewer') {
                setDesc('');
              }
            }}
          >
            <option value="">Chọn vai trò...</option>
            <option value="freelancer">Freelancer</option>
            <option value="poster">Poster</option>
            <option value="reviewer">Reviewer</option>
          </select>
        </div>
        
        {role !== 'reviewer' && (
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1">Mô tả</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-400 bg-white text-sm"
              rows={3}
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Giới thiệu về bạn / kỹ năng..."
            />
          </div>
        )}
        
        <Button
          className="w-full"
          size="sm"
          variant="outline"
          onClick={handleRegister}
          disabled={loading || !role}
        >
          {loading ? 'Đang xử lý...' : 'Đăng ký vai trò'}
        </Button>
      </div>
      
      {message && <div className="text-xs text-gray-700">{message}</div>}
    </Card>
  );
}
