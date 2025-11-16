"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { useWallet } from '@/contexts/WalletContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { JsonJobInput } from './JsonJobInput';
import { ManualJobForm } from './ManualJobForm';
import { MilestoneForm, JsonJobParseData } from '@/constants/escrow';

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
    return rolesData.some((r: { name: string }) => r.name === 'poster');
  } catch {
    return false;
  }
};

export const PostJobTab: React.FC = () => {
  const { account } = useWallet();
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobDuration, setJobDuration] = useState('7');
  const [jobDurationUnit, setJobDurationUnit] = useState<'giây' | 'phút' | 'giờ' | 'ngày' | 'tuần' | 'tháng'>('ngày');
  const [jobResult, setJobResult] = useState('');
  const [posterStatus, setPosterStatus] = useState('');
  const [canPostJobs, setCanPostJobs] = useState(false);
  const [skillsList, setSkillsList] = useState<string[]>([]);
  const [milestonesList, setMilestonesList] = useState<MilestoneForm[]>([]);
  const [currentSkill, setCurrentSkill] = useState('');
  const [currentMilestone, setCurrentMilestone] = useState<MilestoneForm>({amount: '', duration: '', unit: 'ngày', reviewPeriod: '', reviewUnit: 'ngày'});
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [inputMode, setInputMode] = useState<'manual' | 'json'>('manual');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleJsonParse = (data: JsonJobParseData) => {
    if (data.title) setJobTitle(data.title);
    if (data.description) setJobDescription(data.description);
    if (Array.isArray(data.requirements)) setSkillsList(data.requirements);
    if (data.deadline !== undefined) {
      if (data.deadlineUnit) {
        setJobDuration(data.deadline.toString());
        setJobDurationUnit(data.deadlineUnit);
      } else {
        setJobDuration((data.deadline / (24 * 60 * 60)).toString());
        setJobDurationUnit('ngày');
      }
    }
    if (Array.isArray(data.milestones)) {
      setMilestonesList(
        data.milestones.map((m: { amount?: unknown; duration?: unknown; reviewPeriod?: unknown; unit?: string; reviewUnit?: string }) => ({
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
    
    if (isSubmitting) return;
    
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
    if (!account || isSubmitting) return;
    try {
      setIsSubmitting(true);
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
      
      const applyDeadlineValue = parseFloat(jobDuration) || 7;
      const applyDeadlineDuration = applyDeadlineValue * (TIME_MULTIPLIERS[jobDurationUnit] || 86400);
      
      const { escrowHelpers } = await import('@/utils/contractHelpers');
      
      const totalCostOctas = escrowHelpers.calculateJobCreationCost(contractMilestones);
      const totalCostAPT = totalCostOctas / APT_TO_UNITS;
      const milestonesTotal = contractMilestones.reduce((sum, m) => sum + m, 0) / APT_TO_UNITS;
      
      setJobResult(`Tổng chi phí: ${totalCostAPT.toFixed(8)} APT (Milestones: ${milestonesTotal.toFixed(8)} APT + Stake: 1 APT + Fee: 1.5 APT). Đang ký transaction...`);
      
      const payload = escrowHelpers.createJob(
        jobDetailsCid,
        contractMilestoneDurations,
        contractMilestones, 
        contractMilestoneReviewPeriods, 
        applyDeadlineDuration
      );
      
      const tx = await (window as { aptos: { signAndSubmitTransaction: (payload: unknown) => Promise<{ hash: string }> } }).aptos.signAndSubmitTransaction(payload);
      
      if (tx?.hash) {
        setJobResult(`Job đã được tạo thành công! TX: ${tx.hash}`);
        setJobTitle('');
        setJobDescription('');
        setJobDuration('7');
        setSkillsList([]);
        setMilestonesList([]);
        setCurrentSkill('');
        setCurrentMilestone({amount: '', duration: '', unit: 'ngày', reviewPeriod: '', reviewUnit: 'ngày'});
        setValidationErrors({});
      } else {
        setJobResult('Job đã được gửi transaction!');
      }
    } catch (e: unknown) {
      setJobResult(`Lỗi: ${(e as Error)?.message || 'thất bại'}`);
    } finally {
      setIsSubmitting(false);
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
          <TabsList className="flex w-full" activeTab={inputMode} setActiveTab={(v) => !isSubmitting && setInputMode(v as 'manual' | 'json')}>
            <TabsTrigger value="manual" className="flex-1" disabled={isSubmitting}>Nhập thủ công</TabsTrigger>
            <TabsTrigger value="json" className="flex-1" disabled={isSubmitting}>Paste JSON</TabsTrigger>
          </TabsList>
          <TabsContent value="json">
            <JsonJobInput onParse={handleJsonParse} canPostJobs={canPostJobs} isSubmitting={isSubmitting} />
          </TabsContent>
          <TabsContent value="manual">
            <ManualJobForm
              jobTitle={jobTitle}
              setJobTitle={setJobTitle}
              jobDescription={jobDescription}
              setJobDescription={setJobDescription}
              jobDuration={jobDuration}
              setJobDuration={setJobDuration}
              jobDurationUnit={jobDurationUnit}
              setJobDurationUnit={setJobDurationUnit}
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
              isSubmitting={isSubmitting}
            />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};
