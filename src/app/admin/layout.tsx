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
            <p className={`text-sm text-muted-foreground ${isCollapsed ? 'hidden' : ''}`}>System management</p>
          </div>
          <button
            type="button"
            aria-label="Toggle sidebar"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-sm px-2 py-1 rounded border border-border hover:bg-muted"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '»' : '«'}
          </button>
          <div className={isCollapsed ? 'hidden' : ''}>
            <ThemeToggle />
          </div>
        </div>
        <nav className="flex flex-col gap-2">
          <Link className={linkClass('/admin')} href="/admin">
            <span className={isCollapsed ? 'hidden' : ''}>Overview</span>
          </Link>
          <Link className={linkClass('/admin/users')} href="/admin/users">
            <span className={isCollapsed ? 'hidden' : ''}>Users</span>
          </Link>
          <Link className={linkClass('/admin/jobs')} href="/admin/jobs">
            <span className={isCollapsed ? 'hidden' : ''}>Jobs</span>
          </Link>
          <Link className={linkClass('/admin/disputes')} href="/admin/disputes">
            <span className={isCollapsed ? 'hidden' : ''}>Disputes</span>
          </Link>
          <Link className={linkClass('/admin/settings')} href="/admin/settings">
            <span className={isCollapsed ? 'hidden' : ''}>Settings</span>
          </Link>
          <Link className="hover:text-primary mt-2" href="/">
            <span className={isCollapsed ? 'hidden' : ''}>← Back to home</span>
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
                <Link className={linkClass('/admin')} href="/admin" onClick={() => setIsMobileMenuOpen(false)}>Overview</Link>
                <Link className={linkClass('/admin/users')} href="/admin/users" onClick={() => setIsMobileMenuOpen(false)}>Users</Link>
                <Link className={linkClass('/admin/jobs')} href="/admin/jobs" onClick={() => setIsMobileMenuOpen(false)}>Jobs</Link>
                <Link className={linkClass('/admin/disputes')} href="/admin/disputes" onClick={() => setIsMobileMenuOpen(false)}>Disputes</Link>
                {/* Profiles merged into Users - link removed */}
                <Link className={linkClass('/admin/settings')} href="/admin/settings" onClick={() => setIsMobileMenuOpen(false)}>Settings</Link>
                <Link className="hover:text-primary" href="/" onClick={() => setIsMobileMenuOpen(false)}>← Back to home</Link>
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


