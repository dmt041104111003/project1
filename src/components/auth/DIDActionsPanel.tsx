import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useWallet } from '@/contexts/WalletContext';

export default function DIDActionsPanel() {
  const { account } = useWallet();
  const [roles, setRoles] = useState<Array<{ name: string, cid?: string, desc?: string }>>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [inputs, setInputs] = useState<{[k: string]: string}>({});

  useEffect(() => {
    if (!account) { setRoles([]); return; }
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/role', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_all_roles', args: [account], typeArgs: [] })
      });
      const data = await res.json(); // {roles:[{name, cid}, ...]}
      if (!Array.isArray(data?.roles)) return;
      const results: Array<{name:string, cid?:string, desc?:string}> = [];
      for(const r of data.roles) {
        if(r.cid && typeof r.cid==='string' && r.cid.length > 16) {
          try {
            const pfres = await fetch(`/api/ipfs/get?cid=${r.cid}&mode=profile`);
            const pf = await pfres.json();
            results.push({ name: r.name, cid: r.cid, desc: pf?.about || pf?.description });
          } catch {
            results.push({ name: r.name, cid: r.cid });
          }
        } else {
          results.push({ name: r.name });
        }
      }
      if (!cancelled) setRoles(results);
    })();
    return () => { cancelled = true; };
  }, [account]);

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

  const callRole = async (role: string, about?: string) => {
    setLoading(role);
    setMessage('');
    try {
      const cid = about ? await uploadDescToIpfs(about) : undefined;
      const args = cid ? [role, cid] : [role];
      const res = await fetch('/api/role', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: `register_${role}`, args, typeArgs: [] }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'API failed');
      if (window.aptos && data.function) {
        await window.aptos.signAndSubmitTransaction({
          type: 'entry_function_payload',
          function: data.function,
          type_arguments: data.type_args,
          arguments: data.args
        });
        setMessage('Đăng ký thành công! Transaction đã được gửi lên blockchain.');
      } else {
        setMessage('Không tìm thấy ví Aptos!');
      }
    } catch (e: any) {
      setMessage(e?.message || 'Failed');
    } finally { setLoading(null); }
  };

  const ROLE_OPTIONS = [
    { value: 'freelancer', label: 'Freelancer' },
    { value: 'poster', label: 'Poster' },
    { value: 'reviewer', label: 'Reviewer' },
  ];

  const selectedRole = inputs['role'] || '';
  const isSelectedRegistered = !!roles.find(r => r.name === selectedRole);
  const actionLabel = selectedRole ? (isSelectedRegistered ? 'Update Role' : 'Register Role') : 'Register Role';

  return (
    <Card variant="outlined" className="space-y-4 mt-6 bg-white p-4">
      <div className="text-lg font-bold text-blue-800">Register Roles</div>
      <div className="text-sm text-gray-700">Wallet: {account ? `${account.slice(0,6)}...${account.slice(-4)}` : 'Not connected'}</div>
      <div className="my-2">
        {roles.map(r => (
          <div key={r.name} className={`rounded p-2 text-xs mb-1 bg-blue-50 text-blue-900`}>
            Bạn đã là <b>{r.name}</b> 
            <br />Description: {r.desc || <i>No profile data</i>}
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-900">Role</label>
          <select
            className="w-full px-3 py-2 border border-gray-400 bg-white text-sm"
            value={inputs['role'] || ''}
            onChange={e => setInputs(i => ({ ...i, role: e.target.value }))}
          >
            <option value=''>Select role...</option>
            {ROLE_OPTIONS.map(opt => (
              <option value={opt.value} key={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-900">Description</label>
          <textarea className="w-full px-3 py-2 border border-gray-400 bg-white text-sm" rows={3}
            value={inputs['desc'] || ''}
            onChange={e => setInputs(i => ({ ...i, desc: e.target.value }))}
            placeholder="About you / skills or project..."
          />
        </div>
        <Button className="w-full" size="sm" variant="outline" onClick={()=>callRole(inputs.role, inputs.desc)} disabled={loading!==null || !inputs.role}>{actionLabel}</Button>
      </div>
      {message && <div className="text-xs text-gray-700">{message}</div>}
    </Card>
  );
}


