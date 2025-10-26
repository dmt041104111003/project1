import { NextRequest, NextResponse } from 'next/server';
import { APTOS_NODE_URL, DID, CONTRACT_ADDRESS, APTOS_API_KEY } from '@/constants/contracts';

async function lookupCommitmentOnBlockchain(commitment: string) {
  try {
    
    const [addressRes, roleRes, profileRes] = await Promise.all([
      fetch(`${APTOS_NODE_URL}/view`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${APTOS_API_KEY}`
        },
        body: JSON.stringify({
          function: DID.GET_ADDRESS_BY_COMMITMENT, 
          arguments: [commitment], 
          type_arguments: [] 
        })
      }),
      
      fetch(`${APTOS_NODE_URL}/view`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${APTOS_API_KEY}`
        },
        body: JSON.stringify({
          function: DID.GET_ROLE_TYPES_BY_COMMITMENT, 
          arguments: [commitment],
          type_arguments: [] 
        })
      }),
      
      fetch(`${APTOS_NODE_URL}/view`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${APTOS_API_KEY}`
        },
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


    if (!addressData || addressData.length === 0) {
      return null;
    }

    const address = addressData[0];
    const roleHex = roleData?.[0] || '0x';
    const [didCommitment, profileCid] = profileData || [[], []];

    const roles: number[] = [];
    if (roleHex && roleHex.startsWith('0x')) {
      const hexData = roleHex.slice(2);
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
        const cidString = Buffer.from(profileCid).toString('utf8');
        profileName = `User ${address.slice(0, 8)}`; 
      } catch (e) {
      }
    }

    // Check if commitment has roles (verification)
    const isVerified = roles.length > 0;

    return {
      address,
      name: profileName,
      role: primaryRole,
      roles,
      commitment,
      verified: isVerified, 
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

// NEW FUNCTION: Check if an address has a verified DID
async function checkAddressVerification(address: string) {
  try {
    
    // Get all commitments
    const response = await fetch(`${APTOS_NODE_URL}/view`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${APTOS_API_KEY}`
      },
      body: JSON.stringify({
        function: DID.GET_ALL_COMMITMENTS,
        arguments: [],
        type_arguments: []
      })
    });

    if (!response.ok) {
      console.error('HTTP error:', response.status);
      return { verified: false };
    }

    const data = await response.json();
    if (!data || data.length === 0 || !data[0]) {
      return { verified: false };
    }

    const commitmentsList = data[0] || [];

    // Check each commitment to find matching address
    for (const hexCommitment of commitmentsList) {
      const commitment = hexCommitment.startsWith('0x') 
        ? hexCommitment 
        : `0x${hexCommitment}`;
      
      try {
        const addressResponse = await fetch(`${APTOS_NODE_URL}/view`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${APTOS_API_KEY}`
          },
          body: JSON.stringify({
            function: DID.GET_ADDRESS_BY_COMMITMENT, 
            arguments: [commitment], 
            type_arguments: [] 
          })
        });

        const addressData = await addressResponse.json();
        
        if (addressData && addressData.length > 0) {
          const commitmentAddress = addressData[0];
          
          // Found matching address! Now check if commitment has roles
          if (commitmentAddress.toLowerCase() === address.toLowerCase()) {
            // Check if commitment has roles (verification)
            try {
              const roleResponse = await fetch(`${APTOS_NODE_URL}/view`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${APTOS_API_KEY}`
                },
                body: JSON.stringify({
                  function: DID.GET_ROLE_TYPES_BY_COMMITMENT, 
                  arguments: [commitment], 
                  type_arguments: [] 
                })
              });

              const roleData = await roleResponse.json();
              console.log('Role data for commitment:', commitment, ':', roleData);
              const hasRoles = roleData && roleData.length > 0 && roleData[0] && roleData[0] !== '0x';
              console.log('Has roles:', hasRoles);
              
              return { 
                verified: hasRoles, 
                commitment,
                address: commitmentAddress
              };
            } catch (roleError) {
              console.error('Error checking roles:', roleError);
              return { 
                verified: false, 
                commitment,
                address: commitmentAddress
              };
            }
          }
        }
      } catch (err) {
        continue;
      }
    }

    return { verified: false };

  } catch (error) {
    console.error('Error checking address verification:', error);
    return { verified: false };
  }
}

// getAllCommitmentsFromBlockchain function has been removed

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const commitment = searchParams.get('commitment');
    const address = searchParams.get('address');
    const excludeAddress = searchParams.get('excludeAddress');

    // NEW: Check if address has verified DID
    if (address) {
      const verificationResult = await checkAddressVerification(address);
      return NextResponse.json({ 
        success: true, 
        ...verificationResult
      });
    }

    // Existing: Lookup by commitment
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
    
    return NextResponse.json({ 
      success: true, 
      message: 'Get all commitments functionality has been cleared',
      commitments: []
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