"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface ReputationData {
  score: number;
  level: string;
  completedJobs: number;
  successfulJobs: number;
  disputeCount: number;
  lastUpdated: string;
}

export interface ReputationCheckerProps {
  reputation: ReputationData | null;
  loading: boolean;
  onCheckReputation: (address?: string) => void;
}

export const ReputationChecker: React.FC<ReputationCheckerProps> = ({
  reputation,
  loading,
  onCheckReputation
}) => {
  const [checkAddress, setCheckAddress] = useState('');

  const handleCheck = () => {
    if (checkAddress.trim()) {
      onCheckReputation(checkAddress.trim());
    } else {
      onCheckReputation();
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-800 bg-green-50';
    if (score >= 60) return 'text-yellow-800 bg-yellow-50';
    if (score >= 40) return 'text-orange-800 bg-orange-50';
    return 'text-red-800 bg-red-50';
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'platinum': return 'text-purple-800 bg-purple-50';
      case 'gold': return 'text-yellow-800 bg-yellow-50';
      case 'silver': return 'text-gray-800 bg-gray-50';
      case 'bronze': return 'text-orange-800 bg-orange-50';
      default: return 'text-gray-800 bg-gray-50';
    }
  };

  return (
    <Card variant="outlined" className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-blue-800">Reputation Check</h2>
        <Button 
          variant="outline" 
          size="sm" 
          className="!bg-white !text-black !border-2 !border-black"
          onClick={handleCheck}
          disabled={loading}
        >
          {loading ? 'Checking...' : 'Check Reputation'}
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address (leave empty for your own)
          </label>
          <input
            type="text"
            value={checkAddress}
            onChange={(e) => setCheckAddress(e.target.value)}
            placeholder="Enter Aptos address to check"
            className="w-full border border-gray-300 px-3 py-2 rounded-md"
          />
        </div>

        {reputation && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-3 rounded-lg ${getScoreColor(reputation.score)}`}>
                <div className="text-2xl font-bold">{reputation.score}</div>
                <div className="text-sm">Reputation Score</div>
              </div>
              <div className={`p-3 rounded-lg ${getLevelColor(reputation.level)}`}>
                <div className="text-lg font-bold">{reputation.level}</div>
                <div className="text-sm">Level</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-800">{reputation.completedJobs}</div>
                <div className="text-xs text-gray-600">Completed</div>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-800">{reputation.successfulJobs}</div>
                <div className="text-xs text-gray-600">Successful</div>
              </div>
              <div className="p-2 bg-red-50 rounded-lg">
                <div className="text-lg font-bold text-red-800">{reputation.disputeCount}</div>
                <div className="text-xs text-gray-600">Disputes</div>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              Last updated: {new Date(reputation.lastUpdated).toLocaleString()}
            </div>
          </div>
        )}

        {!reputation && !loading && (
          <div className="text-center text-gray-500 text-sm">
            Enter an address to check reputation
          </div>
        )}
      </div>
    </Card>
  );
};
