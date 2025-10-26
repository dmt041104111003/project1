import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useWallet } from '@/contexts/WalletContext';

const ROLES = { FREELANCER: 1, POSTER: 2 } as const;
const TABS = { FREELANCER: 'freelancer', POSTER: 'poster' } as const;
const DEFAULT_TABLE_ID = 'default_table';

interface ProfileData {
  skills: string;
  about: string;
  experience: string;
}

const FormField = ({ label, value, onChange, placeholder, disabled, type = 'input', rows = 3 }: {
  label: string; value: string; onChange: (value: string) => void; placeholder: string; disabled: boolean; type?: 'input' | 'textarea'; rows?: number;
}) => {
  const baseClasses = "w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50";
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      {type === 'input' ? (
        <input className={baseClasses} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} />
      ) : (
        <textarea className={`${baseClasses} resize-none`} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} />
      )}
    </div>
  );
};

export default function DIDActionsPanel() {
  const { account } = useWallet();
  const did = account ? `did:aptos:${account}` : '';
  const [freelancerData, setFreelancerData] = useState<ProfileData>({ skills: '', about: '', experience: '' });
  const [posterData, setPosterData] = useState<ProfileData>({ skills: '', about: '', experience: '' });
  const [roleTypes, setRoleTypes] = useState<number[]>([ROLES.FREELANCER]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<typeof TABS[keyof typeof TABS]>(TABS.FREELANCER);
  const [verificationStatus, setVerificationStatus] = useState('');
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  const currentData = activeTab === TABS.FREELANCER ? freelancerData : posterData;
  const currentRole = activeTab === TABS.FREELANCER ? ROLES.FREELANCER : ROLES.POSTER;
  const isRoleEnabled = (role: number) => roleTypes.includes(role);
  const toggleRole = (role: number, checked: boolean) => 
    setRoleTypes(checked ? [...roleTypes, role] : roleTypes.filter(r => r !== role));

  const checkVerificationStatus = async () => {
    if (!did) return;
    try {
      setVerificationStatus('Đang kiểm tra trạng thái verification...');
      const didCommitHex = await sha256Hex(didTail(did));
      const ipfsResponse = await fetch(`/api/ipfs/get?type=profile&commitment=${didCommitHex}`);
      const ipfsData = await ipfsResponse.json();
      console.log('Frontend: API response:', ipfsData);
      
      const hasProfile = ipfsData.success && ipfsData.data && Object.keys(ipfsData.data).length > 0;
      console.log('Frontend: hasProfile check:', {
        success: ipfsData.success,
        hasData: !!ipfsData.data,
        dataKeys: ipfsData.data ? Object.keys(ipfsData.data) : [],
        hasProfileData: !!ipfsData.profile_data,
        profileDataKeys: ipfsData.profile_data ? Object.keys(ipfsData.profile_data) : [],
        hasProfile
      });
      setIsVerified(hasProfile);
      setVerificationStatus(hasProfile ? 'Profile đã được verify! Bạn có thể sử dụng tất cả tính năng.' : 'Profile chưa được verify! Cần tạo và verify profile trước.');
    } catch (e: any) {
      setVerificationStatus(`Lỗi kiểm tra verification: ${e?.message || 'thất bại'}`);
      setIsVerified(false);
    }
  };

  useEffect(() => {
    if (!did) return;
    const loadProfileData = async () => {
      setIsLoading(true);
      try {
        await checkVerificationStatus();
        const didCommitHex = await sha256Hex(didTail(did));
        const ipfsResponse = await fetch(`/api/ipfs/get?type=profile&commitment=${didCommitHex}`);
        const ipfsData = await ipfsResponse.json();
        
        if (ipfsData.success && ipfsData.data) {
          const profile = ipfsData.data;
          const finalRoles = profile.blockchain_roles || [];
          console.log('Frontend: Loading profile data:', profile);
          console.log('Frontend: Loading roles from profile.blockchain_roles:', finalRoles);
          
          if (finalRoles.includes(ROLES.FREELANCER)) {
            console.log('Frontend: Setting freelancer data from profile:', profile);
            setFreelancerData({
              skills: profile.skills || '',
              about: profile.freelancerAbout || profile.about || '', 
              experience: profile.experience || ''
            });
          }
          
          if (finalRoles.includes(ROLES.POSTER)) {
            console.log('Frontend: Setting poster data from profile:', profile);
            setPosterData({
              skills: '',
              about: profile.posterAbout || profile.about || '', 
              experience: ''
            });
          }
          
          setRoleTypes(finalRoles);
          if (finalRoles.length === 0) setActiveTab(TABS.FREELANCER);
        } else if (ipfsData.profile_cid === '') {
          setFreelancerData({
            skills: 'React, TypeScript, Move',
            about: 'Full-stack developer with 3 years experience',
            experience: '3 năm Frontend, 1 năm Move development'
          });
        }
      } catch (e: any) {
        console.error('Error loading profile:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadProfileData();
  }, [did]);

  const getWalletOrThrow = () => {
    const w = (globalThis as any).aptos ?? (globalThis as any)?.window?.aptos;
    if (!w) throw new Error('Wallet not found');
    return w;
  };

  const sha256Hex = async (s: string): Promise<string> => {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return '0x' + Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const didTail = (d: string): string => d.slice(d.lastIndexOf(':') + 1);


  const getZKPProof = async () => {
    const res = await fetch('/api/zkp/fullprove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ did, roleTypes })
    });
    if (!res.ok) throw new Error('ZKP proof generation failed');
    const data = await res.json();
    return {
      verification_key_hash_sha256: String(data?.verification_key_hash_sha256 || ''),
      t_I_commitment: String(data?.t_I_commitment || ''),
      a_commitment: String(data?.a_commitment || '')
    };
  };

  const uploadToIPFS = async (): Promise<string> => {
    const res = await fetch('/api/ipfs/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_commitment: await sha256Hex(didTail(did)),
        type: 'profile',
        roleTypes: [currentRole],
        skills: currentRole === ROLES.FREELANCER ? currentData.skills : undefined,
        experience: currentRole === ROLES.FREELANCER ? currentData.experience : undefined,
        freelancerAbout: currentRole === ROLES.FREELANCER ? currentData.about : undefined,
        posterAbout: currentRole === ROLES.POSTER ? currentData.about : undefined
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'IPFS upload failed');
    return data.ipfsHash;
  };

  const setError = (message: string) => console.error(message);




  const handleCreateProfile = async () => {
    try {
      if (!did) return setError('Thiếu DID');
      const zkpData = await getZKPProof();
      const didCommitHex = await sha256Hex(didTail(did));
      const profileCid = await uploadToIPFS();
      const apiRes = await fetch('/api/did/create-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did: `did:aptos:${didCommitHex}`, roleTypes, didCommitment: didCommitHex, profileCid,
          tableCommitmentHex: await sha256Hex(DEFAULT_TABLE_ID), tICommitment: zkpData.t_I_commitment, aCommitment: zkpData.a_commitment
        })
      });
      const apiData = await apiRes.json();
      if (!apiData.success) return setError(`API Error: ${apiData.error}`);
      const tx = await getWalletOrThrow().signAndSubmitTransaction(apiData.payload);
      console.log(tx?.hash ? `Tạo DID+Profile tx: ${tx.hash}` : 'Đã gửi giao dịch');
    } catch (e: any) {
      setError(e?.message || 'Tạo DID+Profile thất bại');
    }
  };

  const handleUpdateProfile = async () => {
    try {
      if (!did) return setError('Thiếu DID');
      setIsLoading(true);
      setVerificationStatus('Đang cập nhật profile...');
      
      const didCommitHex = await sha256Hex(didTail(did));
      const zkpData = await getZKPProof();
      const profileCid = await uploadToIPFS();
      
      const apiRes = await fetch('/api/did/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did: `did:aptos:${didCommitHex}`, roleTypes, didCommitment: didCommitHex, profileCid,
          tableCommitmentHex: await sha256Hex(DEFAULT_TABLE_ID), tICommitment: zkpData.t_I_commitment, aCommitment: zkpData.a_commitment
        })
      });
      
      const apiData = await apiRes.json();
      if (!apiData.success) return setError(`API Error: ${apiData.error}`);
      
      const tx = await getWalletOrThrow().signAndSubmitTransaction(apiData.payload);
      const hash = tx?.hash || '';
      
      if (hash) {
        setVerificationStatus(`Cập nhật thành công! TX: ${hash}`);
        console.log(`Cập nhật Profile tx: ${hash}`);
      } else {
        setVerificationStatus('Đã gửi giao dịch cập nhật profile');
      }
    } catch (e: any) {
      setError(e?.message || 'Cập nhật Profile thất bại');
      setVerificationStatus(`Lỗi cập nhật: ${e?.message || 'thất bại'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleBurnDid = async () => {
    try {
      if (!did) return setError('Thiếu DID');
      const zkpData = await getZKPProof();
      const didCommitHex = await sha256Hex(didTail(did));
      const response = await fetch('/api/did/burn-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did: `did:aptos:${didCommitHex}`, tableCommitmentHex: await sha256Hex(DEFAULT_TABLE_ID),
          tICommitment: zkpData.t_I_commitment, aCommitment: zkpData.a_commitment, roleTypes
        })
      });
      if (!response.ok) throw new Error('Failed to get burn payload');
      const { payload } = await response.json();
      const tx = await getWalletOrThrow().signAndSubmitTransaction(payload);
      console.log(tx?.hash ? `Hủy DID tx: ${tx.hash}` : 'Đã gửi giao dịch hủy DID');
    } catch (e: any) {
      setError(e?.message || 'Hủy DID thất bại');
    }
  };

  return (
    <Card variant="outlined" padding="md" className="space-y-4 mt-6">
      <div className="text-sm font-medium">Danh tính (DID)</div>
      
      {verificationStatus && (
        <div className={`p-3 rounded-lg text-sm font-medium ${
          verificationStatus.includes('đã được verify') || verificationStatus.includes('thành công')
            ? 'bg-green-50 text-green-800 border border-green-200'
            : verificationStatus.includes('chưa được verify') || verificationStatus.includes('Lỗi')
            ? 'bg-red-50 text-red-800 border border-red-200'
            : 'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {verificationStatus}
        </div>
      )}
      
      <div className="space-y-2">
          <div className="flex flex-wrap gap-2 mt-2">
            <Button size="sm" variant="outline" onClick={handleCreateProfile} disabled={isLoading || isVerified === true}>
              {isVerified === true ? 'Đã verify' : 'Tạo DID + Hồ sơ'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleUpdateProfile} disabled={isLoading || isVerified === false}>
              Cập nhật hồ sơ
            </Button>
            <Button size="sm" variant="outline" onClick={handleBurnDid} disabled={isLoading || isVerified === false}>
              Hủy DID
            </Button>
          </div>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof TABS[keyof typeof TABS])}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value={TABS.FREELANCER}>
                Freelancer Profile
              </TabsTrigger>
              <TabsTrigger value={TABS.POSTER}>
                Poster Profile
              </TabsTrigger>
            </TabsList>

            <TabsContent value={TABS.FREELANCER} className="space-y-4">
              <Switch
                checked={isRoleEnabled(ROLES.FREELANCER)}
                onChange={(e) => toggleRole(ROLES.FREELANCER, e.target.checked)}
                label="Enable Freelancer Role"
                disabled={isLoading}
              />
              {isRoleEnabled(ROLES.FREELANCER) && (
                <div className="space-y-4">
                  <FormField label="Kỹ năng (skills)" value={freelancerData.skills} onChange={(value) => setFreelancerData(prev => ({ ...prev, skills: value }))} placeholder="React, Rust, Move, ..." disabled={isLoading} type="input" />
                  <FormField label="Giới thiệu (about)" value={freelancerData.about} onChange={(value) => setFreelancerData(prev => ({ ...prev, about: value }))} placeholder="Mô tả về kỹ năng và kinh nghiệm của bạn" disabled={isLoading} type="textarea" />
                  <FormField label="Kinh nghiệm (experience)" value={freelancerData.experience} onChange={(value) => setFreelancerData(prev => ({ ...prev, experience: value }))} placeholder="3 năm Frontend, 1 năm Move development, ..." disabled={isLoading} type="textarea" />
                </div>
              )}
            </TabsContent>

            <TabsContent value={TABS.POSTER} className="space-y-4">
              <Switch
                checked={isRoleEnabled(ROLES.POSTER)}
                onChange={(e) => toggleRole(ROLES.POSTER, e.target.checked)}
                label="Enable Poster Role"
                disabled={isLoading}
              />
              {isRoleEnabled(ROLES.POSTER) && (
                <FormField label="Giới thiệu (about)" value={posterData.about} onChange={(value) => setPosterData(prev => ({ ...prev, about: value }))} placeholder="Mô tả về công ty/dự án và loại công việc bạn đang tìm kiếm" disabled={isLoading} type="textarea" />
              )}
            </TabsContent>
          </Tabs>
        </div>
    </Card>
  );
}


