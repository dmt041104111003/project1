"use client";

import React from 'react';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { HERO_DATA } from '@/constants/landing';

export function Hero() {
  return (
    <section id="home" className="min-h-screen flex items-center">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left side - Content */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold text-blue-800 mb-6">
                {HERO_DATA.title}
              </h1>
              <div className="w-20 h-1 bg-blue-800 mb-6"></div>
            </div>
            
            <p className="text-lg text-gray-700 leading-relaxed">
              {HERO_DATA.description}
            </p>
            
            <div className="space-y-4 pt-4">
              <Button 
                variant="primary" 
                size="lg" 
                className="block w-full max-w-xs !bg-gray-900 !text-white !border-2 !border-black hover:!bg-black"
              >
                {HERO_DATA.primaryCta}
              </Button>
              <Button 
                variant="secondary" 
                size="lg" 
                className="block w-full max-w-xs !bg-gray-900 !text-white !border-2 !border-black hover:!bg-black"
              >
                {HERO_DATA.secondaryCta}
              </Button>
            </div>
          </div>

          {/* Right side - Simple blocks */}
          <div>
            <div className="border border-gray-400 bg-gray-50 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">
                PLATFORM INFO
              </h2>
              
              <div className="space-y-3">
                <div className="border border-gray-300 bg-white p-3">
                  <div className="font-bold text-gray-900">Identity Verification</div>
                  <div className="text-sm text-gray-600">DID-based authentication</div>
                </div>

                <div className="border border-gray-300 bg-white p-3">
                  <div className="font-bold text-gray-900">Escrow Protection</div>
                  <div className="text-sm text-gray-600">Automated payment security</div>
                </div>

                <div className="border border-gray-300 bg-white p-3">
                  <div className="font-bold text-gray-900">Smart Contracts</div>
                  <div className="text-sm text-gray-600">Automated job completion</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}