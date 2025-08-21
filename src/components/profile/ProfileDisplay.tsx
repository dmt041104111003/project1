'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Shield, Clock, Hash } from 'lucide-react';
import { getProfileData } from '@/utils/blockchainService';
import { verifyDataIntegrity } from '@/utils/hashUtils';
import { toast } from 'sonner';
import { ProfileDisplayProps, ProfileData } from '@/constants/profile';

export default function ProfileDisplay({ userAddress }: ProfileDisplayProps) {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await getProfileData(userAddress);
        if (data) {
          setProfileData(data);
        } else {
          setError('Không tìm thấy profile');
        }
      } catch (err) {
        setError('Lỗi khi tải profile');
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userAddress) {
      fetchProfile();
    }
  }, [userAddress]);

  if (loading) {
    return (
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Đang tải profile...</span>
          </div>
        </div>
      </Card>
    );
  }

  if (error || !profileData) {
    return (
      <Card>
        <div className="p-6">
          <div className="text-center text-red-600">
            <XCircle className="h-8 w-8 mx-auto mb-2" />
            <p>{error || 'Không tìm thấy profile'}</p>
          </div>
        </div>
      </Card>
    );
  }

  const similarityPercentage = ((1 - profileData.distance / 1e6) * 100).toFixed(1);

  return (
    <Card>
      <div className="p-6 space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600">DID</label>
            <p 
              className="text-sm font-mono bg-gray-100 p-2 rounded cursor-pointer hover:bg-gray-200 transition-colors break-all"
              onClick={() => {
                navigator.clipboard.writeText(profileData.did);
                toast.success('DID đã được copy!');
              }}
              title="Click để copy DID"
            >
              {profileData.did}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Trust Score</label>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{profileData.trust_score}</Badge>
              <span className="text-xs text-gray-500">/ 100</span>
            </div>
          </div>
        </div>

        {/* Verification Status */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Trạng thái xác minh</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              {profileData.face_verified ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm">Face Verification</span>
            </div>
            <div className="flex items-center gap-2">
              {profileData.is_real ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm">Liveness Check</span>
            </div>
          </div>
        </div>

        {/* Verification Details */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Chi tiết xác minh</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-gray-600">Độ tương đồng khuôn mặt</label>
              <p className="font-medium">{similarityPercentage}%</p>
            </div>
            <div>
              <label className="text-gray-600">Thời gian xử lý</label>
              <p className="font-medium">{profileData.processing_time}ms</p>
            </div>
            <div>
              <label className="text-gray-600">Thông báo</label>
              <p className="font-medium">{profileData.verify_message}</p>
            </div>
            <div>
              <label className="text-gray-600">Ngày tạo</label>
              <p className="font-medium">
                {new Date(parseInt(profileData.created_at) * 1000).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>
        </div>

        {/* Security Data */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Kết quả mã hóa (Bảo mật)
          </h4>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Bảo mật dữ liệu</span>
            </div>
            <p className="text-xs text-blue-700">
              CCCD được mã hóa SHA256, Name và Verification Message lưu dạng plain text
            </p>
          </div>

          <div className="space-y-4">
            {/* CCCD Hash */}
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">CCCD Hash</label>
                <Badge variant="secondary" className="text-xs">SHA256</Badge>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded p-2">
                <p 
                  className="font-mono text-xs break-all text-gray-800 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(profileData.cccd_hash);
                    toast.success('CCCD Hash đã được copy!');
                  }}
                  title="Click để copy CCCD Hash"
                >
                  {profileData.cccd_hash}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Hash của số CCCD thật (không thể đọc ngược)
              </p>
            </div>

            {/* Name */}
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Name</label>
                <Badge variant="secondary" className="text-xs">Plain Text</Badge>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded p-2">
                <p 
                  className="text-sm text-gray-800 cursor-pointer hover:bg-gray-100 transition-colors p-1 rounded"
                  onClick={() => {
                    navigator.clipboard.writeText(profileData.name_hash);
                    toast.success('Name đã được copy!');
                  }}
                  title="Click để copy Name"
                >
                  {profileData.name_hash}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Tên thật (có thể đọc được)
              </p>
            </div>

            {/* Verification Message */}
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Verification Message</label>
                <Badge variant="secondary" className="text-xs">Plain Text</Badge>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded p-2">
                <p 
                  className="text-sm text-gray-800 cursor-pointer hover:bg-gray-100 transition-colors p-1 rounded"
                  onClick={() => {
                    navigator.clipboard.writeText(profileData.verification_hash);
                    toast.success('Verification Message đã được copy!');
                  }}
                  title="Click để copy Verification Message"
                >
                  {profileData.verification_hash}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Thông báo xác minh (có thể đọc được)
              </p>
            </div>
          </div>
        </div>

        {/* IPFS Link */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Documents</h4>
          <div>
            <label className="text-gray-600 text-sm">IPFS CID</label>
            <p 
              className="font-mono bg-gray-100 p-2 rounded text-sm break-all cursor-pointer hover:bg-gray-200 transition-colors"
              onClick={() => {
                navigator.clipboard.writeText(profileData.cid);
                toast.success('IPFS CID đã được copy!');
              }}
              title="Click để copy IPFS CID"
            >
              {profileData.cid}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
