const CONTRACT_ADDRESS = '0x03e18f7d891156850e51e6e4ff770ad7d10801b0edb168de50dd5c00919261ca';
const APTOS_NODE_URL = process.env.APTOS_NODE_URL || 'https://api.testnet.aptoslabs.com';

const normalizeAddress = (addr) => {
  if (!addr) return '';
  const s = String(addr).toLowerCase();
  const noPrefix = s.startsWith('0x') ? s.slice(2) : s;
  const trimmed = noPrefix.replace(/^0+/, '');
  return '0x' + (trimmed.length === 0 ? '0' : trimmed);
};

async function queryEvents(eventHandle, fieldName, limit = 200) {
  try {
    const encodedEventHandle = encodeURIComponent(eventHandle);
    const url = `${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/events/${encodedEventHandle}/${fieldName}?limit=${limit}`;
    
    console.log(`\n📡 Fetching: ${fieldName}`);
    console.log(`   URL: ${url}`);
    
    const res = await fetch(url);
    
    if (!res.ok) {
      console.error(`   ❌ Error: ${res.status} ${res.statusText}`);
      if (res.status === 400) {
        const text = await res.text();
        console.error(`   Response: ${text}`);
      }
      return [];
    }
    
    const data = await res.json();
    const events = Array.isArray(data) ? data : [];
    console.log(`   ✅ Got ${events.length} events`);
    return events;
  } catch (error) {
    console.error(`   ❌ Exception:`, error.message);
    return [];
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('🔍 Checking Dispute Events');
  console.log('='.repeat(80));
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`Node: ${APTOS_NODE_URL}`);
  
  const eventHandle = `${CONTRACT_ADDRESS}::dispute::DisputeStore`;
  
  console.log('\n📋 Fetching all dispute events...');
  
  const [openedEvents, reviewerEvents, votedEvents, evidenceEvents, resolvedEvents] = await Promise.all([
    queryEvents(eventHandle, 'dispute_opened_events', 200),
    queryEvents(eventHandle, 'reviewer_events', 200),
    queryEvents(eventHandle, 'dispute_voted_events', 200),
    queryEvents(eventHandle, 'evidence_added_events', 200),
    queryEvents(eventHandle, 'dispute_resolved_events', 200),
  ]);
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Dispute Opened Events: ${openedEvents.length}`);
  console.log(`Reviewer Events: ${reviewerEvents.length}`);
  console.log(`Voted Events: ${votedEvents.length}`);
  console.log(`Evidence Added Events: ${evidenceEvents.length}`);
  console.log(`Resolved Events: ${resolvedEvents.length}`);
  
  if (openedEvents.length === 0) {
    console.log('\n⚠️  No disputes found!');
    return;
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📝 DISPUTE DETAILS');
  console.log('='.repeat(80));
  
  for (const openedEvent of openedEvents) {
    const disputeId = Number(openedEvent?.data?.dispute_id || 0);
    const jobId = Number(openedEvent?.data?.job_id || 0);
    const milestoneId = Number(openedEvent?.data?.milestone_id || 0);
    const poster = String(openedEvent?.data?.poster || '');
    const freelancer = String(openedEvent?.data?.freelancer || '');
    const openedBy = String(openedEvent?.data?.opened_by || '');
    const selectedReviewersCount = Number(openedEvent?.data?.selected_reviewers_count || 0);
    const createdAt = Number(openedEvent?.data?.created_at || 0);
    const createdAtDate = createdAt ? new Date(createdAt * 1000).toLocaleString('vi-VN') : 'N/A';
    
    console.log(`\n🔴 Dispute #${disputeId}`);
    console.log(`   Job ID: ${jobId}`);
    console.log(`   Milestone ID: ${milestoneId}`);
    console.log(`   Poster: ${poster}`);
    console.log(`   Freelancer: ${freelancer}`);
    console.log(`   Opened By: ${openedBy}`);
    console.log(`   Selected Reviewers Count: ${selectedReviewersCount}`);
    console.log(`   Created At: ${createdAtDate} (${createdAt})`);
    
    const disputeReviewerEvents = reviewerEvents.filter(
      (e) => Number(e?.data?.dispute_id || 0) === disputeId
    );
    
    console.log(`\n   👥 Selected Reviewers (${disputeReviewerEvents.length}):`);
    if (disputeReviewerEvents.length === 0) {
      console.log(`      ⚠️  NO REVIEWERS FOUND! This is the bug!`);
    } else {
      disputeReviewerEvents.forEach((e, idx) => {
        const reviewer = String(e?.data?.reviewer || '');
        const timestamp = Number(e?.data?.timestamp || 0);
        const timestampDate = timestamp ? new Date(timestamp * 1000).toLocaleString('vi-VN') : 'N/A';
        console.log(`      ${idx + 1}. ${reviewer} (at ${timestampDate})`);
      });
    }
    
    const disputeVotedEvents = votedEvents.filter(
      (e) => Number(e?.data?.dispute_id || 0) === disputeId
    );
    
    console.log(`\n   🗳️  Votes (${disputeVotedEvents.length}):`);
    if (disputeVotedEvents.length === 0) {
      console.log(`      No votes yet`);
    } else {
      disputeVotedEvents.forEach((e, idx) => {
        const reviewer = String(e?.data?.reviewer || '');
        const voteChoice = e?.data?.vote_choice === true ? 'Freelancer' : 'Poster';
        const votedAt = Number(e?.data?.voted_at || 0);
        const votedAtDate = votedAt ? new Date(votedAt * 1000).toLocaleString('vi-VN') : 'N/A';
        console.log(`      ${idx + 1}. ${reviewer} → ${voteChoice} (at ${votedAtDate})`);
      });
    }
    
    const disputeEvidenceEvents = evidenceEvents.filter(
      (e) => Number(e?.data?.dispute_id || 0) === disputeId
    );
    
    console.log(`\n   📎 Evidence (${disputeEvidenceEvents.length}):`);
    if (disputeEvidenceEvents.length === 0) {
      console.log(`      No evidence added`);
    } else {
      disputeEvidenceEvents.forEach((e, idx) => {
        const addedBy = String(e?.data?.added_by || '');
        const evidenceCid = String(e?.data?.evidence_cid || '');
        const addedAt = Number(e?.data?.added_at || 0);
        const addedAtDate = addedAt ? new Date(addedAt * 1000).toLocaleString('vi-VN') : 'N/A';
        console.log(`      ${idx + 1}. Added by ${addedBy}`);
        console.log(`         CID: ${evidenceCid}`);
        console.log(`         At: ${addedAtDate}`);
      });
    }
    
    const disputeResolvedEvents = resolvedEvents.filter(
      (e) => Number(e?.data?.dispute_id || 0) === disputeId
    );
    
    if (disputeResolvedEvents.length > 0) {
      const resolved = disputeResolvedEvents[0];
      const winnerIsFreelancer = resolved?.data?.winner_is_freelancer === true;
      const freelancerVotes = Number(resolved?.data?.freelancer_votes || 0);
      const posterVotes = Number(resolved?.data?.poster_votes || 0);
      const resolvedAt = Number(resolved?.data?.resolved_at || 0);
      const resolvedAtDate = resolvedAt ? new Date(resolvedAt * 1000).toLocaleString('vi-VN') : 'N/A';
      
      console.log(`\n   ✅ RESOLVED:`);
      console.log(`      Winner: ${winnerIsFreelancer ? 'Freelancer' : 'Poster'}`);
      console.log(`      Votes: Freelancer ${freelancerVotes} vs Poster ${posterVotes}`);
      console.log(`      Resolved At: ${resolvedAtDate}`);
    }
    
    console.log('\n' + '-'.repeat(80));
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🔍 REVIEWER EVENTS ANALYSIS');
  console.log('='.repeat(80));
  
  if (reviewerEvents.length === 0) {
    console.log('\n⚠️  NO REVIEWER EVENTS FOUND AT ALL!');
    console.log('   This means either:');
    console.log('   1. No disputes have been opened yet');
    console.log('   2. The event handle path is wrong');
    console.log('   3. The contract address is wrong');
  } else {
    console.log(`\n✅ Found ${reviewerEvents.length} reviewer events total`);
    
    const reviewerByDispute = new Map();
    reviewerEvents.forEach((e) => {
      const disputeId = Number(e?.data?.dispute_id || 0);
      if (!reviewerByDispute.has(disputeId)) {
        reviewerByDispute.set(disputeId, []);
      }
      reviewerByDispute.get(disputeId).push(e);
    });
    
    console.log(`\n📊 Reviewer events by dispute:`);
    reviewerByDispute.forEach((events, disputeId) => {
      console.log(`   Dispute #${disputeId}: ${events.length} reviewer(s)`);
    });
    
    openedEvents.forEach((openedEvent) => {
      const disputeId = Number(openedEvent?.data?.dispute_id || 0);
      const expectedCount = Number(openedEvent?.data?.selected_reviewers_count || 0);
      const actualCount = reviewerByDispute.get(disputeId)?.length || 0;
      
      if (expectedCount !== actualCount) {
        console.log(`\n   ⚠️  Dispute #${disputeId}: Expected ${expectedCount} reviewers, but found ${actualCount} reviewer events!`);
      }
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Done!');
  console.log('='.repeat(80));
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

