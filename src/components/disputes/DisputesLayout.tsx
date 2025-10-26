"use client";

import React from 'react';
import { Container } from '@/components/ui/container';
import { Header } from '@/components/landing/header';
import { Footer } from '@/components/landing/footer';

interface DisputesLayoutProps {
  children: React.ReactNode;
}

export const DisputesLayout: React.FC<DisputesLayoutProps> = ({ children }) => {
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
