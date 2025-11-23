"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { JsonJobInputProps } from '@/constants/escrow';

export const JsonJobInput: React.FC<JsonJobInputProps> = ({ onParse, canPostJobs, isSubmitting = false }) => {
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');

  const handleParse = () => {
    try {
      setJsonError('');
      const data = JSON.parse(jsonInput);
      onParse(data);
      setJsonInput('');
    } catch (e) {
      setJsonError(`Lỗi parse JSON: ${(e as Error)?.message || 'Invalid JSON'}`);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">
          Paste JSON data
        </label>
        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder={`{\n  "title": "Phát triển smart contract",\n  "description": "Mô tả dự án...",\n  "requirements": ["Solidity", "Move"],\n  "deadline": 7,\n  "deadlineUnit": "ngày",\n  "milestones": [\n    { "amount": "0.1", "duration": "300", "unit": "giây", "reviewPeriod": "300", "reviewUnit": "giây" },\n    { "amount": "0.1", "duration": "600", "unit": "giây", "reviewPeriod": "600", "reviewUnit": "giây" }\n  ]\n}`}
          rows={15}
          disabled={!canPostJobs || isSubmitting}
          className={`w-full px-4 py-3 border-2 font-mono text-sm resize-none ${
            jsonError ? 'border-blue-500 bg-blue-50' : 'border-gray-400'
          } ${
            !canPostJobs || isSubmitting ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
          }`}
        />
        {jsonError && (
          <p className="text-blue-700 text-sm mt-1">{jsonError}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={handleParse}
          variant="outline"
          disabled={!canPostJobs || !jsonInput.trim() || isSubmitting}
          className="flex-1 !bg-white !text-black !border-2 !border-black font-bold"
        >
          Parse và điền form
        </Button>
        <Button
          type="button"
          onClick={() => {
            setJsonInput('');
            setJsonError('');
          }}
          variant="outline"
          disabled={!canPostJobs || isSubmitting}
          className="!bg-white !text-black !border-2 !border-black font-bold"
        >
          Clear
        </Button>
      </div>
    </div>
  );
};

