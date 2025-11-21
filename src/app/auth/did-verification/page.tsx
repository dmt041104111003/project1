'use client';

import DIDVerificationLayout from '@/components/auth/DIDVerificationLayout';
import DIDVerification from '@/components/auth/DIDVerification';
import { WalletConnectGate } from '@/components/common/WalletConnectGate';

export default function DIDVerificationPage() {
  return (
    <DIDVerificationLayout>
      <WalletConnectGate>
        <DIDVerification />
      </WalletConnectGate>
    </DIDVerificationLayout>
  );
}
