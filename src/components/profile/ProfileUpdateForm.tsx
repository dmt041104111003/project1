'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FileUploadInput } from '@/components/ui/file-upload-input';
import { CidDisplay } from '@/components/ui/cid-display';
import { Section, FormField } from '@/components/ui/section';
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
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
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
    const verify = async () => {
      if (!account) { setChecked(true); setIsVerified(false); return; }
      try {
        const res = await fetch(`/api/did/${account}`);
        if (res.ok) {
          const data = await res.json();
          setIsVerified(Boolean(data?.hasVerified));
        } else {
          setIsVerified(false);
        }
      } finally {
        setChecked(true);
      }
    };
    verify();
  }, [account]);

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
               
               toast.success('Loaded current profile information');
             } else {
               console.log('Data structure not recognized:', allData);
               toast.info('No freelancer profile info found, you may not have created one');
             }
           } else {
             console.log('No data returned from any CID');
             toast.info('No profile information found, you may not have created one');
           }
        } else {
          console.log('No profile data or CID found');
        }
      } catch (error) {
        console.error('Error loading existing profile:', error);
        toast.error('Unable to load current profile information');
      } finally {
        setIsLoadingProfile(false);
      }
    };

    if (isVerified) {
      loadExistingProfile();
    }
  }, [account, isVerified]);

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
      toast.success(`${type === 'avatar' ? 'Avatar' : 'CV'} uploaded successfully!`);
    } catch (err) {
      console.error(err);
      toast.error(`Upload ${type === 'avatar' ? 'avatar' : 'CV'} failed`);
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) { toast.info('Uploading, please wait...'); return; }
    if (!formData.headline.trim()) { toast.error('Please enter a Headline'); return; }
    
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

      if (account) {
        await fetch(`/api/profile/${account}` ,{
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            headline: formData.headline,
            summary: formData.summary,
            skills: formData.skills,
            experience: formData.experience,
            education: formData.education,
            links: formData.links,
            profileCid: profileBare,
            cvCid: cvBare,
            avatarCid: avatarBare,
          })
        });
      }

      const hash = await updateProfileAssets(profileBare, cvBare, avatarBare);
      setTxHash(hash);
      toast.success('Profile updated successfully!');
      
    } catch (err) {
      console.error(err);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const openExplorer = () => {
    if (!txHash) return;
    const url = `https://explorer.aptoslabs.com/txn/${txHash}?network=testnet`;
    window.open(url, '_blank');
  };

  if (!checked || !isVerified) {
    return (
      <Card>
        <div className="p-6 space-y-4 text-foreground">
          {!checked ? (
            <>
              <h3 className="text-lg font-semibold">Checking verification...</h3>
              <p className="text-sm text-muted-foreground">Please wait while we verify your DID status.</p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold">Verification required</h3>
              <p className="text-sm text-muted-foreground">You need to complete DID verification before updating your freelancer profile.</p>
              <Button onClick={() => router.push('/auth/did-verification')}>
                Go to verification
              </Button>
            </>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="p-6 space-y-4 text-foreground">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Update freelancer profile</h3>
          {isLoadingProfile && (
            <div className="text-sm text-muted-foreground">Loading current information...</div>
          )}
        </div>
        
        <FormField label="Headline">
          <Input 
            value={formData.headline}
            onChange={(e) => setFormData(prev => ({ ...prev, headline: e.target.value }))}
            placeholder="e.g. Senior Full-Stack Developer"
          />
        </FormField>

        <FormField label="Summary">
          <Textarea 
            value={formData.summary}
            onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
            placeholder="Briefly describe yourself and your expertise..."
            rows={3}
          />
        </FormField>

                 <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Skills</label>
           <div className="flex gap-2">
             <Input 
               value={skillInput} 
               onChange={(e) => setSkillInput(e.target.value)}
              placeholder="Enter a skill..." 
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

        <FormField label="Experience">
          <Textarea 
            value={formData.experience}
            onChange={(e) => setFormData(prev => ({ ...prev, experience: e.target.value }))}
            placeholder="Describe your work experience..."
            rows={4}
          />
        </FormField>

        <FormField label="Education">
          <Textarea 
            value={formData.education}
            onChange={(e) => setFormData(prev => ({ ...prev, education: e.target.value }))}
            placeholder="Education details..."
            rows={3}
          />
        </FormField>

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

        <Section title="Profile assets">
          <FileUploadInput label="Avatar" accept="image/*" onFile={(f) => handleFileUpload(f, 'avatar')} />
          {uploadedFiles.avatar && (
            <CidDisplay label="Avatar CID" cid={uploadedFiles.avatar} />
          )}

          <FileUploadInput label="CV (PDF)" accept=".pdf" onFile={(f) => handleFileUpload(f, 'cv')} />
          {uploadedFiles.cv && (
            <CidDisplay label="CV CID" cid={uploadedFiles.cv} />
          )}
        </Section>

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={loading || isUploading}>
            {loading || isUploading ? 'Updating...' : 'Update profile'}
          </Button>
          {txHash && (
            <Button type="button" variant="outline" onClick={openExplorer}>
              View transaction
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}


