"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const DisputesSuggestionsTab: React.FC = () => {
  return (
    <Card variant="outlined" className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-blue-800">Suggestions/Comments</h2>
        <Button variant="outline" size="sm">Add Suggestions</Button>
      </div>
      <div className="text-sm text-gray-700 mb-6">
        Track your suggestions and the dispute events you have participated in.
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card variant="outlined" className="p-4">
          <div className="font-bold text-blue-800 mb-1">Suggestions</div>
          <div className="text-sm text-gray-700">No suggestions.</div>
        </Card>
        <Card variant="outlined" className="p-4">
          <div className="font-bold text-blue-800 mb-1">Dispute Events</div>
          <div className="text-sm text-gray-700">No dispute events.</div>
        </Card>
      </div>
    </Card>
  );
};
