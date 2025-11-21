'use client';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { WalletConnectGate } from '@/components/common/WalletConnectGate';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <WalletConnectGate
        title="Kết nối ví để truy cập Dashboard"
        description="Vui lòng kết nối ví Petra để quản lý dự án và người làm tự do."
      >
        <DashboardContent />
      </WalletConnectGate>
    </DashboardLayout>
  );
}