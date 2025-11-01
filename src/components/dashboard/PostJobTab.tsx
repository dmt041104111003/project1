"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { CONTRACT_ADDRESS } from '@/constants/contracts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { JsonJobInput } from './JsonJobInput';
import { ManualJobForm } from './ManualJobForm';

interface Milestone { amount: string; duration: string; unit: string; }

const sha256Hex = async (s: string) => {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return '0x' + Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
};

export const PostJobTab: React.FC = () => {
  const { account } = useWallet();
  
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobDuration, setJobDuration] = useState('7');
  const [jobResult, setJobResult] = useState('');
  const [posterStatus, setPosterStatus] = useState('');
  const [canPostJobs, setCanPostJobs] = useState(false);
  const [skillsList, setSkillsList] = useState<string[]>([]);
  const [milestonesList, setMilestonesList] = useState<Milestone[]>([]);
  const [currentSkill, setCurrentSkill] = useState('');
  const [currentMilestone, setCurrentMilestone] = useState<Milestone>({amount: '', duration: '', unit: 'ngày'});
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [inputMode, setInputMode] = useState<'manual' | 'json'>('manual');

  const TIME_MULTIPLIERS = { 'giây': 1, 'phút': 60, 'giờ': 3600, 'ngày': 86400, 'tuần': 604800, 'tháng': 2592000 } as const;
  const APT_TO_UNITS = 100_000_000;
  const MIN_MILESTONE = 0.001;
  const convertTimeToSeconds = (duration: string, unit: string) => (parseFloat(duration) || 0) * (TIME_MULTIPLIERS[unit as keyof typeof TIME_MULTIPLIERS] || 1);
  const convertAptToUnits = (apt: string) => Math.floor((parseFloat(apt) || 0) * APT_TO_UNITS);

  const checkPosterRole = useCallback(async () => {
    if (!account) return;
    try {
      setPosterStatus('Đang kiểm tra role Poster...');
      const res = await fetch('/api/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'has_poster', args: [account], typeArgs: [] })
      });
      if (!res.ok) {
        setPosterStatus('Bạn chưa có role Poster. Vào trang Role để đăng ký.');
        setCanPostJobs(false);
        return;
      }
      const hasPoster = await res.json();
      setPosterStatus(hasPoster ? 'Bạn có role Poster.' : 'Bạn chưa có role Poster. Vào trang Role để đăng ký.');
      setCanPostJobs(!!hasPoster);
    } catch (e: unknown) {
      setPosterStatus(`Lỗi kiểm tra role: ${(e as Error)?.message || 'thất bại'}`);
      setCanPostJobs(false);
    }
  }, [account]);

  useEffect(() => { if (account) checkPosterRole(); }, [account, checkPosterRole]);

  const addSkill = () => {
    const trimmed = currentSkill.trim();
    if (trimmed) { setSkillsList(prev => [...prev, trimmed]); setCurrentSkill(''); }
  };
  const removeSkill = (index: number) => setSkillsList(prev => prev.filter((_, i) => i !== index));
  const addMilestone = () => {
    if (!currentMilestone.amount.trim() || !currentMilestone.duration.trim()) return;
    const amount = parseFloat(currentMilestone.amount);
    if (amount < MIN_MILESTONE) return alert(`Số tiền tối thiểu là ${MIN_MILESTONE} APT`);
    if (amount <= 0) return alert('Số tiền phải lớn hơn 0');
    setMilestonesList(prev => [...prev, currentMilestone]);
    setCurrentMilestone({amount: '', duration: '', unit: 'ngày'});
  };
  const removeMilestone = (index: number) => setMilestonesList(prev => prev.filter((_, i) => i !== index));
  const calculateTotalBudget = () => milestonesList.reduce((total, milestone) => total + (parseFloat(milestone.amount) || 0), 0);

  const handleJsonParse = (data: {
    title?: string;
    description?: string;
    requirements?: string[];
    deadline?: number;
    milestones?: Array<{ amount: string; duration: string; unit: string }>;
  }) => {
    if (data.title) setJobTitle(data.title);
    if (data.description) setJobDescription(data.description);
    if (Array.isArray(data.requirements)) setSkillsList(data.requirements);
    if (data.deadline) {
      const days = data.deadline / (24 * 60 * 60);
      setJobDuration(days.toString());
    }
    if (Array.isArray(data.milestones)) {
      const parsed = data.milestones.map((m: any) => ({
        amount: m.amount?.toString() || '',
        duration: m.duration?.toString() || '',
        unit: m.unit || 'ngày'
      }));
      setMilestonesList(parsed);
    }
    setInputMode('manual');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    
    const errors: {[key: string]: string} = {};
    
    if (!jobTitle.trim()) {
      errors.jobTitle = 'Tiêu đề dự án không được để trống!';
    }
    if (!jobDescription.trim()) {
      errors.jobDescription = 'Mô tả dự án không được để trống!';
    }
    if (milestonesList.length === 0) {
      errors.milestones = 'Vui lòng thêm ít nhất một cột mốc dự án!';
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setJobResult('Vui lòng kiểm tra lại thông tin!');
      return;
    }
    
    createJob();
  };

  const createJob = async () => {
    if (!account) return;
    try {
      setJobResult('Đang tạo job...');
      const ipfsData = await fetch('/api/ipfs/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'job', title: jobTitle, description: jobDescription, requirements: skillsList })
      }).then(r => r.json());
      
      if (!ipfsData.success) throw new Error(ipfsData.error);
      const encCid = ipfsData.encCid || ipfsData.ipfsHash;

      const contractMilestones = milestonesList.map(milestone => convertAptToUnits(milestone.amount));
      const contractMilestoneDurations = milestonesList.map(milestone => convertTimeToSeconds(milestone.duration, milestone.unit));

      const userCommitment = await sha256Hex(account);
      const data = await fetch('/api/job/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'post',
          user_address: account,
          user_commitment: userCommitment,
          job_details_cid: encCid,
          milestones: contractMilestones,
          milestone_durations: contractMilestoneDurations,
          application_deadline: Math.floor(Date.now() / 1000) + (parseInt(jobDuration) * 24 * 60 * 60)
        })
      }).then(r => r.json());

      if (!data.success) throw new Error(data.error);
      setJobResult('Đang ký transaction...');
      const tx = await (window as { aptos: { signAndSubmitTransaction: (payload: unknown) => Promise<{ hash: string }> } }).aptos.signAndSubmitTransaction(data.payload);
      const hash = tx?.hash;
      setJobResult(hash ? `Job đã được tạo thành công! TX: ${hash}` : 'Job đã được gửi transaction!');
      
    } catch (e: unknown) {
      setJobResult(`Lỗi: ${(e as Error)?.message || 'thất bại'}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card variant="outlined" className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-blue-800 mb-2">Đăng Dự Án</h2>
          <p className="text-gray-700">Tạo dự án mới và tìm freelancer phù hợp</p>
          
          {posterStatus && (
            <div className="p-4 border-2 bg-blue-800 text-white border-blue-800 text-sm font-bold mt-4 rounded">
              {posterStatus}
            </div>
          )}
        </div>

        <Tabs className="mb-6" defaultValue={inputMode}>
          <TabsList 
            className="flex w-full"
            activeTab={inputMode}
            setActiveTab={(v) => setInputMode(v as 'manual' | 'json')}
          >
            <TabsTrigger value="manual" className="flex-1">Nhập thủ công</TabsTrigger>
            <TabsTrigger value="json" className="flex-1">Paste JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="json">
            <JsonJobInput onParse={handleJsonParse} canPostJobs={canPostJobs} />
          </TabsContent>

          <TabsContent value="manual">
            <ManualJobForm
              jobTitle={jobTitle}
              setJobTitle={setJobTitle}
              jobDescription={jobDescription}
              setJobDescription={setJobDescription}
              jobDuration={jobDuration}
              setJobDuration={setJobDuration}
              skillsList={skillsList}
              currentSkill={currentSkill}
              setCurrentSkill={setCurrentSkill}
              addSkill={addSkill}
              removeSkill={removeSkill}
              milestonesList={milestonesList}
              currentMilestone={currentMilestone}
              setCurrentMilestone={setCurrentMilestone}
              addMilestone={addMilestone}
              removeMilestone={removeMilestone}
              calculateTotalBudget={calculateTotalBudget}
              validationErrors={validationErrors}
              canPostJobs={canPostJobs}
              onSubmit={handleFormSubmit}
              jobResult={jobResult}
            />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};
