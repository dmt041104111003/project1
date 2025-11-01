"use client";

import React from 'react';
import { Button } from '@/components/ui/button';

interface Milestone { amount: string; duration: string; unit: string; }

interface ManualJobFormProps {
  jobTitle: string;
  setJobTitle: (v: string) => void;
  jobDescription: string;
  setJobDescription: (v: string) => void;
  jobDuration: string;
  setJobDuration: (v: string) => void;
  skillsList: string[];
  currentSkill: string;
  setCurrentSkill: (v: string) => void;
  addSkill: () => void;
  removeSkill: (index: number) => void;
  milestonesList: Milestone[];
  currentMilestone: Milestone;
  setCurrentMilestone: (v: Milestone) => void;
  addMilestone: () => void;
  removeMilestone: (index: number) => void;
  calculateTotalBudget: () => number;
  validationErrors: {[key: string]: string};
  canPostJobs: boolean;
  onSubmit: (e: React.FormEvent) => void;
  jobResult: string;
}

export const ManualJobForm: React.FC<ManualJobFormProps> = ({
  jobTitle,
  setJobTitle,
  jobDescription,
  setJobDescription,
  jobDuration,
  setJobDuration,
  skillsList,
  currentSkill,
  setCurrentSkill,
  addSkill,
  removeSkill,
  milestonesList,
  currentMilestone,
  setCurrentMilestone,
  addMilestone,
  removeMilestone,
  calculateTotalBudget,
  validationErrors,
  canPostJobs,
  onSubmit,
  jobResult,
}) => {
  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">
          Tiêu đề dự án *
        </label>
        <input
          type="text"
          required
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="Ví dụ: Phát triển smart contract"
          disabled={!canPostJobs}
          className={`w-full px-4 py-3 border-2 ${
            validationErrors.jobTitle 
              ? 'border-red-500 bg-red-50' 
              : 'border-gray-400'
          } ${
            !canPostJobs ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
          }`}
        />
        {validationErrors.jobTitle && (
          <p className="text-red-500 text-sm mt-1">{validationErrors.jobTitle}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">
          Mô tả dự án *
        </label>
        <textarea
          required
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Mô tả chi tiết về dự án, yêu cầu và mục tiêu..."
          rows={4}
          disabled={!canPostJobs}
          className={`w-full px-4 py-3 border-2 resize-none ${
            validationErrors.jobDescription 
              ? 'border-red-500 bg-red-50' 
              : 'border-gray-400'
          } ${
            !canPostJobs ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
          }`}
        />
        {validationErrors.jobDescription && (
          <p className="text-red-500 text-sm mt-1">{validationErrors.jobDescription}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">
          Kỹ năng yêu cầu
        </label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={currentSkill}
            onChange={(e) => setCurrentSkill(e.target.value)}
            placeholder="Thêm kỹ năng..."
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
            disabled={!canPostJobs}
            className={`flex-1 px-4 py-3 border border-gray-400 ${
              !canPostJobs ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
            }`}
          />
          <Button type="button" onClick={addSkill} variant="outline" disabled={!canPostJobs}>
            +
          </Button>
        </div>
        {skillsList.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {skillsList.map((skill, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-2 px-3 py-1 bg-blue-800 text-white text-sm rounded"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(index)}
                  className="text-white hover:text-red-300"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">
          Thời hạn nộp đơn
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={jobDuration}
            onChange={(e) => setJobDuration(e.target.value)}
            placeholder="7"
            disabled={!canPostJobs}
            className={`w-24 px-4 py-3 border border-gray-400 ${
              !canPostJobs ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
            }`}
          />
          <select 
            disabled={!canPostJobs}
            title="Chọn đơn vị thời gian"
            className={`px-4 py-3 border border-gray-400 ${
              !canPostJobs ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
            }`}
          >
            <option>ngày</option>
            <option>tuần</option>
            <option>tháng</option>
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-bold text-gray-900">
            Cột mốc dự án *
          </label>
          <span className="text-sm font-bold text-blue-800">
            Tổng: {calculateTotalBudget().toFixed(3)} APT
          </span>
        </div>
        {validationErrors.milestones && (
          <p className="text-red-500 text-sm">{validationErrors.milestones}</p>
        )}
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={currentMilestone.amount}
              onChange={(e) => setCurrentMilestone({...currentMilestone, amount: e.target.value})}
              placeholder="Số tiền (APT)"
              disabled={!canPostJobs}
              className={`flex-1 px-4 py-3 border border-gray-400 ${
                !canPostJobs ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
              }`}
            />
            <input
              type="number"
              value={currentMilestone.duration}
              onChange={(e) => setCurrentMilestone({...currentMilestone, duration: e.target.value})}
              placeholder="Thời gian"
              disabled={!canPostJobs}
              className={`w-32 px-4 py-3 border border-gray-400 ${
                !canPostJobs ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
              }`}
            />
            <select
              value={currentMilestone.unit}
              onChange={(e) => setCurrentMilestone({...currentMilestone, unit: e.target.value})}
              disabled={!canPostJobs}
              title="Chọn đơn vị thời gian cho milestone"
              className={`px-4 py-3 border border-gray-400 ${
                !canPostJobs ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
              }`}
            >
              <option value="giây">giây</option>
              <option value="phút">phút</option>
              <option value="giờ">giờ</option>
              <option value="ngày">ngày</option>
              <option value="tuần">tuần</option>
              <option value="tháng">tháng</option>
            </select>
          </div>
          <Button type="button" onClick={addMilestone} variant="outline" className="w-full" disabled={!canPostJobs}>
            + Thêm cột mốc
          </Button>
          {milestonesList.length > 0 && (
            <div className="space-y-2">
              {milestonesList.map((milestone, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-100 border border-gray-400 rounded">
                  <span className="text-sm text-gray-700">
                    {milestone.amount} APT - {milestone.duration} {milestone.unit}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeMilestone(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        variant="outline"
        className="w-full !bg-white !text-black !border-2 !border-black py-4 text-lg font-bold hover:!bg-gray-100"
        disabled={!canPostJobs}
      >
        {!canPostJobs ? 'Cần verify profile và có role Poster' : 'Đăng dự án'}
      </Button>

      {jobResult && (
        <div className="p-4 border-2 bg-blue-800 text-white border-blue-800 text-sm font-bold rounded">
          {jobResult}
        </div>
      )}
    </form>
  );
};

