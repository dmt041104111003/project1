"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { JsonJobInputProps } from '@/constants/escrow';

export const JsonJobInput: React.FC<JsonJobInputProps> = ({ onParse, canPostJobs }) => {
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
          placeholder={`{\n  "title": "Phát triển smart contract",\n  "description": "Mô tả dự án...",\n  "requirements": ["Solidity", "Move"],\n  "deadline": 604800,\n  "milestones": [\n    { "amount": "0.1", "duration": "300", "unit": "giây", "reviewPeriod": "300", "reviewUnit": "giây" },\n    { "amount": "0.1", "duration": "600", "unit": "giây", "reviewPeriod": "600", "reviewUnit": "giây" }\n  ]\n}`}
          rows={15}
          disabled={!canPostJobs}
          className={`w-full px-4 py-3 border-2 font-mono text-sm resize-none ${
            jsonError ? 'border-red-500 bg-red-50' : 'border-gray-400'
          } ${
            !canPostJobs ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
          }`}
        />
        {jsonError && (
          <p className="text-red-500 text-sm mt-1">{jsonError}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={handleParse}
          variant="outline"
          disabled={!canPostJobs || !jsonInput.trim()}
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
          disabled={!canPostJobs}
          className="!bg-white !text-black !border-2 !border-black font-bold"
        >
          Clear
        </Button>
      </div>
    </div>
  );
};

