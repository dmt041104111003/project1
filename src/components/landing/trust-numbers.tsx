"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Container } from '@/components/ui/container';
import { TRUST_STATS } from '@/constants/landing';
import CountUp from 'react-countup';

export function TrustNumbers() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-16">
      <Container>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-blue-800 mb-4">
            Trust numbers
          </h2>
          <div className="w-16 h-1 bg-blue-800 mx-auto mb-6"></div>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Transparent metrics stored on-chain
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {TRUST_STATS.map((stat, index) => (
            <div key={index} className="border border-gray-400 bg-gray-50 p-6 text-center">
              <div className="text-4xl font-bold text-blue-800 mb-3">
                {isVisible ? (
                  <CountUp
                    end={parseInt(stat.value.replace(/[^0-9]/g, ''))}
                    duration={2.5}
                    delay={index * 0.2}
                    suffix={stat.value.includes('+') ? '+' : stat.value.includes('%') ? '%' : ''}
                  />
                ) : (
                  '0'
                )}
              </div>
              <div className="text-lg font-bold text-gray-900">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <a 
            href="https://explorer.aptoslabs.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-800 font-bold border border-blue-800 px-6 py-3 bg-white"
          >
            View on Block Explorer
          </a>
        </div>
      </Container>
    </section>
  );
}
