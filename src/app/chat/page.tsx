'use client';

import { PageLayout } from '@/components/common';
import { ChatContent } from '@/components/chat/ChatContent';
import { WalletConnectGate } from '@/components/common/WalletConnectGate';

export default function ChatPage() {
  return (
    <PageLayout>
       <WalletConnectGate
        title="Kết nối ví để truy cập Dashboard"
        description="Vui lòng kết nối ví Petra để quản lý dự án và người làm tự do."
      >
        <ChatContent />
      </WalletConnectGate>
    </PageLayout>
  );
}