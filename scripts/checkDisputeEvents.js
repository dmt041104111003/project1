// Load .env file
const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x03e18f7d891156850e51e6e4ff770ad7d10801b0edb168de50dd5c00919261ca';
const APTOS_NODE_URL = process.env.APTOS_NODE_URL || 'https://api.testnet.aptoslabs.com';
const APTOS_API_KEY = process.env.APTOS_API_KEY || '';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  ...(APTOS_API_KEY && { 'Authorization': `Bearer ${APTOS_API_KEY}` }),
});

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
    
    const res = await fetch(url, { headers: getHeaders() });
    
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

async function getJobData(jobId) {
  try {
    // Get EscrowStore handle
    const resourceUrl = `${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/resource/${CONTRACT_ADDRESS}::escrow::EscrowStore`;
    const resourceRes = await fetch(resourceUrl, { headers: getHeaders() });
    if (!resourceRes.ok) return null;
    
    const resourceData = await resourceRes.json();
    const tableHandle = resourceData?.data?.table?.handle;
    if (!tableHandle) return null;

    // Get job from table
    const tableUrl = `${APTOS_NODE_URL}/v1/tables/${tableHandle}/item`;
    const tableRes = await fetch(tableUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        key_type: 'u64',
        value_type: `${CONTRACT_ADDRESS}::escrow::Job`,
        key: String(jobId),
      }),
    });

    if (!tableRes.ok) return null;
    return tableRes.json();
  } catch (error) {
    console.error(`Error fetching job ${jobId}:`, error.message);
    return null;
  }
}

function parseJobState(state) {
  if (!state) return 'Unknown';
  if (typeof state === 'object') {
    // Handle Move enum format: { "variant": "InProgress", ... } or { "InProgress": {} }
    if (state.variant) return state.variant;
    const keys = Object.keys(state).filter(k => !k.startsWith('__'));
    return keys[0] || 'Unknown';
  }
  return String(state);
}

function parseMilestoneStatus(status) {
  if (!status) return 'Pending';
  if (typeof status === 'object') {
    if (status.variant) return status.variant;
    const keys = Object.keys(status).filter(k => !k.startsWith('__'));
    return keys[0] || 'Pending';
  }
  return String(status);
}

