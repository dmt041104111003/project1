"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { MilestonesList } from './MilestonesList';
import { toast } from 'sonner';
import { JobCardProps } from '@/constants/escrow';

  const getStateDisplay = (state: unknown, applyDeadline?: number, hasFreelancer?: boolean): { text: string; classes: string } => {
  const stateStr = typeof state === 'string' ? state : 'Active';
  
  const applyDeadlineExpired = applyDeadline
    ? applyDeadline * 1000 < Date.now() 
    : false;
  const isExpiredPosted = stateStr === 'Posted' && applyDeadlineExpired && !hasFreelancer;
  
  if (isExpiredPosted) {
    return {
      text: 'Hết hạn đăng ký',
      classes: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    };
  }
  if (stateStr === 'Posted') {
    return {
      text: 'Mở',
      classes: 'bg-green-100 text-green-800 border-green-300'
    };
  }
  if (stateStr === 'InProgress') {
    return {
      text: 'Đang thực hiện',
      classes: 'bg-blue-100 text-blue-800 border-blue-300'
    };
  }
  if (stateStr === 'Completed') {
    return {
      text: 'Hoàn thành',
      classes: 'bg-gray-100 text-gray-800 border-gray-300'
    };
  }
  if (stateStr === 'Disputed') {
    return {
      text: 'Tranh chấp',
      classes: 'bg-red-100 text-red-800 border-red-300'
    };
  }
  return {
    text: stateStr || 'Hoạt động',
    classes: 'bg-gray-100 text-gray-800 border-gray-300'
  };
};

const formatAddress = (address: string | null): string => {
  if (!address) return '-';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

export const JobCard: React.FC<JobCardProps> = ({ job, account, activeTab, onUpdate }) => {
  const handleWithdraw = async () => {
    toast.warning('Bạn có chắc muốn rút lại job này? Stake và escrow sẽ được hoàn về ví của bạn.', {
      action: {
        label: 'Xác nhận',
        onClick: async () => {
          try {
            const { escrowHelpers } = await import('@/utils/contractHelpers');
            const payload = escrowHelpers.posterWithdrawUnfilled(job.id);

            const wallet = (window as { aptos?: { signAndSubmitTransaction: (p: unknown) => Promise<{ hash?: string }> } }).aptos;
            if (!wallet) throw new Error('Wallet not found');

            const tx = await wallet.signAndSubmitTransaction(payload);

            toast.success(`Rút job thành công! TX: ${tx?.hash || 'N/A'}`);
            setTimeout(() => {
              onUpdate();
            }, 2000);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
            toast.error(`Lỗi: ${errorMessage}`);
          }
        }
      },
      cancel: {
        label: 'Hủy',
        onClick: () => {}
      },
      duration: 10000
    });
  };

  const stateDisplay = getStateDisplay(job.state, job.apply_deadline, job.has_freelancer);
  const canShowWithdraw = activeTab === 'posted' && 
    !job.has_freelancer && 
    job.state === 'Posted' && 
    account?.toLowerCase() === job.poster?.toLowerCase();

  return (
    <div className="border border-gray-400 bg-gray-50 p-4 rounded">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-blue-800">Job #{job.id}</h3>
        <span className={`px-2 py-1 text-xs font-bold border-2 ${stateDisplay.classes}`}>
          {stateDisplay.text}
        </span>
      </div>
      
      <div className="space-y-2">
        <p className="text-xs text-gray-600 break-all">CID: {job.cid}</p>
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
          <div><span className="font-bold">Người đăng:</span> {formatAddress(job.poster)}</div>
          <div><span className="font-bold">Freelancer:</span> {formatAddress(job.freelancer)}</div>
          <div><span className="font-bold">Tổng:</span> {job.total_amount ? `${(job.total_amount / 100_000_000).toFixed(2)} APT` : '-'}</div>
          <div><span className="font-bold">Cột mốc:</span> {job.milestones_count || 0}</div>
          <div><span className="font-bold">Đã giao:</span> {job.has_freelancer ? 'Có' : 'Chưa'}</div>
          {job.apply_deadline && (
            <div className="col-span-2">
              <span className="font-bold">Hạn đăng ký:</span> {
                new Date(job.apply_deadline * 1000).toLocaleString('vi-VN')
              }
              {job.apply_deadline * 1000 < Date.now() && (
                <span className="ml-2 text-red-600 font-bold">(Đã hết hạn)</span>
              )}
            </div>
          )}
        </div>
      </div>

      {canShowWithdraw && (
        <div className="mt-3 mb-3 p-3 border-2 border-orange-300 bg-orange-50 rounded">
          <p className="text-xs text-orange-800 mb-2">
            ⚠ Job chưa có freelancer apply. Bạn có thể rút lại stake và escrow về ví.
          </p>
          <Button
            size="sm"
            onClick={handleWithdraw}
            className="bg-orange-100 text-black hover:bg-orange-200 text-xs px-3 py-1"
          >
            Rút lại job (Nhận stake + escrow)
          </Button>
        </div>
      )}

      {job.milestones && Array.isArray(job.milestones) && job.milestones.length > 0 && (
        <MilestonesList
          jobId={job.id}
          milestones={job.milestones}
          poster={job.poster || ''}
          freelancer={job.freelancer}
          jobState={job.state || 'Posted'}
          mutualCancelRequestedBy={job.mutual_cancel_requested_by || null}
          freelancerWithdrawRequestedBy={job.freelancer_withdraw_requested_by || null}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
};

