'use client';

import { JobsLayout } from '@/components/jobs/JobsLayout';
import { JobsContent } from '@/components/jobs/JobsContent';

export default function JobsPage() {
  return (
    <JobsLayout>
      <JobsContent />
    </JobsLayout>
  );
}