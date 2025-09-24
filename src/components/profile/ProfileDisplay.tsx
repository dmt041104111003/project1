'use client';

import { useEffect, useState } from 'react';
import { Card, Badge, CopyableMono, CidDisplay, LoadingInline, Section } from '@/components/ui';
import { fetchJsonFromCid } from '@/lib/client';
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
        const [profileRes, didRes, evRes] = await Promise.all([
          fetch(`/api/profile/${userAddress}`),
          fetch(`/api/did/${userAddress}`),
          fetch(`/api/events/profile-registered?address=${encodeURIComponent(userAddress)}&limit=1`)
        ]);
        const data = profileRes.ok ? await profileRes.json() : null;
        const did = didRes.ok ? await didRes.json() : null;
        const events = evRes.ok ? (await evRes.json()).events : [];
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
          setError('Profile not found');
        }
      } catch (err) {
        setError('Error loading profile');
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
        <div className="p-6 flex items-center justify-center">
          <LoadingInline text="Loading profile..." />
        </div>
      </Card>
    );
  }

  if (error || !profileData) {
    return (
      <Card>
        <div className="p-6">
          <div className="text-center text-red-600">
            <p>{error || 'Profile not found'}</p>
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
            <CopyableMono value={profileData.did_hash} label="DID hash đã được copy!" />
          </div>
          
        </div>

        <Section title="Off-chain details (IPFS)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CidDisplay label="Profile CID" cid={profileData.profile_cid} />
              <CidDisplay label="Avatar CID" cid={profileData.avatar_cid} />
              <CidDisplay label="CV CID" cid={profileData.cv_cid} />
              <CidDisplay label="Verification CID" cid={profileData.verification_cid} />
            </div>
            {offchain && (
              <div className="mt-4 space-y-3">
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
            )}
        </Section>
        {didDetails && (
          <div className="border-t border-border pt-4">
            <h4 className="font-medium mb-3 text-foreground">On-chain DID details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">DID Verified:</span>
                <Badge variant={didDetails.hasVerified ? 'default' : 'danger'}>
                  {didDetails.hasVerified ? 'Verified' : 'Not verified'}
                </Badge>
              </div>
              <div>
                <label className="text-muted-foreground">Controller</label>
                <p
                  className="font-mono bg-card text-card-foreground border border-border p-2 rounded text-sm break-all cursor-pointer hover:bg-accent/40 transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(didDetails.controller || '');
                    toast.success('Controller address copied!');
                  }}
                  title="Click to copy Controller"
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
          <h4 className="font-medium mb-3 text-foreground">Profile information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-muted-foreground">Created at</label>
              <p className="font-medium">
                {new Date(Number(profileData.created_at) * 1000).toLocaleDateString('en-US')}
              </p>
            </div>
            {latestEventTime && (
              <div>
                <label className="text-muted-foreground">Registration time</label>
                <p className="font-medium">
                  {new Date(latestEventTime * 1000).toLocaleString('en-US')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
