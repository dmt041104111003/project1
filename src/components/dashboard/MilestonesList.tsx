"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { toast } from 'sonner';

interface Milestone {
  id: string;
  amount: string;
  deadline: string;
  status: string; // "Pending" | "Submitted" | "Accepted" | "Locked"
  evidence_cid?: { vec?: string[] } | string | null;
}

interface MilestonesListProps {
  jobId: number;
  milestones: Milestone[];
  poster: string;
  freelancer: string | null;
  jobState: string;
  onUpdate?: () => void;
}

export const MilestonesList: React.FC<MilestonesListProps> = ({
  jobId,
  milestones,
  poster,
  freelancer,
  jobState,
  onUpdate
}) => {
  const { account } = useWallet();
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [evidenceCids, setEvidenceCids] = useState<Record<number, string>>({});
  const [uploadingFiles, setUploadingFiles] = useState<Record<number, boolean>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<number, File | null>>({});

  const isPoster = account?.toLowerCase() === poster?.toLowerCase();
  const isFreelancer = account && freelancer && account.toLowerCase() === freelancer.toLowerCase();
  const canInteract = jobState === 'InProgress' || jobState === 'Posted';
  const isCancelled = jobState === 'Cancelled';

  // Parse milestone status from Move enum
  const parseStatus = (status: any): string => {
    if (typeof status === 'string') return status;
    if (status?.vec && Array.isArray(status.vec) && status.vec.length > 0) {
      return String(status.vec[0]);
    }
    if (status?.__variant__) return String(status.__variant__);
    if (status?.__name__) return String(status.__name__);
    const keys = Object.keys(status || {});
    return keys.length > 0 ? String(keys[0]) : 'Pending';
  };

  // Parse evidence CID from Option<String>
  const parseEvidenceCid = (evidence: any): string | null => {
    if (!evidence) return null;
    if (typeof evidence === 'string') return evidence;
    if (evidence.vec && Array.isArray(evidence.vec) && evidence.vec.length > 0) {
      return evidence.vec[0];
    }
    return null;
  };

  const handleFileChange = async (milestoneId: number, file: File | null) => {
    if (!file) {
      setSelectedFiles(prev => {
        const updated = { ...prev };
        delete updated[milestoneId];
        return updated;
      });
      return;
    }

    setSelectedFiles(prev => ({ ...prev, [milestoneId]: file }));
    
    try {
      setUploadingFiles(prev => ({ ...prev, [milestoneId]: true }));
      
      // Upload file to IPFS
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'milestone_evidence');

      const uploadRes = await fetch('/api/ipfs/upload-file', {
        method: 'POST',
        body: formData
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Upload failed');
      }

      const uploadData = await uploadRes.json();
      if (!uploadData.success) throw new Error(uploadData.error || 'Upload failed');
      
      const finalCid = uploadData.encCid || uploadData.ipfsHash;
      setEvidenceCids(prev => ({ ...prev, [milestoneId]: finalCid }));
      toast.success('File uploaded successfully!');
    } catch (err: any) {
      console.error('[MilestonesList] File upload error:', err);
      toast.error(`Lỗi upload file: ${err?.message || 'Unknown error'}`);
      setSelectedFiles(prev => {
        const updated = { ...prev };
        delete updated[milestoneId];
        return updated;
      });
    } finally {
      setUploadingFiles(prev => {
        const updated = { ...prev };
        delete updated[milestoneId];
        return updated;
      });
    }
  };

  const handleSubmitMilestone = async (milestoneId: number) => {
    const evidenceCid = evidenceCids[milestoneId] || '';
    if (!account || !isFreelancer || !evidenceCid.trim()) {
      toast.error('Vui lòng upload file evidence trước');
      return;
    }

    try {
      setSubmittingId(milestoneId);
      
      let finalCid = evidenceCid.trim();

      // Get transaction payload
      const res = await fetch('/api/job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_milestone',
          job_id: jobId,
          milestone_id: milestoneId,
          evidence_cid: finalCid
        })
      });

      const payload = await res.json();
      if (payload.error) throw new Error(payload.error);

      // Sign and submit
      const wallet = (window as any).aptos;
      if (!wallet) throw new Error('Wallet not found');

      const tx = await wallet.signAndSubmitTransaction({
        type: "entry_function_payload",
        function: payload.function,
        type_arguments: payload.type_args || [],
        arguments: payload.args
      });

      toast.success(`Submit milestone thành công! TX: ${tx?.hash || 'N/A'}`);
      setEvidenceCids(prev => {
        const updated = { ...prev };
        delete updated[milestoneId];
        return updated;
      });
      setTimeout(() => {
        if (onUpdate) onUpdate();
      }, 2000);
    } catch (err: any) {
      console.error('[MilestonesList] Submit error:', err);
      toast.error(`Lỗi: ${err?.message || 'Unknown error'}`);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleConfirmMilestone = async (milestoneId: number) => {
    if (!account || !isPoster) return;

    try {
      setConfirmingId(milestoneId);

      const res = await fetch('/api/job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_milestone',
          job_id: jobId,
          milestone_id: milestoneId
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

      toast.success(`Confirm milestone thành công! TX: ${tx?.hash || 'N/A'}`);
      setTimeout(() => {
        if (onUpdate) onUpdate();
      }, 2000);
    } catch (err: any) {
      console.error('[MilestonesList] Confirm error:', err);
      toast.error(`Lỗi: ${err?.message || 'Unknown error'}`);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleClaimTimeout = async (milestoneId: number) => {
    if (!account || !isPoster) return;

    toast.warning('Bạn có chắc muốn claim timeout? Freelancer sẽ mất stake và job sẽ mở lại cho người khác apply.', {
      action: {
        label: 'Xác nhận',
        onClick: async () => {
          try {
            setClaimingId(milestoneId);

            const res = await fetch('/api/job', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'claim_timeout',
                job_id: jobId,
                milestone_id: milestoneId
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

            toast.success(`Claim timeout thành công! TX: ${tx?.hash || 'N/A'}`);
            setTimeout(() => {
              if (onUpdate) onUpdate();
            }, 2000);
          } catch (err: any) {
            console.error('[MilestonesList] Claim timeout error:', err);
            toast.error(`Lỗi: ${err?.message || 'Unknown error'}`);
          } finally {
            setClaimingId(null);
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

  const handleRejectMilestone = async (milestoneId: number) => {
    if (!account || !isPoster) return;

    toast.warning('Bạn có chắc muốn reject milestone này? Việc này sẽ mở dispute.', {
      action: {
        label: 'Xác nhận',
        onClick: async () => {
          try {
            setRejectingId(milestoneId);

            const res = await fetch('/api/job', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'reject_milestone',
                job_id: jobId,
                milestone_id: milestoneId
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

            toast.success(`Reject milestone thành công! TX: ${tx?.hash || 'N/A'}`);
            setTimeout(() => {
              if (onUpdate) onUpdate();
            }, 2000);
          } catch (err: any) {
            console.error('[MilestonesList] Reject error:', err);
            toast.error(`Lỗi: ${err?.message || 'Unknown error'}`);
          } finally {
            setRejectingId(null);
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

  const handleMutualCancel = async () => {
    if (!account || !isPoster || !freelancer) return;

    toast.warning('Bạn có chắc muốn đồng thuận hủy job? Poster sẽ nhận escrow, cả 2 stake sẽ về freelancer.', {
      action: {
        label: 'Xác nhận',
        onClick: async () => {
          try {
            setCancelling(true);

            const res = await fetch('/api/job', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'mutual_cancel',
                job_id: jobId
              })
            });

            const payload = await res.json();
            if (payload.error) throw new Error(payload.error);

            const wallet = (window as any).aptos;
            if (!wallet) throw new Error('Wallet not found');

            toast.info('Freelancer cũng cần ký transaction này. Vui lòng thông báo cho freelancer.', {
              duration: 5000
            });

            const tx = await wallet.signAndSubmitTransaction({
              type: "entry_function_payload",
              function: payload.function,
              type_arguments: payload.type_args || [],
              arguments: payload.args
            });

            toast.success(`Mutual cancel transaction đã được gửi! TX: ${tx?.hash || 'N/A'}`);
            setTimeout(() => {
              if (onUpdate) onUpdate();
            }, 2000);
          } catch (err: any) {
            console.error('[MilestonesList] Mutual cancel error:', err);
            toast.error(`Lỗi: ${err?.message || 'Unknown error'}`);
          } finally {
            setCancelling(false);
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

  const handleFreelancerWithdraw = async () => {
    if (!account || !isFreelancer) return;

    toast.warning('Bạn có chắc muốn rút? Bạn sẽ mất stake (1 APT) và job sẽ mở lại cho freelancer khác.', {
      action: {
        label: 'Xác nhận',
        onClick: async () => {
          try {
            setWithdrawing(true);

            const res = await fetch('/api/job', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'freelancer_withdraw',
                job_id: jobId
              })
            });

            const payload = await res.json();
            if (payload.error) throw new Error(payload.error);

            const wallet = (window as any).aptos;
            if (!wallet) throw new Error('Wallet not found');

            toast.info('Poster cũng cần ký transaction này. Vui lòng thông báo cho poster.', {
              duration: 5000
            });

            const tx = await wallet.signAndSubmitTransaction({
              type: "entry_function_payload",
              function: payload.function,
              type_arguments: payload.type_args || [],
              arguments: payload.args
            });

            toast.success(`Freelancer withdraw transaction đã được gửi! TX: ${tx?.hash || 'N/A'}`);
            setTimeout(() => {
              if (onUpdate) onUpdate();
            }, 2000);
          } catch (err: any) {
            console.error('[MilestonesList] Freelancer withdraw error:', err);
            toast.error(`Lỗi: ${err?.message || 'Unknown error'}`);
          } finally {
            setWithdrawing(false);
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

  if (!milestones || milestones.length === 0) {
    return null;
  }

  return (
    <Card variant="outlined" className="p-4 mt-4">
      <h4 className="text-md font-bold text-blue-800 mb-3">Milestones ({milestones.length})</h4>
      <div className="space-y-3">
        {milestones.map((milestone, index) => {
          const statusStr = parseStatus(milestone.status);
          const evidence = parseEvidenceCid(milestone.evidence_cid);
          const isPending = statusStr === 'Pending';
          const isSubmitted = statusStr === 'Submitted';
          const isAccepted = statusStr === 'Accepted';
          const isLocked = statusStr === 'Locked';
          const deadline = Number(milestone.deadline);
          const deadlineDate = deadline ? new Date(deadline * 1000) : null;
          const isOverdue = Boolean(deadlineDate && deadlineDate.getTime() < Date.now() && !isAccepted);
          
          // Check if previous milestone is accepted (unlock check)
          const isFirstMilestone = index === 0;
          const prevMilestone = index > 0 ? milestones[index - 1] : null;
          const prevStatusStr = prevMilestone ? parseStatus(prevMilestone.status) : null;
          const isPrevAccepted = prevStatusStr === 'Accepted';
          // Can submit only if: milestone is unlocked AND not overdue
          const canSubmit = (isFirstMilestone || isPrevAccepted) && !isOverdue;

          return (
            <div
              key={index}
              className={`border-2 rounded p-3 ${
                isAccepted ? 'bg-green-50 border-green-300' :
                isLocked ? 'bg-red-50 border-red-300' :
                isSubmitted ? 'bg-blue-50 border-blue-300' :
                isOverdue ? 'bg-yellow-50 border-yellow-300' :
                'bg-gray-50 border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <h5 className="font-bold text-blue-800 text-sm">Milestone #{index + 1}</h5>
                  <p className="text-xs text-gray-700">
                    Amount: <span className="font-bold">{(Number(milestone.amount) / 100_000_000).toFixed(2)} APT</span>
                  </p>
                  {deadlineDate && (
                    <p className={`text-xs ${isOverdue && !isAccepted ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                      Deadline: {deadlineDate.toLocaleString('vi-VN')}
                      {isOverdue && !isAccepted && ' (Quá hạn)'}
                    </p>
                  )}
                </div>
                <span className={`px-2 py-1 text-xs font-bold border-2 rounded ${
                  isAccepted ? 'bg-green-100 text-green-800 border-green-300' :
                  isLocked ? 'bg-red-100 text-red-800 border-red-300' :
                  isSubmitted ? 'bg-blue-100 text-blue-800 border-blue-300' :
                  isPending ? 'bg-gray-100 text-gray-800 border-gray-300' :
                  'bg-yellow-100 text-yellow-800 border-yellow-300'
                }`}>
                  {statusStr}
                </span>
              </div>

              {evidence && (
                <div className="mb-2 p-2 bg-white rounded border border-gray-300">
                  <p className="text-xs text-gray-600 mb-1">Evidence CID:</p>
                  <p className="text-xs font-mono break-all">{evidence}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {isFreelancer && isPending && canInteract && (
                  <>
                    {isOverdue && (
                      <p className="text-xs text-red-600 font-bold">
                        Milestone đã quá hạn, không thể submit
                      </p>
                    )}
                    {!canSubmit && !isOverdue && !isFirstMilestone && (
                      <p className="text-xs text-red-600 font-bold">
                        ⚠ Milestone trước phải được accepted trước khi submit milestone này
                      </p>
                    )}
                    {canSubmit && !isOverdue && (
                      <>
                        <label className="flex-1 min-w-[150px]">
                          <input
                            type="file"
                            accept="*/*"
                            title="Chọn file evidence để upload"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              handleFileChange(Number(milestone.id), file);
                            }}
                            disabled={Boolean(uploadingFiles[Number(milestone.id)]) || submittingId === Number(milestone.id) || isOverdue}
                            className="w-full px-2 py-1 border border-gray-400 text-xs rounded text-gray-700 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </label>
                        {uploadingFiles[Number(milestone.id)] && (
                          <span className="text-xs text-blue-600">Đang upload...</span>
                        )}
                        {selectedFiles[Number(milestone.id)] && (
                          <span className="text-xs text-green-600">
                            ✓ {selectedFiles[Number(milestone.id)]?.name}
                          </span>
                        )}
                        {evidenceCids[Number(milestone.id)] && (
                          <span className="text-xs text-green-600">✓ CID ready</span>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleSubmitMilestone(Number(milestone.id))}
                          disabled={
                            submittingId === Number(milestone.id) || 
                            Boolean(uploadingFiles[Number(milestone.id)]) ||
                            !evidenceCids[Number(milestone.id)]?.trim() ||
                            isOverdue
                          }
                          className="bg-blue-800 text-black hover:bg-blue-900 text-xs px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submittingId === Number(milestone.id) ? 'Đang submit...' : 'Submit'}
                        </Button>
                      </>
                    )}
                  </>
                )}

                {isPoster && isOverdue && isPending && canInteract && !isCancelled && (
                  <Button
                    size="sm"
                    onClick={() => handleClaimTimeout(Number(milestone.id))}
                    disabled={claimingId === Number(milestone.id) || isCancelled}
                    className="bg-orange-600 text-black hover:bg-orange-700 text-xs px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {claimingId === Number(milestone.id) ? 'Đang claim...' : 'Claim Timeout (Nhận stake freelancer)'}
                  </Button>
                )}
                {isPoster && isCancelled && (
                  <span className="text-xs text-orange-700 font-bold">✓ Đã claim timeout, job đã bị hủy</span>
                )}

                {isPoster && isSubmitted && canInteract && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleConfirmMilestone(Number(milestone.id))}
                      disabled={confirmingId === Number(milestone.id)}
                      className="bg-green-600 text-black hover:bg-green-700 text-xs px-3 py-1"
                    >
                      {confirmingId === Number(milestone.id) ? 'Đang confirm...' : 'Confirm'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectMilestone(Number(milestone.id))}
                      disabled={rejectingId === Number(milestone.id)}
                      className="bg-red-100 text-red-800 border-red-300 hover:bg-red-200 text-xs px-3 py-1"
                    >
                      {rejectingId === Number(milestone.id) ? 'Đang reject...' : 'Reject'}
                    </Button>
                  </>
                )}

                {isAccepted && (
                  <span className="text-xs text-green-700 font-bold">✓ Đã hoàn thành và thanh toán</span>
                )}

                {isLocked && (
                  <span className="text-xs text-red-700 font-bold">⚠ Đã bị lock (dispute)</span>
                )}
              </div>
            </div>
          );
        })}
        
        {/* TH3: Cancel Job Actions */}
        {canInteract && !isCancelled && freelancer && (
          <div className="mt-4 p-3 border-2 border-orange-300 bg-orange-50 rounded">
            <h5 className="text-sm font-bold text-orange-800 mb-2">Dừng dự án</h5>
            <div className="flex gap-2 flex-wrap">
              {isPoster && (
                <Button
                  size="sm"
                  onClick={() => handleMutualCancel()}
                  disabled={cancelling}
                  className="bg-blue-600 text-black  hover:bg-blue-700 text-xs px-3 py-1"
                >
                  {cancelling ? 'Đang xử lý...' : 'Đồng thuận hủy (Mutual Cancel)'}
                </Button>
              )}
              {isFreelancer && (
                <Button
                  size="sm"
                  onClick={() => handleFreelancerWithdraw()}
                  disabled={withdrawing}
                  className="bg-red-600 text-black hover:text-white hover:bg-red-700 text-xs px-3 py-1"
                >
                  {withdrawing ? 'Đang xử lý...' : 'Xin rút (Mất stake)'}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

