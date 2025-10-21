"use client";

import React, { useState, useEffect } from 'react';
import { Container } from '@/components/ui/container';
import { Header } from '@/components/landing/header';
import { Footer } from '@/components/landing/footer';

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch jobs from blockchain
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔄 Fetching jobs from /api/job/list...');
        const response = await fetch('/api/job/list');
        const data = await response.json();
        
        console.log('📋 API response:', data);
        
        if (data.success) {
          setJobs(data.jobs || []);
          console.log(`✅ Fetched ${data.jobs?.length || 0} jobs from blockchain`);
        } else {
          setError(data.error || 'Failed to fetch jobs');
          console.error('❌ API error:', data.error);
        }
      } catch (err) {
        console.error('❌ Error fetching jobs:', err);
        setError('Failed to fetch jobs');
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-20">
        <Container>
          <div className="mb-8">
            <h1 className="text-4xl lg:text-6xl font-bold text-text-primary mb-4 leading-tight">
              <span className="text-primary block">
                Find a job
              </span>
            </h1>
            <p className="text-xl lg:text-2xl text-text-secondary max-w-2xl">
              Discover high-quality job opportunities with escrow protection
            </p>
          </div>

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-text-secondary text-lg mt-4">
                Loading jobs from blockchain...
              </p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-500 text-lg">
                Error: {error}
              </p>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.map((job) => (
                  <div 
                    key={job.id} 
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow cursor-pointer"
                    onClick={() => window.location.href = `/jobs/${job.id}`}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Job #{job.id}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {job.budget} APT • {job.milestones?.length || 0} milestones
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        job.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                        job.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                        job.status === 'completed' ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400' :
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    
                    {/* Details */}
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Worker:</span>
                        <span className={`font-medium ${
                          job.worker_commitment ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {job.worker_commitment ? 'Assigned' : 'Open'}
                        </span>
                      </div>
                      
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 break-all">
                          CID: {job.cid}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {jobs.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No jobs found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Be the first to post a job and start earning!
                  </p>
                </div>
              )}
            </>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}
