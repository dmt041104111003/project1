"use client";

import React from 'react';
import { Container } from '@/components/ui/container';
import { Header } from '@/components/landing/header';
import { Footer } from '@/components/landing/footer';

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-20">
        <Container>
          <div className="max-w-2xl mx-auto text-center py-20">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              💬 Chat
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Tính năng chat đang được phát triển
            </p>
            <p className="text-gray-500">
              Sẽ có sớm trong các phiên bản tiếp theo
            </p>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
