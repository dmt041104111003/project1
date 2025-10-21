"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/landing/header';
import { Footer } from '@/components/landing/footer';

import { useWallet } from '@/contexts/WalletContext';
import { Wallet } from 'lucide-react';
import { aptosView } from '@/lib/aptos';
import { DID, JOB, CONTRACT_ADDRESS, APTOS_NODE_URL } from '@/constants/contracts';
import { Buffer } from 'buffer';


export default function DashboardPage() {
  const { account, connectWallet, isConnecting } = useWallet();

  const [didResolved, setDidResolved] = useState<string>("")
  const [didCheckResult, setDidCheckResult] = useState<string>('')
  const [didToCheck, setDidToCheck] = useState<string>('')

  // State cho Job features
  const [jobTitle, setJobTitle] = useState<string>('')
  const [jobDescription, setJobDescription] = useState<string>('')
  const [jobBudget, setJobBudget] = useState<string>('')
  const [jobDuration, setJobDuration] = useState<string>('7')
  const [jobSkills, setJobSkills] = useState<string>('')
  const [jobRequirements, setJobRequirements] = useState<string>('')
  const [jobResult, setJobResult] = useState<string>('')
  const [jobId, setJobId] = useState<string>('')
  const [jobStatus, setJobStatus] = useState<string>('')
  const [jobHistory, setJobHistory] = useState<any[]>([])
  const [loadingJobHistory, setLoadingJobHistory] = useState<boolean>(false)
  
  // State cho skills và milestones
  const [skillsList, setSkillsList] = useState<string[]>([])
  const [milestonesList, setMilestonesList] = useState<Array<{amount: string, duration: string, unit: string}>>([])
  const [currentSkill, setCurrentSkill] = useState<string>('')
  const [currentMilestone, setCurrentMilestone] = useState<{amount: string, duration: string, unit: string}>({amount: '', duration: '', unit: 'ngày'})


  const signEntry = async (functionId: string, args: unknown[]) => {
    if (!(window as any).aptos) throw new Error('Aptos wallet not available');
    const tx = { type: 'entry_function_payload', function: functionId, type_arguments: [], arguments: args };
    const res = await (window as any).aptos.signAndSubmitTransaction(tx);
    return res?.hash as string;
  }

  const sha256Hex = async (s: string) => {
    const enc = new TextEncoder();
    const data = enc.encode(s);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const bytes = Array.from(new Uint8Array(hash));
    return '0x' + bytes.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const refreshProfile = async () => {
    try {
      if (!account) return
      
      // Generate DID from account
      const didCommitHex = await sha256Hex(account);
      const did = `did:aptos:${didCommitHex}`;
      
      console.log('Generated DID:', did);
      setDidResolved(did);
      
    } catch (e) { 
      console.error(e)
      setDidResolved("Lỗi khi tạo DID")
    }
  }

  useEffect(() => { if (account) { refreshProfile() } }, [account])




  const checkDID = async () => {
    try {
      if (!didToCheck.trim()) {
        setDidCheckResult('❌ Vui lòng nhập DID');
        return;
      }
      
      setDidCheckResult('🔄 Đang kiểm tra DID...');
      
      // Extract commitment from DID string
      const didParts = didToCheck.split(':');
      if (didParts.length !== 3 || didParts[0] !== 'did' || didParts[1] !== 'aptos') {
        setDidCheckResult('❌ Format DID không hợp lệ');
        return;
      }
      
      const commitmentHex = didParts[2];
      const commitment = Buffer.from(commitmentHex.slice(2), 'hex');
      
      const rolesRes = await aptosView<any>({
        function: DID.GET_ROLE_TYPES_BY_COMMITMENT,
        arguments: [Array.from(commitment)]
      });
      const hasProfile = Array.isArray(rolesRes) && rolesRes.length > 0;
      setDidCheckResult(hasProfile ? '✅ DID hợp lệ' : '❌ DID không tồn tại');
    } catch (e: any) {
      setDidCheckResult(`❌ Lỗi: ${e?.message || 'thất bại'}`);
    }
  }

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


  // ✅ JOB FUNCTIONS
  const createJob = async () => {
    try {
      setJobResult('🔄 Đang upload metadata lên IPFS...')
      
      // Upload job metadata to IPFS
      const ipfsResponse = await fetch('/api/ipfs/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: jobTitle,
          description: jobDescription,
          budget: parseInt(jobBudget),
          duration_days: parseInt(jobDuration),
          skills_required: skillsList.length > 0 ? skillsList : jobSkills.split(',').map(s => s.trim()).filter(s => s),
          requirements: jobRequirements,
          user_address: account // Add user address for DID verification
        })
      });
      
      const ipfsData = await ipfsResponse.json();
      if (!ipfsData.success) throw new Error(ipfsData.error);
      
      setJobResult('💼 Đang tạo job...')
      console.log('IPFS upload successful:', ipfsData);
      
      const did = didResolved;
      console.log('Current DID:', did);
      
      if (!did || did === "Lỗi khi tạo DID") {
        throw new Error('Thiếu DID hoặc DID không hợp lệ. Vui lòng tạo profile trước.');
      }
      
      // Get commitment from DID
      const didParts = did.split(':');
      if (didParts.length !== 3 || didParts[0] !== 'did' || didParts[1] !== 'aptos') {
        throw new Error('DID format không hợp lệ');
      }
      
      const commitmentHex = didParts[2];
      console.log('Commitment hex:', commitmentHex);
      
      if (!commitmentHex || commitmentHex.length < 2) {
        throw new Error('Commitment hex không hợp lệ');
      }
      
      // On-chain stored commitment is ASCII bytes of the hex string ("0x...")
      const commitmentAsciiBytes = Array.from(Buffer.from(commitmentHex, 'utf8'));
      console.log('Commitment ASCII bytes:', commitmentAsciiBytes);
      
      // Convert milestones to array
      let milestones: number[];
      let durationPerMilestone: number[];
      
      if (milestonesList.length > 0) {
        milestones = milestonesList.map(m => parseInt(m.amount) * 100_000_000);
        durationPerMilestone = milestonesList.map(m => {
          const duration = parseInt(m.duration);
          const multiplier = m.unit === 'tuần' ? 7 * 86400 : m.unit === 'tháng' ? 30 * 86400 : 86400;
          return duration * multiplier;
        });
      } else {
        // Fallback to single milestone
        milestones = [parseInt(jobBudget) * 100_000_000];
        durationPerMilestone = [parseInt(jobDuration) * 86400];
      }
      
      const applicationDeadline = Math.floor(Date.now() / 1000) + (parseInt(jobDuration) * 86400);
      
      console.log('Calling contract with arguments:', {
        function: JOB.POST_JOB,
        jobTitle,
        ipfsHash: ipfsData.ipfsHash,
        milestones,
        applicationDeadline,
        skills: skillsList.length > 0 ? skillsList : jobSkills.split(',').map(s => s.trim()).filter(s => s),
        durationPerMilestone,
        commitment: commitmentAsciiBytes
      });
      
      // Convert IPFS hash to bytes array
      const cidBytes = Array.from(Buffer.from(ipfsData.ipfsHash, 'utf8'));
      console.log('CID string:', ipfsData.ipfsHash);
      console.log('CID bytes:', cidBytes);
      
      const txHash = await signEntry(JOB.POST_JOB, [
        jobTitle, // _job_title (không sử dụng trong contract)
        cidBytes, // job_details_cid as bytes array
        milestones, // milestones
        applicationDeadline, // application_deadline
        skillsList.length > 0 ? skillsList : jobSkills.split(',').map(s => s.trim()).filter(s => s), // _skills (không sử dụng)
        durationPerMilestone, // duration_per_milestone
        commitmentAsciiBytes // poster_commitment (ASCII bytes of "0x...")
      ]);
      
      console.log('Contract call successful, tx hash:', txHash);
      
      setJobResult('✅ Job đã được tạo thành công!');
    } catch (e: any) {
      setJobResult(`❌ Lỗi: ${e?.message || 'thất bại'}`);
    }
  }

  const applyToJob = async () => {
    try {
      setJobResult('🔄 Đang apply vào job...')
      const did = didResolved;
      if (!did || did === "Lỗi khi tạo DID") {
        throw new Error('Thiếu DID hoặc DID không hợp lệ. Vui lòng tạo profile trước.');
      }
      
      // Get commitment from DID
      const didParts = did.split(':');
      if (didParts.length !== 3 || didParts[0] !== 'did' || didParts[1] !== 'aptos') {
        throw new Error('DID format không hợp lệ');
      }
      
      const commitmentHex = didParts[2];
      if (!commitmentHex || commitmentHex.length < 2) {
        throw new Error('Commitment hex không hợp lệ');
      }
      
      const commitment = Buffer.from(commitmentHex.slice(2), 'hex');
      
      await signEntry(JOB.APPLY, [
        parseInt(jobId),
        Array.from(commitment) // worker_commitment
      ]);
      
      setJobResult('✅ Đã apply vào job thành công!');
    } catch (e: any) {
      setJobResult(`❌ Lỗi: ${e?.message || 'thất bại'}`);
    }
  }

  const completeJob = async () => {
    try {
      setJobResult('🔄 Đang hoàn tất job...')
      const did = didResolved;
      if (!did || did === "Lỗi khi tạo DID") {
        throw new Error('Thiếu DID hoặc DID không hợp lệ. Vui lòng tạo profile trước.');
      }
      
      // Get commitment from DID
      const didParts = did.split(':');
      if (didParts.length !== 3 || didParts[0] !== 'did' || didParts[1] !== 'aptos') {
        throw new Error('DID format không hợp lệ');
      }
      
      const commitmentHex = didParts[2];
      if (!commitmentHex || commitmentHex.length < 2) {
        throw new Error('Commitment hex không hợp lệ');
      }
      
      const commitment = Buffer.from(commitmentHex.slice(2), 'hex');
      
      await signEntry(JOB.COMPLETE_JOB, [
        parseInt(jobId),
        Array.from(commitment) // poster_commitment
      ]);
      
      setJobResult('✅ Job đã được hoàn tất!');
    } catch (e: any) {
      setJobResult(`❌ Lỗi: ${e?.message || 'thất bại'}`);
    }
  }

  const cancelJob = async () => {
    try {
      setJobResult('🔄 Đang hủy job...')
      const did = didResolved;
      if (!did || did === "Lỗi khi tạo DID") {
        throw new Error('Thiếu DID hoặc DID không hợp lệ. Vui lòng tạo profile trước.');
      }
      
      // Get commitment from DID
      const didParts = did.split(':');
      if (didParts.length !== 3 || didParts[0] !== 'did' || didParts[1] !== 'aptos') {
        throw new Error('DID format không hợp lệ');
      }
      
      const commitmentHex = didParts[2];
      if (!commitmentHex || commitmentHex.length < 2) {
        throw new Error('Commitment hex không hợp lệ');
      }
      
      const commitment = Buffer.from(commitmentHex.slice(2), 'hex');
      
      await signEntry(JOB.CANCEL_JOB, [
        parseInt(jobId),
        Array.from(commitment) // poster_commitment
      ]);
      
      setJobResult('✅ Job đã được hủy!');
    } catch (e: any) {
      setJobResult(`❌ Lỗi: ${e?.message || 'thất bại'}`);
    }
  }

  const checkJobStatus = async () => {
    try {
      setJobStatus('Đang kiểm tra...')
      const job = await aptosView<any>({ 
        function: JOB.GET_JOB_LATEST, 
        arguments: [parseInt(jobId)] 
      });
      setJobStatus(`Job ID: ${job?.[0] || 'Unknown'}, Active: ${job?.[1] || 'Unknown'}, Completed: ${job?.[2] || 'Unknown'}`);
    } catch (e: any) {
      setJobStatus(`❌ Lỗi: ${e?.message || 'thất bại'}`);
    }
  }

  const loadJobHistory = async () => {
    try {
      if (!account) return;
      
      setLoadingJobHistory(true);
      setJobHistory([]);
      
      // Query job events from blockchain
      const contractAddress = CONTRACT_ADDRESS;
      
      console.log('Loading job history for contract:', contractAddress);
      
      // Get job posted events
      const postedEvents = await fetch(`${APTOS_NODE_URL}/v1/accounts/${contractAddress}/events/${contractAddress}::escrow::Events/job_posted?limit=10`)
        .then(res => res.json())
        .catch(() => []);
      
      // Get job completed events  
      const completedEvents = await fetch(`${APTOS_NODE_URL}/v1/accounts/${contractAddress}/events/${contractAddress}::escrow::Events/job_completed?limit=10`)
        .then(res => res.json())
        .catch(() => []);
        
      // Get job cancelled events
      const cancelledEvents = await fetch(`${APTOS_NODE_URL}/v1/accounts/${contractAddress}/events/${contractAddress}::escrow::Events/job_cancelled?limit=10`)
        .then(res => res.json())
        .catch(() => []);
      
      // Process events and create history
      const history: any[] = [];
      
      // Process posted events
      if (postedEvents.data) {
        for (const event of postedEvents.data) {
          // Check if this job involves the current user
          const userAddress = account?.toLowerCase();
          const userHash = await sha256Hex(userAddress || '');
          const posterCommitment = event.data.poster_commitment;
          
          // Convert commitment to hex for comparison
          const commitmentHex = '0x' + posterCommitment.map((b: number) => b.toString(16).padStart(2, '0')).join('');
          
          if (commitmentHex === userHash) {
            history.push({
              id: event.data.job_id,
              title: event.data.job_title,
              budget: `${(event.data.escrowed_amount / 100_000_000).toFixed(2)} APT`,
              ipfs_cid: event.data.cid,
              status: 'Open',
              createdAt: new Date(parseInt(event.data.start_time) * 1000).toLocaleDateString(),
              txHash: event.version,
              type: 'Posted'
            });
          }
        }
      }
      
      // Process completed events
      if (completedEvents.data) {
        for (const event of completedEvents.data) {
          const userAddress = account?.toLowerCase();
          const userHash = await sha256Hex(userAddress || '');
          const posterCommitment = event.data.poster_commitment;
          
          // Convert commitment to hex for comparison
          const commitmentHex = '0x' + posterCommitment.map((b: number) => b.toString(16).padStart(2, '0')).join('');
          
          if (commitmentHex === userHash) {
            history.push({
              id: event.data.job_id,
              title: event.data.job_title,
              budget: `${(event.data.escrowed_amount / 100_000_000).toFixed(2)} APT`,
              freelancer: event.data.worker_commitment,
              status: 'Completed',
              createdAt: new Date(parseInt(event.data.complete_time) * 1000).toLocaleDateString(),
              txHash: event.version,
              type: 'Completed'
            });
          }
        }
      }
      
      // Process cancelled events
      if (cancelledEvents.data) {
        for (const event of cancelledEvents.data) {
          const userAddress = account?.toLowerCase();
          const userHash = await sha256Hex(userAddress || '');
          const posterCommitment = event.data.poster_commitment;
          
          // Convert commitment to hex for comparison
          const commitmentHex = '0x' + posterCommitment.map((b: number) => b.toString(16).padStart(2, '0')).join('');
          
          if (commitmentHex === userHash) {
            history.push({
              id: event.data.job_id,
              title: event.data.job_title,
              reason: event.data.reason,
              status: 'Cancelled',
              createdAt: new Date(parseInt(event.data.cancel_time) * 1000).toLocaleDateString(),
              txHash: event.version,
              type: 'Cancelled'
            });
          }
        }
      }
      
      setJobHistory(history);
      
    } catch (e: any) {
      console.error('Error loading job history:', e);
      setJobHistory([]);
    } finally {
      setLoadingJobHistory(false);
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
                  Connect wallet to access Profile
                </h1>
                <p className="text-xl text-text-secondary mb-8">
                  You need to connect Petra wallet to manage your profile
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


            {/* ✅ DID CHECK SECTION */}
            <Card className="p-6 shadow-lg border-2 border-green-200 hover:border-green-300 transition-all duration-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">🔍 Kiểm tra DID</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold block mb-2 text-gray-700 dark:text-gray-300">DID để kiểm tra</label>
                  <input 
                    className="border-2 border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 w-full focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200 hover:border-green-400" 
                    value={didToCheck} 
                    onChange={(e) => setDidToCheck(e.target.value)} 
                    placeholder="did:aptos:0x..." 
                  />
                </div>
                
                <Button 
                  size="lg" 
                  onClick={checkDID}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  🔍 Kiểm tra DID
                </Button>
                
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm border border-green-200 dark:border-green-700">
                  <strong className="text-green-800 dark:text-green-200">Kết quả:</strong> 
                  <span className="text-gray-700 dark:text-gray-300 ml-2">{didCheckResult || 'Chưa kiểm tra'}</span>
                </div>
              </div>
            </Card>


            {/* ✅ JOB MANAGEMENT SECTION */}
            <Card className="p-6 shadow-lg border-2 border-blue-200 hover:border-blue-300 transition-all duration-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">💼 Đăng Dự Án</h2>
                <div className="text-sm text-gray-600 dark:text-gray-300 bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full">
                  <div>Role sẽ được check tự động khi upload</div>
                </div>
              </div>
              
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Project Details */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold block mb-2 text-gray-700 dark:text-gray-300">Tiêu đề dự án</label>
                    <input 
                      className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200 hover:border-blue-400" 
                      value={jobTitle} 
                      onChange={(e) => setJobTitle(e.target.value)} 
                      placeholder="Ví dụ: Cần phát triển smart contract cho marketplace" 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold block mb-2 text-gray-700 dark:text-gray-300">Mô tả chi tiết</label>
                    <textarea 
                      className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200 hover:border-blue-400 resize-none" 
                      value={jobDescription} 
                      onChange={(e) => setJobDescription(e.target.value)} 
                      placeholder="Mô tả chi tiết về dự án, yêu cầu và mục tiêu..."
                      rows={4}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold block mb-2 text-gray-700 dark:text-gray-300">Kỹ năng yêu cầu</label>
                    <div className="flex gap-2">
                      <input 
                        className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200 hover:border-blue-400" 
                        value={currentSkill} 
                        onChange={(e) => setCurrentSkill(e.target.value)} 
                        placeholder="Thêm kỹ năng..." 
                        onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                      />
                      <button 
                        onClick={addSkill}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
                      >
                        +
                      </button>
                    </div>
                    {skillsList.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {skillsList.map((skill, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                          >
                            {skill}
                            <button 
                              onClick={() => removeSkill(index)}
                              className="text-blue-600 dark:text-blue-400 hover:text-red-600 dark:hover:text-red-400"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium block mb-2 text-gray-700">Thời hạn nộp đơn</label>
                    <div className="flex gap-2">
                      <input 
                        className="w-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                        value={jobDuration} 
                        onChange={(e) => setJobDuration(e.target.value)} 
                        placeholder="7" 
                      />
                      <select className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" aria-label="Đơn vị thời gian">
                        <option>ngày</option>
                        <option>tuần</option>
                        <option>tháng</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold block mb-2 text-gray-700 dark:text-gray-300">
                      Cột mốc dự án (Số tiền và thời gian ước tính cho mỗi giai đoạn)
                    </label>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input 
                          className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200 hover:border-blue-400" 
                          value={currentMilestone.amount} 
                          onChange={(e) => setCurrentMilestone({...currentMilestone, amount: e.target.value})} 
                          placeholder="Số tiền (APT)" 
                        />
                        <input 
                          className="w-32 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200 hover:border-blue-400" 
                          value={currentMilestone.duration}
                          onChange={(e) => setCurrentMilestone({...currentMilestone, duration: e.target.value})}
                          placeholder="Thời gian" 
                        />
                        <select 
                          className="px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200 hover:border-blue-400" 
                          aria-label="Đơn vị thời gian cột mốc"
                          value={currentMilestone.unit}
                          onChange={(e) => setCurrentMilestone({...currentMilestone, unit: e.target.value})}
                        >
                          <option>ngày</option>
                          <option>tuần</option>
                          <option>tháng</option>
                        </select>
                      </div>
                      <button 
                        onClick={addMilestone}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
                      >
                        <span>+</span>
                        Thêm cột mốc
                      </button>
                      {milestonesList.length > 0 && (
                        <div className="space-y-2">
                          {milestonesList.map((milestone, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {milestone.amount} APT - {milestone.duration} {milestone.unit}
                              </span>
                              <button 
                                onClick={() => removeMilestone(index)}
                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <Button 
                  size="lg" 
                  onClick={createJob}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  🚀 Đăng dự án
                </Button>
                
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm border border-blue-200 dark:border-blue-700">
                  <strong className="text-blue-800 dark:text-blue-200">Kết quả:</strong> 
                  <span className="text-gray-700 dark:text-gray-300 ml-2">{jobResult || 'Chưa thực hiện'}</span>
                </div>
              </div>
            </Card>

            {/* ✅ JOB MANAGEMENT SECTION */}
            <Card variant="outlined" className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-text-primary">🔧 Quản Lý Dự Án</h2>
              </div>
              
              <div className="max-w-2xl mx-auto space-y-6">
                <div>
                  <label className="text-sm font-semibold block mb-2 text-gray-700 dark:text-gray-300">Job ID</label>
                  <input 
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200 hover:border-blue-400" 
                    value={jobId} 
                    onChange={(e) => setJobId(e.target.value)} 
                    placeholder="Nhập Job ID..." 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    size="lg" 
                    onClick={applyToJob}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    📝 Apply Job
                  </Button>
                  <Button 
                    size="lg" 
                    onClick={completeJob}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    ✅ Hoàn tất
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    size="lg" 
                    onClick={cancelJob}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    ❌ Hủy Job
                  </Button>
                  <Button 
                    size="lg" 
                    onClick={checkJobStatus}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    🔍 Kiểm tra Status
                  </Button>
                </div>
                
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm border border-blue-200 dark:border-blue-700">
                  <strong className="text-blue-800 dark:text-blue-200">Status:</strong> 
                  <span className="text-gray-700 dark:text-gray-300 ml-2">{jobStatus || 'Chưa kiểm tra'}</span>
                </div>
              </div>
            </Card>

            {/* ✅ JOB HISTORY SECTION */}
            <Card variant="outlined" className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-text-primary">📋 Lịch sử Job</h2>
                <Button 
                  size="sm" 
                  onClick={loadJobHistory}
                  disabled={loadingJobHistory}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {loadingJobHistory ? '🔄 Đang tải...' : '🔄 Tải lịch sử'}
                </Button>
              </div>
              
              <div className="space-y-4">
                {loadingJobHistory ? (
                  <div className="text-center py-8">
                    <div className="text-lg">🔄 Đang tải lịch sử job...</div>
                  </div>
                ) : jobHistory.length > 0 ? (
                  <div className="space-y-3">
                    {jobHistory.map((job, index) => (
                      <div key={index} className="p-4 border rounded-lg bg-gray-50">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="font-medium text-gray-600">Tiêu đề</div>
                            <div className="text-blue-600 font-semibold">{job.title}</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-600">Budget</div>
                            <div className="text-green-600 font-semibold">{job.budget}</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-600">Trạng thái</div>
                            <div className={`font-semibold ${
                              job.status === 'Completed' ? 'text-green-600' : 
                              job.status === 'Open' ? 'text-blue-600' : 
                              'text-red-600'
                            }`}>
                              {job.status}
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-600">Loại</div>
                            <div className="text-purple-600 font-semibold">{job.type}</div>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t">
                          <div className="text-xs text-gray-500">
                            <strong>IPFS:</strong> {job.ipfs_cid || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">
                            <strong>Tx:</strong> {job.txHash}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-lg text-gray-500">📭 Chưa có lịch sử job</div>
                    <div className="text-sm text-gray-400 mt-2">Tạo job đầu tiên để xem lịch sử</div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}

