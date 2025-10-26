'use client';

import { JobDetailLayout } from '@/components/jobs/JobDetailLayout';
import { JobDetailContent } from '@/components/jobs/JobDetailContent';

export default function JobDetailPage() {
  return (
    <JobDetailLayout>
      <JobDetailContent />
    </JobDetailLayout>
  );
}