"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { useWallet } from '@/contexts/WalletContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { JsonJobInput } from './JsonJobInput';
import { ManualJobForm } from './ManualJobForm';

interface Milestone { amount: string; duration: string; unit: string; reviewPeriod?: string; reviewUnit?: string; }

const TIME_MULTIPLIERS = { 'giây': 1, 'phút': 60, 'giờ': 3600, 'ngày': 86400, 'tuần': 604800, 'tháng': 2592000 } as const;
const APT_TO_UNITS = 100_000_000;

const checkPosterRoleFromTable = async (address: string): Promise<boolean> => {
  try {
    const res = await fetch(`/api/role?address=${encodeURIComponent(address)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) return false;
    const data = await res.json();
    const rolesData = data.roles || [];
    return rolesData.some((r: any) => r.name === 'poster');
  } catch {
    return false;
  }
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
  const [currentMilestone, setCurrentMilestone] = useState<Milestone>({amount: '', duration: '', unit: 'ngày', reviewPeriod: '', reviewUnit: 'ngày'});
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [inputMode, setInputMode] = useState<'manual' | 'json'>('manual');

  useEffect(() => {
    if (!account) return;
    const check = async () => {
      const hasPoster = await checkPosterRoleFromTable(account);
      setPosterStatus(hasPoster ? 'Bạn có role Poster.' : 'Bạn chưa có role Poster. Vào trang Role để đăng ký.');
      setCanPostJobs(hasPoster);
    };
    check();
  }, [account]);

  const addSkill = () => {
    const trimmed = currentSkill.trim();
    if (trimmed) { setSkillsList(prev => [...prev, trimmed]); setCurrentSkill(''); }
  };
  const removeSkill = (index: number) => setSkillsList(prev => prev.filter((_, i) => i !== index));
  const addMilestone = () => {
    if (!currentMilestone.amount.trim() || !currentMilestone.duration.trim()) return;
    const amount = parseFloat(currentMilestone.amount);
    if (amount <= 0) return alert('Số tiền phải lớn hơn 0');
    setMilestonesList(prev => [...prev, currentMilestone]);
    setCurrentMilestone({amount: '', duration: '', unit: 'ngày', reviewPeriod: '', reviewUnit: 'ngày'});
  };
  const removeMilestone = (index: number) => setMilestonesList(prev => prev.filter((_, i) => i !== index));
  const calculateTotalBudget = () => milestonesList.reduce((total, milestone) => total + (parseFloat(milestone.amount) || 0), 0);

  const handleJsonParse = (data: {
    title?: string;
    description?: string;
    requirements?: string[];
    deadline?: number;
    milestones?: Array<{ amount: string; duration: string; unit: string; reviewPeriod?: string; reviewUnit?: string }>;
  }) => {
    if (data.title) setJobTitle(data.title);
    if (data.description) setJobDescription(data.description);
    if (Array.isArray(data.requirements)) setSkillsList(data.requirements);
    if (data.deadline) setJobDuration((data.deadline / (24 * 60 * 60)).toString());
    if (Array.isArray(data.milestones)) {
      setMilestonesList(
        data.milestones.map((m: any) => ({
          amount: m.amount?.toString() || '',
          duration: m.duration?.toString() || '',
          unit: m.unit || 'ngày',
          reviewPeriod: m.reviewPeriod?.toString() || m.duration?.toString() || '',
          reviewUnit: m.reviewUnit || m.unit || 'ngày'
        }))
      );
    }
    setInputMode('manual');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!account) {
      setJobResult('Vui lòng kết nối ví!');
      return;
    }
    
    const hasPoster = await checkPosterRoleFromTable(account);
    if (!hasPoster) {
      setPosterStatus('Bạn chưa có role Poster. Vào trang Role để đăng ký.');
      setCanPostJobs(false);
      setJobResult('Bạn không có quyền đăng job. Vui lòng đăng ký role Poster trước!');
      return;
    }

    setValidationErrors({});
    const errors: {[key: string]: string} = {};
    if (!jobTitle.trim()) errors.jobTitle = 'Tiêu đề dự án không được để trống!';
    if (!jobDescription.trim()) errors.jobDescription = 'Mô tả dự án không được để trống!';
    if (milestonesList.length === 0) errors.milestones = 'Vui lòng thêm ít nhất một cột mốc dự án!';
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
      
      const ipfsRes = await fetch('/api/ipfs/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'job', title: jobTitle, description: jobDescription, requirements: skillsList })
      });
      const ipfsData = await ipfsRes.json();
      if (!ipfsData.success) throw new Error(ipfsData.error);
      const jobDetailsCid = ipfsData.encCid || ipfsData.ipfsHash;
      
      const contractMilestones = milestonesList.map(m => Math.floor(parseFloat(m.amount) * APT_TO_UNITS));
      const contractMilestoneDurations = milestonesList.map(m => 
        (parseFloat(m.duration) || 0) * (TIME_MULTIPLIERS[m.unit as keyof typeof TIME_MULTIPLIERS] || 1)
      );
      const contractMilestoneReviewPeriods = milestonesList.map(m => {
        const rp = (m.reviewPeriod && m.reviewPeriod.trim().length > 0) ? parseFloat(m.reviewPeriod) : parseFloat(m.duration);
        const ru = (m.reviewUnit && m.reviewUnit.trim().length > 0) ? m.reviewUnit : m.unit;
        return (rp || 0) * (TIME_MULTIPLIERS[ru as keyof typeof TIME_MULTIPLIERS] || 1);
      });
      
      const applyDeadlineDays = parseFloat(jobDuration) || 7;
      const applyDeadlineTimestamp = Math.floor(Date.now() / 1000) + (applyDeadlineDays * 24 * 60 * 60);
      
      const apiRes = await fetch('/api/job/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          job_details_cid: jobDetailsCid, 
          milestones: contractMilestones, 
          milestone_durations: contractMilestoneDurations,
          milestone_review_periods: contractMilestoneReviewPeriods,
          apply_deadline: applyDeadlineTimestamp
        })
      });
      const payload = await apiRes.json();
      if (payload.error) throw new Error(payload.error);
      
      setJobResult('Đang ký transaction...');
      const tx = await (window as { aptos: { signAndSubmitTransaction: (payload: unknown) => Promise<{ hash: string }> } }).aptos.signAndSubmitTransaction({
        type: "entry_function_payload",
        function: payload.function,
        type_arguments: payload.type_args,
        arguments: payload.args
      });
      
      setJobResult(tx?.hash ? `Job đã được tạo thành công! TX: ${tx.hash}` : 'Job đã được gửi transaction!');
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
          <TabsList className="flex w-full" activeTab={inputMode} setActiveTab={(v) => setInputMode(v as 'manual' | 'json')}>
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
