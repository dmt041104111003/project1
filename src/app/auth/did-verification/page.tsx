'use client';

import { PageLayout } from '@/components/common';
import DIDVerification from '@/components/auth/DIDVerification';
import { WalletConnectGate } from '@/components/common/WalletConnectGate';

export default function DIDVerificationPage() {
  return (
    <PageLayout>
      <WalletConnectGate>
        <DIDVerification />
      </WalletConnectGate>
    </PageLayout>
  );
}
