import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { JobCardProps } from '@/constants/jobs';

export default function JobCard({ job }: JobCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [detailJob, setDetailJob] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background scroll when modal open
  useEffect(() => {
    if (showDetail) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [showDetail]);

  const handleApplyJob = async () => {
    setApplying(true);
    try {
      console.log('Applying to job:', job.id);
      
      // Get user address from session or wallet
      const userAddress = '0x' + Math.random().toString(16).substr(2, 64); // Mock for now
      const commitment = '0x' + Math.random().toString(16).substr(2, 64); // Mock for now
      
      // Call apply job API
      const response = await fetch('/api/apply-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: job.id,
          userAddress,
          commitment
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`✅ ${result.message}\nTransaction: ${result.transactionHash}`);
      } else {
        throw new Error(result.error || 'Failed to apply to job');
      }
      
    } catch (error: any) {
      console.error('Error applying to job:', error);
      alert(`❌ Failed to apply to job: ${error.message || 'Unknown error'}`);
    } finally {
      setApplying(false);
    }
  };

  const handleViewDetails = async () => {
    if (!job.cid) {
      alert('No CID available for this job');
      return;
    }

    setLoading(true);
    try {
      // Fetch IPFS metadata
      const ipfsResponse = await fetch(`https://ipfs.io/ipfs/${job.cid}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!ipfsResponse.ok) {
        throw new Error('Failed to fetch job details');
      }

      const metadata = await ipfsResponse.json();
      
      // Merge blockchain data with IPFS metadata
      const fullJob = {
        ...job,
        title: metadata.title || job.title,
        description: metadata.description || job.description,
        skills: Array.isArray(metadata.skills_required)
          ? metadata.skills_required
          : (typeof metadata.skills_required === 'string'
              ? metadata.skills_required.split(',').map((s: string) => s.trim()).filter(Boolean)
              : []),
        requirements: metadata.requirements || '',
        budget: metadata.budget ?? job.budget,
        duration_days: metadata.duration_days || job.duration_days,
        created_at: metadata.created_at || job.created_at,
        version: metadata.version || '1.0.0'
      };

      setDetailJob(fullJob);
      setShowDetail(true);
    } catch (error) {
      console.error('Error fetching job details:', error);
      alert('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card variant="elevated" className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-xl font-semibold text-text-primary mb-2">
                  {job.title}
                </h3>
                <p className="text-text-secondary mb-3 line-clamp-2">
                  {job.description}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  {job.escrow && (
                    <Badge variant="success" size="sm">
                      Escrow
                    </Badge>
                  )}
                  {job.verified && (
                    <Badge variant="primary" size="sm">
                      Verified
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-text-muted">
              <span>Budget: {typeof job.budget === 'number' ? `${job.budget} APT` : (job.budget || '-')}</span>
              <span>Duration: {job.duration || '-'}</span>
              <span>Posted: {job.postedDate || '-'}</span>
              <span>By: {job.postedBy || '-'}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:items-end">
            <Button 
              size="lg" 
              className="w-full lg:w-auto"
              onClick={handleApplyJob}
              disabled={applying}
            >
              {applying ? 'Applying...' : 'Apply now'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full lg:w-auto"
              onClick={handleViewDetails}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'View details'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal for job details (portal to escape stacking context) */}
      {mounted && showDetail && detailJob && createPortal((
        <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-[2147483647]">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700 relative">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-xl sm:text-2xl font-bold">Job Details</h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowDetail(false)}
                >
                  ✕ Close
                </Button>
              </div>
              
              <div className="space-y-6">
                {/* Header */}
                <div className="border-b pb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {detailJob.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                    {detailJob.description}
                  </p>
                  <div className="flex gap-2 mt-4">
                    {detailJob.escrow && (
                      <Badge variant="success" size="sm">
                        Escrow Protected
                      </Badge>
                    )}
                    {detailJob.verified && (
                      <Badge variant="primary" size="sm">
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Skills */}
                {Array.isArray(detailJob.skills) && detailJob.skills.length > 0 && (
                  <div className="border-b pb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Required Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {detailJob.skills.map((skill: string, index: number) => (
                        <Badge key={index} variant="default" size="sm">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Requirements */}
                {detailJob.requirements && (
                  <div className="border-b pb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Requirements</h3>
                    <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {detailJob.requirements}
                    </p>
                  </div>
                )}

                {/* Job Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Budget & Duration */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">💰 Budget & Duration</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Total Budget:</span>
                        <span className="font-semibold text-green-600">
                          {typeof detailJob.budget === 'number' ? `${detailJob.budget} APT` : (detailJob.budget || '-')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Duration:</span>
                        <span className="font-semibold">{detailJob.duration || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Posted Info */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">📅 Posted Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Posted:</span>
                        <span className="font-semibold">{detailJob.postedDate || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Posted By:</span>
                        <span className="font-semibold text-blue-600 truncate max-w-32">
                          {detailJob.postedBy || '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Milestones Detail */}
                {detailJob.milestones && Array.isArray(detailJob.milestones) && detailJob.milestones.length > 0 && (
                  <div className="border-b pb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🎯 Milestones</h3>
                    <div className="space-y-3">
                      {detailJob.milestones
                        .filter((milestone: any) => typeof milestone === 'number' && milestone > 0)
                        .map((milestone: number, index: number) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">Milestone {index + 1}</span>
                          </div>
                          <span className="text-lg font-bold text-green-600">
                            {(milestone / 100_000_000).toFixed(2)} APT
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6">
                  <Button 
                    size="lg" 
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleApplyJob}
                    disabled={applying}
                  >
                    {applying ? '🔄 Applying...' : '🚀 Apply now'}
                  </Button>
                  <Button variant="outline" size="lg" className="flex-1">
                    💾 Save for later
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}
    </>
  );
}
