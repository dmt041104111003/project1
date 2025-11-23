const CONTRACT_ADDRESS = "0x48cab96b6e8464bc899e92222bc1c3afb7384b92770ad6c97cb1674a50843aba";
const APTOS_NODE_URL = "https://api.testnet.aptoslabs.com";

async function checkEvents(jobId) {
  console.log(`\n=== Checking events for Job #${jobId} ===\n`);

  try {
    const eventHandle = `${CONTRACT_ADDRESS}::escrow::EscrowStore`;
    
    const mutualCancelUrl = `${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/events/${encodeURIComponent(eventHandle)}/mutual_cancel_requested_events?limit=200`;
    const freelancerWithdrawUrl = `${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/events/${encodeURIComponent(eventHandle)}/freelancer_withdraw_requested_events?limit=200`;

    console.log('Fetching mutual_cancel_requested_events...');
    const mutualCancelRes = await fetch(mutualCancelUrl);
    const mutualCancelEvents = mutualCancelRes.ok ? await mutualCancelRes.json() : [];
    
    console.log('Fetching freelancer_withdraw_requested_events...');
    const freelancerWithdrawRes = await fetch(freelancerWithdrawUrl);
    const freelancerWithdrawEvents = freelancerWithdrawRes.ok ? await freelancerWithdrawRes.json() : [];

    console.log(`\nTotal mutual_cancel_requested_events: ${mutualCancelEvents.length}`);
    console.log(`Total freelancer_withdraw_requested_events: ${freelancerWithdrawEvents.length}`);

    const jobMutualCancelEvents = mutualCancelEvents.filter(evt => Number(evt?.data?.job_id || 0) === Number(jobId));
    const jobFreelancerWithdrawEvents = freelancerWithdrawEvents.filter(evt => Number(evt?.data?.job_id || 0) === Number(jobId));

    console.log(`\nEvents for Job #${jobId}:`);
    console.log(`- mutual_cancel_requested_events: ${jobMutualCancelEvents.length}`);
    console.log(`- freelancer_withdraw_requested_events: ${jobFreelancerWithdrawEvents.length}`);

    if (jobMutualCancelEvents.length > 0) {
      console.log('\n=== Mutual Cancel Events ===');
      jobMutualCancelEvents
        .sort((a, b) => Number(b?.data?.requested_at || 0) - Number(a?.data?.requested_at || 0))
        .forEach((evt, idx) => {
          console.log(`\nEvent #${idx + 1}:`);
          console.log(`  job_id: ${evt?.data?.job_id}`);
          console.log(`  requested_by: ${evt?.data?.requested_by}`);
          console.log(`  requested_at: ${evt?.data?.requested_at} (${new Date(Number(evt?.data?.requested_at || 0) * 1000).toLocaleString()})`);
          console.log(`  sequence_number: ${evt?.sequence_number}`);
        });
      
      const latest = jobMutualCancelEvents.sort((a, b) => Number(b?.data?.requested_at || 0) - Number(a?.data?.requested_at || 0))[0];
      const requestedBy = String(latest?.data?.requested_by || '');
      const zeroAddress = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const isZero = requestedBy === '0x0' || requestedBy === zeroAddress || requestedBy.toLowerCase() === zeroAddress.toLowerCase();
      
      console.log(`\nLatest event requested_by: ${requestedBy}`);
      console.log(`Is zero address: ${isZero}`);
      console.log(`Result: ${isZero ? 'null (cleared)' : requestedBy}`);
    }

    if (jobFreelancerWithdrawEvents.length > 0) {
      console.log('\n=== Freelancer Withdraw Events ===');
      jobFreelancerWithdrawEvents
        .sort((a, b) => Number(b?.data?.requested_at || 0) - Number(a?.data?.requested_at || 0))
        .forEach((evt, idx) => {
          console.log(`\nEvent #${idx + 1}:`);
          console.log(`  job_id: ${evt?.data?.job_id}`);
          console.log(`  requested_by: ${evt?.data?.requested_by}`);
          console.log(`  requested_at: ${evt?.data?.requested_at} (${new Date(Number(evt?.data?.requested_at || 0) * 1000).toLocaleString()})`);
          console.log(`  sequence_number: ${evt?.sequence_number}`);
        });
      
      const latest = jobFreelancerWithdrawEvents.sort((a, b) => Number(b?.data?.requested_at || 0) - Number(a?.data?.requested_at || 0))[0];
      const requestedBy = String(latest?.data?.requested_by || '');
      const zeroAddress = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const isZero = requestedBy === '0x0' || requestedBy === zeroAddress || requestedBy.toLowerCase() === zeroAddress.toLowerCase();
      
      console.log(`\nLatest event requested_by: ${requestedBy}`);
      console.log(`Is zero address: ${isZero}`);
      console.log(`Result: ${isZero ? 'null (cleared)' : requestedBy}`);
    }

    if (jobMutualCancelEvents.length === 0 && jobFreelancerWithdrawEvents.length === 0) {
      console.log('\n⚠️  No events found for this job!');
      console.log('This could mean:');
      console.log('  1. Contract has not been deployed with the new events');
      console.log('  2. No request has been made yet');
      console.log('  3. Events are being emitted but not yet indexed');
    }

  } catch (error) {
    console.error('Error checking events:', error);
  }
}

const jobId = process.argv[2] || '1';
console.log(`Checking events for Job #${jobId}...`);
checkEvents(jobId).catch(console.error);

