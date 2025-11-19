'use client';

import DIDVerificationLayout from '@/components/auth/DIDVerificationLayout';
import DIDActionsPanel from '@/components/auth/DIDActionsPanel';
import { WalletConnectGate } from '@/components/common/WalletConnectGate';

export default function DIDVerificationPage() {
  return (
    <DIDVerificationLayout>
      <WalletConnectGate>
        <DIDActionsPanel />
      </WalletConnectGate>
    </DIDVerificationLayout>
  );
}