async function main() {
  console.log('='.repeat(80));
  console.log('🔍 Checking Dispute Events & Job States');
  console.log('='.repeat(80));
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`Node: ${APTOS_NODE_URL}`);
  console.log(`API Key: ${APTOS_API_KEY ? '✅ Set' : '❌ Not set'}`);
  
  const disputeEventHandle = `${CONTRACT_ADDRESS}::dispute::DisputeStore`;
  const escrowEventHandle = `${CONTRACT_ADDRESS}::escrow::EscrowStore`;
  
  console.log('\n📋 Fetching all events...');
  
  const [
    openedEvents, 
    reviewerEvents, 
    votedEvents, 
    evidenceEvents, 
    resolvedEvents,
    jobStateChangedEvents,
    milestoneRejectedEvents
  ] = await Promise.all([
    queryEvents(disputeEventHandle, 'dispute_opened_events', 200),
    queryEvents(disputeEventHandle, 'reviewer_events', 200),
    queryEvents(disputeEventHandle, 'dispute_voted_events', 200),
    queryEvents(disputeEventHandle, 'evidence_added_events', 200),
    queryEvents(disputeEventHandle, 'dispute_resolved_events', 200),
    queryEvents(escrowEventHandle, 'job_state_changed_events', 200),
    queryEvents(escrowEventHandle, 'milestone_rejected_events', 200),
  ]);
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 EVENTS SUMMARY');
  console.log('='.repeat(80));
  console.log(`Dispute Opened Events: ${openedEvents.length}`);
  console.log(`Reviewer Events: ${reviewerEvents.length}`);
  console.log(`Voted Events: ${votedEvents.length}`);
  console.log(`Evidence Added Events: ${evidenceEvents.length}`);
  console.log(`Resolved Events: ${resolvedEvents.length}`);
  console.log(`Job State Changed Events: ${jobStateChangedEvents.length}`);
  console.log(`Milestone Rejected Events: ${milestoneRejectedEvents.length}`);
  
  // Group disputes by job
  const disputesByJob = new Map();
  openedEvents.forEach((evt) => {
    const jobId = Number(evt?.data?.job_id || 0);
    const milestoneId = Number(evt?.data?.milestone_id || 0);
    const disputeId = Number(evt?.data?.dispute_id || 0);
    
    if (!disputesByJob.has(jobId)) {
      disputesByJob.set(jobId, []);
    }
    disputesByJob.get(jobId).push({ disputeId, milestoneId, event: evt });
  });

  console.log('\n' + '='.repeat(80));
  console.log('📝 DISPUTES BY JOB');
  console.log('='.repeat(80));

  for (const [jobId, disputes] of disputesByJob) {
    console.log(`\n🔵 Job #${jobId} - ${disputes.length} dispute(s)`);
    
    // Fetch actual job data from table
    console.log(`   📥 Fetching job data from table...`);
    const jobData = await getJobData(jobId);
    
    if (jobData) {
      const jobState = parseJobState(jobData.state);
      const disputeIdInJob = jobData.dispute_id?.vec?.[0] || null;
      const disputeWinner = jobData.dispute_winner?.vec?.[0];
      
      // Debug raw state
      console.log(`   📊 Job State (from table): ${jobState}`);
      console.log(`      Raw state: ${JSON.stringify(jobData.state)}`);
      console.log(`   🔗 Dispute ID in Job: ${disputeIdInJob !== null ? disputeIdInJob : 'None'}`);
      console.log(`   🏆 Dispute Winner: ${disputeWinner !== undefined ? (disputeWinner ? 'Freelancer' : 'Poster') : 'Not set'}`);
      
      // Show milestones
      const milestones = jobData.milestones || [];
      console.log(`   📋 Milestones (${milestones.length}):`);
      milestones.forEach((m, idx) => {
        const status = parseMilestoneStatus(m.status);
        console.log(`      [${idx}] Status: ${status}, Amount: ${Number(m.amount || 0) / 1e8} APT`);
      });
    } else {
      console.log(`   ⚠️  Could not fetch job data from table`);
    }
    
    // Show disputes for this job
    for (const { disputeId, milestoneId, event } of disputes) {
      const createdAt = Number(event?.data?.created_at || 0);
      const createdAtDate = createdAt ? new Date(createdAt * 1000).toLocaleString('vi-VN') : 'N/A';
      
      console.log(`\n   🔴 Dispute #${disputeId} (Milestone ${milestoneId})`);
      console.log(`      Created: ${createdAtDate}`);
      console.log(`      Opened By: ${event?.data?.opened_by}`);
      
      // Check votes for this dispute
      const disputeVotes = votedEvents.filter(e => Number(e?.data?.dispute_id || 0) === disputeId);
      console.log(`      Votes: ${disputeVotes.length}/3`);
      
      if (disputeVotes.length > 0) {
        disputeVotes.forEach((v, idx) => {
          const choice = v?.data?.vote_choice === true ? 'Freelancer' : 'Poster';
          console.log(`         ${idx + 1}. ${normalizeAddress(v?.data?.reviewer)} → ${choice}`);
        });
      }
      
      // Check if resolved
      const resolvedEvent = resolvedEvents.find(e => Number(e?.data?.dispute_id || 0) === disputeId);
      if (resolvedEvent) {
        const winner = resolvedEvent?.data?.winner_is_freelancer === true ? 'Freelancer' : 'Poster';
        const fVotes = Number(resolvedEvent?.data?.freelancer_votes || 0);
        const pVotes = Number(resolvedEvent?.data?.poster_votes || 0);
        console.log(`      ✅ RESOLVED: ${winner} wins (${fVotes} vs ${pVotes})`);
      } else {
        console.log(`      ⏳ Status: Pending resolution`);
      }
    }
  }

  // Show recent job state changes
  console.log('\n' + '='.repeat(80));
  console.log('🔄 RECENT JOB STATE CHANGES (last 10)');
  console.log('='.repeat(80));
  
  const recentStateChanges = jobStateChangedEvents.slice(-10).reverse();
  recentStateChanges.forEach((evt) => {
    const jobId = Number(evt?.data?.job_id || 0);
    const oldState = evt?.data?.old_state || '?';
    const newState = evt?.data?.new_state || '?';
    const changedAt = Number(evt?.data?.changed_at || 0);
    const changedAtDate = changedAt ? new Date(changedAt * 1000).toLocaleString('vi-VN') : 'N/A';
    
    console.log(`   Job #${jobId}: ${oldState} → ${newState} (${changedAtDate})`);
  });

  // Show milestone rejections
  console.log('\n' + '='.repeat(80));
  console.log('❌ MILESTONE REJECTIONS');
  console.log('='.repeat(80));
  
  if (milestoneRejectedEvents.length === 0) {
    console.log('   No milestone rejections found');
  } else {
    milestoneRejectedEvents.forEach((evt) => {
      const jobId = Number(evt?.data?.job_id || 0);
      const milestoneId = Number(evt?.data?.milestone_id || 0);
      const rejectedAt = Number(evt?.data?.rejected_at || 0);
      const rejectedAtDate = rejectedAt ? new Date(rejectedAt * 1000).toLocaleString('vi-VN') : 'N/A';
      
      console.log(`   Job #${jobId}, Milestone #${milestoneId} - Rejected at ${rejectedAtDate}`);
    });
  }

  // Check reviewer loads
  console.log('\n' + '='.repeat(80));
  console.log('👥 REVIEWER STATUS');
  console.log('='.repeat(80));
  
  const reviewerAddresses = [
    '0x840f14231a87be9b3a41638bd8a3f8879ca1a517db3f9f23e181dfbbfb2beccb',
    '0x28360a9a93c9240c28c1ecd45c46685f65d05d3ba0abf90353f352943ba755ff',
    '0x579024a64f477ef1fd1ddad0014a0c14f0f97e4c450ed8272528415fd56d00d6',
    '0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9',
  ];

  // Get DisputeStore for reviewer_load table
  try {
    const disputeResourceUrl = `${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/resource/${CONTRACT_ADDRESS}::dispute::DisputeStore`;
    const disputeRes = await fetch(disputeResourceUrl, { headers: getHeaders() });
    
    if (disputeRes.ok) {
      const disputeData = await disputeRes.json();
      const loadHandle = disputeData?.data?.reviewer_load?.handle;
      
      if (loadHandle) {
        console.log(`   Reviewer Load Table Handle: ${loadHandle}`);
        
        for (const addr of reviewerAddresses) {
          try {
            const loadUrl = `${APTOS_NODE_URL}/v1/tables/${loadHandle}/item`;
            const loadRes = await fetch(loadUrl, {
              method: 'POST',
              headers: getHeaders(),
              body: JSON.stringify({
                key_type: 'address',
                value_type: 'u64',
                key: addr,
              }),
            });
            
            if (loadRes.ok) {
              const load = await loadRes.json();
              console.log(`   ${normalizeAddress(addr)}: Load = ${load} ${load > 0 ? '🔴 BUSY' : '🟢 FREE'}`);
            } else {
              console.log(`   ${normalizeAddress(addr)}: Load = 0 🟢 FREE (not in table)`);
            }
          } catch (e) {
            console.log(`   ${normalizeAddress(addr)}: Error checking load`);
          }
        }
      }
    }
  } catch (e) {
    console.log('   ⚠️ Could not check reviewer loads');
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Done!');
  console.log('='.repeat(80));
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
