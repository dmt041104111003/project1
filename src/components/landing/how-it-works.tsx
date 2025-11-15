"use client";
import React from 'react';
import { Container } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { HOW_IT_WORKS_STEPS } from '@/constants/landing';

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16">
      <Container>
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-blue-800 mb-4">
            Cách hoạt động
          </h2>
          <div className="w-16 h-1 bg-blue-800 mx-auto mb-6"></div>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Quy trình 4 bước để bắt đầu freelancing an toàn và minh bạch
          </p>
        </div>
        
        {/* Process table cổ điển */}
        <div className="max-w-4xl mx-auto">
          <table className="w-full border-collapse border-2 border-blue-800 bg-white">
             <thead>
               <tr className="bg-blue-600 text-white">
                 <th className="border-2 border-blue-800 p-4 text-left font-bold text-lg">Step</th>
                 <th className="border-2 border-blue-800 p-4 text-left font-bold text-lg">Action</th>
                 <th className="border-2 border-blue-800 p-4 text-left font-bold text-lg">Description</th>
               </tr>
             </thead>
            <tbody>
              {HOW_IT_WORKS_STEPS.map((step, index) => (
                <tr key={step.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border-2 border-blue-800 p-4 font-bold text-center text-lg">
                    {step.id}
                  </td>
                  <td className="border-2 border-blue-800 p-4 font-bold text-gray-900 text-lg">
                    {step.title}
                  </td>
                  <td className="border-2 border-blue-800 p-4 text-gray-700 text-lg">
                    {step.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quick Start Guide - Horizontal */}
        <div className="mt-12">
          <h3 className="text-2xl font-bold text-blue-800 mb-6 text-center">Quick Start Guide</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {HOW_IT_WORKS_STEPS.map((step) => (
              <Card key={step.id} variant="default" className="text-center">
                <div className="text-3xl font-bold text-blue-800 mb-3">
                  {step.id}
                </div>
                <h4 className="font-bold text-gray-900 mb-2 text-lg">{step.title}</h4>
                <p className="text-gray-700 text-base">{step.description}</p>
              </Card>
            ))}
          </div>
        </div>
        
      </Container>
    </section>
  );
}
