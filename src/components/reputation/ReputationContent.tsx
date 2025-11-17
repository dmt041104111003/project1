"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { copyAddress, formatAddress } from '@/utils/addressUtils';

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
    
    try {
      const reputationRes = await fetch(
        `/api/reputation?address=${encodeURIComponent(address)}&profile=true`
      );

      if (reputationRes.ok) {
        const repData = await reputationRes.json();
        if (repData.success) {
          setCheckedUT(repData.ut || 0);
          setProfiles(repData.profiles || null);
        }
      }

      setCheckedAddress(address);
    } catch (e: any) {
      setError(e?.message || 'Không thể kiểm tra thông tin');
      setCheckedAddress(null);
      setCheckedUT(null);
      setProfiles(null);
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
              <div className="p-4 bg-gray-50 rounded-md">
                <div className="text-sm text-gray-600 mb-1">Địa chỉ:</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-gray-800 break-all">
                    {formatAddress(checkedAddress)}
                  </span>
                  <button
                    onClick={() => copyAddress(checkedAddress)}
                    className="text-xs text-blue-600 underline"
                  >
                    Copy
                  </button>
                </div>
              </div>

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
                        {meta.cid && (
                          <div className="text-xs text-gray-600">
                            CID: <span className="font-mono">{meta.cid}</span>
                          </div>
                        )}
                        {meta.url && (
                          <a
                            href={meta.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-600 underline"
                          >
                            Mở trực tiếp trên IPFS
                          </a>
                        )}
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
                                !['about', 'type', 'version', 'created_at'].includes(key)
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
                                !['about', 'type', 'version', 'created_at'].includes(key)
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
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
