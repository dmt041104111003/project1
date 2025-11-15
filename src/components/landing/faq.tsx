"use client";

import React, { useState } from 'react';
import { Container } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { FAQS } from '@/constants/landing';

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-16">
      <Container>
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-blue-800 mb-4">
            Các câu hỏi hay gặp
          </h2>
          <div className="w-16 h-1 bg-blue-800 mx-auto mb-6"></div>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Các câu hỏi hay gặp về nền tảng Marketplace2vn
          </p>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <div className="space-y-4">
            {FAQS.map((faq, index) => (
              <Card key={index} variant="outlined">
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between bg-gray-50 border-b border-gray-300"
                >
                  <span className="font-bold text-gray-900 text-lg">
                    {faq.question}
                  </span>
                  <span className="text-blue-800 font-bold text-xl">
                    {openIndex === index ? '−' : '+'}
                  </span>
                </button>
                
                {openIndex === index && (
                  <div className="px-6 py-4">
                    <p className="text-gray-700 leading-relaxed text-lg">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
