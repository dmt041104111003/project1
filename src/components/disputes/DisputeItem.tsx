"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DisputeItemProps } from '@/constants/escrow';
import { useWallet } from '@/contexts/WalletContext';

const REVIEWER_VOTE_DELAY = 180;

export const DisputeItem: React.FC<DisputeItemProps> = ({ dispute, resolvingKey, onResolvePoster, onResolveFreelancer }) => {
  const { account } = useWallet();
  const key = `${dispute.jobId}:${dispute.milestoneIndex}`;
  const [posterEvidenceUrl, setPosterEvidenceUrl] = useState<string | null>(null);
  const [freelancerEvidenceUrl, setFreelancerEvidenceUrl] = useState<string | null>(null);
  const [loadingPoster, setLoadingPoster] = useState(false);
  const [loadingFreelancer, setLoadingFreelancer] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [canVote, setCanVote] = useState(false);
  
  console.log('[DisputeItem] Dispute:', dispute);
  console.log('[DisputeItem] Poster Evidence CID:', dispute.posterEvidenceCid);
  console.log('[DisputeItem] Freelancer Evidence CID:', dispute.freelancerEvidenceCid);
  console.log('[DisputeItem] Account:', account);
  useEffect(() => {
    const decodeCid = async (
      encCid: string,
      side: 'poster' | 'freelancer',
      setUrl: (url: string | null) => void,
      setLoading: (loading: boolean) => void
    ) => {
      if (!encCid) {
        setUrl(null);
        return;
      }

      if (!encCid.startsWith('enc:')) {
        setUrl(`https://ipfs.io/ipfs/${encCid}`);
        return;
      }

      try {
        setLoading(true);
        if (!account) {
          console.log(`[DisputeItem] No account, cannot decode CID for ${side}`);
          setUrl(null);
          return;
        }
        const params = new URLSearchParams({
          disputeId: String(dispute.disputeId),
          role: 'reviewer',
          side,
          decodeOnly: 'true',
          address: account,
        });
        console.log(`[DisputeItem] Decoding CID for ${side}, disputeId: ${dispute.disputeId}, CID: ${encCid}`);
        const res = await fetch(`/api/ipfs/dispute?${params.toString()}`);
        console.log(`[DisputeItem] API response for ${side}:`, res.status, res.statusText);
        if (res.ok) {
          const data = await res.json();
          console.log(`[DisputeItem] API data for ${side}:`, data);
          if (data.success && data.url) {
            setUrl(data.url);
            console.log(`[DisputeItem] Successfully decoded CID for ${side}:`, data.url);
          } else {
            console.log(`[DisputeItem] Failed to decode CID for ${side}:`, data);
            setUrl(null);
          }
        } else {
          const errorText = await res.text();
          console.log(`[DisputeItem] API error for ${side}:`, res.status, errorText);
          setUrl(null);
        }
      } catch (error) {
        console.error(`[DisputeItem] Exception decoding CID for ${side}:`, error);
        setUrl(null);
      } finally {
        setLoading(false);
      }
    };

    if (dispute.posterEvidenceCid) {
      decodeCid(dispute.posterEvidenceCid, 'poster', setPosterEvidenceUrl, setLoadingPoster);
    }
    if (dispute.freelancerEvidenceCid) {
      decodeCid(dispute.freelancerEvidenceCid, 'freelancer', setFreelancerEvidenceUrl, setLoadingFreelancer);
    }
  }, [dispute.posterEvidenceCid, dispute.freelancerEvidenceCid, dispute.disputeId, account]);

  useEffect(() => {
    if (!dispute.createdAt || dispute.status === 'resolved') {
      setCanVote(true);
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const elapsed = now - dispute.createdAt!;
      const remaining = REVIEWER_VOTE_DELAY - elapsed;
      
      if (remaining <= 0) {
        setCanVote(true);
        setTimeRemaining(0);
      } else {
        setCanVote(false);
        setTimeRemaining(remaining);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [dispute.createdAt, dispute.status]);

  return (
    <Card variant="outlined" className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-blue-800 font-bold">Công việc #{dispute.jobId} — Cột mốc {dispute.milestoneIndex}</div>
        <div className="text-xs text-gray-600">{dispute.openedAt || ''}</div>
      </div>
      <div className="text-sm text-gray-700 mb-2">
        Trạng thái: {dispute.status === 'resolved' ? (
          <span className="text-green-700 font-bold">
            Đã giải quyết
            {dispute.disputeWinner !== null && dispute.disputeWinner !== undefined && (
              <span className="ml-2 text-xs">
                ({dispute.disputeWinner ? 'Người làm tự do thắng' : 'Người thuê thắng'})
              </span>
            )}
          </span>
        ) : (
          dispute.status
        )}
      </div>
      {dispute.reason && <div className="text-sm text-gray-700 mb-3">Lý do: {dispute.reason}</div>}
      <div className="mb-3 text-xs text-gray-700">
        <div className="font-bold mb-2">Minh chứng:</div>
        {dispute.posterEvidenceCid ? (
          <div className="mb-2">
            <span className="font-semibold">Người thuê:</span>{' '}
            {loadingPoster ? (
              <span className="text-gray-500">Đang giải mã...</span>
            ) : posterEvidenceUrl ? (
              <a 
                className="text-blue-700 underline break-all hover:text-blue-900" 
                href={posterEvidenceUrl} 
                target="_blank" 
                rel="noreferrer"
              >
                Xem bằng chứng
              </a>
            ) : (
              <span className="text-red-500">Không thể giải mã CID: {dispute.posterEvidenceCid}</span>
            )}
          </div>
        ) : (
          <div className="mb-2 text-gray-500">Người thuê: Chưa có minh chứng</div>
        )}
        {dispute.freelancerEvidenceCid ? (
          <div>
            <span className="font-semibold">Người làm tự do:</span>{' '}
            {loadingFreelancer ? (
              <span className="text-gray-500">Đang giải mã...</span>
            ) : freelancerEvidenceUrl ? (
              <a 
                className="text-blue-700 underline break-all hover:text-blue-900" 
                href={freelancerEvidenceUrl} 
                target="_blank" 
                rel="noreferrer"
              >
                Xem bằng chứng
              </a>
            ) : (
              <span className="text-red-500">Không thể giải mã CID: {dispute.freelancerEvidenceCid}</span>
            )}
          </div>
        ) : (
          <div className="text-gray-500">Người làm tự do: Chưa có minh chứng</div>
        )}
      </div>
      {dispute.status === 'resolved' ? (
        <div className="text-sm text-green-700 font-bold">
          ✓ Tranh chấp đã được giải quyết. Bên thắng có thể yêu cầu thanh toán/hoàn tiền.
        </div>
      ) : (
      <div className="space-y-2">
        {!canVote && timeRemaining !== null && timeRemaining > 0 && (
          <div className="text-sm text-orange-600 font-semibold bg-orange-50 border border-orange-200 rounded p-2">
            Vui lòng đợi {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')} để bên còn lại có thời gian gửi minh chứng trước khi bỏ phiếu
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="!bg-white !text-black !border-2 !border-black"
            size="sm"
            disabled={!canVote || dispute.votesCompleted || dispute.hasVoted || resolvingKey === `${dispute.disputeId}:poster`}
            onClick={onResolvePoster}
          >
            {resolvingKey === `${dispute.disputeId}:poster` ? 'Đang bỏ phiếu...' : 'Bỏ phiếu cho Người thuê'}
          </Button>
          <Button
            variant="outline"
            className="!bg-white !text-black !border-2 !border-black"
            size="sm"
            disabled={!canVote || dispute.votesCompleted || dispute.hasVoted || resolvingKey === `${dispute.disputeId}:freelancer`}
            onClick={onResolveFreelancer}
          >
            {resolvingKey === `${dispute.disputeId}:freelancer` ? 'Đang bỏ phiếu...' : 'Bỏ phiếu cho Người làm tự do'}
          </Button>
          {dispute.votesCompleted ? (
            <span className="text-xs text-gray-600">Bỏ phiếu đã đóng</span>
          ) : dispute.hasVoted ? (
            <span className="text-xs text-gray-600">Bạn đã bỏ phiếu</span>
          ) : null}
        </div>
      </div>
      )}
    </Card>
  );
};


