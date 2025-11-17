'use client';

import { DisputesLayout } from '@/components/disputes/DisputesLayout';
import { DisputesContentWithAuth } from '@/components/disputes/DisputesContentWithAuth';

export default function DisputesPage() {
  return (
    <DisputesLayout>
      <DisputesContentWithAuth />
    </DisputesLayout>
  );
}