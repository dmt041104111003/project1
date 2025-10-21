"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/landing/header';
import { Footer } from '@/components/landing/footer';
import { useWallet } from '@/contexts/WalletContext';

// Helper function for SHA256
const sha256Hex = async (s: string): Promise<string> => {
  const enc = new TextEncoder();
  const data = enc.encode(s);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(hash));
  return '0x' + bytes.map(b => b.toString(16).padStart(2, '0')).join('');
};
import { Wallet } from 'lucide-react';

export default function DashboardPage() {
  const { account, connectWallet, isConnecting } = useWallet();

  // State cho Job form
  const [jobTitle, setJobTitle] = useState<string>('')
  const [jobDescription, setJobDescription] = useState<string>('')
  const [jobDuration, setJobDuration] = useState<string>('7')
  const [jobSkills, setJobSkills] = useState<string>('')
  const [jobRequirements, setJobRequirements] = useState<string>('')
  const [jobResult, setJobResult] = useState<string>('')
  const [profileStatus, setProfileStatus] = useState<string>('')
  const [isProfileVerified, setIsProfileVerified] = useState<boolean | null>(null)
  
  // State cho skills và milestones
  const [skillsList, setSkillsList] = useState<string[]>([])
  const [milestonesList, setMilestonesList] = useState<Array<{amount: string, duration: string, unit: string}>>([])
  const [currentSkill, setCurrentSkill] = useState<string>('')
  const [currentMilestone, setCurrentMilestone] = useState<{amount: string, duration: string, unit: string}>({amount: '', duration: '', unit: 'ngày'})

  const sha256Hex = async (s: string) => {
    const enc = new TextEncoder();
    const data = enc.encode(s);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const bytes = Array.from(new Uint8Array(hash));
    return '0x' + bytes.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // ✅ SKILLS & MILESTONES FUNCTIONS
  const addSkill = () => {
    if (currentSkill.trim()) {
      setSkillsList([...skillsList, currentSkill.trim()]);
      setCurrentSkill('');
    }
  }

  const removeSkill = (index: number) => {
    setSkillsList(skillsList.filter((_, i) => i !== index));
  }

  const addMilestone = () => {
    if (currentMilestone.amount.trim() && currentMilestone.duration.trim()) {
      setMilestonesList([...milestonesList, currentMilestone]);
      setCurrentMilestone({amount: '', duration: '', unit: 'ngày'});
    }
  }

  const removeMilestone = (index: number) => {
    setMilestonesList(milestonesList.filter((_, i) => i !== index));
  }

  // Calculate total budget from milestones
  const calculateTotalBudget = () => {
    return milestonesList.reduce((total, milestone) => {
      const amount = parseFloat(milestone.amount) || 0;
      return total + amount;
    }, 0);
  }

  // ✅ AUTO CHECK PROFILE ON LOAD
  React.useEffect(() => {
    if (account) {
      checkProfile();
    }
  }, [account]);

  // ✅ PROFILE CHECK FUNCTION
  const checkProfile = async () => {
    try {
      setProfileStatus('🔄 Đang kiểm tra profile...')
      
      // Check if user has verified profile
      const profileCheck = await fetch('/api/did/check-profile', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const profileData = await profileCheck.json();
      if (!profileData.success) throw new Error(profileData.error);
      
      if (profileData.verified) {
        // Check if user has Poster role (role 2)
        const hasPosterRole = profileData.roleTypes && profileData.roleTypes.includes(2);
        
        if (hasPosterRole) {
          setProfileStatus('✅ Profile đã được verify với role Poster! Bạn có thể đăng job.');
          setIsProfileVerified(true);
        } else {
          setProfileStatus('❌ Profile đã verify nhưng không có role Poster! Vào /auth/did-verification để cập nhật role.');
          setIsProfileVerified(false);
        }
      } else {
        setProfileStatus('❌ Profile chưa được verify! Vào /auth/did-verification để tạo profile.');
        setIsProfileVerified(false);
      }
      
    } catch (e: any) {
      setProfileStatus(`❌ Lỗi kiểm tra profile: ${e?.message || 'thất bại'}`);
      setIsProfileVerified(false);
    }
  }

  // ✅ JOB FUNCTIONS
  const createJob = async () => {
    try {
      setJobResult('🔄 Đang tạo job...')
      
  
      
      const ipfsResponse = await fetch('/api/ipfs/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'job',
          title: jobTitle,
          description: jobDescription,
          requirements: skillsList.join(', '), // Use skills list as requirements
          user_commitment: await sha256Hex(account || '') // Generate commitment from account
        })
      });
      
      const ipfsData = await ipfsResponse.json();
      if (!ipfsData.success) throw new Error(ipfsData.error);
      
      // Now call job actions API with correct parameters
      const response = await fetch('/api/job/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'post',
          user_address: account,
          user_commitment: await sha256Hex(account || ''),
          job_details_cid: ipfsData.ipfsHash,
          milestones: milestonesList,
          application_deadline: Math.floor(Date.now() / 1000) + (parseInt(jobDuration) * 24 * 60 * 60) // Convert days to seconds
        })
      });
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      
      // Sign and submit transaction using wallet
      setJobResult('🔄 Đang ký transaction...');
      
      const wallet = (window as any).aptos;
      if (!wallet) throw new Error('Wallet not found');
      
      const tx = await wallet.signAndSubmitTransaction(data.payload);
      const hash = tx?.hash || '';
      
      if (hash) {
        setJobResult(`✅ Job đã được tạo thành công! TX: ${hash}`);
        console.log('Job created with hash:', hash);
      } else {
        setJobResult('✅ Job đã được gửi transaction!');
        console.log('Job transaction submitted');
      }
      
    } catch (e: any) {
      setJobResult(`❌ Lỗi: ${e?.message || 'thất bại'}`);
    }
  }

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
                <Button 
                  size="lg" 
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="flex items-center gap-2 mx-auto"
                >
                  <Wallet className="w-5 h-5" />
                  {isConnecting ? 'Connecting...' : 'Connect Petra Wallet'}
                </Button>
                
                <div className="text-sm text-muted-foreground">
                  Or{' '}
                  <Link href="/" className="text-primary hover:underline">
                    go back to home
                  </Link>
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
            {/* Job Form */}
            <div className="max-w-2xl mx-auto">
              <Card className="p-8">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">💼 Đăng Dự Án</h1>
                  <p className="text-gray-600 dark:text-gray-400">Tạo dự án mới và tìm freelancer phù hợp</p>
                  
                  {/* Profile Status */}
                  {profileStatus && (
                    <div className={`p-3 rounded-lg text-sm font-medium ${
                      profileStatus.includes('✅') 
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700'
                        : profileStatus.includes('❌')
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700'
                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {profileStatus.includes('✅') ? '✅' : profileStatus.includes('❌') ? '❌' : '🔄'}
                        </span>
                        <span>{profileStatus}</span>
                      </div>
                    </div>
                  )}
                </div>

                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); createJob(); }}>
                  {/* Basic Info */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tiêu đề dự án *
                    </label>
                    <input
                      type="text"
                      required
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="Ví dụ: Phát triển smart contract"
                      disabled={isProfileVerified === false}
                      className={`w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        isProfileVerified === false 
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed' 
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                      }`}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Mô tả dự án *
                    </label>
                    <textarea
                      required
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Mô tả chi tiết về dự án, yêu cầu và mục tiêu..."
                      rows={4}
                      disabled={isProfileVerified === false}
                      className={`w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                        isProfileVerified === false 
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed' 
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                      }`}
                    />
                  </div>

                  {/* Skills */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Kỹ năng yêu cầu (sẽ được lưu vào requirements)
                    </label>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={currentSkill}
                        onChange={(e) => setCurrentSkill(e.target.value)}
                        placeholder="Thêm kỹ năng..."
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                        disabled={isProfileVerified === false}
                        className={`flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          isProfileVerified === false 
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed' 
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                        }`}
                      />
                      <Button type="button" onClick={addSkill} variant="outline" disabled={isProfileVerified === false}>
                        +
                      </Button>
                    </div>
                    {skillsList.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {skillsList.map((skill, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => removeSkill(index)}
                              className="text-blue-600 dark:text-blue-400 hover:text-red-600"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Thời hạn nộp đơn
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={jobDuration}
                        onChange={(e) => setJobDuration(e.target.value)}
                        placeholder="7"
                        disabled={isProfileVerified === false}
                        className={`w-24 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          isProfileVerified === false 
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed' 
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                        }`}
                      />
                      <select 
                        disabled={isProfileVerified === false}
                        title="Chọn đơn vị thời gian"
                        className={`px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          isProfileVerified === false 
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed' 
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                        }`}
                      >
                        <option>ngày</option>
                        <option>tuần</option>
                        <option>tháng</option>
                      </select>
                    </div>
                  </div>

                  {/* Milestones */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Cột mốc dự án *
                      </label>
                      <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        Tổng: {calculateTotalBudget().toFixed(2)} APT
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={currentMilestone.amount}
                          onChange={(e) => setCurrentMilestone({...currentMilestone, amount: e.target.value})}
                          placeholder="Số tiền (APT)"
                          disabled={isProfileVerified === false}
                          className={`flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            isProfileVerified === false 
                              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed' 
                              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                          }`}
                        />
                        <input
                          type="number"
                          value={currentMilestone.duration}
                          onChange={(e) => setCurrentMilestone({...currentMilestone, duration: e.target.value})}
                          placeholder="Thời gian"
                          disabled={isProfileVerified === false}
                          className={`w-32 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            isProfileVerified === false 
                              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed' 
                              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                          }`}
                        />
                        <select
                          value={currentMilestone.unit}
                          onChange={(e) => setCurrentMilestone({...currentMilestone, unit: e.target.value})}
                          disabled={isProfileVerified === false}
                          title="Chọn đơn vị thời gian cho milestone"
                          className={`px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            isProfileVerified === false 
                              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed' 
                              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                          }`}
                        >
                          <option>ngày</option>
                          <option>tuần</option>
                          <option>tháng</option>
                        </select>
                      </div>
                      <Button type="button" onClick={addMilestone} variant="outline" className="w-full" disabled={isProfileVerified === false}>
                        + Thêm cột mốc
                      </Button>
                      {milestonesList.length > 0 && (
                        <div className="space-y-2">
                          {milestonesList.map((milestone, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
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

                  {/* Budget Summary */}
                  {milestonesList.length > 0 && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tổng ngân sách:</span>
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {calculateTotalBudget().toFixed(2)} APT
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Submit */}
                      <Button
                        type="submit"
                        size="lg"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg font-semibold"
                        disabled={milestonesList.length === 0 || isProfileVerified === false}
                      >
                        {isProfileVerified === false ? '🔒 Cần verify profile trước' : '🚀 Đăng dự án'}
                      </Button>

                  {/* Result */}
                  {jobResult && (
                    <div className={`p-4 rounded-lg text-sm ${
                      jobResult.includes('✅') 
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700'
                        : jobResult.includes('❌')
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700'
                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700'
                    }`}>
                      {jobResult}
                    </div>
                  )}
                </form>
              </Card>
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}

