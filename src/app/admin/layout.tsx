"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const linkClass = (href: string) => {
    const isActive = pathname === href;
    return `transition-colors font-medium relative ${
      isActive ? 'text-primary' : 'text-text-primary hover:text-primary'
    }`;
  };

  return (
    <div className="min-h-screen flex">
      <aside
        className={`border-r border-border p-4 md:p-6 transition-all duration-200 ease-in-out hidden md:block ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="mb-6 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className={`text-xl font-semibold ${isCollapsed ? 'hidden' : ''}`}>Admin</h2>
            <p className={`text-sm text-muted-foreground ${isCollapsed ? 'hidden' : ''}`}>Quản trị hệ thống</p>
          </div>
          <button
            type="button"
            aria-label="Toggle sidebar"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-sm px-2 py-1 rounded border border-border hover:bg-muted"
            title={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
          >
            {isCollapsed ? '»' : '«'}
          </button>
          <div className={isCollapsed ? 'hidden' : ''}>
            <ThemeToggle />
          </div>
        </div>
        <nav className="flex flex-col gap-2">
          <Link className={linkClass('/admin')} href="/admin">
            <span className={isCollapsed ? 'hidden' : ''}>Tổng quan</span>
          </Link>
          <Link className={linkClass('/admin/users')} href="/admin/users">
            <span className={isCollapsed ? 'hidden' : ''}>Người dùng</span>
          </Link>
          <Link className={linkClass('/admin/jobs')} href="/admin/jobs">
            <span className={isCollapsed ? 'hidden' : ''}>Việc làm</span>
          </Link>
          <Link className={linkClass('/admin/disputes')} href="/admin/disputes">
            <span className={isCollapsed ? 'hidden' : ''}>Tranh chấp</span>
          </Link>
          <Link className={linkClass('/admin/profiles')} href="/admin/profiles">
            <span className={isCollapsed ? 'hidden' : ''}>Hồ sơ</span>
          </Link>
          <Link className={linkClass('/admin/settings')} href="/admin/settings">
            <span className={isCollapsed ? 'hidden' : ''}>Cài đặt</span>
          </Link>
          <Link className="hover:text-primary mt-2" href="/">
            <span className={isCollapsed ? 'hidden' : ''}>← Về trang chủ</span>
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-0 md:p-8">
        <div className="md:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="font-semibold">Admin</div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                type="button"
                aria-label="Toggle mobile menu"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-base px-2 py-1 rounded hover:bg-muted"
              >
                {isMobileMenuOpen ? '✕' : '☰'}
              </button>
            </div>
          </div>
          {isMobileMenuOpen && (
            <div className="py-3 border-t border-border">
              <nav className="flex flex-col gap-2 px-4 pb-3">
                <Link className={linkClass('/admin')} href="/admin" onClick={() => setIsMobileMenuOpen(false)}>Tổng quan</Link>
                <Link className={linkClass('/admin/users')} href="/admin/users" onClick={() => setIsMobileMenuOpen(false)}>Người dùng</Link>
                <Link className={linkClass('/admin/jobs')} href="/admin/jobs" onClick={() => setIsMobileMenuOpen(false)}>Việc làm</Link>
                <Link className={linkClass('/admin/disputes')} href="/admin/disputes" onClick={() => setIsMobileMenuOpen(false)}>Tranh chấp</Link>
                <Link className={linkClass('/admin/profiles')} href="/admin/profiles" onClick={() => setIsMobileMenuOpen(false)}>Hồ sơ</Link>
                <Link className={linkClass('/admin/settings')} href="/admin/settings" onClick={() => setIsMobileMenuOpen(false)}>Cài đặt</Link>
                <Link className="hover:text-primary" href="/" onClick={() => setIsMobileMenuOpen(false)}>← Về trang chủ</Link>
              </nav>
            </div>
          )}
        </div>
        <div className="p-4 md:p-0">
          {children}
        </div>
      </main>
    </div>
  );
}


