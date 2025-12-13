'use client';

import { PageLayout } from '@/components/common';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { WalletConnectGate } from '@/components/common/WalletConnectGate';

export default function DashboardPage() {
  return (
    <PageLayout>
      <WalletConnectGate
        title="Kết nối ví để truy cập Bảng điều khiển"
        description="Vui lòng kết nối ví Petra để quản lý dự án và người làm tự do."
      >
        <DashboardContent />
      </WalletConnectGate>
    </PageLayout>
  );
}