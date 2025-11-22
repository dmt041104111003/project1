import { CONTRACT_ADDRESS } from '@/constants/contracts';
import { eventsCache, inflightEventsRequests, aptosFetch, APTOS_NODE_URL } from './aptosClientCore';

export async function queryEvents(eventHandle: string, fieldName: string, limit: number = 200) {
  const cacheKey = `${eventHandle}_${fieldName}_${limit}`;
  const cached = eventsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 30_000) {
    return cached.data;
  }

  if (inflightEventsRequests.has(cacheKey)) {
    return inflightEventsRequests.get(cacheKey) as Promise<any[]>;
  }

  const promise = (async () => {
    try {
      const encodedEventHandle = encodeURIComponent(eventHandle);
      const url = `${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/events/${encodedEventHandle}/${fieldName}?limit=${limit}`;
      const res = await aptosFetch(url);
      if (!res.ok) {
        if (res.status === 400) {
          console.error(`Failed to query events for ${eventHandle}/${fieldName}:`, res.status, res.statusText);
        }
        return [];
      }
      const data = await res.json();
      const events = Array.isArray(data) ? data : [];
      eventsCache.set(cacheKey, { timestamp: Date.now(), data: events });
      return events;
    } catch (error) {
      console.error(`Error querying events for ${eventHandle}/${fieldName}:`, error);
      return [];
    } finally {
      inflightEventsRequests.delete(cacheKey);
    }
  })();

  inflightEventsRequests.set(cacheKey, promise);
  return promise;
}

export async function getJobCreatedEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::escrow::EscrowStore`;
  return queryEvents(eventHandle, 'job_created_events', limit);
}

export async function getJobAppliedEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::escrow::EscrowStore`;
  return queryEvents(eventHandle, 'job_applied_events', limit);
}

export async function getJobStateChangedEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::escrow::EscrowStore`;
  return queryEvents(eventHandle, 'job_state_changed_events', limit);
}

export async function getMilestoneCreatedEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::escrow::EscrowStore`;
  return queryEvents(eventHandle, 'milestone_created_events', limit);
}

export async function getMilestoneSubmittedEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::escrow::EscrowStore`;
  return queryEvents(eventHandle, 'milestone_submitted_events', limit);
}

export async function getMilestoneAcceptedEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::escrow::EscrowStore`;
  return queryEvents(eventHandle, 'milestone_accepted_events', limit);
}

export async function getMilestoneRejectedEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::escrow::EscrowStore`;
  return queryEvents(eventHandle, 'milestone_rejected_events', limit);
}

export async function getClaimTimeoutEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::escrow::EscrowStore`;
  return queryEvents(eventHandle, 'claim_timeout_events', limit);
}

export async function getProofStoredEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::role::RoleStore`;
  return queryEvents(eventHandle, 'proof_stored_events', limit);
}

export async function getRoleRegisteredEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::role::RoleStore`;
  return queryEvents(eventHandle, 'role_registered_events', limit);
}

export function clearRoleEventsCache() {
  const eventHandle = `${CONTRACT_ADDRESS}::role::RoleStore`;
  const cacheKey = `${eventHandle}_role_registered_events_200`;
  eventsCache.delete(cacheKey);
}

export async function getReputationChangedEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::reputation::RepStore`;
  return queryEvents(eventHandle, 'reputation_changed_events', limit);
}

export async function getDisputeOpenedEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::dispute::DisputeStore`;
  return queryEvents(eventHandle, 'dispute_opened_events', limit);
}

export async function getDisputeVotedEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::dispute::DisputeStore`;
  return queryEvents(eventHandle, 'dispute_voted_events', limit);
}

export async function getEvidenceAddedEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::dispute::DisputeStore`;
  return queryEvents(eventHandle, 'evidence_added_events', limit);
}

export async function getDisputeResolvedEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::dispute::DisputeStore`;
  return queryEvents(eventHandle, 'dispute_resolved_events', limit);
}

export async function getReviewerDisputeEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::dispute::DisputeStore`;
  return queryEvents(eventHandle, 'reviewer_events', limit);
}

