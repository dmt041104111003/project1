"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DisputeItemProps } from '@/constants/escrow';

export const DisputeItem: React.FC<DisputeItemProps> = ({ dispute, resolvingKey, onResolvePoster, onResolveFreelancer }) => {
  const key = `${dispute.jobId}:${dispute.milestoneIndex}`;
  const [posterEvidenceUrl, setPosterEvidenceUrl] = useState<string | null>(null);
  const [freelancerEvidenceUrl, setFreelancerEvidenceUrl] = useState<string | null>(null);
  const [loadingPoster, setLoadingPoster] = useState(false);
  const [loadingFreelancer, setLoadingFreelancer] = useState(false);
  useEffect(() => {
    const decodeCid = async (
      encCid: string,
      setUrl: (url: string | null) => void,
      setLoading: (loading: boolean) => void
    ) => {
      if (!encCid || !encCid.startsWith('enc:')) {
        setUrl(encCid ? `https://ipfs.io/ipfs/${encCid}` : null);
        return;
      }
      try {
        setLoading(true);
        const { fetchWithAuth } = await import('@/utils/api');
        const res = await fetchWithAuth(`/api/ipfs/get?cid=${encodeURIComponent(encCid)}&decodeOnly=true`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.url) {
            setUrl(data.url);
          } else {
            setUrl(null);
          }
        } else {
          setUrl(null);
        }
      } catch (err) {
        setUrl(null);
      } finally {
        setLoading(false);
      }
    };

    if (dispute.posterEvidenceCid) {
      decodeCid(dispute.posterEvidenceCid, setPosterEvidenceUrl, setLoadingPoster);
    }
    if (dispute.freelancerEvidenceCid) {
      decodeCid(dispute.freelancerEvidenceCid, setFreelancerEvidenceUrl, setLoadingFreelancer);
    }
  }, [dispute.posterEvidenceCid, dispute.freelancerEvidenceCid]);

  return (
    <Card variant="outlined" className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-blue-800 font-bold">Job #{dispute.jobId} — Cột mốc {dispute.milestoneIndex}</div>
        <div className="text-xs text-gray-600">{dispute.openedAt || ''}</div>
      </div>
      <div className="text-sm text-gray-700 mb-2">
        Trạng thái: {dispute.status === 'resolved' ? (
          <span className="text-green-700 font-bold">
            Đã giải quyết
            {dispute.disputeWinner !== null && dispute.disputeWinner !== undefined && (
              <span className="ml-2 text-xs">
                ({dispute.disputeWinner ? 'Freelancer thắng' : 'Poster thắng'})
              </span>
            )}
          </span>
        ) : (
          dispute.status
        )}
      </div>
      {dispute.reason && <div className="text-sm text-gray-700 mb-3">Lý do: {dispute.reason}</div>}
      {(dispute.posterEvidenceCid || dispute.freelancerEvidenceCid) && (
        <div className="mb-3 text-xs text-gray-700">
          {dispute.posterEvidenceCid && (
            <div className="mb-2">
              Bằng chứng của Poster:{' '}
              {loadingPoster ? (
                <span className="text-gray-500">Đang tải...</span>
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
                <span className="text-red-500">Không thể giải mã CID</span>
              )}
            </div>
          )}
          {dispute.freelancerEvidenceCid && (
            <div>
              Bằng chứng của Freelancer:{' '}
              {loadingFreelancer ? (
                <span className="text-gray-500">Đang tải...</span>
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
                <span className="text-red-500">Không thể giải mã CID</span>
              )}
            </div>
          )}
        </div>
      )}
      {dispute.status === 'resolved' ? (
        <div className="text-sm text-green-700 font-bold">
          ✓ Dispute đã được giải quyết. Bên thắng có thể claim payment/refund.
        </div>
      ) : (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="!bg-white !text-black !border-2 !border-black"
          size="sm"
          disabled={dispute.votesCompleted || dispute.hasVoted || resolvingKey === `${dispute.disputeId}:poster`}
          onClick={onResolvePoster}
        >
          {resolvingKey === `${dispute.disputeId}:poster` ? 'Đang bỏ phiếu...' : 'Bỏ phiếu cho Poster'}
        </Button>
        <Button
          variant="outline"
          className="!bg-white !text-black !border-2 !border-black"
          size="sm"
          disabled={dispute.votesCompleted || dispute.hasVoted || resolvingKey === `${dispute.disputeId}:freelancer`}
          onClick={onResolveFreelancer}
        >
          {resolvingKey === `${dispute.disputeId}:freelancer` ? 'Đang bỏ phiếu...' : 'Bỏ phiếu cho Freelancer'}
        </Button>
        {dispute.votesCompleted ? (
          <span className="text-xs text-gray-600">Bỏ phiếu đã đóng</span>
        ) : dispute.hasVoted ? (
          <span className="text-xs text-gray-600">Bạn đã bỏ phiếu</span>
        ) : null}
      </div>
      )}
    </Card>
  );
};


