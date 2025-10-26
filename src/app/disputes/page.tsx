'use client';

import { DisputesLayout } from '@/components/disputes/DisputesLayout';
import { DisputesContent } from '@/components/disputes/DisputesContent';

export default function DisputesPage() {
  return (
    <DisputesLayout>
      <DisputesContent />
    </DisputesLayout>
  );
}