"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CONTRACT_ADDRESS } from '@/constants/contracts';

export const JobDetailContent: React.FC = () => {
  const params = useParams();
  const jobId = params.id;
  
  const [jobDetails, setJobDetails] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobDetails = async () => {
      if (!jobId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Get job from table first to get CID
        const jobRes = await fetch(`/api/job?job_id=${jobId}`);
        if (!jobRes.ok) {
          throw new Error('Job not found');
        }
        
        const jobData = await jobRes.json();
        const cid = jobData.job?.cid;
        
        if (!cid) {
          throw new Error('Job CID not found');
        }
        
        // Fetch IPFS data using CID directly
        const res = await fetch(`/api/ipfs/get?cid=${encodeURIComponent(cid)}`);
        const data = await res.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch job details from IPFS');
        }
        
        if (data.data) {
          setJobDetails(data.data);
        }
      } catch (err: unknown) {
        setError((err as Error).message || 'Failed to fetch job details');
      } finally {
        setLoading(false);
      }
    };

    fetchJobDetails();
  }, [jobId]);


  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-700 text-lg">Loading job details...</p>
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
        <Button 
          onClick={() => window.history.back()}
          variant="outline"
          size="sm"
          className="mb-4"
        >
          ← Back to Jobs
        </Button>
        <h1 className="text-3xl font-bold text-blue-800 mb-2">Job #{String(jobId)}</h1>
      </div>

      <Card variant="outlined" className="p-8">
        {jobDetails ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-blue-800 mb-2">
                {String(jobDetails.title || 'Untitled Job')}
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {String(jobDetails.description || 'No description provided')}
              </p>
            </div>
            {(jobDetails as any).requirements && (
              <div>
                <h3 className="text-lg font-bold text-blue-800 mb-2">Requirements</h3>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {String((jobDetails as any).requirements)}
                </p>
              </div>
            )}
            {(jobDetails as any).budget && (
              <div>
                <h3 className="text-lg font-bold text-blue-800 mb-2">Budget</h3>
                <p className="text-gray-700">{String((jobDetails as any).budget)}</p>
              </div>
            )}
            {(jobDetails as any).deadline && (
              <div>
                <h3 className="text-lg font-bold text-blue-800 mb-2">Deadline</h3>
                <p className="text-gray-700">{String((jobDetails as any).deadline)}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">Job details not available</p>
          </div>
        )}
      </Card>
    </>
  );
};
