import { NextRequest, NextResponse } from 'next/server';
import { DID, JOB, APTOS_NODE_URL } from '@/constants/contracts';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'job' or 'profile'
    const commitment = searchParams.get('commitment'); // For profile
    const jobId = searchParams.get('jobId'); // For job
    
    if (!type) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Type is required. Must be "job" or "profile"' 
        },
        { status: 400 }
      );
    }
    
    if (type === 'profile') {
      return await getProfileCID(commitment);
    } else if (type === 'job') {
      return await getJobCID(jobId);
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid type. Must be "job" or "profile"' 
        },
        { status: 400 }
      );
    }
    
  } catch (error: any) {
    console.error('Get CID error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get CID' 
      },
      { status: 500 }
    );
  }
}

// Get profile CID from did_registry
async function getProfileCID(commitment: string | null) {
  if (!commitment) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Commitment is required for profile type' 
      },
      { status: 400 }
    );
  }
  
  try {
    console.log(`Getting profile CID for commitment: ${commitment}`);
    
    console.log('Calling blockchain view function:', DID.GET_PROFILE_DATA_BY_COMMITMENT);
    console.log('With commitment:', commitment);
    console.log('Commitment type:', typeof commitment);
    console.log('Commitment length:', commitment.length);
    
    // Convert commitment to hex if needed
    let processedCommitment = commitment;
    if (commitment.startsWith('0x')) {
      processedCommitment = commitment.slice(2);
    }
    console.log('Processed commitment:', processedCommitment);
    
    // Convert to the format stored in blockchain (hex encoded string)
    const hexEncodedCommitment = '0x' + Buffer.from(commitment, 'utf8').toString('hex');
    console.log('Hex encoded commitment:', hexEncodedCommitment);
    
    // Use the hex encoded version for blockchain call
    const finalCommitment = hexEncodedCommitment;
    
    const viewResponse = await fetch(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: DID.GET_PROFILE_DATA_BY_COMMITMENT,
        type_arguments: [],
        arguments: [finalCommitment]
      })
    });
    
    console.log('View response status:', viewResponse.status);
    console.log('View response ok:', viewResponse.ok);
    
    if (!viewResponse.ok) {
      throw new Error(`View function failed: ${viewResponse.statusText}`);
    }
    
    const result = await viewResponse.json();
    console.log('Profile data result:', result);
    console.log('Result type:', typeof result);
    console.log('Result length:', Array.isArray(result) ? result.length : 'not array');
    
    // Check if result is empty (indicates no profile found)
    if (Array.isArray(result) && result.length === 2 && result[0] === '0x' && result[1] === '0x') {
      console.log('❌ EMPTY RESULT: No profile found for this commitment');
      console.log('This means either:');
      console.log('1. Profile was not created successfully');
      console.log('2. Commitment does not match what was stored');
      console.log('3. Profile was burned/deleted');
      
      console.log('🔍 DEBUG INFO:');
      console.log('Current commitment:', commitment);
      console.log('From transaction, commitment should be: 0x307866376538623763386138393131373032303661613164333433616638386533333930376361646265333932363861633765356234356436343365623635306266');
      console.log('Commitment match:', commitment === '0x307866376538623763386138393131373032303661613164333433616638386533333930376361646265333932363861633765356234356436343365306266');
      
      return NextResponse.json({
        success: false,
        error: 'No profile found for this commitment. Please create a profile first.',
        debug: {
          commitment: commitment,
          processedCommitment: processedCommitment,
          result: result
        }
      });
    }
    
    // Extract did_commitment and profile_cid from result
    const [didCommitment, profileCid] = result;
    console.log('didCommitment:', didCommitment);
    console.log('profileCid:', profileCid);
    console.log('profileCid type:', typeof profileCid);
    console.log('profileCid is array:', Array.isArray(profileCid));
    
    // Convert profile_cid from hex to string
    let cidString = '';
    if (Array.isArray(profileCid)) {
      console.log('Converting from array:', profileCid);
      cidString = Buffer.from(profileCid).toString('utf8');
    } else if (typeof profileCid === 'string') {
      console.log('Converting from string:', profileCid);
      if (profileCid.startsWith('0x')) {
        cidString = Buffer.from(profileCid.slice(2), 'hex').toString('utf8');
      } else {
        cidString = profileCid;
      }
    }
    console.log('Final cidString:', cidString);
    
    // Get role types from blockchain
    let blockchainRoles: number[] = [];
    try {
      const roleResponse = await fetch(`${APTOS_NODE_URL}/v1/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          function: DID.GET_ROLE_TYPES_BY_COMMITMENT,
          type_arguments: [],
          arguments: [finalCommitment]
        })
      });
      
      if (roleResponse.ok) {
        const roleResult = await roleResponse.json();
        console.log('Blockchain roles:', roleResult);
        
        // Normalize roles
        for (const item of roleResult) {
          if (typeof item === 'number') {
            blockchainRoles.push(item);
          } else if (typeof item === 'string') {
            if (item.startsWith('0x')) {
              const hex = item.slice(2);
              for (let i = 0; i < hex.length; i += 2) {
                const byteHex = hex.slice(i, i + 2);
                if (byteHex.length === 2) blockchainRoles.push(parseInt(byteHex, 16));
              }
            } else {
              const n = parseInt(item);
              if (!Number.isNaN(n)) blockchainRoles.push(n);
            }
          } else if (Array.isArray(item)) {
            for (const v of item) if (typeof v === 'number') blockchainRoles.push(v);
          }
        }
      }
    } catch (roleError) {
      console.log('Could not fetch roles from blockchain:', roleError);
    }

    // Try to fetch profile data from IPFS using CID
    let profileData = null;
    if (cidString) {
      try {
        const ipfsGateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
        const ipfsResponse = await fetch(`${ipfsGateway}/${cidString}`);
        
        if (ipfsResponse.ok) {
          profileData = await ipfsResponse.json();
          console.log('IPFS profile data:', profileData);
        }
      } catch (ipfsError) {
        console.log('Could not fetch profile data from IPFS:', ipfsError);
      }
    }
    
    return NextResponse.json({
      success: true,
      type: 'profile',
      commitment,
      did_commitment: didCommitment,
      profile_cid: cidString,
      blockchain_roles: blockchainRoles,
      profile_data: profileData,
      data: {
        commitment,
        did_commitment: didCommitment,
        profile_cid: cidString,
        blockchain_roles: blockchainRoles,
        ...profileData
      }
    });
    
  } catch (error: any) {
    throw new Error(`Failed to get profile CID: ${error.message}`);
  }
}

// Get job CID from escrow
async function getJobCID(jobId: string | null) {
  if (!jobId) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Job ID is required for job type' 
      },
      { status: 400 }
    );
  }
  
  try {
    console.log(`Getting job CID for job ID: ${jobId}`);
    
    const viewResponse = await fetch(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: JOB.GET_JOB_BY_ID,
        type_arguments: [],
        arguments: [jobId]
      })
    });
    
    if (!viewResponse.ok) {
      throw new Error(`View function failed: ${viewResponse.statusText}`);
    }
    
    const jobData = await viewResponse.json();
    console.log('Job data result:', jobData);
    
    // Extract CID from job data
    const cid = jobData.cid || [];
    
    // Convert CID from hex to string
    let cidString = '';
    if (Array.isArray(cid)) {
      cidString = Buffer.from(cid).toString('utf8');
    } else if (typeof cid === 'string') {
      cidString = Buffer.from(cid.slice(2), 'hex').toString('utf8');
    }
    
    return NextResponse.json({
      success: true,
      type: 'job',
      job_id: jobId,
      cid: cidString,
      data: {
        job_id: jobId,
        cid: cidString,
        poster_commitment: jobData.poster_commitment,
        milestones: jobData.milestones,
        worker_commitment: jobData.worker_commitment,
        approved: jobData.approved,
        active: jobData.active,
        completed: jobData.completed
      }
    });
    
  } catch (error: any) {
    throw new Error(`Failed to get job CID: ${error.message}`);
  }
}
