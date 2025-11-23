const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x55491d4abd9f4b3c0aa4d09b469ba7f2482523065e116846ef7701ea59bfb842";
const API_URL = 'https://fullnode.testnet.aptoslabs.com/v1';

async function checkJobEvents(jobId) {
  console.log(`\n=== Checking events for Job #${jobId} ===\n`);

  try {
    const eventHandle = `${CONTRACT_ADDRESS}::escrow::EscrowStore`;
    
    console.log("1. Fetching JobAppliedEvents...");
    const appliedEventsUrl = `${API_URL}/accounts/${CONTRACT_ADDRESS}/events/${encodeURIComponent(eventHandle)}/job_applied_events?limit=200`;
    console.log(`URL: ${appliedEventsUrl}`);
    const appliedRes = await fetch(appliedEventsUrl);
    if (!appliedRes.ok) {
      throw new Error(`Failed to fetch applied events: ${appliedRes.status} ${appliedRes.statusText}`);
    }
    const appliedEvents = await appliedRes.json();
    
    const jobAppliedEvents = appliedEvents.filter(
      (e) => Number(e.data.job_id || 0) === Number(jobId)
    );
    
    console.log(`Found ${jobAppliedEvents.length} JobAppliedEvent(s) for job ${jobId}:`);
    jobAppliedEvents
      .sort((a, b) => Number(b.data.applied_at || 0) - Number(a.data.applied_at || 0))
      .forEach((e, idx) => {
        console.log(`  [${idx + 1}] Freelancer: ${e.data.freelancer}`);
        console.log(`      Applied at: ${new Date(Number(e.data.applied_at || 0) * 1000).toLocaleString()}`);
        console.log(`      Timestamp: ${e.data.applied_at}`);
        console.log(`      Event version: ${e.version}`);
      });

    console.log("\n2. Fetching JobStateChangedEvents...");
    const stateEventsUrl = `${API_URL}/accounts/${CONTRACT_ADDRESS}/events/${encodeURIComponent(eventHandle)}/job_state_changed_events?limit=200`;
    console.log(`URL: ${stateEventsUrl}`);
    const stateRes = await fetch(stateEventsUrl);
    if (!stateRes.ok) {
      throw new Error(`Failed to fetch state events: ${stateRes.status} ${stateRes.statusText}`);
    }
    const stateEvents = await stateRes.json();
    
    const jobStateEvents = stateEvents.filter(
      (e) => Number(e.data.job_id || 0) === Number(jobId)
    );
    
    console.log(`Found ${jobStateEvents.length} JobStateChangedEvent(s) for job ${jobId}:`);
    jobStateEvents
      .sort((a, b) => Number(b.data.changed_at || 0) - Number(a.data.changed_at || 0))
      .forEach((e, idx) => {
        console.log(`  [${idx + 1}] Old state: ${e.data.old_state || 'N/A'}`);
        console.log(`      New state: ${e.data.new_state || 'N/A'}`);
        console.log(`      Changed at: ${new Date(Number(e.data.changed_at || 0) * 1000).toLocaleString()}`);
        console.log(`      Timestamp: ${e.data.changed_at}`);
        console.log(`      Event version: ${e.version}`);
      });

    console.log("\n3. Analysis:");
    if (jobAppliedEvents.length > 0) {
      const latestApplied = jobAppliedEvents[0];
      const appliedAt = Number(latestApplied.data.applied_at || 0);
      const appliedFreelancer = latestApplied.data.freelancer;
      
      console.log(`  Latest applied: ${appliedFreelancer}`);
      console.log(`  Applied timestamp: ${appliedAt} (${new Date(appliedAt * 1000).toLocaleString()})`);
      
      if (jobStateEvents.length > 0) {
        const latestState = jobStateEvents[0];
        const stateChangedAt = Number(latestState.data.changed_at || 0);
        const currentState = latestState.data.new_state;
        
        console.log(`  Latest state: ${currentState}`);
        console.log(`  State changed timestamp: ${stateChangedAt} (${new Date(stateChangedAt * 1000).toLocaleString()})`);
        
        console.log(`  Time difference: ${appliedAt - stateChangedAt} seconds`);
        
        if (appliedAt > stateChangedAt) {
          console.log(`  ⚠️  Applied event is NEWER than latest state change!`);
          console.log(`  → State should be PendingApproval`);
        } else {
          console.log(`  ✓ State change is newer than apply event`);
        }
      } else {
        console.log(`  ⚠️  No state change events found!`);
        console.log(`  → State should be PendingApproval (from apply event)`);
      }
    } else {
      console.log(`  No applied events found for this job`);
    }

    console.log("\n4. Expected state logic:");
    if (jobAppliedEvents.length > 0) {
      const latestApplied = jobAppliedEvents[0];
      const appliedAt = Number(latestApplied.data.applied_at || 0);
      
      if (jobStateEvents.length > 0) {
        const latestState = jobStateEvents[0];
        const stateChangedAt = Number(latestState.data.changed_at || 0);
        const currentState = latestState.data.new_state;
        
        const approvedEvent = jobStateEvents.find(
          (e) =>
            e.data.old_state === "PendingApproval" &&
            e.data.new_state === "InProgress" &&
            Number(e.data.changed_at || 0) > appliedAt
        );
        
        const rejectedEvent = jobStateEvents.find(
          (e) =>
            e.data.old_state === "PendingApproval" &&
            e.data.new_state === "Posted" &&
            Number(e.data.changed_at || 0) > appliedAt
        );
        
        if (approvedEvent) {
          console.log(`  → State: InProgress (approved)`);
        } else if (rejectedEvent) {
          console.log(`  → State: Posted (rejected)`);
        } else if (appliedAt > stateChangedAt) {
          console.log(`  → State: PendingApproval (applied after last state change)`);
        } else if (currentState === "PendingApproval") {
          console.log(`  → State: PendingApproval (from state event)`);
        } else {
          console.log(`  → State: ${currentState} (but should check if applied event exists)`);
        }
      } else {
        console.log(`  → State: PendingApproval (no state events, but has applied event)`);
      }
    } else {
      console.log(`  → State: Posted (no applied events)`);
    }

    return {
      appliedEvents: jobAppliedEvents,
      stateEvents: jobStateEvents,
    };
  } catch (error) {
    console.error("Error checking events:", error);
    throw error;
  }
}

const jobId = process.argv[2];
if (!jobId) {
  console.error("Usage: node checkJobEventsSimple.js <jobId>");
  console.error("Example: node checkJobEventsSimple.js 1");
  console.error("\nOr set NEXT_PUBLIC_CONTRACT_ADDRESS environment variable");
  process.exit(1);
}

if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0xYOUR_CONTRACT_ADDRESS") {
  console.error("Error: Please set NEXT_PUBLIC_CONTRACT_ADDRESS environment variable");
  console.error("Example: NEXT_PUBLIC_CONTRACT_ADDRESS=0x123... node checkJobEventsSimple.js 1");
  process.exit(1);
}

checkJobEvents(jobId).then(() => {
  console.log("\n=== Done ===");
  process.exit(0);
}).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

