import { NextRequest, NextResponse } from 'next/server';
import { DID, JOB, APTOS_NODE_URL } from '@/constants/contracts';

const PINATA_JWT = process.env.PINATA_JWT;
const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY;

// Helper function to create SHA256 hash
const sha256Hex = async (s: string): Promise<string> => {
  const enc = new TextEncoder();
  const data = enc.encode(s);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(hash));
  return '0x' + bytes.map(b => b.toString(16).padStart(2, '0')).join('');
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      title, 
      description, 
      requirements, 
      user_commitment, // ZKP commitment thay vì địa chỉ
      type = 'job' // 'job' or 'profile'
    } = body;
    
    // ✅ VALIDATE USER BASED ON TYPE
    if (type === 'job') {
      // For job creation, user MUST have DID profile with poster role
      if (!user_commitment) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'User commitment is required for job creation' 
          },
          { status: 400 }
        );
      }
      
      // Check user's DID profile and role using view functions
      try {
        console.log('Checking DID profile for job creation:', user_commitment);
        
        const roleResponse = await fetch(`${APTOS_NODE_URL}/v1/view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            function: DID.GET_ROLE_TYPES_BY_COMMITMENT,
            type_arguments: [],
            arguments: [user_commitment]
          })
        });
        
        if (!roleResponse.ok) {
          console.error('Role API error:', roleResponse.status, roleResponse.statusText);
          return NextResponse.json(
            { 
              success: false, 
              error: 'Failed to check user role' 
            },
            { status: 500 }
          );
        }
        
        const userRolesResult = await roleResponse.json();
        console.log('User roles raw:', userRolesResult);
        
        // Normalize roles
        const userRoles: number[] = [];
        for (const item of userRolesResult) {
          if (typeof item === 'number') {
            userRoles.push(item);
          } else if (typeof item === 'string') {
            if (item.startsWith('0x')) {
              const hex = item.slice(2);
              for (let i = 0; i < hex.length; i += 2) {
                const byteHex = hex.slice(i, i + 2);
                if (byteHex.length === 2) userRoles.push(parseInt(byteHex, 16));
              }
            } else {
              const n = parseInt(item);
              if (!Number.isNaN(n)) userRoles.push(n);
            }
          } else if (Array.isArray(item)) {
            for (const v of item) if (typeof v === 'number') userRoles.push(v);
          }
        }
        
        console.log('User roles:', userRoles);
        
        // Check if user has profile (roles.length > 0)
        if (userRoles.length === 0) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'User does not have a DID profile. Please create profile first.' 
            },
            { status: 403 }
          );
        }

        // For job creation, user must have poster role (2)
        if (!userRoles.includes(2)) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'User does not have poster role. Only posters can create jobs.' 
            },
            { status: 403 }
          );
        }
        
        console.log('✅ Job creation validation passed - userRoles:', userRoles);
        
        // Store user roles for later use
        body.userRoles = userRoles;
        
      } catch (didError) {
        console.error('DID check error:', didError);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to verify DID profile' 
          },
          { status: 500 }
        );
      }
    } else if (type === 'profile') {
      // For profile creation, NO DID check needed (user is creating profile)
      console.log('✅ Profile creation - no DID validation needed');
      
      // Get role types from request body
      const { roleTypes } = body;
      if (!roleTypes || !Array.isArray(roleTypes) || roleTypes.length === 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Role types are required for profile creation' 
          },
          { status: 400 }
        );
      }
      
      // Store role types for later use
      body.userRoles = roleTypes;
    }
    // Create metadata based on type
    let metadata: any;
    let fileName: string;
    
    if (type === 'job') {
      // Job CID chỉ chứa thông tin cơ bản từ poster
      metadata = {
        title,
        description,
        requirements,
        created_at: new Date().toISOString(),
        version: "1.0.0",
        type: "job"
      };
      fileName = 'job-metadata.json';
    } else if (type === 'profile') {
      // Create profile metadata based on role types from request body
      let profileData: any = {
        created_at: new Date().toISOString(),
        version: "1.0.0",
        type: "profile"
      };
      
      // Get role types and profile data from request body
      const { skills, about, experience, roleTypes } = body;
      
      // Handle multiple roles - don't use else if
      if (roleTypes && roleTypes.includes(1)) { // Freelancer
        profileData = { 
          ...profileData, 
          skills: skills || '', 
          about: about || '', 
          experience: experience || '' 
        };
      }
      
      if (roleTypes && roleTypes.includes(2)) { // Poster
        profileData = { 
          ...profileData, 
          about: about || '' 
        };
      }
      
      // If user has both roles, we need to handle the about field properly
      if (roleTypes && roleTypes.includes(1) && roleTypes.includes(2)) {
        // User is both Freelancer and Poster - use the same about for both
        profileData = { 
          ...profileData, 
          skills: skills || '', 
          about: about || '', 
          experience: experience || '' 
        };
      }
      
      metadata = profileData;
      fileName = 'profile-metadata.json';
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid type. Must be "job" or "profile"' 
        },
        { status: 400 }
      );
    }
    
    const formData = new FormData();
    formData.append('file', new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' }), fileName);
    
    const pinataOptions = JSON.stringify({
      cidVersion: 1
    });
    formData.append('pinataOptions', pinataOptions);

    const pinataMetadata = JSON.stringify({
      name: `${type}-${type === 'job' ? title : 'profile'}-${Date.now()}`,
      keyvalues: {
        type: `${type}-metadata`,
        title: type === 'job' ? title : 'profile'
      }
    });
    formData.append('pinataMetadata', pinataMetadata);

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Pinata upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    const ipfsHash = result.IpfsHash;

    return NextResponse.json({
      success: true,
      ipfsHash,
      ipfsUrl: `${IPFS_GATEWAY}/${ipfsHash}`,
      metadata,
      type,
      // Contract function info for frontend
      contractInfo: {
        didRegistry: {
          createProfile: DID.CREATE_PROFILE,
          updateProfile: DID.UPDATE_PROFILE,
          getProfileData: DID.GET_PROFILE_DATA_BY_COMMITMENT
        },
        escrow: {
          executeJobAction: JOB.EXECUTE_JOB_ACTION,
          getJobById: JOB.GET_JOB_BY_ID,
          getJobLatest: JOB.GET_JOB_LATEST,
          hasNoActiveJobs: JOB.HAS_NO_ACTIVE_JOBS
        }
      }
    });

  } catch (error: any) {
    console.error('IPFS upload error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to upload to IPFS' 
      },
      { status: 500 }
    );
  }
}
