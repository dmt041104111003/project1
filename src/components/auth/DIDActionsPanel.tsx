import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useWallet } from '@/contexts/WalletContext';

export default function DIDActionsPanel() {
  const { account } = useWallet();
  const [descFreelancer, setDescFreelancer] = useState('');
  const [descPoster, setDescPoster] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const uploadDescToIpfs = async (about: string) => {
    const res = await fetch('/api/ipfs/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'profile', about })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'upload failed');
    return data.encCid || data.ipfsHash;
  };

  const callRole = async (action: string, about?: string) => {
    setLoading(action);
    setMessage('');
    try {
      const cid = about ? await uploadDescToIpfs(about) : undefined;
      const args = cid ? [cid] : [];
      const res = await fetch('/api/role', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, args, typeArgs: [] }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'API failed');
      setMessage(`Prepared function: ${data.function}`);
    } catch (e: any) {
      setMessage(e?.message || 'Failed');
    } finally { setLoading(null); }
  };

  return (
    <Card variant="outlined" className="space-y-4 mt-6 bg-white p-4">
      <div className="text-lg font-bold text-blue-800">Register Roles</div>
      <div className="text-sm text-gray-700">Wallet: {account ? `${account.slice(0,6)}...${account.slice(-4)}` : 'Not connected'}</div>

      <div className="space-y-3">
        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-900">Freelancer description</label>
          <textarea className="w-full px-3 py-2 border border-gray-400 bg-white text-sm" rows={3} value={descFreelancer} onChange={(e) => setDescFreelancer(e.target.value)} placeholder="About you / skills" />
          <Button className="w-full" size="sm" variant="outline" onClick={() => callRole('register_freelancer', descFreelancer)} disabled={loading !== null}>Register FREELANCER</Button>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-900">Poster description</label>
          <textarea className="w-full px-3 py-2 border border-gray-400 bg-white text-sm" rows={3} value={descPoster} onChange={(e) => setDescPoster(e.target.value)} placeholder="About your project/company" />
          <Button className="w-full" size="sm" variant="outline" onClick={() => callRole('register_poster', descPoster)} disabled={loading !== null}>Register POSTER</Button>
        </div>

        <div>
          <Button className="w-full" size="sm" variant="outline" onClick={() => callRole('register_reviewer')} disabled={loading !== null}>Register REVIEWER</Button>
        </div>
      </div>

      {message && <div className="text-xs text-gray-700">{message}</div>}
    </Card>
  );
}


