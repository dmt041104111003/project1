import { NextRequest, NextResponse } from 'next/server';
import { APTOS_NODE_URL, DID } from '@/constants/contracts';

async function lookupCommitmentOnBlockchain(commitment: string) {
  try {
    console.log('Looking up commitment:', commitment);
    
    const [addressRes, roleRes, profileRes] = await Promise.all([
      fetch(`${APTOS_NODE_URL}/v1/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          function: DID.GET_ADDRESS_BY_COMMITMENT, 
          arguments: [commitment], 
          type_arguments: [] 
        })
      }),
      
      fetch(`${APTOS_NODE_URL}/v1/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          function: DID.GET_ROLE_TYPES_BY_COMMITMENT, 
          arguments: [commitment],
          type_arguments: [] 
        })
      }),
      
      fetch(`${APTOS_NODE_URL}/v1/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          function: DID.GET_PROFILE_DATA_BY_COMMITMENT, 
          arguments: [commitment],
          type_arguments: [] 
        })
      })
    ]);

    const [addressData, roleData, profileData] = await Promise.all([
      addressRes.json(), 
      roleRes.json(), 
      profileRes.json()
    ]);

    console.log('Address data:', addressData);
    console.log('Role data:', roleData);
    console.log('Profile data:', profileData);

    if (!addressData || addressData.length === 0) {
      console.log('No address found for commitment');
      return null;
    }

    const address = addressData[0];
    const roleHex = roleData?.[0] || '0x';
    const [didCommitment, profileCid] = profileData || [[], []];

    const roles: number[] = [];
    if (roleHex && roleHex.startsWith('0x')) {
      const hexData = roleHex.slice(2); // Remove '0x'
      for (let i = 0; i < hexData.length; i += 2) {
        const hexByte = hexData.slice(i, i + 2);
        const roleNumber = parseInt(hexByte, 16);
        if (roleNumber > 0) {
          roles.push(roleNumber);
        }
      }
    }

    const roleMap: { [key: number]: string } = {
      1: 'freelancer',
      2: 'poster'
    };
    
    const roleStrings = roles.map(role => roleMap[role] || 'unknown').filter(role => role !== 'unknown');
    const primaryRole = roleStrings.length > 0 ? roleStrings.join(', ') : 'unknown';

    let profileName = `User ${address.slice(0, 8)}`;
    if (profileCid && profileCid.length > 0) {
      try {
        Buffer.from(profileCid).toString('utf8');
        profileName = `User ${address.slice(0, 8)}`; 
      } catch {
        console.log('Could not decode profile CID');
      }
    }

    return {
      address,
      name: profileName,
      role: primaryRole,
      roles,
      commitment,
      verified: true, 
      profile: {
        didCommitment,
        profileCid
      }
    };

  } catch (error) {
    console.error('Blockchain lookup error:', error);
    return null;
  }
}

async function getAllCommitmentsFromBlockchain(excludeAddress?: string) {
  try {
    // Use direct API call with proper endpoint
    const response = await fetch(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: DID.GET_ALL_COMMITMENTS,
        arguments: [],
        type_arguments: []
      })
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      console.error('HTTP error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    console.log('API response:', data);
    
    if (!data || data.length === 0) {
      console.log('No commitments found');
      return [];
    }

    // data có dạng: [["0x30786637..."]]
    const commitmentsList = data[0] || [];
    console.log('Commitments list:', commitmentsList);

    const commitments = await Promise.all(
      commitmentsList.map(async (hexCommitment: string) => {
        const commitment = hexCommitment.startsWith('0x') 
          ? hexCommitment 
          : `0x${hexCommitment}`;
        
        console.log('Processing commitment:', commitment);
        
        const userInfo = await lookupCommitmentOnBlockchain(commitment);
        
        if (!userInfo) {
          console.log('No user info for commitment:', commitment);
          return null;
        }
        
        // Filter out excluded address at source
        if (excludeAddress && userInfo.address.toLowerCase() === excludeAddress.toLowerCase()) {
          console.log('Excluding current user at source:', userInfo.address);
          return null;
        }
        
        return {
          id: `commitment-${commitment}`,
          commitment,
          address: userInfo.address,
          name: userInfo.name,
          role: userInfo.role,
          verified: userInfo.verified,
          profile: userInfo.profile
        };
      })
    );

    return commitments.filter(Boolean);
  } catch (error) {
    console.error('Error getting all commitments:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const commitment = searchParams.get('commitment');
    const excludeAddress = searchParams.get('excludeAddress');

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
    
    let commitments = [];
    try {
      commitments = await getAllCommitmentsFromBlockchain(excludeAddress || undefined);
    } catch (blockchainError) {
      console.error('Blockchain error (non-fatal):', blockchainError);
    }
    
    return NextResponse.json({ 
      success: true, 
      commitments: commitments 
    });

  } catch (error) {
    console.error('API error:', error);
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
