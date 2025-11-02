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
        console.log('Roles data:', data);
        setRoles(data.roles || []);
      })
      .catch(err => {
        console.error('Error fetching roles:', err);
        setRoles([]);
      })
      .finally(() => setLoadingRoles(false));
  }, [account]);

  const handleRegister = async () => {
    if (!role || !window.aptos) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: `register_${role}`, about: desc || undefined })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'API failed');
      if (!data.function) throw new Error('Invalid response');
      
      await window.aptos.signAndSubmitTransaction({
        type: 'entry_function_payload',
        function: data.function,
        type_arguments: data.type_args,
        arguments: data.args
      });
      
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
      <div className="text-lg font-bold text-blue-800">Register Roles</div>
      <div className="text-sm text-gray-700">
        Wallet: {account ? `${account.slice(0,6)}...${account.slice(-4)}` : 'Not connected'}
      </div>
      
      {loadingRoles ? (
        <div className="text-xs text-gray-500">Đang tải roles...</div>
      ) : roles.length > 0 ? (
        <div className="my-2">
          {roles.map(r => (
            <div key={r.name} className="rounded p-2 text-xs mb-1 bg-blue-50 text-blue-900">
              Đã đăng ký: <b>{r.name}</b>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-gray-500">Chưa đăng ký role nào</div>
      )}
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-1">Role</label>
          <select
            className="w-full px-3 py-2 border border-gray-400 bg-white text-sm"
            value={role}
            onChange={e => setRole(e.target.value)}
          >
            <option value="">Select role...</option>
            <option value="freelancer">Freelancer</option>
            <option value="poster">Poster</option>
            <option value="reviewer">Reviewer</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-1">Description</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-400 bg-white text-sm"
            rows={3}
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="About you / skills..."
          />
        </div>
        
        <Button
          className="w-full"
          size="sm"
          variant="outline"
          onClick={handleRegister}
          disabled={loading || !role}
        >
          {loading ? 'Loading...' : 'Register Role'}
        </Button>
      </div>
      
      {message && <div className="text-xs text-gray-700">{message}</div>}
    </Card>
  );
}
