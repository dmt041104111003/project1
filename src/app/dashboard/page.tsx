'use client';

import { useState, useEffect } from 'react';
import { Buffer } from 'buffer';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/landing/header';
import { Footer } from '@/components/landing/footer';
import { useWallet } from '@/contexts/WalletContext';
import { Wallet } from 'lucide-react';

interface Milestone { amount: string; duration: string; unit: string; }
interface Job { id: string; status: string; budget: number; worker_commitment?: string[]; approved: boolean; poster_commitment: string; }
type TabType = 'post' | 'manage' | 'applicants';

const sha256Hex = async (s: string) => {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return '0x' + Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
};

export default function DashboardPage() {
  const { account, connectWallet, isConnecting } = useWallet();

  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobDuration, setJobDuration] = useState('7');
  const [jobResult, setJobResult] = useState('');
  const [profileStatus, setProfileStatus] = useState('');
  const [canPostJobs, setCanPostJobs] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('post');
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [claimingJob, setClaimingJob] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<Job[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [approvingJob, setApprovingJob] = useState<string | null>(null);
  const [skillsList, setSkillsList] = useState<string[]>([]);
  const [milestonesList, setMilestonesList] = useState<Milestone[]>([]);
  const [currentSkill, setCurrentSkill] = useState('');
  const [currentMilestone, setCurrentMilestone] = useState<Milestone>({amount: '', duration: '', unit: 'ngày'});

  const getUserCommitment = async () => sha256Hex(account!);
  const getHexEncodedCommitment = (commitment: string) => '0x' + Buffer.from(commitment, 'utf8').toString('hex');

  const fetchMyJobs = async () => {
    if (!account) return;
    setLoadingJobs(true);
    try {
      const { jobs } = await fetch('/api/job/list').then(r => r.json());
      const hexCommitment = getHexEncodedCommitment(await getUserCommitment());
      setMyJobs(jobs.filter((job: Job) => job.poster_commitment === hexCommitment));
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

  const claimStake = async (jobId: string) => {
    if (!account) return;
    setClaimingJob(jobId);
    try {
      const userCommitment = await getUserCommitment();
      const expiryData = await fetch(`/api/job/check-expiry?job_id=${jobId}&milestone_index=0`).then(r => r.json());
      
      if (!expiryData.success || !expiryData.is_expired) {
        const deadline = new Date(expiryData.milestone_deadline * 1000);
        const timeLeft = Math.floor((deadline.getTime() - new Date(expiryData.current_time * 1000).getTime()) / 1000 / 60);
        alert(`Milestone not expired yet. Deadline: ${deadline.toLocaleString()}, Time left: ${timeLeft} minutes`);
        return;
      }
      
      const autoReturnData = await fetch('/api/job/auto-return-stake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, user_address: account, user_commitment: userCommitment })
      }).then(r => r.json());
      
      if (autoReturnData.success) {
        const tx = await (window as any).aptos.signAndSubmitTransaction(autoReturnData.payload);
        alert(`Stake claimed successfully! Transaction: ${tx.hash}`);
        fetchMyJobs();
      } else {
        alert(`Failed to claim stake: ${autoReturnData.error}`);
      }
    } catch (error) {
      console.error('Error claiming stake:', error);
      alert('Error claiming stake');
    } finally {
      setClaimingJob(null);
    }
  };

  const fetchApplicants = async () => {
    if (!account) return;
    setLoadingApplicants(true);
    try {
      const { jobs } = await fetch('/api/job/list').then(r => r.json());
      const hexCommitment = getHexEncodedCommitment(await getUserCommitment());
      setApplicants(jobs.filter((job: Job) => 
        job.poster_commitment === hexCommitment && job.worker_commitment && !job.approved
      ));
    } catch (error) {
      console.error('Error fetching applicants:', error);
    } finally {
      setLoadingApplicants(false);
    }
  };

  const approveWorker = async (jobId: string) => {
    if (!account) return;
    setApprovingJob(jobId);
    try {
      const data = await fetch('/api/job/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', job_id: parseInt(jobId), user_address: account, user_commitment: await getUserCommitment() })
      }).then(r => r.json());
      
      if (data.success) {
        const tx = await (window as any).aptos.signAndSubmitTransaction(data.payload);
        alert(`Worker approved successfully! Transaction: ${tx.hash}`);
        fetchApplicants();
      } else {
        alert(`Failed to approve worker: ${data.error}`);
      }
    } catch (error) {
      console.error('Error approving worker:', error);
      alert('Error approving worker');
    } finally {
      setApprovingJob(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'manage' && account) fetchMyJobs();
    else if (activeTab === 'applicants' && account) fetchApplicants();
  }, [activeTab, account]);

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

  const TIME_MULTIPLIERS = { 'giây': 1, 'phút': 60, 'giờ': 3600, 'ngày': 86400, 'tuần': 604800, 'tháng': 2592000 };
  const APT_TO_UNITS = 100_000_000;
  const MIN_MILESTONE = 0.001;
  const convertTimeToSeconds = (duration: string, unit: string) => (parseFloat(duration) || 0) * (TIME_MULTIPLIERS[unit as keyof typeof TIME_MULTIPLIERS] || 1);
  const convertAptToUnits = (apt: string) => Math.floor((parseFloat(apt) || 0) * APT_TO_UNITS);

  useEffect(() => { if (account) checkProfile(); }, [account]);

  const checkProfile = async () => {
    try {
      setProfileStatus('Đang kiểm tra profile...');
      const profileData = await fetch(`/api/ipfs/get?type=profile&commitment=${await getUserCommitment()}`).then(r => r.json());
      
      console.log('Dashboard: API response:', profileData);
      
      if (!profileData.success) {
        setProfileStatus('Profile chưa được verify! Vào /auth/did-verification để tạo profile.');
        setCanPostJobs(false);
        return;
      }
      
      const hasProfile = profileData.data && Object.keys(profileData.data).length > 0;
      const hasPosterRole = profileData.data?.blockchain_roles?.includes(2);
      
      console.log('Dashboard: Profile check:', {
        success: profileData.success,
        hasData: !!profileData.data,
        dataKeys: profileData.data ? Object.keys(profileData.data) : [],
        hasProfileData: !!profileData.profile_data, 
        profileDataKeys: profileData.profile_data ? Object.keys(profileData.profile_data) : [], // Để so sánh
        blockchain_roles: profileData.data?.blockchain_roles,
        hasProfile,
        hasPosterRole
      });
      
      if (hasProfile && hasPosterRole) {
        setProfileStatus('Profile đã được verify với role Poster! Bạn có thể đăng job.');
        setCanPostJobs(true);
      } else {
        const message = hasProfile 
          ? 'Profile đã verify nhưng không có role Poster! Vào /auth/did-verification để cập nhật role.'
          : 'Profile chưa được verify! Vào /auth/did-verification để tạo profile.';
        setProfileStatus(message);
        setCanPostJobs(false);
      }
    } catch (e: any) {
      setProfileStatus(`Lỗi kiểm tra profile: ${e?.message || 'thất bại'}`);
      setCanPostJobs(false);
    }
  };

  const createJob = async () => {
    try {
      setJobResult('Đang tạo job...');
      
      const hasInvalidMilestones = milestonesList.some(milestone => {
        const amount = parseFloat(milestone.amount);
        return amount <= 0 || amount < MIN_MILESTONE;
      });
      
      if (hasInvalidMilestones) {
        setJobResult(`Có milestone không hợp lệ. Số tiền phải >= ${MIN_MILESTONE} APT`);
        return;
      }
      
      const userCommitment = await getUserCommitment();
      const ipfsData = await fetch('/api/ipfs/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'job', title: jobTitle, description: jobDescription, requirements: skillsList, user_commitment: userCommitment })
      }).then(r => r.json());
      
      if (!ipfsData.success) throw new Error(ipfsData.error);
      
      const contractMilestones = milestonesList.map(milestone => convertAptToUnits(milestone.amount));
      const contractMilestoneDurations = milestonesList.map(milestone => convertTimeToSeconds(milestone.duration, milestone.unit));

      const data = await fetch('/api/job/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'post',
          user_address: account,
          user_commitment: userCommitment,
          job_details_cid: ipfsData.ipfsHash,
          milestones: contractMilestones,
          milestone_durations: contractMilestoneDurations,
          application_deadline: Math.floor(Date.now() / 1000) + (parseInt(jobDuration) * 24 * 60 * 60)
        })
      }).then(r => r.json());
      
      if (!data.success) throw new Error(data.error);
      
      setJobResult('Đang ký transaction...');
      const tx = await (window as any).aptos.signAndSubmitTransaction(data.payload);
      const hash = tx?.hash;
      
      setJobResult(hash ? `Job đã được tạo thành công! TX: ${hash}` : 'Job đã được gửi transaction!');
      
    } catch (e: any) {
      setJobResult(`Lỗi: ${e?.message || 'thất bại'}`);
    }
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 pt-20">
          <Container>
            <div className="max-w-2xl mx-auto text-center py-20">
              <div className="mb-8">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Wallet className="w-12 h-12 text-primary" />
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold text-text-primary mb-4">
                  Connect wallet to access Dashboard
                </h1>
                <p className="text-xl text-text-secondary mb-8">
                  You need to connect Petra wallet to manage your jobs
                </p>
              </div>
              <div className="space-y-4">
                <Button size="lg" onClick={connectWallet} disabled={isConnecting} className="flex items-center gap-2 mx-auto">
                  <Wallet className="w-5 h-5" />
                  {isConnecting ? 'Connecting...' : 'Connect Petra Wallet'}
                </Button>
                <div className="text-sm text-muted-foreground">
                  Or <Link href="/" className="text-primary hover:underline">go back to home</Link>
                </div>
              </div>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-20">
        <Container>
          <div className="space-y-6">
            {/* Tabs */}
            <div className="max-w-4xl mx-auto">
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                {(['post', 'manage', 'applicants'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab === 'post' ? 'Đăng Dự Án' : tab === 'manage' ? 'Quản Lý Dự Án' : 'Ứng Viên'}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'post' && (
            <div className="max-w-2xl mx-auto">
              <Card className="p-8">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Đăng Dự Án</h1>
                  <p className="text-gray-600">Tạo dự án mới và tìm freelancer phù hợp</p>
                  
                  {profileStatus && (
                    <div className={`p-3 rounded-lg text-sm font-medium ${
                      profileStatus.includes('đã được verify') 
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : profileStatus.includes('chưa được verify') || profileStatus.includes('không có role')
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : 'bg-blue-50 text-blue-800 border border-blue-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span>{profileStatus}</span>
                      </div>
                    </div>
                  )}
                </div>

                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); createJob(); }}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tiêu đề dự án *
                    </label>
                    <input
                      type="text"
                      required
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="Ví dụ: Phát triển smart contract"
                      disabled={!canPostJobs}
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        !canPostJobs ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mô tả dự án *
                    </label>
                    <textarea
                      required
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Mô tả chi tiết về dự án, yêu cầu và mục tiêu..."
                      rows={4}
                      disabled={!canPostJobs}
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                        !canPostJobs ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        className={`flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
                            className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => removeSkill(index)}
                              className="text-blue-600 hover:text-red-600"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Thời hạn nộp đơn
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={jobDuration}
                        onChange={(e) => setJobDuration(e.target.value)}
                        placeholder="7"
                        disabled={!canPostJobs}
                        className={`w-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          !canPostJobs ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
                        }`}
                      />
                      <select 
                        disabled={!canPostJobs}
                        title="Chọn đơn vị thời gian"
                        className={`px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
                      <label className="block text-sm font-medium text-gray-700">
                        Cột mốc dự án *
                      </label>
                      <div className="text-sm font-semibold text-blue-600">
                        Tổng: {calculateTotalBudget().toFixed(3)} APT
                      </div>
                    </div>
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
                          className={`flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            !canPostJobs ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
                          }`}
                        />
                        <input
                          type="number"
                          value={currentMilestone.duration}
                          onChange={(e) => setCurrentMilestone({...currentMilestone, duration: e.target.value})}
                          placeholder="Thời gian"
                          disabled={!canPostJobs}
                          className={`w-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            !canPostJobs ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
                          }`}
                        />
                        <select
                          value={currentMilestone.unit}
                          onChange={(e) => setCurrentMilestone({...currentMilestone, unit: e.target.value})}
                          disabled={!canPostJobs}
                          title="Chọn đơn vị thời gian cho milestone"
                          className={`px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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

                  {milestonesList.length > 0 && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Tổng ngân sách:</span>
                        <span className="text-lg font-bold text-blue-600">{calculateTotalBudget().toFixed(3)} APT</span>
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg font-semibold"
                    disabled={milestonesList.length === 0 || !canPostJobs}
                  >
                    {!canPostJobs ? 'Cần verify profile và có role Poster' : 'Đăng dự án'}
                  </Button>

                  {jobResult && (
                    <div className={`p-4 rounded-lg text-sm ${
                      jobResult.includes('thành công') 
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : jobResult.includes('Lỗi') || jobResult.includes('không hợp lệ')
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : 'bg-blue-50 text-blue-800 border border-blue-200'
                    }`}>
                      {jobResult}
                    </div>
                  )}
                </form>
              </Card>
            </div>
            )}

            {activeTab === 'manage' && (
            <div className="max-w-4xl mx-auto">
              <Card className="p-8">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Quản Lý Dự Án</h1>
                  <p className="text-gray-600">Theo dõi và quản lý các dự án của bạn</p>
                </div>

                {loadingJobs ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-text-secondary text-lg mt-4">Đang tải dự án...</p>
                  </div>
                ) : myJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Bạn chưa có dự án nào</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myJobs.map((job) => (
                      <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900">Job #{job.id}</h3>
                            <p className="text-sm text-gray-600">
                              Status: {job.status} | Worker: {job.worker_commitment ? 'Assigned' : 'None'} | Approved: {job.approved ? 'Yes' : 'No'}
                            </p>
                            <p className="text-sm text-gray-600">Budget: {(job.budget || 0).toFixed(2)} APT</p>
                          </div>
                          <div className="flex gap-2">
                            {job.approved ? (
                              <button
                                onClick={() => claimStake(job.id.toString())}
                                disabled={claimingJob === job.id.toString()}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {claimingJob === job.id.toString() ? 'Claiming...' : 'Claim Stake'}
                              </button>
                            ) : (
                              <span className="px-4 py-2 bg-gray-400 text-white rounded-md cursor-not-allowed">
                                Waiting for Approval
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
            )}

            {activeTab === 'applicants' && (
            <div className="max-w-4xl mx-auto">
              <Card className="p-8">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Ứng Viên</h1>
                  <p className="text-gray-600">Duyệt và phê duyệt ứng viên cho các dự án của bạn</p>
                </div>

                {loadingApplicants ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-text-secondary text-lg mt-4">Đang tải ứng viên...</p>
                  </div>
                ) : applicants.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Không có ứng viên nào đang chờ duyệt</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applicants.map((job) => (
                      <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900">Job #{job.id}</h3>
                            <p className="text-sm text-gray-600">
                              Status: {job.status} | Worker: {job.worker_commitment ? 'Assigned' : 'None'} | Approved: {job.approved ? 'Yes' : 'No'}
                            </p>
                            <p className="text-sm text-gray-600">Budget: {(job.budget || 0).toFixed(2)} APT</p>
                            <p className="text-sm text-gray-600">
                              Worker Commitment: {job.worker_commitment ? job.worker_commitment[0]?.slice(0, 20) + '...' : 'None'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => approveWorker(job.id.toString())}
                              disabled={approvingJob === job.id.toString()}
                              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {approvingJob === job.id.toString() ? 'Approving...' : 'Approve Worker'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
            )}
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}

