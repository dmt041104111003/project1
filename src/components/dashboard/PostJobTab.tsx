"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { CONTRACT_ADDRESS } from '@/constants/contracts';

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

  const TIME_MULTIPLIERS = { 'giây': 1, 'phút': 60, 'giờ': 3600, 'ngày': 86400, 'tuần': 604800, 'tháng': 2592000 } as const;
  const APT_TO_UNITS = 100_000_000;
  const MIN_MILESTONE = 0.001;
  const convertTimeToSeconds = (duration: string, unit: string) => (parseFloat(duration) || 0) * (TIME_MULTIPLIERS[unit as keyof typeof TIME_MULTIPLIERS] || 1);
  const convertAptToUnits = (apt: string) => Math.floor((parseFloat(apt) || 0) * APT_TO_UNITS);

  const checkPosterRole = useCallback(async () => {
    if (!account) return;
    try {
      setPosterStatus('Đang kiểm tra role Poster...');
      const fn = `${CONTRACT_ADDRESS}::role::has_poster`;
      const res = await fetch(`/v1/view`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ function: fn, type_arguments: [], arguments: [account] }) });
      const ok = res.ok ? await res.json() : [];
      const hasPoster = Array.isArray(ok) ? !!ok[0] : !!ok;
      setPosterStatus(hasPoster ? 'Bạn có role Poster.' : 'Bạn chưa có role Poster. Vào trang Role để đăng ký.');
      setCanPostJobs(hasPoster);
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
            <div className="p-4 border-2 bg-blue-800 text-black border-blue-800 text-sm font-bold mt-4">
              {posterStatus}
            </div>
          )}
        </div>

        <form className="space-y-6" onSubmit={(e) => { 
          e.preventDefault(); 
          console.log('Form submitted!', { jobTitle, jobDescription, milestonesList });
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
          
          console.log('Validation errors:', errors);
          
          if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            setJobResult('Vui lòng kiểm tra lại thông tin!');
            return;
          }
          
          createJob(); 
        }}>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Tiêu đề dự án *
            </label>
            <input
              type="text"
              required
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Ví dụ: Phát triển smart contract"
              disabled={!canPostJobs}
              className={`w-full px-4 py-3 border-2 ${
                validationErrors.jobTitle 
                  ? 'border-red-500 bg-red-50' 
                  : 'border-gray-400'
              } ${
                !canPostJobs ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
              }`}
            />
            {validationErrors.jobTitle && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.jobTitle}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Mô tả dự án *
            </label>
            <textarea
              required
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Mô tả chi tiết về dự án, yêu cầu và mục tiêu..."
              rows={4}
              disabled={!canPostJobs}
              className={`w-full px-4 py-3 border-2 resize-none ${
                validationErrors.jobDescription 
                  ? 'border-red-500 bg-red-50' 
                  : 'border-gray-400'
              } ${
                !canPostJobs ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
              }`}
            />
            {validationErrors.jobDescription && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.jobDescription}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Kỹ năng yêu cầu
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={currentSkill}
                onChange={(e) => setCurrentSkill(e.target.value)}
                placeholder="Thêm kỹ năng..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                disabled={!canPostJobs}
                className={`flex-1 px-4 py-3 border border-gray-400 ${
                  !canPostJobs ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
                }`}
              />
              <Button type="button" onClick={addSkill} variant="outline" disabled={!canPostJobs}>
                +
              </Button>
            </div>
            {skillsList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {skillsList.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-blue-800 text-black text-sm"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(index)}
                      className="text-black hover:text-red-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Thời hạn nộp đơn
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={jobDuration}
                onChange={(e) => setJobDuration(e.target.value)}
                placeholder="7"
                disabled={!canPostJobs}
                className={`w-24 px-4 py-3 border border-gray-400 ${
                  !canPostJobs ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
                }`}
              />
              <select 
                disabled={!canPostJobs}
                title="Chọn đơn vị thời gian"
                className={`px-4 py-3 border border-gray-400 ${
                  !canPostJobs ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
                }`}
              >
                <option>ngày</option>
                <option>tuần</option>
                <option>tháng</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-gray-900">
                Cột mốc dự án *
              </label>
              <span className="text-sm font-bold text-blue-800">
                Tổng: {calculateTotalBudget().toFixed(3)} APT
              </span>
            </div>
            {validationErrors.milestones && (
              <p className="text-red-500 text-sm">{validationErrors.milestones}</p>
            )}
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={currentMilestone.amount}
                  onChange={(e) => setCurrentMilestone({...currentMilestone, amount: e.target.value})}
                  placeholder="Số tiền (APT)"
                  disabled={!canPostJobs}
                  className={`flex-1 px-4 py-3 border border-gray-400 ${
                    !canPostJobs ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
                  }`}
                />
                <input
                  type="number"
                  value={currentMilestone.duration}
                  onChange={(e) => setCurrentMilestone({...currentMilestone, duration: e.target.value})}
                  placeholder="Thời gian"
                  disabled={!canPostJobs}
                  className={`w-32 px-4 py-3 border border-gray-400 ${
                    !canPostJobs ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
                  }`}
                />
                <select
                  value={currentMilestone.unit}
                  onChange={(e) => setCurrentMilestone({...currentMilestone, unit: e.target.value})}
                  disabled={!canPostJobs}
                  title="Chọn đơn vị thời gian cho milestone"
                  className={`px-4 py-3 border border-gray-400 ${
                    !canPostJobs ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
                  }`}
                >
                  <option value="giây">giây</option>
                  <option value="phút">phút</option>
                  <option value="giờ">giờ</option>
                  <option value="ngày">ngày</option>
                  <option value="tuần">tuần</option>
                  <option value="tháng">tháng</option>
                </select>
              </div>
              <Button type="button" onClick={addMilestone} variant="outline" className="w-full" disabled={!canPostJobs}>
                + Thêm cột mốc
              </Button>
              {milestonesList.length > 0 && (
                <div className="space-y-2">
                  {milestonesList.map((milestone, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-100 border border-gray-400">
                      <span className="text-sm text-gray-700">
                        {milestone.amount} APT - {milestone.duration} {milestone.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeMilestone(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            variant="outline"
            className="w-full !bg-white !text-black !border-2 !border-black py-4 text-lg font-bold hover:!bg-gray-100"
            disabled={!canPostJobs}
          >
            {!canPostJobs ? 'Cần verify profile và có role Poster' : 'Đăng dự án'}
          </Button>

          {jobResult && (
            <div className="p-4 border-2 bg-blue-800 text-black border-blue-800 text-sm font-bold">
              {jobResult}
            </div>
          )}
        </form>
      </Card>
    </div>
  );
};
