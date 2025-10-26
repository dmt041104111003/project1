"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';

export const JobsContent: React.FC = () => {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/job/list');
        const data = await response.json();
        
        if (data.success) {
          setJobs(data.jobs || []);
        } else {
          setError(data.error || 'Failed to fetch jobs');
        }
      } catch (err) {
        setError('Failed to fetch jobs');
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-700 text-lg">Loading jobs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 text-lg">Error: {error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-800 mb-2">Find a Job</h1>
        <p className="text-lg text-gray-700">Discover high-quality job opportunities with escrow protection</p>
      </div>

      {jobs.length === 0 ? (
        <Card variant="outlined" className="p-8 text-center">
          <h3 className="text-lg font-bold text-blue-800 mb-2">No jobs found</h3>
          <p className="text-gray-700">Be the first to post a job and start earning!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <div 
              key={job.id} 
              className="cursor-pointer"
              onClick={() => {
                console.log('Clicking job:', job.id);
                router.push(`/jobs/${job.id}`);
              }}
            >
              <Card 
                variant="outlined"
                className="p-6 hover:bg-gray-50"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-blue-800">Job #{job.id}</h3>
                    <p className="text-sm text-gray-700">
                      {job.budget} APT • {job.milestones?.length || 0} milestones
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-bold border-2 ${
                    job.status === 'active' ? 'bg-green-100 text-green-800 border-green-300' :
                    job.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                    job.status === 'completed' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                    'bg-gray-100 text-gray-800 border-gray-300'
                  }`}>
                    {job.status}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Worker:</span>
                    <span className={`font-bold ${job.worker_commitment ? 'text-blue-800' : 'text-gray-600'}`}>
                      {job.worker_commitment ? 'Assigned' : 'Open'}
                    </span>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-400">
                    <p className="text-xs text-gray-600 break-all">CID: {job.cid}</p>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </>
  );
};
