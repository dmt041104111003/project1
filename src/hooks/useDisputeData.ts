import { useState, useEffect } from 'react';

export function useDisputeData(jobId: number) {
  const [hasDisputeId, setHasDisputeId] = useState<boolean>(false);
  const [disputeWinner, setDisputeWinner] = useState<boolean | null>(null);
  const [disputeVotesDone, setDisputeVotesDone] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { getDisputeSummary, getDisputeOpenedEvents } = await import('@/lib/aptosClient');
        
        const openedEvents = await getDisputeOpenedEvents(200);
        const disputeEvent = openedEvents.find((e: any) => Number(e?.data?.job_id || 0) === Number(jobId));
        
        if (disputeEvent) {
          const disputeId = Number(disputeEvent?.data?.dispute_id || 0);
          setHasDisputeId(disputeId > 0);
          
          if (disputeId > 0) {
            const summary = await getDisputeSummary(disputeId);
            if (summary) {
              if (typeof summary.winner === 'boolean') {
                setDisputeWinner(summary.winner);
                setDisputeVotesDone(true);
              } else {
                const totalVotes = Number(summary.counts?.total || 0);
                setDisputeVotesDone(totalVotes >= 3);
              }
            }
          }
        } else {
          setHasDisputeId(false);
        }
      } catch {}
    };
    load();
  }, [jobId]);

  return {
    hasDisputeId,
    disputeWinner,
    disputeVotesDone,
  };
}

