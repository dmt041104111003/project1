"use client";
import React, { useRef, useEffect, useState } from 'react';
import { Container } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { HOW_IT_WORKS_STEPS } from '@/constants/landing';

export function HowItWorks() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [clickedStep, setClickedStep] = useState<number | null>(null);
  const [isTableHovered, setIsTableHovered] = useState(false);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  const scrollToStep = (stepIndex: number) => {
    if (stepRefs.current[stepIndex] && scrollContainerRef.current) {
      const element = stepRefs.current[stepIndex];
      const container = scrollContainerRef.current;
      const elementLeft = element.offsetLeft;
      const elementWidth = element.offsetWidth;
      const containerWidth = container.offsetWidth;
      const scrollLeft = elementLeft - (containerWidth / 2) + (elementWidth / 2);
      
      container.scrollTo({ 
        left: scrollLeft, 
        behavior: 'smooth' 
      });
      setCurrentStep(stepIndex);
      setClickedStep(stepIndex);
    }
  };

  const handleCardClick = (stepIndex: number) => {
    scrollToStep(stepIndex);
    setIsAutoPlaying(false);
  };

  const scrollToStart = () => {
    scrollToStep(0);
    setIsAutoPlaying(false);
  };

  const scrollToEnd = () => {
    scrollToStep(HOW_IT_WORKS_STEPS.length - 1);
    setIsAutoPlaying(false);
  };

  useEffect(() => {
    if (!isAutoPlaying || !scrollContainerRef.current) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        const nextStep = (prev + 1) % HOW_IT_WORKS_STEPS.length;
        if (stepRefs.current[nextStep] && scrollContainerRef.current) {
          const element = stepRefs.current[nextStep];
          const container = scrollContainerRef.current;
          const elementLeft = element.offsetLeft;
          const elementWidth = element.offsetWidth;
          const containerWidth = container.offsetWidth;
          const scrollLeft = elementLeft - (containerWidth / 2) + (elementWidth / 2);
          
          container.scrollTo({ 
            left: scrollLeft, 
            behavior: 'smooth' 
          });
        }
        return nextStep;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const handleMouseEnter = () => {
    setIsAutoPlaying(false);
  };

  const handleMouseLeave = () => {
    setIsAutoPlaying(true);
  };

  return (
    <section id="how-it-works" className="py-16">
      <Container>
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-blue-800 mb-4">
            Cách hoạt động
          </h2>
          <div className="w-16 h-1 bg-blue-800 mx-auto mb-6"></div>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Quy trình 7 bước để bắt đầu freelancing an toàn và minh bạch với ZK Proof và escrow
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <table 
            className="w-full border-collapse border-2 border-blue-800 bg-white"
            onMouseEnter={() => setIsTableHovered(true)}
            onMouseLeave={() => setIsTableHovered(false)}
          >
             <thead>
               <tr className="bg-blue-600 text-white">
                 <th className="border-2 border-blue-800 p-4 text-center font-bold text-lg">Bước</th>
                 <th className="border-2 border-blue-800 p-4 text-center font-bold text-lg">Hành động</th>
                 <th className="border-2 border-blue-800 p-4 text-center font-bold text-lg">Mô tả</th>
               </tr>
             </thead>
            <tbody>
              {(isTableHovered ? HOW_IT_WORKS_STEPS : HOW_IT_WORKS_STEPS.slice(0, 4)).map((step, index) => (
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

        {/* Quick Start Guide - Flow với mũi tên */}
        <div className="mt-12">
          <h3 className="text-2xl font-bold text-blue-800 mb-8 text-center">Hướng dẫn nhanh</h3>
          
          {/* Desktop: Horizontal flow */}
          <div 
            ref={scrollContainerRef}
            className="hidden lg:block overflow-x-auto pb-8 scrollbar-hide" 
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none',
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch'
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <style jsx>{`
              .scrollbar-hide::-webkit-scrollbar {
                display: none;
                width: 0;
                height: 0;
              }
              .scrollbar-hide {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
              .brightness-115 {
                filter: brightness(1.15);
              }
            `}</style>
            <div className="flex items-start gap-4 min-w-max px-4">
              {HOW_IT_WORKS_STEPS.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div 
                    ref={(el) => { stepRefs.current[index] = el; }}
                    className="flex-shrink-0 w-64 relative"
                    onClick={() => handleCardClick(index)}
                  >
                    <div className={clickedStep === index ? 'brightness-115' : ''}>
                      <Card 
                        variant="default" 
                        className={`text-center border-2 h-64 flex flex-col transition-all duration-500 cursor-pointer relative ${
                          clickedStep === index
                            ? 'border-blue-800 shadow-2xl scale-110 bg-blue-100 z-10'
                            : currentStep === index 
                            ? 'border-blue-800 shadow-lg scale-105 bg-blue-50' 
                            : 'border-blue-400 opacity-75 hover:opacity-90 hover:scale-102'
                        }`}
                      >
                      <div className="flex items-center justify-center mb-3 flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-blue-800 text-white flex items-center justify-center text-xl font-bold">
                          {step.id}
                        </div>
                      </div>
                      <h4 className="font-bold text-gray-900 mb-2 text-base leading-tight line-clamp-2">{step.title}</h4>
                      <p className="text-gray-700 text-sm leading-relaxed line-clamp-3 flex-grow">{step.description}</p>
                      </Card>
                    </div>
                  </div>
                  {index < HOW_IT_WORKS_STEPS.length - 1 && (
                    <div className="flex-shrink-0 flex items-center justify-center self-center">
                      <svg 
                        className="w-8 h-8 text-blue-800" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={3} 
                          d="M13 7l5 5m0 0l-5 5m5-5H6" 
                        />
                      </svg>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
          
          {/* Desktop: Navigation buttons */}
          <div className="hidden lg:block">
            <Pagination
              currentPage={currentStep}
              totalPages={HOW_IT_WORKS_STEPS.length}
              onPageChange={(page) => {
                scrollToStep(page);
                setIsAutoPlaying(false);
              }}
              showAutoPlay={true}
              isAutoPlaying={isAutoPlaying}
              onAutoPlayToggle={() => setIsAutoPlaying(!isAutoPlaying)}
              showFirstLast={true}
            />
          </div>

          {/* Tablet: 2 columns với mũi tên */}
          <div className="hidden md:block lg:hidden">
            <div className="grid grid-cols-2 gap-6">
              {HOW_IT_WORKS_STEPS.map((step, index) => (
                <React.Fragment key={step.id}>
                  <Card variant="default" className="text-center border-2 border-blue-800 relative h-64 flex flex-col">
                    <div className="flex items-center justify-center mb-3 flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-blue-800 text-white flex items-center justify-center text-xl font-bold">
                        {step.id}
                      </div>
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2 text-base leading-tight line-clamp-2">{step.title}</h4>
                    <p className="text-gray-700 text-sm leading-relaxed line-clamp-3 flex-grow">{step.description}</p>
                    
                    {/* Mũi tên xuống cho các bước lẻ (trừ bước cuối) */}
                    {index % 2 === 0 && index < HOW_IT_WORKS_STEPS.length - 1 && (
                      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                        <svg 
                          className="w-6 h-6 text-blue-800" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={3} 
                            d="M19 14l-7 7m0 0l-7-7m7 7V3" 
                          />
                        </svg>
                      </div>
                    )}
                    
                    {/* Mũi tên phải cho các bước chẵn (trừ bước cuối) */}
                    {index % 2 === 1 && index < HOW_IT_WORKS_STEPS.length - 1 && (
                      <div className="absolute -right-6 top-1/2 transform -translate-y-1/2">
                        <svg 
                          className="w-6 h-6 text-blue-800" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={3} 
                            d="M13 7l5 5m0 0l-5 5m5-5H6" 
                          />
                        </svg>
                      </div>
                    )}
                  </Card>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Mobile: Vertical flow */}
          <div className="block md:hidden">
            <div className="space-y-6">
              {HOW_IT_WORKS_STEPS.map((step, index) => (
                <React.Fragment key={step.id}>
                  <Card variant="default" className="text-center border-2 border-blue-800 relative h-64 flex flex-col group hover:h-auto hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-center mb-3 flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-blue-800 text-white flex items-center justify-center text-xl font-bold">
                        {step.id}
                      </div>
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2 text-base leading-tight line-clamp-2 group-hover:line-clamp-none">{step.title}</h4>
                    <p className="text-gray-700 text-sm leading-relaxed line-clamp-3 group-hover:line-clamp-none flex-grow">{step.description}</p>
                    
                    {/* Mũi tên xuống */}
                    {index < HOW_IT_WORKS_STEPS.length - 1 && (
                      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                        <svg 
                          className="w-6 h-6 text-blue-800" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={3} 
                            d="M19 14l-7 7m0 0l-7-7m7 7V3" 
                          />
                        </svg>
                      </div>
                    )}
                  </Card>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
        
      </Container>
    </section>
  );
}
