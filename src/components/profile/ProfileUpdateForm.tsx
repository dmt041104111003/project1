'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { updateProfileAssets } from '@/lib/client';
import { fetchJsonFromCid } from '@/lib/client';
import { X, Plus } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { ProfileFormData } from '@/constants/auth';

export default function ProfileUpdateForm() {
  const { account } = useWallet();
  const [formData, setFormData] = useState<ProfileFormData>({
    headline: '',
    summary: '',
    skills: [],
    experience: '',
    education: '',
    links: []
  });
  const [skillInput, setSkillInput] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ avatar?: string; cv?: string }>({});
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [existingCids, setExistingCids] = useState<{ profile?: string; avatar?: string; cv?: string }>({});
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const loadExistingProfile = async () => {
      if (!account) {
        console.log('No account found');
        return;
      }
      
      console.log('Loading profile for account:', account);
      
      try {
        setIsLoadingProfile(true);
        const resp = await fetch(`/api/profile/${account}`);
        const profileData = resp.ok ? await resp.json() : null;
        console.log('Profile data from blockchain:', profileData);
        
            if (profileData && (profileData.profile_cid || profileData.verification_cid)) {
           console.log('Found profile data:', profileData);

           let profileCid = '';
           if (profileData.profile_cid) {
             profileCid = profileData.profile_cid.replace('ipfs://', '');
             console.log('Using new profile CID format:', profileCid);
           }
           setExistingCids({
             profile: (profileData.profile_cid || '').replace('ipfs://', ''),
             avatar: (profileData.avatar_cid || '').replace('ipfs://', ''),
             cv: (profileData.cv_cid || '').replace('ipfs://', ''),
           });
           
                                   let allData: Record<string, unknown> = {};
            if (profileCid) {
              try {
                console.log('Trying to fetch profile data from CID:', profileCid);
                const data = await fetchJsonFromCid<Record<string, unknown>>(profileCid);
                if (data) {
                  console.log('Profile data from CID:', data);
                  allData = { ...allData, ...data };
                }
              } catch (error) {
                console.log('Failed to fetch profile data from CID:', profileCid, error);
              }
            }
            
            console.log('Combined data from all CIDs:', allData);
            
            if (Object.keys(allData).length > 0) {
              console.log('Raw data from IPFS:', allData);
              
              if (allData.type === 'freelancer_profile' || allData.headline || allData.skills) {
                console.log('Setting form data with:', allData);
                setFormData({
                  headline: (allData.headline as string) || '',
                  summary: (allData.summary as string) || '',
                  skills: (allData.skills as string[]) || [],
                  experience: (allData.experience as string) || '',
                  education: (allData.education as string) || '',
                  links: (allData.links as string[]) || []
                });
                
                if (allData.avatar_url) {
                  setUploadedFiles(prev => ({ ...prev, avatar: allData.avatar_url as string }));
                }
                if (allData.cv_url) {
                  setUploadedFiles(prev => ({ ...prev, cv: allData.cv_url as string }));
                }
               
               toast.success('Đã tải thông tin hồ sơ hiện tại');
             } else {
               console.log('Data structure not recognized:', allData);
               toast.info('Không tìm thấy thông tin hồ sơ freelancer, có thể bạn chưa tạo hồ sơ');
             }
           } else {
             console.log('No data returned from any CID');
             toast.info('Không tìm thấy thông tin hồ sơ, có thể bạn chưa tạo hồ sơ');
           }
        } else {
          console.log('No profile data or CID found');
        }
      } catch (error) {
        console.error('Error loading existing profile:', error);
        toast.error('Không thể tải thông tin hồ sơ hiện tại');
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadExistingProfile();
  }, [account]);

  const handleFileUpload = async (file: File, type: 'avatar' | 'cv') => {
    try {
      setIsUploading(true);
      const form = new FormData();
      form.append('file', file);
      form.append('filename', file.name);
      const res = await fetch('/api/ipfs/pin', { method: 'POST', body: form });
      if (!res.ok) throw new Error(await res.text());
      const { cid } = await res.json() as { cid: string };
      const fileUrl = `ipfs://${cid}`;
      setUploadedFiles(prev => ({ ...prev, [type]: fileUrl }));
      toast.success(`${type === 'avatar' ? 'Ảnh đại diện' : 'CV'} đã upload thành công!`);
    } catch (err) {
      console.error(err);
      toast.error(`Upload ${type === 'avatar' ? 'ảnh' : 'CV'} thất bại`);
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) { toast.info('Đang upload, vui lòng đợi...'); return; }
    if (!formData.headline.trim()) { toast.error('Vui lòng nhập Headline'); return; }
    
    try {
      setLoading(true);
      
       const profileJson = {
         ...formData,
         avatar_url: uploadedFiles.avatar,
         cv_url: uploadedFiles.cv,
         timestamp: Date.now(),
         type: 'freelancer_profile'
       };
      
      const res = await fetch('/api/ipfs/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileJson),
      });
      if (!res.ok) throw new Error(await res.text());
      const { cid } = await res.json() as { cid: string };
      const profileBare = (cid || existingCids.profile || '').replace('ipfs://', '');
      const cvBare = ((uploadedFiles.cv || existingCids.cv) || '').replace('ipfs://', '');
      const avatarBare = ((uploadedFiles.avatar || existingCids.avatar) || '').replace('ipfs://', '');
      const hash = await updateProfileAssets(profileBare, cvBare, avatarBare);
      setTxHash(hash);
      toast.success('Cập nhật hồ sơ thành công!');
      
    } catch (err) {
      console.error(err);
      toast.error('Cập nhật hồ sơ thất bại');
    } finally {
      setLoading(false);
    }
  };

  const openExplorer = () => {
    if (!txHash) return;
    const url = `https://explorer.aptoslabs.com/txn/${txHash}?network=testnet`;
    window.open(url, '_blank');
  };

  return (
    <Card>
      <form onSubmit={onSubmit} className="p-6 space-y-4 text-foreground">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Cập nhật hồ sơ freelancer</h3>
          {isLoadingProfile && (
            <div className="text-sm text-muted-foreground">Đang tải thông tin hiện tại...</div>
          )}
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Headline</label>
          <Input 
            value={formData.headline} 
            onChange={(e) => setFormData(prev => ({ ...prev, headline: e.target.value }))}
            placeholder="e.g. Senior Full-Stack Developer" 
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Tóm tắt</label>
          <Textarea 
            value={formData.summary} 
            onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
            placeholder="Mô tả ngắn gọn về bản thân và chuyên môn..."
            rows={3}
          />
        </div>

                 <div className="space-y-2">
           <label className="text-sm font-medium text-muted-foreground">Kỹ năng</label>
           <div className="flex gap-2">
             <Input 
               value={skillInput} 
               onChange={(e) => setSkillInput(e.target.value)}
               placeholder="Nhập kỹ năng..." 
               onKeyPress={(e) => {
                 if (e.key === 'Enter') {
                   e.preventDefault();
                   if (skillInput.trim()) {
                     setFormData(prev => ({ ...prev, skills: [...prev.skills, skillInput.trim()] }));
                     setSkillInput('');
                   }
                 }
               }}
             />
             <Button 
               type="button" 
               size="sm" 
               onClick={() => {
                 if (skillInput.trim()) {
                   setFormData(prev => ({ ...prev, skills: [...prev.skills, skillInput.trim()] }));
                   setSkillInput('');
                 }
               }}
             >
               <Plus className="h-4 w-4" />
             </Button>
           </div>
           <div className="flex flex-wrap gap-2 mt-2">
             {formData.skills.map((skill, index) => (
               <Badge key={index} variant="secondary" className="flex items-center gap-1">
                 {skill}
                 <X 
                   className="h-3 w-3 cursor-pointer" 
                   onClick={() => setFormData(prev => ({ 
                     ...prev, 
                     skills: prev.skills.filter((_, i) => i !== index) 
                   }))}
                 />
               </Badge>
             ))}
           </div>
         </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Kinh nghiệm</label>
          <Textarea 
            value={formData.experience} 
            onChange={(e) => setFormData(prev => ({ ...prev, experience: e.target.value }))}
            placeholder="Mô tả kinh nghiệm làm việc..."
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Học vấn</label>
          <Textarea 
            value={formData.education} 
            onChange={(e) => setFormData(prev => ({ ...prev, education: e.target.value }))}
            placeholder="Thông tin học vấn..."
            rows={3}
          />
        </div>

                 <div className="space-y-2">
           <label className="text-sm font-medium text-muted-foreground">Links</label>
           <div className="flex gap-2">
             <Input 
               value={linkInput} 
               onChange={(e) => setLinkInput(e.target.value)}
               placeholder="https://github.com/..." 
               onKeyPress={(e) => {
                 if (e.key === 'Enter') {
                   e.preventDefault();
                   if (linkInput.trim()) {
                     setFormData(prev => ({ ...prev, links: [...prev.links, linkInput.trim()] }));
                     setLinkInput('');
                   }
                 }
               }}
             />
             <Button 
               type="button" 
               size="sm" 
               onClick={() => {
                 if (linkInput.trim()) {
                   setFormData(prev => ({ ...prev, links: [...prev.links, linkInput.trim()] }));
                   setLinkInput('');
                 }
               }}
             >
               <Plus className="h-4 w-4" />
             </Button>
           </div>
           <div className="flex flex-wrap gap-2 mt-2">
             {formData.links.map((link, index) => (
               <Badge key={index} variant="secondary" className="flex items-center gap-1">
                 <a href={link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                   {link}
                 </a>
                 <X 
                   className="h-3 w-3 cursor-pointer" 
                   onClick={() => setFormData(prev => ({ 
                     ...prev, 
                     links: prev.links.filter((_, i) => i !== index) 
                   }))}
                 />
               </Badge>
             ))}
           </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="space-y-2">
             <label className="text-sm font-medium text-muted-foreground">Ảnh đại diện</label>
             <Input 
               type="file" 
               accept="image/*"
               onChange={(e) => {
                 const file = e.target.files?.[0];
                 if (file) handleFileUpload(file, 'avatar');
               }}
             />
             {uploadedFiles.avatar && (
               <p className="text-xs text-green-600">✓ Đã upload: {uploadedFiles.avatar}</p>
             )}
           </div>

           <div className="space-y-2">
             <label className="text-sm font-medium text-muted-foreground">CV (PDF)</label>
             <Input 
               type="file" 
               accept=".pdf"
               onChange={(e) => {
                 const file = e.target.files?.[0];
                 if (file) handleFileUpload(file, 'cv');
               }}
             />
             {uploadedFiles.cv && (
               <p className="text-xs text-green-600">✓ Đã upload: {uploadedFiles.cv}</p>
             )}
           </div>
         </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={loading || isUploading}>
            {loading || isUploading ? 'Đang cập nhật...' : 'Cập nhật hồ sơ'}
          </Button>
          {txHash && (
            <Button type="button" variant="outline" onClick={openExplorer}>
              Xem giao dịch
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}


