"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';

export const ProjectsTab: React.FC = () => {
  const { account } = useWallet();
  const [loading, setLoading] = useState(false);
  const [roleStatus, setRoleStatus] = useState('');
  const [jobs, setJobs] = useState<Array<{ id: string; cid: string; poster: string; freelancer: string | null; totalAmount: string; milestoneCount: number; hasFreelancer: boolean; locked: boolean }>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    if (!account) return;
    const checkRole = async () => {
      try {
        const res = await fetch(`/api/role?address=${encodeURIComponent(account)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        const rolesData = data.roles || [];
        const roleNames = rolesData.map((r: any) => r.name).join(', ');
        setRoleStatus(roleNames ? `Bạn có role: ${roleNames}` : 'Bạn chưa có role nào. Vào trang Role để đăng ký.');
      } catch {
        setRoleStatus('Lỗi kiểm tra role');
      }
    };
    checkRole();
  }, [account]);

  const scanJobs = async () => {
    if (!account) return;
    setLoading(true);
    setJobs([]);
    try {
      const fetched = [];
      for (let id = 1; id <= 100; id++) {
        try {
          const res = await fetch(`/api/job/post?jobId=${id}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          if (!res.ok) continue;
          const data = await res.json();
          if (data.poster?.toLowerCase() === account.toLowerCase() || data.freelancer?.toLowerCase() === account.toLowerCase()) {
            fetched.push({ id: data.jobId, cid: data.cid, poster: data.poster, freelancer: data.freelancer, totalAmount: data.totalAmount, milestoneCount: data.milestoneCount, hasFreelancer: data.hasFreelancer, locked: data.locked });
          }
        } catch {}
      }
      setJobs(fetched);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (account) scanJobs();
  }, [account]);

  if (!account) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-xl text-gray-700">Vui lòng kết nối wallet</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card variant="outlined" className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-blue-800 mb-2">Dự Án</h2>
          <p className="text-gray-700">Xem và quản lý dự án từ blockchain</p>
          {roleStatus && (
            <div className="p-4 border-2 bg-blue-800 text-white border-blue-800 text-sm font-bold mt-4 rounded">
              {roleStatus}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <Button onClick={scanJobs} variant="outline" disabled={loading} className="!bg-white !text-black !border-2 !border-black py-2 font-bold hover:!bg-gray-100">
            {loading ? 'Đang tải...' : 'Làm mới'}
          </Button>
        </div>
        <div className="space-y-4">
          {jobs.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((job) => (
            <div key={job.id} className="border border-gray-400 bg-gray-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-blue-800">Job #{job.id}</h3>
                <span className="text-xs text-gray-600 break-all">CID: {job.cid}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                <div><span className="font-bold">Poster:</span> {job.poster}</div>
                <div><span className="font-bold">Freelancer:</span> {job.freelancer || '-'}</div>
                <div><span className="font-bold">Total:</span> {job.totalAmount ? `${(Number(job.totalAmount) / 100_000_000).toFixed(2)} APT` : '-'}</div>
                <div><span className="font-bold">Milestones:</span> {job.milestoneCount}</div>
                <div><span className="font-bold">Has Freelancer:</span> {job.hasFreelancer ? 'Yes' : 'No'}</div>
                <div><span className="font-bold">Locked:</span> {job.locked ? 'Yes' : 'No'}</div>
              </div>
            </div>
          ))}
          {jobs.length > 0 && (
            <div className="flex items-center justify-between gap-4 pt-2">
              <Button variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="!bg-white !text-black !border-2 !border-black py-2 px-4">
                Trước
              </Button>
              <div className="text-sm text-gray-700">
                Trang {currentPage} / {Math.max(1, Math.ceil(jobs.length / pageSize))}
              </div>
              <Button variant="outline" disabled={currentPage >= Math.ceil(jobs.length / pageSize)} onClick={() => setCurrentPage(p => Math.min(Math.ceil(jobs.length / pageSize), p + 1))} className="!bg-white !text-black !border-2 !border-black py-2 px-4">
                Sau
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
