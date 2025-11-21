"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PostJobTab } from './PostJobTab';
import { ProjectsTab } from './ProjectsTab';
import { useRoles } from '@/contexts/RolesContext';

type TabType = 'post' | 'projects';

export const DashboardContent: React.FC = () => {
  const { hasPosterRole, hasFreelancerRole } = useRoles();
  const [activeTab, setActiveTab] = useState<TabType>('post');

  const availableTabs = useMemo(() => {
    const tabs: TabType[] = [];
    if (hasPosterRole) tabs.push('post');
    if (hasPosterRole || hasFreelancerRole) tabs.push('projects');
    return tabs;
  }, [hasPosterRole, hasFreelancerRole]);

  useEffect(() => {
    if (availableTabs.length === 0) {
      return;
    }
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [availableTabs, activeTab]);

  if (availableTabs.length === 0) {
    return (
      <div className="text-center p-8 border-2 border-dashed border-blue-800 rounded-lg">
        <h2 className="text-2xl font-bold text-blue-800 mb-2">Chưa có quyền truy cập Dashboard</h2>
        <p className="text-gray-700">Vui lòng đăng ký vai trò Người thuê hoặc Người làm tự do để sử dụng Dashboard.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-800 mb-2">Dashboard</h1>
        <p className="text-lg text-gray-700">Quản lý dự án và người làm tự do của bạn</p>
      </div>

      <Tabs className="w-full">
        <TabsList 
          className="flex w-full mb-6"
          activeTab={activeTab}
          setActiveTab={(value) => setActiveTab(value as TabType)}
        >
          {hasPosterRole && <TabsTrigger value="post">Đăng Dự Án</TabsTrigger>}
          {(hasPosterRole || hasFreelancerRole) && <TabsTrigger value="projects">Dự Án</TabsTrigger>}
        </TabsList>

        {hasPosterRole && (
          <TabsContent value="post">
            <PostJobTab hasPosterRole={hasPosterRole} />
          </TabsContent>
        )}

        {(hasPosterRole || hasFreelancerRole) && (
          <TabsContent value="projects">
            <ProjectsTab
              hasPosterRole={hasPosterRole}
              hasFreelancerRole={hasFreelancerRole}
            />
          </TabsContent>
        )}
      </Tabs>
    </>
  );
};
