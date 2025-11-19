"use client";

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PostJobTab } from './PostJobTab';
import { ProjectsTab } from './ProjectsTab';

type TabType = 'post' | 'projects';

export const DashboardContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('post');

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
