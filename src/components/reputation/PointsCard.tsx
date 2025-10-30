"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface Points {
  total: number;
  available: number;
  claimed: number;
}

export interface PointsCardProps {
  title: string;
  points: Points;
  aptBalance: number;
  loading: boolean;
  onRefresh: () => void;
  onClaim: () => void;
  disabled?: boolean;
  disabledText?: string;
}

export const PointsCard: React.FC<PointsCardProps> = ({
  title,
  points,
  aptBalance,
  loading,
  onRefresh,
  onClaim,
  disabled = false,
  disabledText,
}) => {
  const [claimAmount, setClaimAmount] = useState('');

  const handleClaim = () => {
    if (disabled) return;
    if (claimAmount && parseFloat(claimAmount) > 0 && parseFloat(claimAmount) <= points.available) {
      onClaim();
      setClaimAmount('');
    }
  };

  return (
    <Card variant="outlined" className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-blue-800">{title}</h2>
        <Button 
          variant="outline" 
          size="sm" 
          className="!bg-white !text-black !border-2 !border-black"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? 'Fetching...' : 'Refresh'}
        </Button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-800">{points.total}</div>
            <div className="text-sm text-gray-600">Total Points</div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-800">{points.available}</div>
            <div className="text-sm text-gray-600">Available</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-800">{points.claimed}</div>
            <div className="text-sm text-gray-600">Claimed</div>
          </div>
        </div>

        <div className="p-3 bg-yellow-50 rounded-lg">
          <div className="text-sm text-gray-700 mb-2">APT Balance: <span className="font-bold">{aptBalance} APT</span></div>
        </div>

        {points.available > 0 ? (
          <div className="space-y-3">
            {disabled && disabledText ? (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-2 rounded">{disabledText}</div>
            ) : null}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Claim Amount (Max: {points.available})
              </label>
              <input
                type="number"
                value={claimAmount}
                onChange={(e) => setClaimAmount(e.target.value)}
                placeholder="Enter amount to claim"
                className="w-full border border-gray-300 px-3 py-2 rounded-md"
                max={points.available}
                min="0"
                disabled={disabled}
              />
            </div>
            <Button
              variant="outline"
              className="w-full !bg-white !text-black !border-2 !border-black"
              onClick={handleClaim}
              disabled={disabled || loading || !claimAmount || parseFloat(claimAmount) <= 0}
            >
              {loading ? 'Claiming...' : 'Claim APT'}
            </Button>
          </div>
        ) : (
          <div className="text-center text-gray-500 text-sm">
            No points available to claim
          </div>
        )}
      </div>
    </Card>
  );
};


