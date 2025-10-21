import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { aptosView } from '@/lib/aptos';
import { DID as DID_CONST } from '@/constants/contracts';
import { useWallet } from '@/contexts/WalletContext';

// Constants
const ROLES = {
  FREELANCER: 1,
  POSTER: 2,
} as const;

const TABS = {
  FREELANCER: 'freelancer' as const,
  POSTER: 'poster' as const,
} as const;

const DEFAULT_TABLE_ID = 'default_table';

interface ProfileData {
  skills: string;
  about: string;
  experience: string;
}

interface ZKPResponse {
  verification_key_hash_sha256: string;
  t_I_commitment: string;
  a_commitment: string;
}

interface IPFSResponse {
  success: boolean;
  ipfsHash: string;
  error?: string;
}

export default function DIDActionsPanel() {
  const { account } = useWallet();
  const did = account ? `did:aptos:${account}` : '';
  const [freelancerData, setFreelancerData] = useState<ProfileData>({
    skills: '',
    about: '',
    experience: ''
  });
  const [posterData, setPosterData] = useState<ProfileData>({
    skills: '',
    about: '',
    experience: ''
  });
  const [roleTypes, setRoleTypes] = useState<number[]>([ROLES.FREELANCER]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<typeof TABS[keyof typeof TABS]>(TABS.FREELANCER);
  const [verificationStatus, setVerificationStatus] = useState<string>('');
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  // Helper functions
  const getCurrentTabData = (): ProfileData => {
    return activeTab === TABS.FREELANCER ? freelancerData : posterData;
  };

  const setCurrentTabData = (data: ProfileData): void => {
    if (activeTab === TABS.FREELANCER) {
      setFreelancerData(data);
    } else {
      setPosterData(data);
    }
  };

  const getCurrentRole = (): number => {
    return activeTab === TABS.FREELANCER ? ROLES.FREELANCER : ROLES.POSTER;
  };

  const isRoleEnabled = (role: number): boolean => {
    return roleTypes.includes(role);
  };

  // Auto-check verification status
  const checkVerificationStatus = async () => {
    if (!did) return;
    
    try {
      setVerificationStatus('🔄 Đang kiểm tra trạng thái verification...');
      
      const didCommitHex = await sha256Hex(didTail(did));
      
      // Get verification status from new API
      const ipfsResponse = await fetch(`/api/ipfs/get?type=profile&commitment=${didCommitHex}`);
      const ipfsData = await ipfsResponse.json();
      
      if (ipfsData.success) {
        // Check if profile exists and has data
        const hasProfile = ipfsData.profile_data && Object.keys(ipfsData.profile_data).length > 0;
        const isVerified = hasProfile;
        console.log('Verification check - hasProfile:', hasProfile, 'profile_data:', ipfsData.profile_data);
        setIsVerified(isVerified);
        
        if (isVerified) {
          setVerificationStatus('✅ Profile đã được verify! Bạn có thể sử dụng tất cả tính năng.');
        } else {
          setVerificationStatus('❌ Profile chưa được verify! Cần tạo và verify profile trước.');
        }
      } else {
        setIsVerified(false);
        setVerificationStatus('❌ Profile chưa được verify! Cần tạo và verify profile trước.');
      }
    } catch (e: any) {
      setVerificationStatus(`❌ Lỗi kiểm tra verification: ${e?.message || 'thất bại'}`);
      setIsVerified(false);
    }
  };

  // Auto-load profile data when component mounts
  useEffect(() => {
    const loadProfileData = async () => {
      if (!did) {
        console.log('No DID available');
        return;
      }
      
      setIsLoading(true);
      try {
        // Check verification status first
        await checkVerificationStatus();
        
        console.log('Loading profile data for DID:', did);
        const didCommitHex = await sha256Hex(didTail(did));
        console.log('DID commitment hex:', didCommitHex);
        
        // Get profile data from new API
        const ipfsResponse = await fetch(`/api/ipfs/get?type=profile&commitment=${didCommitHex}`);
        const ipfsData = await ipfsResponse.json();
        console.log('IPFS API response:', ipfsData);
        console.log('Profile data exists:', !!ipfsData.profile_data);
        console.log('Profile data keys:', ipfsData.profile_data ? Object.keys(ipfsData.profile_data) : 'none');
        
        if (ipfsData.success && ipfsData.profile_data) {
          const profile = ipfsData.profile_data;
          console.log('Profile data found:', profile);
          console.log('Roles from API:', ipfsData.blockchain_roles);
          console.log('Is verified:', ipfsData.is_verified);
          
          // Use roles from API
          const finalRoles = ipfsData.blockchain_roles || [];
          
          // Set data for both tabs based on roles
          if (finalRoles.includes(ROLES.FREELANCER)) {
            setFreelancerData({
              skills: profile.skills || '',
              about: profile.freelancerAbout || profile.about || '', // Use role-specific about first
              experience: profile.experience || ''
            });
          }
          
          if (finalRoles.includes(ROLES.POSTER)) {
            setPosterData({
              skills: '',
              about: profile.posterAbout || profile.about || '', // Use role-specific about first
              experience: ''
            });
          }
          
          console.log('Final roles to use:', finalRoles);
          setRoleTypes(finalRoles);
          
          // Don't auto-switch tabs - let user stay on current tab
          // Only switch if no roles are enabled
          if (finalRoles.length === 0) {
            setActiveTab(TABS.FREELANCER);
          }
          
        } else {
          console.log('No profile data found or API error:', ipfsData.error);
          console.log('No profile found - create one first');
          
          // Show helpful message for first-time users
          if (ipfsData.profile_cid === '') {
            console.log('Welcome! This is your first time. Please fill in your profile information and click "Tạo DID + Hồ sơ" to create your identity.');
            
            // Pre-fill with sample data for testing
            setFreelancerData({
              skills: 'React, TypeScript, Move',
              about: 'Full-stack developer with 3 years experience',
              experience: '3 years Frontend, 1 year Move development'
            });
          }
        }
      } catch (e: any) {
        console.error('Could not load profile data:', e);
        console.error(`Error loading profile: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProfileData();
  }, [did]);

  // Utility functions
  const getWalletOrThrow = () => {
    const g: any = globalThis as any;
    const w = g.aptos ?? g?.window?.aptos;
    if (!w) throw new Error('Wallet not found');
    return w;
  };

  const sha256Hex = async (s: string): Promise<string> => {
    const enc = new TextEncoder();
    const data = enc.encode(s);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const bytes = Array.from(new Uint8Array(hash));
    return '0x' + bytes.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const didTail = (d: string): string => {
    const i = d.lastIndexOf(':');
    return i >= 0 ? d.slice(i + 1) : d;
  };


  // API helper functions
  const getZKPProof = async (): Promise<ZKPResponse> => {
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
    const currentData = getCurrentTabData();
    const currentRole = getCurrentRole();
    
    const res = await fetch('/api/ipfs/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_commitment: await sha256Hex(didTail(did)),
        type: 'profile',
        roleTypes: [currentRole],
        skills: currentRole === ROLES.FREELANCER ? currentData.skills : undefined,
        experience: currentRole === ROLES.FREELANCER ? currentData.experience : undefined,
        // Send role-specific about fields
        freelancerAbout: currentRole === ROLES.FREELANCER ? currentData.about : undefined,
        posterAbout: currentRole === ROLES.POSTER ? currentData.about : undefined
      })
    });
    
    const data: IPFSResponse = await res.json();
    if (!data.success) throw new Error(data.error || 'IPFS upload failed');
    
    return data.ipfsHash;
  };

  const setError = (message: string) => {
    console.error(message);
  };




  const handleCreateProfile = async () => {
    try {
      if (!did) return setError('Thiếu DID');
      
      const zkpData = await getZKPProof();
      const didCommitHex = await sha256Hex(didTail(did));
      const didPretty = `did:aptos:${didCommitHex}`;
      const tableCommitHex = await sha256Hex(DEFAULT_TABLE_ID);
      const profileCid = await uploadToIPFS();
      
      const apiRes = await fetch('/api/did/create-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did: didPretty, roleTypes, didCommitment: didCommitHex, profileCid,
          tableCommitmentHex: tableCommitHex, tICommitment: zkpData.t_I_commitment, aCommitment: zkpData.a_commitment
        })
      });
      
      const apiData = await apiRes.json();
      if (!apiData.success) return setError(`API Error: ${apiData.error}`);
      
      const tx = await getWalletOrThrow().signAndSubmitTransaction(apiData.payload);
      const hash = tx?.hash || '';
      console.log(hash ? `Tạo DID+Profile tx: ${hash}` : 'Đã gửi giao dịch');
    } catch (e: any) {
      setError(e?.message || 'Tạo DID+Profile thất bại');
    }
  };

  const handleUpdateProfile = async () => {
    try {
      if (!did) return setError('Thiếu DID');
      
      setIsLoading(true);
      setVerificationStatus('🔄 Đang cập nhật profile...');
      
      const didCommitHex = await sha256Hex(didTail(did));
      const didPretty = `did:aptos:${didCommitHex}`;
      const tableCommitHex = await sha256Hex(DEFAULT_TABLE_ID);
      
      const r = await aptosView<boolean[]>({ 
        function: DID_CONST.IS_PROFILE_VERIFIED, 
        arguments: [didPretty, tableCommitHex] 
      });
      
      if (!r?.[0]) return setError('Profile chưa verified. Cần verify trước khi update.');
      
      const zkpData = await getZKPProof();
      const profileCid = await uploadToIPFS();
      
      const apiRes = await fetch('/api/did/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did: didPretty, roleTypes, didCommitment: didCommitHex, profileCid,
          tableCommitmentHex: tableCommitHex, tICommitment: zkpData.t_I_commitment, aCommitment: zkpData.a_commitment
        })
      });
      
      const apiData = await apiRes.json();
      if (!apiData.success) return setError(`API Error: ${apiData.error}`);
      
      const tx = await getWalletOrThrow().signAndSubmitTransaction(apiData.payload);
      const hash = tx?.hash || '';
      
      if (hash) {
        setVerificationStatus(`✅ Cập nhật thành công! TX: ${hash}`);
        console.log(`Cập nhật Profile tx: ${hash}`);
        
        // Auto-refresh profile data after successful update
        setTimeout(async () => {
          try {
            console.log('🔄 Auto-refreshing profile data...');
            const ipfsResponse = await fetch(`/api/ipfs/get?type=profile&commitment=${didCommitHex}`);
            const ipfsData = await ipfsResponse.json();
            
            if (ipfsData.success && ipfsData.profile_data) {
              const profile = ipfsData.profile_data;
              console.log('✅ Refreshed profile data:', profile);
              
              // Update both tabs with fresh data based on roles
              const finalRoles = ipfsData.blockchain_roles || [];
              
              if (finalRoles.includes(ROLES.FREELANCER)) {
                setFreelancerData({
                  skills: profile.skills || '',
                  about: profile.freelancerAbout || profile.about || '',
                  experience: profile.experience || ''
                });
              }
              
              if (finalRoles.includes(ROLES.POSTER)) {
                setPosterData({
                  skills: '',
                  about: profile.posterAbout || profile.about || '',
                  experience: ''
                });
              }
              
              setRoleTypes(finalRoles);
              setVerificationStatus('✅ Profile đã được cập nhật và refresh thành công!');
            }
          } catch (refreshError) {
            console.error('Error refreshing profile:', refreshError);
            setVerificationStatus('✅ Cập nhật thành công! (Refresh failed - please reload page)');
          }
        }, 2000); // Wait 2 seconds for blockchain to update
      } else {
        setVerificationStatus('✅ Đã gửi giao dịch cập nhật profile');
      }
    } catch (e: any) {
      setError(e?.message || 'Cập nhật Profile thất bại');
      setVerificationStatus(`❌ Lỗi cập nhật: ${e?.message || 'thất bại'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleBurnDid = async () => {
    try {
      if (!did) return setError('Thiếu DID');
      
      const zkpData = await getZKPProof();
      const didCommitHex = await sha256Hex(didTail(did));
      const didPretty = `did:aptos:${didCommitHex}`;
      const tableCommitHex = await sha256Hex(DEFAULT_TABLE_ID);
      
      const response = await fetch('/api/did/burn-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did: didPretty, tableCommitmentHex: tableCommitHex,
          tICommitment: zkpData.t_I_commitment, aCommitment: zkpData.a_commitment, roleTypes
        })
      });
      
      if (!response.ok) throw new Error('Failed to get burn payload');
      
      const { payload } = await response.json();
      const tx = await getWalletOrThrow().signAndSubmitTransaction(payload);
      
      const hash = tx?.hash || '';
      console.log(hash ? `Hủy DID tx: ${hash}` : 'Đã gửi giao dịch hủy DID');
    } catch (e: any) {
      setError(e?.message || 'Hủy DID thất bại');
    }
  };

  return (
    <Card variant="outlined" className="p-6 space-y-4 mt-6">
      <div className="text-sm font-medium">Danh tính (DID)</div>
      
      {/* Verification Status */}
      {verificationStatus && (
        <div className={`p-3 rounded-lg text-sm font-medium ${
          verificationStatus.includes('✅') 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700'
            : verificationStatus.includes('❌')
            ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700'
            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {verificationStatus.includes('✅') ? '✅' : verificationStatus.includes('❌') ? '❌' : '🔄'}
            </span>
            <span>{verificationStatus}</span>
          </div>
        </div>
      )}
      
      <div className="space-y-2">
          <div className="flex flex-wrap gap-2 mt-2">
            <Button size="sm" variant="outline" onClick={handleCreateProfile} disabled={isLoading || isVerified === true}>
              {isVerified === true ? '✅ Đã verify' : 'Tạo DID + Hồ sơ'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleUpdateProfile} disabled={isLoading || isVerified === false}>
              Cập nhật hồ sơ
            </Button>
            <Button size="sm" variant="outline" onClick={handleBurnDid} disabled={isLoading || isVerified === false}>
              Hủy DID
            </Button>
          </div>
          {/* Tabs - Always show both */}
          <div className="space-y-4">
            {/* Tab Navigation */}
            <div className="flex border-b">
              <button
                className={`px-4 py-2 text-xs border-b-2 ${
                  activeTab === TABS.FREELANCER 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500'
                }`}
                onClick={() => setActiveTab(TABS.FREELANCER)}
                disabled={isLoading}
              >
                Freelancer Profile
              </button>
              <button
                className={`px-4 py-2 text-xs border-b-2 ${
                  activeTab === TABS.POSTER 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500'
                }`}
                onClick={() => setActiveTab(TABS.POSTER)}
                disabled={isLoading}
              >
                Poster Profile
              </button>
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
              {activeTab === TABS.FREELANCER && (
                <div className="space-y-4">
                  {/* Role Selection for Freelancer */}
                  <div className="flex items-center gap-2">
                    <label htmlFor="freelancer-role" className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        id="freelancer-role"
                      checked={isRoleEnabled(ROLES.FREELANCER)} 
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRoleTypes([...roleTypes, ROLES.FREELANCER]);
                        } else {
                          setRoleTypes(roleTypes.filter(r => r !== ROLES.FREELANCER));
                        }
                      }}
                        className="mr-2"
                        disabled={isLoading}
                      />
                      <span className="text-xs">Enable Freelancer Role</span>
                    </label>
                  </div>
                  
                  {isRoleEnabled(ROLES.FREELANCER) && (
                    <>
                      <div>
                        <div className="text-xs mb-1">Kỹ năng (skills)</div>
                        <input 
                          className="border rounded px-3 py-2 w-full text-xs"
                          value={freelancerData.skills} 
                          onChange={(e) => setFreelancerData(prev => ({ ...prev, skills: e.target.value }))} 
                          placeholder="React, Rust, Move, ..." 
                          disabled={isLoading}
                        />
                      </div>
                      <div>
                        <div className="text-xs mb-1">Giới thiệu (about)</div>
                        <textarea 
                          className="border rounded px-3 py-2 w-full text-xs"
                          rows={3} 
                          value={freelancerData.about} 
                          onChange={(e) => setFreelancerData(prev => ({ ...prev, about: e.target.value }))} 
                          placeholder="Mô tả về kỹ năng và kinh nghiệm của bạn" 
                          disabled={isLoading}
                        />
                      </div>
                      <div>
                        <div className="text-xs mb-1">Kinh nghiệm (experience)</div>
                        <textarea 
                          className="border rounded px-3 py-2 w-full text-xs"
                          rows={3} 
                          value={freelancerData.experience} 
                          onChange={(e) => setFreelancerData(prev => ({ ...prev, experience: e.target.value }))} 
                          placeholder="3 năm Frontend, 1 năm Move development, ..." 
                          disabled={isLoading}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === TABS.POSTER && (
                <div className="space-y-4">
                  {/* Role Selection for Poster */}
                  <div className="flex items-center gap-2">
                    <label htmlFor="poster-role" className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        id="poster-role"
                      checked={isRoleEnabled(ROLES.POSTER)} 
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRoleTypes([...roleTypes, ROLES.POSTER]);
                        } else {
                          setRoleTypes(roleTypes.filter(r => r !== ROLES.POSTER));
                        }
                      }}
                        className="mr-2"
                        disabled={isLoading}
                      />
                      <span className="text-xs">Enable Poster Role</span>
                    </label>
                  </div>
                  
                  {isRoleEnabled(ROLES.POSTER) && (
                    <div>
                      <div className="text-xs mb-1">Giới thiệu (about)</div>
                      <textarea 
                        className="border rounded px-3 py-2 w-full text-xs"
                        rows={3} 
                        value={posterData.about} 
                        onChange={(e) => setPosterData(prev => ({ ...prev, about: e.target.value }))} 
                        placeholder="Mô tả về công ty/dự án và loại công việc bạn đang tìm kiếm" 
                        disabled={isLoading}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
    </Card>
  );
}


