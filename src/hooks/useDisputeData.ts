import { useState, useEffect } from 'react';

export function useDisputeData(jobId: number) {
  const [hasDisputeId, setHasDisputeId] = useState<boolean>(false);
  const [disputeWinner, setDisputeWinner] = useState<boolean | null>(null);
  const [disputeVotesDone, setDisputeVotesDone] = useState<boolean>(false);
  const [activeDisputeMilestoneId, setActiveDisputeMilestoneId] = useState<number | null>(null);

  const load = async () => {
    try {
      const { getDisputeSummary, getDisputeOpenedEvents, getDisputeResolvedEvents } = await import('@/lib/aptosClient');
      const { getParsedJobData } = await import('@/lib/aptosClient');
      
      const openedEvents = await getDisputeOpenedEvents(200);
      const resolvedEvents = await getDisputeResolvedEvents(200);
      
      const resolvedDisputeIds = new Set(
        resolvedEvents.map((e: any) => Number(e?.data?.dispute_id || 0))
      );
      
      // Find ACTIVE (unresolved) dispute for this job
      const activeDisputeEvent = openedEvents.find((e: any) => {
        const eventJobId = Number(e?.data?.job_id || 0);
        const eventDisputeId = Number(e?.data?.dispute_id || 0);
        return eventJobId === Number(jobId) && !resolvedDisputeIds.has(eventDisputeId);
      });
      
      if (activeDisputeEvent) {
        const disputeId = Number(activeDisputeEvent?.data?.dispute_id || 0);
        const milestoneId = Number(activeDisputeEvent?.data?.milestone_id || 0);
        setHasDisputeId(disputeId > 0);
        setActiveDisputeMilestoneId(milestoneId);
        
        if (disputeId > 0) {
          const summary = await getDisputeSummary(disputeId);
          if (summary) {
            if (summary.isResolved || typeof summary.winner === 'boolean') {
              const jobData = await getParsedJobData(jobId);
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
        setActiveDisputeMilestoneId(null);
        setDisputeWinner(null);
        setDisputeVotesDone(false);
      }
    } catch (err) {
      console.error('[useDisputeData] Error:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { clearDisputeEventsCache } = await import('@/lib/aptosClient');
      clearDisputeEventsCache();
      load();
    };
    init();
    
    const handleJobsUpdated = async () => {
      const { clearJobEventsCache, clearDisputeEventsCache } = await import('@/lib/aptosClient');
      const { clearJobTableCache } = await import('@/lib/aptosClientCore');
      clearJobEventsCache();
      clearDisputeEventsCache();
      clearJobTableCache();
      load();
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
    activeDisputeMilestoneId,
  };
}

