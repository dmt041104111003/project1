"use client";

import React from 'react';
import { Container } from '@/components/ui/container';
import { PERSONAS } from '@/constants/landing';

export function PersonaSwitcher() {
  return (
    <section id="features" className="py-16">
      <Container>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-blue-800 mb-4">
            Tính năng nền tảng
          </h2>
          <div className="w-16 h-1 bg-blue-800 mx-auto mb-6"></div>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Tất cả những gì bạn cần để freelancing an toàn và minh bạch
          </p>
        </div>
        
        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Client Features */}
          <div className="border border-gray-400 bg-gray-50 p-6 flex flex-col h-full">
            <h3 className="text-xl font-bold text-blue-800 mb-6 text-center">
              CHO KHÁCH HÀNG
            </h3>
            
            <div className="space-y-4 flex-grow">
              {PERSONAS.poster.benefits.map((benefit, index) => (
                <div key={index} className="border border-gray-300 bg-white p-4 min-h-[80px] flex items-start">
                  <div className="flex items-start gap-3 w-full">
                    <div className="w-5 h-5 bg-blue-100 text-blue-800 border border-blue-300 flex items-center justify-center font-bold text-xs rounded flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-gray-800 text-sm font-medium leading-relaxed">
                      {benefit}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-center mt-6">
              <button className="w-full px-6 py-3 bg-white text-black font-bold border-2 border-black hover:bg-gray-100 min-h-[48px]">
                {PERSONAS.poster.cta}
              </button>
            </div>
          </div>

          {/* Freelancer Features */}
          <div className="border border-gray-400 bg-gray-50 p-6 flex flex-col h-full">
            <h3 className="text-xl font-bold text-blue-800 mb-6 text-center">
              CHO FREELANCER
            </h3>
            
            <div className="space-y-4 flex-grow">
              {PERSONAS.freelancer.benefits.map((benefit, index) => (
                <div key={index} className="border border-gray-300 bg-white p-4 min-h-[80px] flex items-start">
                  <div className="flex items-start gap-3 w-full">
                    <div className="w-5 h-5 bg-blue-100 text-blue-800 border border-blue-300 flex items-center justify-center font-bold text-xs rounded flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-gray-800 text-sm font-medium leading-relaxed">
                      {benefit}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-center mt-6">
              <button className="w-full px-6 py-3 bg-white text-black font-bold border-2 border-black hover:bg-gray-100 min-h-[48px]">
                {PERSONAS.freelancer.cta}
              </button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
