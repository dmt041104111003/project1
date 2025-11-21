"use client";

import React from 'react';
import { Container } from '@/components/ui/container';
import { Header } from '@/components/landing/header';
import { Footer } from '@/components/landing/footer';

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ children, className = '' }) => {
  return (
    <div className={`min-h-screen bg-white flex flex-col ${className}`}>
      <Header />
      <main className="flex-1 pt-20">
        <Container>
          {children}
        </Container>
      </main>
      <Footer />
    </div>
  );
};

