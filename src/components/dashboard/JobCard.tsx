"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { MilestonesList } from './MilestonesList';
import { toast } from 'sonner';
import { JobCardProps } from '@/constants/escrow';

const getStateDisplay = (state: any): { text: string; classes: string } => {
  const stateStr = typeof state === 'string' ? state : 'Active';
  
  if (stateStr === 'Posted') {
    return {
      text: 'Open',
      classes: 'bg-green-100 text-green-800 border-green-300'
    };
  }
  if (stateStr === 'InProgress') {
    return {
      text: 'In Progress',
      classes: 'bg-blue-100 text-blue-800 border-blue-300'
    };
  }
  if (stateStr === 'Completed') {
    return {
      text: 'Completed',
      classes: 'bg-gray-100 text-gray-800 border-gray-300'
    };
  }
  if (stateStr === 'Disputed') {
    return {
      text: 'Disputed',
      classes: 'bg-red-100 text-red-800 border-red-300'
    };
  }
  return {
    text: stateStr || 'Active',
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
            const res = await fetch('/api/job/withdraw', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'poster_withdraw_unfilled',
                job_id: job.id
              })
            });
            const payload = await res.json();
            if (payload.error) throw new Error(payload.error);

            const wallet = (window as any).aptos;
            if (!wallet) throw new Error('Wallet not found');

            const tx = await wallet.signAndSubmitTransaction({
              type: "entry_function_payload",
              function: payload.function,
              type_arguments: payload.type_args || [],
              arguments: payload.args
            });

            toast.success(`Rút job thành công! TX: ${tx?.hash || 'N/A'}`);
            setTimeout(() => {
              onUpdate();
            }, 2000);
          } catch (err: any) {
            console.error('[JobCard] Withdraw error:', err);
            toast.error(`Lỗi: ${err?.message || 'Unknown error'}`);
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

  const stateDisplay = getStateDisplay(job.state);
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
          <div><span className="font-bold">Poster:</span> {formatAddress(job.poster)}</div>
          <div><span className="font-bold">Freelancer:</span> {formatAddress(job.freelancer)}</div>
          <div><span className="font-bold">Total:</span> {job.total_amount ? `${(job.total_amount / 100_000_000).toFixed(2)} APT` : '-'}</div>
          <div><span className="font-bold">Milestones:</span> {job.milestones_count || 0}</div>
          <div><span className="font-bold">Assigned:</span> {job.has_freelancer ? 'Yes' : 'No'}</div>
          {job.apply_deadline && (
            <div className="col-span-2">
              <span className="font-bold">Apply Deadline:</span> {
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
            className="bg-orange-600 text-black hover:bg-orange-700 text-xs px-3 py-1"
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

