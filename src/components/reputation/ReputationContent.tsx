"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { copyAddress, copyText, formatAddress } from '@/utils/addressUtils';
import { fetchWithAuth } from '@/utils/api';

type ProfileMeta = {
  cid: string | null;
  url: string | null;
  data: any | null;
};

export const ReputationContent: React.FC = () => {
  const { account } = useWallet();
  
  const [checkAddress, setCheckAddress] = useState('');
  const [checkedAddress, setCheckedAddress] = useState<string | null>(null);
  const [checkedUT, setCheckedUT] = useState<number | null>(null);
  const [profiles, setProfiles] = useState<Record<'freelancer' | 'poster', ProfileMeta | null> | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [proofInfo, setProofInfo] = useState<{ proof: any; public_signals: any; timestamp?: number } | null>(null);
  const [proofMessage, setProofMessage] = useState('');

  const formatProofValue = (value: any): string => {
    if (Array.isArray(value)) {
      return value
        .map((item) =>
          Array.isArray(item)
            ? `[${item.map((sub) => String(sub)).join(', ')}]`
            : String(item)
        )
        .join(', ');
    }
    if (typeof value === 'object' && value !== null) {
      return Object.entries(value)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? formatProofValue(v) : String(v)}`)
        .join(' | ');
    }
    return String(value);
  };

  const handleCopyProofValue = async (label: string, value: any) => {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    await copyText(serialized, `${label} đã được copy`, 'Không thể copy dữ liệu');
  };

  const renderProofEntries = (sectionLabel: string, data: any) => {
    if (!data || typeof data !== 'object') {
      return (
        <p className="text-xs text-gray-500">
          Không tìm thấy dữ liệu {sectionLabel === 'proof' ? 'proof' : 'public signals'}.
        </p>
      );
    }

    return Object.entries(data).map(([key, value]) => {
      const displayValue = formatProofValue(value);
      return (
        <button
          key={`${sectionLabel}-${key}`}
          type="button"
          className="w-full text-left group"
          onClick={() => handleCopyProofValue(`${sectionLabel}.${key}`, value)}
        >
          <div className="border border-gray-200 rounded-md p-3 bg-white transition-colors group-hover:bg-blue-50">
            <div className="text-[11px] uppercase text-gray-500 font-semibold mb-1">{key}</div>
            <div className="text-sm font-mono text-gray-800 break-all">{displayValue}</div>
            <div className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 transition">
              Nhấn để copy
            </div>
          </div>
        </button>
      );
    });
  };

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
    setProfiles(null);
    setProofInfo(null);
    setProofMessage('');
    
    try {
      const reputationRes = await fetch(
        `/api/reputation?address=${encodeURIComponent(address)}`
      );

      if (reputationRes.ok) {
        const repData = await reputationRes.json();
        if (repData.success) {
          setCheckedUT(repData.ut || 0);
        }
      }

      const profileRes = await fetch(
        `/api/profile?address=${encodeURIComponent(address)}`
      );

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData.success) {
          setProfiles(profileData.profiles || null);
        }
      }

      setCheckedAddress(address);

      try {
        const proofRes = await fetchWithAuth(`/api/proof?address=${encodeURIComponent(address)}`);
        if (proofRes.ok) {
          const proofData = await proofRes.json();
          if (proofData?.success && proofData?.proof) {
            setProofInfo(proofData.proof);
            setProofMessage('');
          } else {
            setProofInfo(null);
            setProofMessage(proofData?.message || 'Địa chỉ này chưa lưu proof.');
          }
        } else {
          if (proofRes.status === 401) {
            setProofMessage('Cần đăng nhập để xem proof và public signals.');
          } else {
            const errText = await proofRes.text().catch(() => '');
            setProofMessage(errText || 'Không thể lấy proof từ server.');
          }
          setProofInfo(null);
        }
      } catch (proofErr: any) {
        setProofInfo(null);
        setProofMessage(proofErr?.message || 'Không thể lấy proof.');
      }
    } catch (e: any) {
      setError(e?.message || 'Không thể kiểm tra thông tin');
      setCheckedAddress(null);
      setCheckedUT(null);
      setProfiles(null);
      setProofInfo(null);
      setProofMessage('');
    } finally {
      setChecking(false);
    }
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-blue-800 mb-2">Điểm Danh Tiếng</h1>
        <p className="text-lg text-gray-700">Kiểm tra điểm UT cho bất kỳ địa chỉ nào.</p>
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
              <button
                type="button"
                onClick={() => copyAddress(checkedAddress)}
                className="w-full text-left"
              >
                <div className="p-4 bg-gray-50 rounded-md border border-transparent hover:border-blue-200 transition">
                  <div className="text-sm text-gray-600 mb-1 flex items-center justify-between">
                    <span>Địa chỉ</span>
                    <span className="text-[11px] text-blue-600">Nhấn để copy</span>
                  </div>
                  <div className="text-sm font-mono text-gray-800 break-all">
                    {checkedAddress}
                  </div>
                  <div className="text-xs text-gray-500">
                    ({formatAddress(checkedAddress)})
                  </div>
                </div>
              </button>

              {/* Điểm UT */}
              {checkedUT !== null && (
                <div className="p-4 bg-gray-50 rounded-md">
                  <div className="text-sm text-gray-600 mb-1">Điểm UT:</div>
                  <div className="text-2xl font-bold text-blue-800">{checkedUT}</div>
                </div>
              )}

              {profiles && (
                <div className="p-4 bg-gray-50 rounded-md space-y-4">
                  <div className="text-sm text-gray-600 font-semibold">Metadata hồ sơ công khai</div>
                  {(['freelancer', 'poster'] as const).map((role) => {
                    const meta = profiles?.[role];
                    if (!meta) return null;
                    return (
                      <div key={role} className="space-y-2 border border-gray-200 rounded-md p-3 bg-white">
                        <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                          {role === 'freelancer' ? 'Freelancer' : 'Poster'}
                        </div>
                        {/* Hidden CID and direct IPFS link per request */}
                        {meta.data ? (
                          <>
                            {meta.data.about && (
                              <div>
                                <div className="text-xs text-gray-500">Giới thiệu</div>
                                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                  {String(meta.data.about)}
                                </p>
                              </div>
                            )}
                            {Object.entries(meta.data)
                              .filter(([key]) =>
                                !['about', 'type', 'version', 'created_at', 'skills'].includes(key)
                              )
                              .map(([key, value]) => (
                                <div key={key}>
                                  <div className="text-xs text-gray-500 capitalize">{key}</div>
                                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                    {typeof value === 'object'
                                      ? JSON.stringify(value, null, 2)
                                      : String(value)}
                                  </p>
                                </div>
                              ))}
                            {!meta.data.about &&
                              Object.entries(meta.data).filter(([key]) =>
                                !['about', 'type', 'version', 'created_at', 'skills'].includes(key)
                              ).length === 0 && (
                                <p className="text-sm text-gray-600">
                                  Metadata không có nội dung mô tả chi tiết.
                                </p>
                              )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-500">
                            Không tìm thấy metadata công khai cho role này hoặc người dùng chưa đăng ký profile.
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {!profiles.freelancer && !profiles.poster && (
                    <p className="text-sm text-gray-500">
                      Không có metadata hồ sơ nào cho địa chỉ này.
                    </p>
                  )}
                </div>
              )}

              {(proofInfo || proofMessage) && (
                <div className="p-4 bg-gray-50 rounded-md space-y-3">
                  <div className="text-sm text-gray-600 font-semibold">ZK Proof & Public Signals</div>
                  {proofInfo ? (
                    <div className="space-y-4">
                      {proofInfo.timestamp && (
                        <div className="text-xs text-gray-500">
                          Đã lưu lúc:{' '}
                          <span className="font-mono">
                            {new Date(Number(proofInfo.timestamp) * 1000).toLocaleString('vi-VN')}
                          </span>
                        </div>
                      )}
                      <div className="text-[11px] text-gray-500 italic">
                        Nhấn vào từng dòng để copy giá trị tương ứng.
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs uppercase text-gray-600 font-semibold">Proof</div>
                        <div className="space-y-2">
                          {renderProofEntries('proof', proofInfo.proof)}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs uppercase text-gray-600 font-semibold">Public Signals</div>
                        <div className="space-y-2">
                          {renderProofEntries('public_signals', proofInfo.public_signals)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">{proofMessage}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
