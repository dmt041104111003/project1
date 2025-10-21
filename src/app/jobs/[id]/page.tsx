"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { Header } from '@/components/landing/header';
import { Footer } from '@/components/landing/footer';
import { toast } from 'sonner';

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id;
  
  const [job, setJob] = useState<any>(null);
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  // Fetch job details
  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`🔄 Fetching job ${jobId} details...`);
        
        // Fetch job from blockchain
        const jobResponse = await fetch(`/api/job/detail?id=${jobId}`);
        const jobData = await jobResponse.json();
        
        console.log('📋 Job API response:', jobData);
        
        if (!jobData.success) {
          throw new Error(jobData.error || 'Failed to fetch job');
        }
        
        setJob(jobData.job);
        console.log('🔍 Job data for Apply button:', {
          status: jobData.job.status,
          worker_commitment: jobData.job.worker_commitment,
          shouldShowApply: jobData.job.status === 'active' && !jobData.job.worker_commitment
        });
        
        // Fetch job details from IPFS using jobId
        if (jobData.job.cid) {
          console.log(`🔄 Fetching job details from IPFS for job ${jobId}`);
          
          const ipfsResponse = await fetch(`/api/ipfs/get?type=job&jobId=${jobId}`);
          const ipfsData = await ipfsResponse.json();
          
          console.log('📋 IPFS response:', ipfsData);
          
          if (ipfsData.success && ipfsData.job_data) {
            setJobDetails(ipfsData.job_data);
            console.log('✅ Job details loaded:', ipfsData.job_data);
          } else {
            console.warn('⚠️ No job details found in IPFS');
          }
        }
        
      } catch (err: any) {
        console.error('❌ Error fetching job details:', err);
        setError(err.message || 'Failed to fetch job details');
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  // Handle job application
  const handleApply = async () => {
    try {
      setApplying(true);
      
      console.log(`🔄 Applying for job ${jobId}...`);
      
      // Get user address from wallet
      const wallet = (window as any).aptos;
      if (!wallet) {
        throw new Error('Wallet not found. Please connect your wallet first.');
      }
      
      const account = await wallet.account();
      if (!account) {
        throw new Error('Please connect your wallet first.');
      }
      
      // Generate commitment from account
      const crypto = await import('crypto');
      const userCommitment = crypto.createHash('sha256').update(account).digest('hex');
      
      // Call job actions API
      const response = await fetch('/api/job/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply',
          job_id: parseInt(jobId as string),
          user_address: account,
          user_commitment: userCommitment
        })
      });
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to prepare application');
      }
      
      console.log('✅ Application prepared:', data);
      
      // Sign and submit transaction
      const tx = await wallet.signAndSubmitTransaction(data.payload);
      const hash = tx?.hash || '';
      
      if (hash) {
        console.log(`✅ Application submitted! TX: ${hash}`);
        toast.success(`Application submitted successfully! Transaction: ${hash}`);
        
        // Refresh job data
        window.location.reload();
      } else {
        console.log('✅ Application transaction sent');
        toast.success('Application submitted successfully!');
      }
      
    } catch (err: any) {
      console.error('❌ Application failed:', err);
      toast.error(`Application failed: ${err.message}`);
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 pt-20">
          <Container>
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-text-secondary text-lg mt-4">
                Loading job details...
              </p>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 pt-20">
          <Container>
            <div className="text-center py-12">
              <p className="text-red-500 text-lg">
                Error: {error}
              </p>
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
          <div className="mb-8">
            <button 
              onClick={() => window.history.back()}
              className="text-primary hover:text-primary/80 mb-4 flex items-center gap-2"
            >
              ← Back to Jobs
            </button>
            
            <h1 className="text-4xl lg:text-6xl font-bold text-text-primary mb-4 leading-tight">
              <span className="text-primary block">
                Job #{job?.id}
              </span>
            </h1>
          </div>

          {job && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
                  {/* Job Details from IPFS */}
                  {jobDetails ? (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                          {jobDetails.title || 'Untitled Job'}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                          {jobDetails.description || 'No description provided'}
                        </p>
                      </div>
                      
                      {jobDetails.requirements && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Requirements
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400">
                            {jobDetails.requirements}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400">
                        Job details not available
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Job Status */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Job Status
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Status:</span>
                      <span className={`font-medium ${
                        job.status === 'active' ? 'text-green-600 dark:text-green-400' :
                        job.status === 'in_progress' ? 'text-blue-600 dark:text-blue-400' :
                        job.status === 'completed' ? 'text-gray-600 dark:text-gray-400' :
                        'text-yellow-600 dark:text-yellow-400'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Budget:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {job.budget} APT
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Milestones:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {job.milestones?.length || 0}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Worker:</span>
                      <span className={`font-medium ${
                        job.worker_commitment ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {job.worker_commitment ? 'Assigned' : 'Open'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Milestones */}
                {job.milestones && job.milestones.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Milestones
                    </h3>
                    
                    <div className="space-y-2">
                      {job.milestones.map((amount: number, index: number) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            Milestone {index + 1}:
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {(amount / 100_000_000).toFixed(2)} APT
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Apply Button */}
                {(job.status === 'active' || job.status === 'pending_approval') && !job.worker_commitment && (
                  <button 
                    onClick={handleApply}
                    disabled={applying}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg border-2 border-blue-500 hover:shadow-xl hover:from-blue-700 hover:to-purple-700 hover:border-blue-600 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {applying ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Applying...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                
                        Apply for Job
                      </span>
                    )}
                  </button>
                )}

              </div>
            </div>
          )}
        </Container>
      </main>

      <Footer />
      
    </div>
  );
}
