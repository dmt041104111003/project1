import { useState, useEffect } from 'react';

export function useDisputeData(jobId: number) {
  const [hasDisputeId, setHasDisputeId] = useState<boolean>(false);
  const [disputeWinner, setDisputeWinner] = useState<boolean | null>(null);
  const [disputeVotesDone, setDisputeVotesDone] = useState<boolean>(false);

  const load = async () => {
    try {
      const { getDisputeSummary, getDisputeOpenedEvents } = await import('@/lib/aptosClient');
      const { getParsedJobData } = await import('@/lib/aptosClient');
      
      const openedEvents = await getDisputeOpenedEvents(200);
      const disputeEvent = openedEvents.find((e: any) => Number(e?.data?.job_id || 0) === Number(jobId));
      
      if (disputeEvent) {
        const disputeId = Number(disputeEvent?.data?.dispute_id || 0);
        setHasDisputeId(disputeId > 0);
        
        if (disputeId > 0) {
          const summary = await getDisputeSummary(disputeId);
          if (summary) {
            if (typeof summary.winner === 'boolean') {
              const jobData = await getParsedJobData(jobId);
              const milestoneId = Number(disputeEvent?.data?.milestone_id || 0);
              const milestone = jobData?.milestones?.find((m: any) => Number(m.id) === milestoneId);
              
              if (milestone) {
                const { parseStatus } = await import('@/components/dashboard/MilestoneUtils');
                const status = parseStatus(milestone.status);
                if (status === 'Accepted') {
                  setDisputeWinner(null);
                } else {
                  setDisputeWinner(summary.winner);
                }
              } else {
                setDisputeWinner(summary.winner);
              }
              setDisputeVotesDone(true);
            } else {
              const totalVotes = Number(summary.counts?.total || 0);
              setDisputeVotesDone(totalVotes >= 3);
              setDisputeWinner(null);
            }
          } else {
            setDisputeWinner(null);
            setDisputeVotesDone(false);
          }
        } else {
          setDisputeWinner(null);
          setDisputeVotesDone(false);
        }
      } else {
        setHasDisputeId(false);
        setDisputeWinner(null);
        setDisputeVotesDone(false);
      }
    } catch {}
  };

  useEffect(() => {
    load();
    
    const handleJobsUpdated = async () => {
      const { clearJobEventsCache, clearDisputeEventsCache } = await import('@/lib/aptosClient');
      const { clearJobTableCache } = await import('@/lib/aptosClientCore');
      clearJobEventsCache();
      clearDisputeEventsCache();
      clearJobTableCache();
      setTimeout(() => load(), 1000);
    };
    
    window.addEventListener('jobsUpdated', handleJobsUpdated);
    return () => {
      window.removeEventListener('jobsUpdated', handleJobsUpdated);
    };
  }, [jobId]);

  return {
    hasDisputeId,
    disputeWinner,
    disputeVotesDone,
  };
}

