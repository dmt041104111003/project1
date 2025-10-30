"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CONTRACT_ADDRESS } from '@/constants/contracts';

const sha256Hex = async (s: string): Promise<string> => {
  const enc = new TextEncoder();
  const data = enc.encode(s);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(hash));
  return '0x' + bytes.map(b => b.toString(16).padStart(2, '0')).join('');
};

const getWalletAccount = async () => {
  const wallet = (window as { aptos: { 
    account: () => Promise<string | { address: string }>;
    signAndSubmitTransaction: (payload: unknown) => Promise<{ hash?: string }>;
  } }).aptos;
  if (!wallet) throw new Error('Wallet not found. Please connect your wallet first.');
  const account = await wallet.account();
  if (!account) throw new Error('Please connect your wallet first.');
  const accountAddress = typeof account === 'string' ? account : account.address;
  if (!accountAddress) throw new Error('Invalid account format. Please reconnect your wallet.');
  return { wallet, accountAddress };
};

export const JobDetailContent: React.FC = () => {
  const params = useParams();
  const jobId = params.id;
  
  const [cid, setCid] = useState<string>('');
  const [jobDetails, setJobDetails] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBlockchainInfo, setShowBlockchainInfo] = useState(false);
  const [chainInfo, setChainInfo] = useState<{ total_amount?: number; milestones_count?: number; has_freelancer?: boolean; locked?: boolean } | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        // Resolve CID on-chain then fetch IPFS via API helper
        const viewFn = `${CONTRACT_ADDRESS}::escrow::get_job_cid`;
        const res = await fetch(`/api/ipfs/get?jobId=${jobId}&viewFn=${encodeURIComponent(viewFn)}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to resolve CID');
        setCid(data.cid || data.encCid || '');
        if (data.data) setJobDetails(data.data);

        // Fetch additional fields from blockchain (best-effort)
        const fnTotal = `${CONTRACT_ADDRESS}::escrow::get_total_amount`;
        const fnMilestones = `${CONTRACT_ADDRESS}::escrow::get_milestone_count`;
        const fnHasFreelancer = `${CONTRACT_ADDRESS}::escrow::has_freelancer`;
        const fnLocked = `${CONTRACT_ADDRESS}::escrow::is_locked`;
        const [tRes, mRes, fRes, lRes] = await Promise.all([
          fetch('/v1/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ function: fnTotal, type_arguments: [], arguments: [Number(jobId)] }) }).catch(() => null),
          fetch('/v1/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ function: fnMilestones, type_arguments: [], arguments: [Number(jobId)] }) }).catch(() => null),
          fetch('/v1/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ function: fnHasFreelancer, type_arguments: [], arguments: [Number(jobId)] }) }).catch(() => null),
          fetch('/v1/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ function: fnLocked, type_arguments: [], arguments: [Number(jobId)] }) }).catch(() => null),
        ]);
        const totalOut = tRes && (tRes as Response).ok ? await (tRes as Response).json() : undefined;
        const milesOut = mRes && (mRes as Response).ok ? await (mRes as Response).json() : undefined;
        const hasFOut = fRes && (fRes as Response).ok ? await (fRes as Response).json() : undefined;
        const lockedOut = lRes && (lRes as Response).ok ? await (lRes as Response).json() : undefined;
        setChainInfo({
          total_amount: totalOut !== undefined ? (Array.isArray(totalOut) ? Number(totalOut[0]) : Number(totalOut)) : undefined,
          milestones_count: milesOut !== undefined ? (Array.isArray(milesOut) ? Number(milesOut[0]) : Number(milesOut)) : undefined,
          has_freelancer: hasFOut !== undefined ? (Array.isArray(hasFOut) ? !!hasFOut[0] : !!hasFOut) : undefined,
          locked: lockedOut !== undefined ? (Array.isArray(lockedOut) ? !!lockedOut[0] : !!lockedOut) : undefined,
        });
      } catch (err: unknown) {
        setError((err as Error).message || 'Failed to fetch job details');
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  const handleApplyOffchain = async () => {
    try {
      setApplying(true);
      if (!cid) throw new Error('Missing job CID');
      const { accountAddress } = await getWalletAccount();
      const res = await fetch('/api/ipfs/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'apply', jobCid: cid, walletAddress: accountAddress })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Apply failed');
      if (data.freelancer_id_hash) {
        try { localStorage.setItem('freelancer_id_hash', data.freelancer_id_hash); } catch (_) {}
      }
      alert('Applied off-chain successfully. Poster will review in Dashboard.');
    } catch (e: unknown) {
      alert(`Apply failed: ${(e as Error).message}`);
    } finally {
      setApplying(false);
    }
  };


  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-700 text-lg">Loading job details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 text-lg">Error: {error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <Button 
          onClick={() => window.history.back()}
          variant="outline"
          size="sm"
          className="mb-4"
        >
          ← Back to Jobs
        </Button>
        <h1 className="text-3xl font-bold text-blue-800 mb-2">Job #{String(jobId)}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
        <div className="lg:col-span-2 space-y-6">
          <Card variant="outlined" className="p-8">
            {jobDetails ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-blue-800 mb-2">
                    {String(jobDetails.title || 'Untitled Job')}
                  </h2>
                  <p className="text-gray-700">
                    {String(jobDetails.description || 'No description provided')}
                  </p>
                </div>
                {!!(jobDetails as any).requirements && (
                  <div>
                    <h3 className="text-lg font-bold text-blue-800 mb-2">Requirements</h3>
                    <p className="text-gray-700">{String((jobDetails as any).requirements)}</p>
                  </div>
                )}
                {chainInfo && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 border border-gray-300 bg-gray-50">
                      <div className="text-xs text-gray-600">Budget</div>
                      <div className="text-sm font-bold text-gray-900">{typeof chainInfo.total_amount === 'number' ? `${(chainInfo.total_amount / 100_000_000).toFixed(2)} APT` : '—'}</div>
                    </div>
                    <div className="p-3 border border-gray-300 bg-gray-50">
                      <div className="text-xs text-gray-600">Milestones</div>
                      <div className="text-sm font-bold text-gray-900">{typeof chainInfo.milestones_count === 'number' ? chainInfo.milestones_count : '—'}</div>
                    </div>
                    <div className="p-3 border border-gray-300 bg-gray-50">
                      <div className="text-xs text-gray-600">Status</div>
                      <div className="text-sm font-bold text-gray-900">{chainInfo.locked ? 'In progress' : 'Active'}</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">Job details not available</p>
              </div>
            )}
          </Card>

          <Card variant="outlined" className="p-6">
            <div 
              className="flex justify-between items-center cursor-pointer mb-4"
              onClick={() => setShowBlockchainInfo(!showBlockchainInfo)}
            >
              <h3 className="text-lg font-bold text-blue-800">Blockchain Information</h3>
              <span className="text-blue-800 text-lg">
                {showBlockchainInfo ? '−' : '+'}
              </span>
            </div>
            {showBlockchainInfo && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Job ID:</span>
                  <span className="font-bold text-gray-900">#{String(jobId)}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-gray-700 text-sm">Resolved CID:</span>
                  <span className="font-mono text-xs text-gray-600 break-all bg-gray-50 p-2 rounded">
                    {cid || 'N/A'}
                  </span>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Button 
            onClick={handleApplyOffchain}
            disabled={applying || !cid}
            size="lg"
            variant="outline"
            className="w-full !bg-white !text-black !border-2 !border-black py-4 text-lg font-bold hover:!bg-gray-100"
          >
            {applying ? 'Applying...' : 'Apply (off-chain)'}
          </Button>
        </div>
      </div>
    </>
  );
};
