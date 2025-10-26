"use client";
import React from 'react';
import { Container } from '@/components/ui/container';
import { HOW_IT_WORKS_STEPS } from '@/constants/landing';

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16">
      <Container>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-blue-800 mb-4">
            How it works
          </h2>
          <div className="w-16 h-1 bg-blue-800 mx-auto mb-6"></div>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            A simple 4-step process to start safe and transparent freelancing
          </p>
        </div>
        
        {/* Process table cổ điển */}
        <div className="max-w-4xl mx-auto">
          <table className="w-full border-collapse border-2 border-blue-800 bg-white">
             <thead>
               <tr className="bg-blue-600 text-white">
                 <th className="border-2 border-blue-800 p-4 text-left font-bold">Step</th>
                 <th className="border-2 border-blue-800 p-4 text-left font-bold">Action</th>
                 <th className="border-2 border-blue-800 p-4 text-left font-bold">Description</th>
               </tr>
             </thead>
            <tbody>
              {HOW_IT_WORKS_STEPS.map((step, index) => (
                <tr key={step.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border-2 border-blue-800 p-4 font-bold text-center">
                    {step.id}
                  </td>
                  <td className="border-2 border-blue-800 p-4 font-bold text-gray-900">
                    {step.title}
                  </td>
                  <td className="border-2 border-blue-800 p-4 text-gray-700">
                    {step.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quick Start Guide - Horizontal */}
        <div className="mt-12">
          <h3 className="text-xl font-bold text-blue-800 mb-6 text-center">Quick Start Guide</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {HOW_IT_WORKS_STEPS.map((step, index) => (
              <div key={step.id} className="border border-gray-400 bg-gray-50 p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-800 mb-3">
                    {step.id}
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">{step.title}</h4>
                  <p className="text-gray-700 text-sm">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
      </Container>
    </section>
  );
}
