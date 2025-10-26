"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const DisputesListTab: React.FC = () => {
  return (
    <Card variant="outlined" className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-blue-800">Dispute events are ongoing</h2>
        <Button variant="outline" size="sm">Refresh</Button>
      </div>
      <div className="text-sm text-gray-700">
        No data. Connect API/on-chain to display the dispute list.
      </div>
    </Card>
  );
};
