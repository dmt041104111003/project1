"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { copyAddress, formatAddress } from '@/utils/addressUtils';

export const ReputationContent: React.FC = () => {
  const { account } = useWallet();
  
  const [checkAddress, setCheckAddress] = useState('');
  const [checkedAddress, setCheckedAddress] = useState<string | null>(null);
  const [checkedUT, setCheckedUT] = useState<number | null>(null);
  const [proofData, setProofData] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const handleCheck = async () => {
    const address = checkAddress.trim() || account;
    if (!address) {
      setError('Vui lòng nhập địa chỉ hoặc kết nối ví');
      return;
    }
    
    setChecking(true);
    setError('');
    setCheckedAddress(null);
    setCheckedUT(null);
    setProofData(null);
    
    try {
      // Query cả reputation và proof cùng lúc
      const [reputationRes, proofRes] = await Promise.all([
        fetch(`/api/reputation?address=${encodeURIComponent(address)}`),
        fetch(`/api/proof?address=${encodeURIComponent(address)}`)
      ]);

      // Xử lý reputation
      if (reputationRes.ok) {
        const repData = await reputationRes.json();
        if (repData.success) {
          setCheckedUT(repData.ut || 0);
        }
      }

      // Xử lý proof
      if (proofRes.ok) {
        const proofDataRes = await proofRes.json();
        if (proofDataRes.success && proofDataRes.proof) {
          setProofData(proofDataRes.proof);
        }
      }

      setCheckedAddress(address);
    } catch (e: any) {
      setError(e?.message || 'Không thể kiểm tra thông tin');
      setCheckedAddress(null);
      setCheckedUT(null);
      setProofData(null);
    } finally {
      setChecking(false);
    }
  };

  const formatProof = (proof: string): string => {
    if (!proof) return '-';
    if (proof.length <= 20) return proof;
    return formatAddress(proof);
  };

  const handleCopyProof = async (proof: string) => {
    await copyAddress(proof);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-blue-800 mb-2">Điểm Danh Tiếng & Proof</h1>
        <p className="text-lg text-gray-700">Kiểm tra điểm UT và ZK proof cho bất kỳ địa chỉ nào.</p>
      </div>

      <Card variant="outlined" className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Địa chỉ ví {account && <span className="text-gray-500 font-normal">(để trống để kiểm tra địa chỉ của bạn)</span>}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={checkAddress}
                onChange={(e) => setCheckAddress(e.target.value)}
                placeholder={account || "0x..."}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleCheck()}
              />
              <Button onClick={handleCheck} disabled={checking} variant="primary">
                {checking ? 'Đang kiểm tra...' : 'Kiểm tra'}
              </Button>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>

          {checkedAddress && (
            <div className="mt-4 space-y-4">
              {/* Địa chỉ */}
              <div className="p-4 bg-gray-50 rounded-md">
                <div className="text-sm text-gray-600 mb-1">Địa chỉ:</div>
                <div className="text-sm font-mono text-gray-800 break-all">{checkedAddress}</div>
              </div>

              {/* Điểm UT */}
              {checkedUT !== null && (
                <div className="p-4 bg-gray-50 rounded-md">
                  <div className="text-sm text-gray-600 mb-1">Điểm UT:</div>
                  <div className="text-2xl font-bold text-blue-800">{checkedUT}</div>
                </div>
              )}

              {/* Proof */}
              {proofData ? (
                <div className="p-4 bg-gray-50 rounded-md space-y-3">
                  <div className="text-sm font-bold text-gray-700 mb-2">Thông tin Proof:</div>
                  
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Proof (JSON):</div>
                    <div 
                      className="text-sm font-mono text-gray-800 p-2 bg-white rounded border border-gray-200 cursor-pointer hover:bg-gray-100 break-all"
                      onClick={() => handleCopyProof(JSON.stringify(proofData.proof, null, 2))}
                      title="Click để copy toàn bộ proof"
                    >
                      {formatProof(JSON.stringify(proofData.proof, null, 2))}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600 mb-1">Public Signals (JSON):</div>
                    <div 
                      className="text-sm font-mono text-gray-800 p-2 bg-white rounded border border-gray-200 cursor-pointer hover:bg-gray-100 break-all"
                      onClick={() => handleCopyProof(JSON.stringify(proofData.public_signals, null, 2))}
                      title="Click để copy toàn bộ public signals"
                    >
                      {formatProof(JSON.stringify(proofData.public_signals, null, 2))}
                    </div>
                  </div>

                  {proofData.timestamp && (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Timestamp:</div>
                      <div className="text-sm text-gray-800">
                        {(() => {
                          const date = new Date(Number(proofData.timestamp) * 1000);
                          const day = String(date.getDate()).padStart(2, '0');
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const year = date.getFullYear();
                          const hours = String(date.getHours()).padStart(2, '0');
                          const minutes = String(date.getMinutes()).padStart(2, '0');
                          const seconds = String(date.getSeconds()).padStart(2, '0');
                          return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 rounded-md">
                  <div className="text-sm text-yellow-800">Địa chỉ này chưa có proof.</div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
