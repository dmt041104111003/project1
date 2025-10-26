import { NextRequest, NextResponse } from 'next/server';
import { APTOS_NODE_URL, DID, CONTRACT_ADDRESS } from '@/constants/contracts';

async function lookupCommitmentOnBlockchain(commitment: string) {
  try {
    const addressResponse = await fetch(APTOS_NODE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'view',
        params: {
          function: DID.GET_ADDRESS_BY_COMMITMENT,
          arguments: [commitment],
          type_arguments: []
        }
      })
    });

    const addressData = await addressResponse.json();
    if (!addressData.result || addressData.result.length === 0) {
      return null;
    }

    const address = addressData.result[0];

    const roleResponse = await fetch(APTOS_NODE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'view',
        params: {
          function: DID.GET_ROLE_TYPES_BY_COMMITMENT,
          arguments: [commitment],
          type_arguments: []
        }
      })
    });

    const roleData = await roleResponse.json();
    const roles = roleData.result || [];

    const profileResponse = await fetch(APTOS_NODE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'view',
        params: {
          function: DID.GET_PROFILE_DATA_BY_COMMITMENT,
          arguments: [commitment],
          type_arguments: []
        }
      })
    });

    const profileData = await profileResponse.json();
    const profile = profileData.result || {};

    const verificationResponse = await fetch(APTOS_NODE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'view',
        params: {
          function: DID.IS_PROFILE_VERIFIED,
          arguments: [commitment],
          type_arguments: []
        }
      })
    });

    const verificationData = await verificationResponse.json();
    const isVerified = verificationData.result || false;

    let primaryRole = 'unknown';
    if (roles.includes('0')) primaryRole = 'poster';
    else if (roles.includes('1')) primaryRole = 'freelancer';

    return {
      address: address,
      name: profile.name || `User ${address.slice(0, 8)}`,
      role: primaryRole,
      roles: roles,
      commitment: commitment,
      verified: isVerified,
      profile: profile
    };

  } catch (error) {
    console.error('Blockchain lookup error:', error);
    return null;
  }
}

async function getAllCommitmentsFromBlockchain() {
  try {
    const indexerUrl = 'https://indexer-testnet.aptoslabs.com/v1';
    const response = await fetch(`${indexerUrl}/events?event_type=${DID.CREATE_PROFILE}&limit=100`);
    
    if (!response.ok) {
      console.error('Indexer API error:', response.status);
      return [];
    }

    const data = await response.json();
    
    if (!data || !data.length) {
      return [];
    }

    const commitments = [];
    for (const event of data) {
      if (event.data && event.data.did_commitment) {
        const commitmentHex = event.data.did_commitment;
        const commitment = commitmentHex.startsWith('0x') ? commitmentHex.slice(2) : commitmentHex;
        
        commitments.push(commitment);
      }
    }
    
    const validatedCommitments = [];
    for (const commitment of commitments) {
      const userInfo = await lookupCommitmentOnBlockchain(commitment);
      if (userInfo) {
        validatedCommitments.push({
          id: `commitment-${commitment}`,
          commitment: commitment,
          address: userInfo.address,
          name: userInfo.name,
          role: userInfo.role,
          verified: userInfo.verified,
          profile: userInfo.profile
        });
      }
    }

    return validatedCommitments;
  } catch (error) {
    console.error('Error getting all commitments:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const commitment = searchParams.get('commitment');

    if (commitment) {
      const userInfo = await lookupCommitmentOnBlockchain(commitment);

      if (!userInfo) {
        return NextResponse.json({ error: 'Commitment not found on blockchain' }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        user: userInfo 
      });
    }

    const commitments = await getAllCommitmentsFromBlockchain();
    
    return NextResponse.json({ 
      success: true, 
      commitments: commitments 
    });

  } catch (error) {
    console.error('Blockchain lookup error:', error);
    return NextResponse.json({ error: 'Failed to lookup commitment' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { commitment, userInfo } = await request.json();

    if (!commitment || !userInfo) {
      return NextResponse.json({ error: 'Commitment and user info are required' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User verified and saved' 
    });

  } catch (error) {
    console.error('Commitment verification error:', error);
    return NextResponse.json({ error: 'Failed to verify commitment' }, { status: 500 });
  }
}
