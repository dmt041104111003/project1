"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { copyAddress, formatAddress } from '@/utils/addressUtils';
import { toast } from 'sonner';

export const ReputationContent: React.FC = () => {
  const { account } = useWallet();
  
  const [checkAddress, setCheckAddress] = useState('');
  const [checkedAddress, setCheckedAddress] = useState<string | null>(null);
  const [checkedUT, setCheckedUT] = useState<number | null>(null);
  const [proofData, setProofData] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ isValid: boolean; message?: string } | null>(null);

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
      const [reputationRes, proofRes] = await Promise.all([
        fetch(`/api/reputation?address=${encodeURIComponent(address)}`),
        fetch(`/api/proof?address=${encodeURIComponent(address)}`)
      ]);

      if (reputationRes.ok) {
        const repData = await reputationRes.json();
        if (repData.success) {
          setCheckedUT(repData.ut || 0);
        }
      }

      if (proofRes.ok) {
        const proofDataRes = await proofRes.json();
        if (proofDataRes.success && proofDataRes.proof) {
          setProofData(proofDataRes.proof);
          await verifyProof(proofDataRes.proof.proof, proofDataRes.proof.public_signals);
        } else {
          setProofData(null);
          setVerifyResult(null);
        }
      } else {
        setProofData(null);
        setVerifyResult(null);
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
    toast.success('Đã copy vào clipboard');
  };

  const verifyProof = async (proof: any, publicSignals: any) => {
    if (!proof || !publicSignals) {
      setVerifyResult(null);
      return;
    }

    setVerifying(true);
    try {
      const verifyRes = await fetch('/api/zk/verify-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proof, public_signals: publicSignals })
      });

      const verifyData = await verifyRes.json();
      
      if (verifyRes.ok && verifyData.success) {
        setVerifyResult({
          isValid: verifyData.isValid === true,
          message: verifyData.message || (verifyData.isValid ? 'Proof hợp lệ' : 'Proof không hợp lệ')
        });
      } else {
        setVerifyResult({
          isValid: false,
          message: verifyData.error || 'Lỗi khi verify proof'
        });
      }
    } catch (e: any) {
      setVerifyResult({
        isValid: false,
        message: e?.message || 'Lỗi khi verify proof'
      });
    } finally {
      setVerifying(false);
    }
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
                  
                  {/* Kết quả verify */}
                  {verifying ? (
                    <div className="p-3 bg-blue-50 rounded-md">
                      <div className="text-sm text-blue-700">Đang verify proof...</div>
                    </div>
                  ) : verifyResult ? (
                    <div className={`p-3 rounded-md ${verifyResult.isValid ? 'bg-green-50 border border-green-300' : 'bg-red-50 border border-red-300'}`}>
                      <div className={`text-sm font-bold ${verifyResult.isValid ? 'text-green-700' : 'text-red-700'}`}>
                        {verifyResult.isValid ? 'Proof hợp lệ' : 'Proof không hợp lệ'}
                      </div>
                      {verifyResult.message && (
                        <div className={`text-xs mt-1 ${verifyResult.isValid ? 'text-green-600' : 'text-red-600'}`}>
                          {verifyResult.message}
                        </div>
                      )}
                    </div>
                  ) : null}

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
