'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
// no-op import
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

type DidState = {
  loading: boolean;
  error: string | null;
  hasVerified: boolean;
  didHash: string;
  controller: string;
};

export default function DIDVerifiedStatus() {
  const { account } = useWallet();
  const [state, setState] = useState<DidState>({
    loading: true,
    error: null,
    hasVerified: false,
    didHash: '0x',
    controller: ''
  });

  useEffect(() => {
    const run = async () => {
      if (!account) {
        setState((s) => ({ ...s, loading: false, error: 'Vui lòng kết nối ví Petra' }));
        return;
      }
      try {
        setState((s) => ({ ...s, loading: true, error: null }));
        const res = await fetch(`/api/did/${account}`);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        setState({ loading: false, error: null, hasVerified: data.hasVerified, didHash: data.didHash, controller: data.controller });
      } catch (e) {
        setState((s) => ({ ...s, loading: false, error: 'Không thể kiểm tra trạng thái DID' }));
      }
    };
    run();
  }, [account]);

  if (state.loading) {
    return (
      <Card>
        <div className="p-6 flex items-center justify-center text-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-border" />
          <span className="ml-2">Đang kiểm tra trạng thái DID...</span>
        </div>
      </Card>
    );
  }

  if (state.error) {
    return (
      <Card>
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Trạng thái DID</h3>
          <p className="text-sm text-muted-foreground">{state.error}</p>
        </div>
      </Card>
    );
  }

  if (state.hasVerified) {
    return (
      <Card>
        <div className="p-8 flex flex-col items-center justify-center text-center gap-3">
          <CheckCircle className="h-14 w-14 text-green-600" />
          <h3 className="text-lg font-semibold">Đã xác minh DID</h3>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Trạng thái DID</h3>
          <Badge variant={state.hasVerified ? 'success' : 'danger'}>
            {state.hasVerified ? 'Đã xác minh' : 'Chưa xác minh'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="text-muted-foreground">Ví hiện tại</label>
            <p className="font-mono break-all">{account || '—'}</p>
          </div>
          <div>
            <label className="text-muted-foreground">Controller</label>
            <p className="font-mono break-all">{state.controller || '—'}</p>
          </div>
          <div className="md:col-span-2">
            <label className="text-muted-foreground">DID Hash</label>
            <p className="font-mono break-all">{state.didHash}</p>
          </div>
        </div>

        {!state.hasVerified && (
          <div className="pt-2">
            <Link href="/auth/did-verification">
              <Button>Tiến hành xác minh DID</Button>
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}


