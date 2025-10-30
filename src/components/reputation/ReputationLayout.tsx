"use client";

import React from 'react';
import { Container } from '@/components/ui/container';
import { Header } from '@/components/landing/header';
import { Footer } from '@/components/landing/footer';

interface ReputationLayoutProps {
  children: React.ReactNode;
}

export const ReputationLayout: React.FC<ReputationLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
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


