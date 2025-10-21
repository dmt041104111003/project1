import { NextRequest, NextResponse } from 'next/server';
import { JOB } from '@/constants/contracts';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;
    
    switch (action) {
      case 'post':
        return await postJob(params);
      case 'apply':
        return await applyJob(params);
      case 'approve':
        return await approveJob(params);
      case 'submit':
        return await submitMilestone(params);
      case 'accept':
        return await acceptMilestone(params);
      case 'complete':
        return await completeJob(params);
      case 'claim':
        return await claimJob(params);
      case 'cancel':
        return await cancelJob(params);
      default:
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid action. Must be: post, apply, approve, submit, accept, complete, claim, cancel' 
          },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Job action error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to execute job action' 
      },
      { status: 500 }
    );
  }
}

// Post a new job
async function postJob(params: any) {
  const { 
    user_address, 
    user_commitment, 
    job_details_cid, 
    milestones, 
    application_deadline 
  } = params;
  
  if (!user_address || !user_commitment || !job_details_cid || !milestones || !application_deadline) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Missing required parameters: user_address, user_commitment, job_details_cid, milestones, application_deadline' 
      },
      { status: 400 }
    );
  }
  
  try {
    console.log('🔍 DEBUG - postJob parameters:', {
      user_address,
      user_commitment,
      job_details_cid,
      milestones,
      application_deadline,
      commitmentLength: user_commitment?.length
    });

    // Convert milestones to vector<u64> format expected by contract
    // Contract expects: milestones: vector<u64> (array of amounts in micro-APT)
    const milestonesAmounts = milestones.map((milestone: any) => {
      const amount = parseFloat(milestone.amount || '0');
      return Math.floor(amount * 100_000_000); // Convert APT to micro-APT
    });
    
    const payload = {
      type: 'entry_function_payload',
      function: JOB.EXECUTE_JOB_ACTION,
      type_arguments: [],
      arguments: [
        JOB.ACTION_POST, // action
        0, // job_id (will be assigned by contract)
        user_commitment, // user_commitment
        [], // worker_commitment (empty for post)
        0, // milestone_index (not used for post)
        [], // cid (not used for post)
        job_details_cid, // job_details_cid
        milestonesAmounts, // milestones as vector<u64>
        application_deadline // application_deadline
      ]
    };

    console.log('🔍 DEBUG - Transaction payload:', {
      function: JOB.EXECUTE_JOB_ACTION,
      arguments: payload.arguments,
      user_commitment_in_args: payload.arguments[2],
      commitment_match: payload.arguments[2] === user_commitment
    });
    
    return NextResponse.json({
      success: true,
      message: 'Job posting transaction prepared',
      payload,
      instructions: 'Submit this payload to Aptos network using your wallet'
    });
    
  } catch (error: any) {
    throw new Error(`Failed to prepare job posting: ${error.message}`);
  }
}

// Apply to a job
async function applyJob(params: any) {
  const { 
    user_address, 
    user_commitment, 
    job_id 
  } = params;
  
  if (!user_address || !user_commitment || job_id === undefined) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Missing required parameters: user_address, user_commitment, job_id' 
      },
      { status: 400 }
    );
  }
  
  try {
    const payload = {
      type: 'entry_function_payload',
      function: JOB.EXECUTE_JOB_ACTION,
      type_arguments: [],
      arguments: [
        JOB.ACTION_APPLY, // action
        job_id, // job_id
        user_commitment, // user_commitment
        user_commitment, // worker_commitment (same as user_commitment for apply)
        0, // milestone_index (not used for apply)
        [], // cid (not used for apply)
        [], // job_details_cid (not used for apply)
        [], // milestones (not used for apply)
        0 // application_deadline (not used for apply)
      ]
    };
    
    return NextResponse.json({
      success: true,
      message: 'Job application transaction prepared',
      payload,
      instructions: 'Submit this payload to Aptos network using your wallet'
    });
    
  } catch (error: any) {
    throw new Error(`Failed to prepare job application: ${error.message}`);
  }
}

// Approve a worker for a job
async function approveJob(params: any) {
  const { 
    user_address, 
    user_commitment, 
    job_id 
  } = params;
  
  if (!user_address || !user_commitment || job_id === undefined) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Missing required parameters: user_address, user_commitment, job_id' 
      },
      { status: 400 }
    );
  }
  
  try {
    const payload = {
      type: 'entry_function_payload',
      function: JOB.EXECUTE_JOB_ACTION,
      type_arguments: [],
      arguments: [
        JOB.ACTION_APPROVE, // action
        job_id, // job_id
        user_commitment, // user_commitment
        [], // worker_commitment (not used for approve)
        0, // milestone_index (not used for approve)
        [], // cid (not used for approve)
        [], // job_details_cid (not used for approve)
        [], // milestones (not used for approve)
        0 // application_deadline (not used for approve)
      ]
    };
    
    return NextResponse.json({
      success: true,
      message: 'Job approval transaction prepared',
      payload,
      instructions: 'Submit this payload to Aptos network using your wallet'
    });
    
  } catch (error: any) {
    throw new Error(`Failed to prepare job approval: ${error.message}`);
  }
}

