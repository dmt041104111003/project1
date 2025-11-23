"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SegmentedTabs } from '@/components/ui';
import { useWallet } from '@/contexts/WalletContext';
import { useDisputes } from './useDisputes';
import { DisputeItem } from './DisputeItem';

export const DisputesContent: React.FC = () => {
  const { account } = useWallet();
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const {
    loading,
    errorMsg,
    disputes,
    history,
    historyLoading,
    isReviewer,
    checkingRole,
    refresh,
    fetchHistory,
    resolving,
    resolveToPoster,
    resolveToFreelancer,
  } = useDisputes(account);
  
  console.log('[DisputesContent] Account:', account);
  console.log('[DisputesContent] Is Reviewer:', isReviewer);
  console.log('[DisputesContent] Checking Role:', checkingRole);
  console.log('[DisputesContent] Disputes:', disputes);
  console.log('[DisputesContent] Disputes count:', disputes.length);
  console.log('[DisputesContent] Loading:', loading);
  console.log('[DisputesContent] Error:', errorMsg);

  if (!account) {
    return (
      <div className="space-y-6">
        <Card variant="outlined" className="p-6 text-sm text-gray-700">
          Vui lòng kết nối ví để truy cập trang tranh chấp.
        </Card>
      </div>
    );
  }

  if (!checkingRole && !isReviewer) {
    return (
      <div className="space-y-6">
        <Card variant="outlined" className="p-6 text-sm text-gray-700">
          Bạn cần đăng ký vai trò Người đánh giá để xem và bỏ phiếu tranh chấp.
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-800 mb-2">Tranh chấp</h1>
          <p className="text-lg text-gray-700">Chỉ reviewer được chỉ định mới có thể xem và bỏ phiếu.</p>
        </div>
      </div>

      <SegmentedTabs
        stretch
        tabs={[
          { value: 'current', label: 'Tranh chấp đang xử lý' },
          { value: 'history', label: 'Lịch sử đã tham gia' },
        ]}
        activeTab={activeTab}
        onChange={(value) => setActiveTab(value as 'current' | 'history')}
      />

      {errorMsg && <div className="p-2 bg-blue-100 text-blue-800 text-sm border border-blue-300">{errorMsg}</div>}

      {activeTab === 'current' ? (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => refresh({ silent: false })} disabled={loading}>
              {loading ? 'Đang tải...' : 'Làm mới danh sách'}
            </Button>
          </div>
          {disputes.filter(d => d.status !== 'resolved').length === 0 ? (
            <Card variant="outlined" className="p-6 text-sm text-gray-700">Không có tranh chấp nào để xem xét.</Card>
          ) : (
            disputes.filter(d => d.status !== 'resolved').map((d) => (
              <DisputeItem
                key={`${d.jobId}:${d.milestoneIndex}`}
                dispute={d}
                resolvingKey={resolving}
                onResolvePoster={() => resolveToPoster(d.disputeId)}
                onResolveFreelancer={() => resolveToFreelancer(d.disputeId)}
              />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => fetchHistory()} disabled={historyLoading}>
              {historyLoading ? 'Đang tải...' : 'Làm mới lịch sử'}
            </Button>
          </div>
          {history.length === 0 ? (
            <Card variant="outlined" className="p-6 text-sm text-gray-700">
              Bạn chưa từng tham gia tranh chấp nào hoặc dữ liệu chưa có sẵn.
            </Card>
          ) : (
            history.map((item) => (
              <Card
                key={`${item.disputeId}:${item.milestoneId}:${item.timestamp}`}
                variant="outlined"
                className="p-4 bg-white"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm text-gray-600">
                      Tranh chấp #{item.disputeId} · Công việc #{item.jobId} · Cột mốc #{item.milestoneId}
                    </p>
                    <p className="text-xs text-gray-500">
                      Tham gia lúc:{' '}
                      {item.timestamp
                        ? new Date(item.timestamp * 1000).toLocaleString('vi-VN')
                        : 'Không xác định'}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};
