"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Header } from '@/components/landing/header';
import { Footer } from '@/components/landing/footer';
import StatsCard from '@/components/dashboard/StatsCard';
import ProjectCard from '@/components/dashboard/ProjectCard';
import ActivityItem from '@/components/dashboard/ActivityItem';
import JobPostForm from '@/components/dashboard/JobPostForm';
import JobManagementCard from '@/components/dashboard/JobManagementCard';
import { MOCK_STATS, MOCK_PROJECTS, MOCK_RECENT_ACTIVITIES, MOCK_POSTED_JOBS, MOCK_ACCEPTED_JOBS } from '@/constants/dashboard';
import { useWallet } from '@/contexts/WalletContext';
import { Wallet, ArrowRight, Shield, BarChart3, Briefcase, Activity, User, Plus, FileText, CheckCircle } from 'lucide-react';
import ProfileDisplay from '@/components/profile/ProfileDisplay';
import ProfileUpdateForm from '@/components/profile/ProfileUpdateForm';


const robotoCondensed = {
  fontFamily: "'Roboto Condensed', sans-serif",
  fontWeight: 400,
  fontStyle: 'normal',
};

export default function DashboardPage() {
  const { account, connectWallet, isConnecting } = useWallet();

  const TOP_LEVEL_TABS = ["overview", "projects", "activity", "profile", "profile-settings"] as const
  const [activeTab, setActiveTab] = useState<string>("overview")
  const PROJECT_SUB_TABS = ["post-job", "posted-jobs", "accepted-jobs"] as const
  const [projectSubTab, setProjectSubTab] = useState<string>("post-job")

  useEffect(() => {
    const applyHash = () => {
      const raw = (typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "") || "overview"
      if (raw.startsWith("projects:")) {
        const [, sub] = raw.split(":")
        setActiveTab("projects")
        if (PROJECT_SUB_TABS.includes(sub as any)) {
          setProjectSubTab(sub)
        } else {
          setProjectSubTab("post-job")
        }
        return
      }

      if (TOP_LEVEL_TABS.includes(raw as any)) {
        setActiveTab(raw)
      } else {
        setActiveTab("overview")
      }
    }
    applyHash()
    window.addEventListener("hashchange", applyHash)
    return () => window.removeEventListener("hashchange", applyHash)
  }, [])

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700&family=Roboto+Condensed:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'primary';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Hoàn thành';
      case 'in-progress': return 'Đang thực hiện';
      case 'pending': return 'Chờ xử lý';
      default: return status;
    }
  };



  if (!account) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        
        <main className="flex-1 pt-20">
          <Container>
            <div className="max-w-2xl mx-auto text-center py-20">
              <div className="mb-8">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Wallet className="w-12 h-12 text-primary" />
                </div>
                <h1 style={robotoCondensed} className="text-4xl lg:text-5xl font-bold text-text-primary mb-4">
                  Kết nối ví để truy cập Dashboard
                </h1>
                <p style={robotoCondensed} className="text-xl text-text-secondary mb-8">
                  Bạn cần kết nối ví Petra để xem thông tin dashboard và quản lý dự án
                </p>
              </div>

              <div className="space-y-4">
                <Button 
                  size="lg" 
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="flex items-center gap-2 mx-auto"
                >
                  <Wallet className="w-5 h-5" />
                  {isConnecting ? 'Đang kết nối...' : 'Kết nối ví Petra'}
                </Button>
                
                <div className="text-sm text-muted-foreground">
                  Hoặc{' '}
                  <Link href="/" className="text-primary hover:underline">
                    quay về trang chủ
                  </Link>
                </div>
              </div>
            </div>
          </Container>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-20">
        <Container>
          <div className="mb-8">
            <h1 className="text-4xl lg:text-6xl font-bold text-text-primary mb-4 leading-tight">
              <span 
                style={robotoCondensed}
                className=" text-primary block"
              >
                Dashboard
              </span>
            </h1>
            <p 
              style={robotoCondensed}
              className="text-xl lg:text-2xl text-text-secondary max-w-2xl"
            >
              Quản lý dự án và theo dõi thu nhập của bạn
            </p>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value)
              // Update URL hash without scrolling to top
              if (typeof window !== "undefined") {
                const newUrl = value === "projects"
                  ? `${window.location.pathname}#projects:${projectSubTab}`
                  : `${window.location.pathname}#${value}`
                window.history.replaceState(null, "", newUrl)
              }
            }}
            className="w-full"
          >
            <TabsList className="flex w-full mb-6">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Tổng quan
              </TabsTrigger>
              <TabsTrigger value="projects" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Dự án
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Hoạt động
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                DID Profile
              </TabsTrigger>
              <TabsTrigger value="profile-settings" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Cập nhật hồ sơ
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard 
                  title="Tổng thu nhập" 
                  value={`$${MOCK_STATS.totalEarnings.toLocaleString()}`} 
                />
                <StatsCard 
                  title="Dự án đang thực hiện" 
                  value={MOCK_STATS.activeProjects} 
                />
                <StatsCard 
                  title="Tỷ lệ hoàn thành" 
                  value={`${MOCK_STATS.completionRate}%`} 
                />
                <StatsCard 
                  title="Thanh toán chờ" 
                  value={`$${MOCK_STATS.pendingPayments.toLocaleString()}`} 
                />
              </div>

              {/* Quick Actions */}
              <Card variant="outlined" className="p-6">
                <h2 className="text-xl font-semibold text-text-primary mb-4">Thao tác nhanh</h2>
                <div className="grid md:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-16 flex flex-col gap-2">
                    <span className="text-sm">Tạo dự án mới</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex flex-col gap-2">
                    <span className="text-sm">Rút tiền</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex flex-col gap-2">
                    <span className="text-sm">Xem báo cáo</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex flex-col gap-2">
                    <span className="text-sm">Cài đặt</span>
                  </Button>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="projects" className="space-y-6">
              <Tabs value={projectSubTab} onValueChange={(sub) => {
                setProjectSubTab(sub)
                if (typeof window !== "undefined") {
                  const newUrl = `${window.location.pathname}#projects:${sub}`
                  window.history.replaceState(null, "", newUrl)
                }
              }} className="w-full">
                <TabsList className="flex w-full mb-6">
                  <TabsTrigger value="post-job" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Đăng Job
                  </TabsTrigger>
                  <TabsTrigger value="posted-jobs" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Quản lý Job đã đăng
                  </TabsTrigger>
                  <TabsTrigger value="accepted-jobs" className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Quản lý Job đã nhận
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="post-job" className="space-y-6">
                  <JobPostForm 
                    onSubmit={(jobData) => {
                      console.log('New job posted:', jobData);
                      // Handle job posting logic here
                    }}
                  />
                </TabsContent>

                <TabsContent value="posted-jobs" className="space-y-6">
                  <Card variant="outlined" className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-text-primary">Job đã đăng</h2>
                      <Button variant="outline" size="sm">
                        Xem tất cả
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      {MOCK_POSTED_JOBS.map((job) => (
                        <JobManagementCard 
                          key={job.job_id} 
                          job={job}
                          type="posted"
                          onView={(jobId) => console.log('View job:', jobId)}
                          onEdit={(jobId) => console.log('Edit job:', jobId)}
                          onDelete={(jobId) => console.log('Delete job:', jobId)}
                        />
                      ))}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="accepted-jobs" className="space-y-6">
                  <Card variant="outlined" className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-text-primary">Job đã nhận</h2>
                      <Button variant="outline" size="sm">
                        Xem tất cả
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      {MOCK_ACCEPTED_JOBS.map((job) => (
                        <JobManagementCard 
                          key={job.job_id} 
                          job={job}
                          type="accepted"
                          onView={(jobId) => console.log('View job:', jobId)}
                          getStatusColor={getStatusColor}
                          getStatusText={getStatusText}
                        />
                      ))}
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <Card variant="outlined" className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-text-primary">Hoạt động gần đây</h2>
                  <Button variant="outline" size="sm">
                    Xem tất cả
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {MOCK_RECENT_ACTIVITIES.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="profile" className="space-y-6">
              <ProfileDisplay userAddress={account} />
            </TabsContent>
            <TabsContent value="profile-settings" className="space-y-6">
              <ProfileUpdateForm />
            </TabsContent>
          </Tabs>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
