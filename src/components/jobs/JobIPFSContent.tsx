"use client";

import React from 'react';
import { Card } from '@/components/ui/card';

interface JobIPFSContentProps {
  jobDetails: Record<string, unknown> | null;
}

export const JobIPFSContent: React.FC<JobIPFSContentProps> = ({ jobDetails }) => {
  return (
    <div className="lg:col-span-2">
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
                  {Array.isArray((jobDetails as any).requirements)
                    ? (jobDetails as any).requirements.join(', ')
                    : String((jobDetails as any).requirements)}
                </p>
              </div>
            )}
            
            {(jobDetails as any).budget && (
              <div>
                <h3 className="text-lg font-bold text-blue-800 mb-2">Budget</h3>
                <p className="text-gray-700">{String((jobDetails as any).budget)}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">Job details not available</p>
          </div>
        )}
      </Card>
    </div>
  );
};

