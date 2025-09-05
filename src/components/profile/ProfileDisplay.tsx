'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getProfileData, getDidDetails, getProfileRegisteredEventsForUser } from '@/utils/blockchainService';
import { fetchJsonFromCid } from '@/lib/api/ipfs';
import { toast } from 'sonner';
import { ProfileDisplayProps, ProfileData } from '@/constants/profile';

export default function ProfileDisplay({ userAddress }: ProfileDisplayProps) {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [didDetails, setDidDetails] = useState<{ hasVerified: boolean; didHash: string; controller: string } | null>(null);
  const [latestEventTime, setLatestEventTime] = useState<number | null>(null);
  const [offchain, setOffchain] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const [data, did, events] = await Promise.all([
          getProfileData(userAddress),
          getDidDetails(userAddress),
          getProfileRegisteredEventsForUser(userAddress, 1)
        ]);
        if (data) {
          setProfileData(data);
          const cidSource = data.profile_cid || data.verification_cid;
          if (cidSource) {
            const json = await fetchJsonFromCid<Record<string, unknown>>(cidSource);
            if (json) setOffchain(json);
          }
          setDidDetails(did);
          if (Array.isArray(events) && events.length > 0) {
            const event = events[0] as Record<string, unknown>;
            const data = event?.data as Record<string, unknown>;
            const t = Number(data?.time || 0);
            setLatestEventTime(isNaN(t) ? null : t);
          }
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
          <div className="flex items-center justify-center text-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-border"></div>
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
            <p>{error || 'Không tìm thấy profile'}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6 space-y-4 text-foreground">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">DID Hash</label>
            <p 
              className="text-sm font-mono bg-card text-card-foreground border border-border p-2 rounded cursor-pointer hover:bg-accent/40 transition-colors break-all"
              onClick={() => {
                navigator.clipboard.writeText(profileData.did_hash);
                toast.success('DID hash đã được copy!');
              }}
              title="Click để copy DID Hash"
            >
              {profileData.did_hash}
            </p>
          </div>
          
        </div>

        {offchain && (
          <div className="border-t border-border pt-4">
            <h4 className="font-medium mb-3 text-foreground">Chi tiết off-chain (IPFS)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {'name' in offchain && (
                <div>
                  <label className="text-muted-foreground">Name</label>
                  <p className="font-medium break-words">{String(offchain.name)}</p>
                </div>
              )}
              {'verification_message' in offchain && (
                <div>
                  <label className="text-muted-foreground">Verification Message</label>
                  <p className="font-medium break-words">{String(offchain.verification_message)}</p>
                </div>
              )}
              {'selfie_url' in offchain && (
                <div>
                  <label className="text-muted-foreground">Selfie</label>
                  <img src={offchain.selfie_url as string} alt="selfie" className="rounded border border-border max-h-40 object-cover" />
                </div>
              )}
              {'id_card_front_url' in offchain && (
                <div>
                  <label className="text-muted-foreground">ID Card (Front)</label>
                  <img src={offchain.id_card_front_url as string} alt="id-front" className="rounded border border-border max-h-40 object-cover" />
                </div>
              )}
              {'id_card_back_url' in offchain && (
                <div>
                  <label className="text-muted-foreground">ID Card (Back)</label>
                  <img src={offchain.id_card_back_url as string} alt="id-back" className="rounded border border-border max-h-40 object-cover" />
                </div>
              )}
            </div>
          </div>
        )}
        {didDetails && (
          <div className="border-t border-border pt-4">
            <h4 className="font-medium mb-3 text-foreground">Chi tiết DID on-chain</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">DID Verified:</span>
                <Badge variant={didDetails.hasVerified ? 'default' : 'danger'}>
                  {didDetails.hasVerified ? 'Đã xác minh' : 'Chưa xác minh'}
                </Badge>
              </div>
              <div>
                <label className="text-muted-foreground">Controller</label>
                <p
                  className="font-mono bg-card text-card-foreground border border-border p-2 rounded text-sm break-all cursor-pointer hover:bg-accent/40 transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(didDetails.controller || '');
                    toast.success('Controller address đã được copy!');
                  }}
                  title="Click để copy Controller"
                >
                  {didDetails.controller || '—'}
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="text-muted-foreground">DID Hash (resolver)</label>
                <p
                  className="font-mono bg-card text-card-foreground border border-border p-2 rounded text-sm break-all"
                >
                  {didDetails.didHash}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <h4 className="font-medium mb-3 text-foreground">Thông tin hồ sơ</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-muted-foreground">Ngày tạo</label>
              <p className="font-medium">
                {new Date(Number(profileData.created_at) * 1000).toLocaleDateString('vi-VN')}
              </p>
            </div>
            <div>
              <label className="text-muted-foreground">Verification CID</label>
              <p 
                className="font-mono bg-card text-card-foreground border border-border p-2 rounded text-sm break-all cursor-pointer hover:bg-accent/40 transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(profileData.verification_cid);
                  toast.success('Verification CID đã được copy!');
                }}
                title="Click để copy IPFS CID"
              >
                {profileData.verification_cid}
              </p>
            </div>
            <div>
              <label className="text-muted-foreground">Profile CID</label>
              <p 
                className="font-mono bg-card text-card-foreground border border-border p-2 rounded text-sm break-all cursor-pointer hover:bg-accent/40 transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(profileData.profile_cid);
                  toast.success('Profile CID đã được copy!');
                }}
                title="Click để copy Profile CID"
              >
                {profileData.profile_cid || '—'}
              </p>
            </div>
            <div>
              <label className="text-muted-foreground">Avatar CID</label>
              <p 
                className="font-mono bg-card text-card-foreground border border-border p-2 rounded text-sm break-all cursor-pointer hover:bg-accent/40 transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(profileData.avatar_cid);
                  toast.success('Avatar CID đã được copy!');
                }}
                title="Click để copy Avatar CID"
              >
                {profileData.avatar_cid || '—'}
              </p>
            </div>
            <div>
              <label className="text-muted-foreground">CV CID</label>
              <p 
                className="font-mono bg-card text-card-foreground border border-border p-2 rounded text-sm break-all cursor-pointer hover:bg-accent/40 transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(profileData.cv_cid);
                  toast.success('CV CID đã được copy!');
                }}
                title="Click để copy CV CID"
              >
                {profileData.cv_cid || '—'}
              </p>
            </div>
            {latestEventTime && (
              <div>
                <label className="text-muted-foreground">Thời điểm đăng ký</label>
                <p className="font-medium">
                  {new Date(latestEventTime * 1000).toLocaleString('vi-VN')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
