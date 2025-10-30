"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useWallet } from '@/contexts/WalletContext';
import { PostJobTab } from './PostJobTab';
import { ProjectsTab } from './ProjectsTab';

type TabType = 'post' | 'projects';

export const DashboardContent: React.FC = () => {
  const { account, connectWallet, isConnecting } = useWallet();
  const [activeTab, setActiveTab] = useState<TabType>('post');

  if (!account) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="mb-8">
          <h1 className="text-4xl lg:text-5xl font-bold text-blue-800 mb-4">
            Connect wallet to access Dashboard
          </h1>
          <p className="text-xl text-gray-700 mb-8">
            You need to connect Petra wallet to manage your jobs
          </p>
        </div>
        <div className="space-y-4">
          <Button size="lg" onClick={connectWallet} disabled={isConnecting} className="flex items-center gap-2 mx-auto">
            {isConnecting ? 'Connecting...' : 'Connect Petra Wallet'}
          </Button>
          <div className="text-sm text-gray-600">
            Or <Link href="/" className="text-blue-800 hover:underline">go back to home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-800 mb-2">Dashboard</h1>
        <p className="text-lg text-gray-700">Quản lý dự án và ứng viên của bạn</p>
      </div>

      <Tabs className="w-full">
        <TabsList 
          className="flex w-full mb-6"
          activeTab={activeTab}
          setActiveTab={(value) => setActiveTab(value as TabType)}
        >
          <TabsTrigger value="post">Đăng Dự Án</TabsTrigger>
          <TabsTrigger value="projects">Dự Án</TabsTrigger>
        </TabsList>

        <TabsContent value="post">
          <PostJobTab />
        </TabsContent>

        <TabsContent value="projects">
          <ProjectsTab />
        </TabsContent>
      </Tabs>
    </>
  );
};
