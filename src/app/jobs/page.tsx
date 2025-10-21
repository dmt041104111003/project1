"use client";

import React, { useState, useEffect } from 'react';
import { Container } from '@/components/ui/container';
import { Header } from '@/components/landing/header';
import { Footer } from '@/components/landing/footer';
import JobCard from '@/components/jobs/JobCard';
import JobFilters from '@/components/jobs/JobFilters';
import { CATEGORIES } from '@/constants/jobs';



const robotoCondensed = {
  fontFamily: "'Roboto Condensed', sans-serif",
  fontWeight: 400,
  fontStyle: 'normal',
};

export default function JobsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showEscrowOnly, setShowEscrowOnly] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700&family=Roboto+Condensed:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  // Fetch jobs from blockchain
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/jobs');
        const data = await response.json();
        
        if (data.success) {
          setJobs(data.jobs);
          console.log('Fetched jobs from blockchain:', data.jobs.length);
        } else {
          setError(data.error || 'Failed to fetch jobs');
        }
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError('Failed to fetch jobs');
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || job.category.toLowerCase() === selectedCategory;
    const matchesEscrow = !showEscrowOnly || job.escrow;
    
    return matchesSearch && matchesCategory && matchesEscrow;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-20">
        <Container>
          <div className="mb-8">
            <h1 className="text-4xl lg:text-6xl font-bold text-text-primary mb-4 leading-tight">
              <span 
                style={robotoCondensed}
                className=" text-primary block"
              >
                Find a job
              </span>
            </h1>
            <p 
              style={robotoCondensed}
              className="text-xl lg:text-2xl text-text-secondary max-w-2xl"
            >
              Discover high-quality job opportunities with escrow protection
            </p>
          </div>

          <JobFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            showEscrowOnly={showEscrowOnly}
            setShowEscrowOnly={setShowEscrowOnly}
            categories={CATEGORIES}
          />

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-text-secondary text-lg mt-4">
                Loading jobs from blockchain...
              </p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-500 text-lg">
                Error: {error}
              </p>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="space-y-6">
                {filteredJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>

              {filteredJobs.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-text-secondary text-lg">
                    No jobs found matching your filters
                  </p>
                </div>
              )}
            </>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}