// Submit a milestone
async function submitMilestone(params: any) {
  const { 
    user_address, 
    user_commitment, 
    job_id, 
    milestone_index, 
    cid 
  } = params;
  
  if (!user_address || !user_commitment || job_id === undefined || milestone_index === undefined || !cid) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Missing required parameters: user_address, user_commitment, job_id, milestone_index, cid' 
      },
      { status: 400 }
    );
  }
  
  try {
    const payload = {
      type: 'entry_function_payload',
      function: JOB.EXECUTE_JOB_ACTION,
      type_arguments: [],
      arguments: [
        JOB.ACTION_SUBMIT, // action
        job_id, // job_id
        user_commitment, // user_commitment
        [], // worker_commitment (not used for submit)
        milestone_index, // milestone_index
        cid, // cid (milestone submission proof)
        [], // job_details_cid (not used for submit)
        [], // milestones (not used for submit)
        0 // application_deadline (not used for submit)
      ]
    };
    
    return NextResponse.json({
      success: true,
      message: 'Milestone submission transaction prepared',
      payload,
      instructions: 'Submit this payload to Aptos network using your wallet'
    });
    
  } catch (error: any) {
    throw new Error(`Failed to prepare milestone submission: ${error.message}`);
  }
}

// Accept a milestone
async function acceptMilestone(params: any) {
  const { 
    user_address, 
    user_commitment, 
    job_id, 
    milestone_index, 
    cid 
  } = params;
  
  if (!user_address || !user_commitment || job_id === undefined || milestone_index === undefined || !cid) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Missing required parameters: user_address, user_commitment, job_id, milestone_index, cid' 
      },
      { status: 400 }
    );
  }
  
  try {
    const payload = {
      type: 'entry_function_payload',
      function: JOB.EXECUTE_JOB_ACTION,
      type_arguments: [],
      arguments: [
        JOB.ACTION_ACCEPT, // action
        job_id, // job_id
        user_commitment, // user_commitment
        [], // worker_commitment (not used for accept)
        milestone_index, // milestone_index
        cid, // cid (milestone acceptance proof)
        [], // job_details_cid (not used for accept)
        [], // milestones (not used for accept)
        0 // application_deadline (not used for accept)
      ]
    };
    
    return NextResponse.json({
      success: true,
      message: 'Milestone acceptance transaction prepared',
      payload,
      instructions: 'Submit this payload to Aptos network using your wallet'
    });
    
  } catch (error: any) {
    throw new Error(`Failed to prepare milestone acceptance: ${error.message}`);
  }
}

// Complete a job
async function completeJob(params: any) {
  const { 
    user_address, 
    user_commitment, 
    job_id 
  } = params;
  
  if (!user_address || !user_commitment || job_id === undefined) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Missing required parameters: user_address, user_commitment, job_id' 
      },
      { status: 400 }
    );
  }
  
  try {
    const payload = {
      type: 'entry_function_payload',
      function: JOB.EXECUTE_JOB_ACTION,
      type_arguments: [],
      arguments: [
        JOB.ACTION_COMPLETE, // action
        job_id, // job_id
        user_commitment, // user_commitment
        [], // worker_commitment (not used for complete)
        0, // milestone_index (not used for complete)
        [], // cid (not used for complete)
        [], // job_details_cid (not used for complete)
        [], // milestones (not used for complete)
        0 // application_deadline (not used for complete)
      ]
    };
    
    return NextResponse.json({
      success: true,
      message: 'Job completion transaction prepared',
      payload,
      instructions: 'Submit this payload to Aptos network using your wallet'
    });
    
  } catch (error: any) {
    throw new Error(`Failed to prepare job completion: ${error.message}`);
  }
}

// Claim job payment
async function claimJob(params: any) {
  const { 
    user_address, 
    user_commitment, 
    job_id 
  } = params;
  
  if (!user_address || !user_commitment || job_id === undefined) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Missing required parameters: user_address, user_commitment, job_id' 
      },
      { status: 400 }
    );
  }
  
  try {
    const payload = {
      type: 'entry_function_payload',
      function: JOB.EXECUTE_JOB_ACTION,
      type_arguments: [],
      arguments: [
        JOB.ACTION_CLAIM, // action
        job_id, // job_id
        user_commitment, // user_commitment
        [], // worker_commitment (not used for claim)
        0, // milestone_index (not used for claim)
        [], // cid (not used for claim)
        [], // job_details_cid (not used for claim)
        [], // milestones (not used for claim)
        0 // application_deadline (not used for claim)
      ]
    };
    
    return NextResponse.json({
      success: true,
      message: 'Job claim transaction prepared',
      payload,
      instructions: 'Submit this payload to Aptos network using your wallet'
    });
    
  } catch (error: any) {
    throw new Error(`Failed to prepare job claim: ${error.message}`);
  }
}

// Cancel a job
async function cancelJob(params: any) {
  const { 
    user_address, 
    user_commitment, 
    job_id 
  } = params;
  
  if (!user_address || !user_commitment || job_id === undefined) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Missing required parameters: user_address, user_commitment, job_id' 
      },
      { status: 400 }
    );
  }
  
  try {
    const payload = {
      type: 'entry_function_payload',
      function: JOB.EXECUTE_JOB_ACTION,
      type_arguments: [],
      arguments: [
        JOB.ACTION_CANCEL, // action
        job_id, // job_id
        user_commitment, // user_commitment
        [], // worker_commitment (not used for cancel)
        0, // milestone_index (not used for cancel)
        [], // cid (not used for cancel)
        [], // job_details_cid (not used for cancel)
        [], // milestones (not used for cancel)
        0 // application_deadline (not used for cancel)
      ]
    };
    
    return NextResponse.json({
      success: true,
      message: 'Job cancellation transaction prepared',
      payload,
      instructions: 'Submit this payload to Aptos network using your wallet'
    });
    
  } catch (error: any) {
    throw new Error(`Failed to prepare job cancellation: ${error.message}`);
  }
}
