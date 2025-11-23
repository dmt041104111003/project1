const { Aptos, AptosConfig, Network } = require("@aptos-labs/ts-sdk");

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xYOUR_CONTRACT_ADDRESS";

const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

async function checkJobEvents(jobId) {
  console.log(`\n=== Checking events for Job #${jobId} ===\n`);

  try {
    const eventHandle = `${CONTRACT_ADDRESS}::escrow::EscrowStore`;
    
    console.log("1. Fetching JobAppliedEvents...");
    const appliedEvents = await aptos.getEventsByEventHandle({
      eventHandle: `${eventHandle}`,
      fieldName: "job_applied_events",
      limit: 200,
    });
    
    const jobAppliedEvents = appliedEvents.filter(
      (e) => Number(e.data.job_id || 0) === Number(jobId)
    );
    
    console.log(`Found ${jobAppliedEvents.length} JobAppliedEvent(s) for job ${jobId}:`);
    jobAppliedEvents.forEach((e, idx) => {
      console.log(`  [${idx + 1}] Freelancer: ${e.data.freelancer}`);
      console.log(`      Applied at: ${new Date(Number(e.data.applied_at || 0) * 1000).toLocaleString()}`);
      console.log(`      Event version: ${e.version}`);
      console.log(`      Event sequence: ${e.sequence_number}`);
    });

    console.log("\n2. Fetching JobStateChangedEvents...");
    const stateEvents = await aptos.getEventsByEventHandle({
      eventHandle: `${eventHandle}`,
      fieldName: "job_state_changed_events",
      limit: 200,
    });
    
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
        console.log(`      Event version: ${e.version}`);
        console.log(`      Event sequence: ${e.sequence_number}`);
      });

    console.log("\n3. Analysis:");
    if (jobAppliedEvents.length > 0) {
      const latestApplied = jobAppliedEvents[0];
      const appliedAt = Number(latestApplied.data.applied_at || 0);
      const appliedFreelancer = latestApplied.data.freelancer;
      
      console.log(`  Latest applied: ${appliedFreelancer} at ${new Date(appliedAt * 1000).toLocaleString()}`);
      
      if (jobStateEvents.length > 0) {
        const latestState = jobStateEvents[0];
        const stateChangedAt = Number(latestState.data.changed_at || 0);
        const currentState = latestState.data.new_state;
        
        console.log(`  Latest state: ${currentState} at ${new Date(stateChangedAt * 1000).toLocaleString()}`);
        
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

  } catch (error) {
    console.error("Error checking events:", error);
  }
}

const jobId = process.argv[2];
if (!jobId) {
  console.error("Usage: node checkJobEvents.js <jobId>");
  console.error("Example: node checkJobEvents.js 1");
  process.exit(1);
}

checkJobEvents(jobId).then(() => {
  console.log("\n=== Done ===");
  process.exit(0);
}).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

