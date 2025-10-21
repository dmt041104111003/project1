import { NextRequest, NextResponse } from 'next/server';
import { DID } from '@/constants/contracts';

export async function POST(request: NextRequest) {
  try {
    const { did, tableCommitmentHex, tICommitment, aCommitment, roleTypes } = await request.json();

    if (!did) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields for burn profile' 
        },
        { status: 400 }
      );
    }

    // Handle empty fields - convert empty strings to empty vectors/strings
    const processedTableCommitmentHex = tableCommitmentHex && tableCommitmentHex.trim().length > 0 ? tableCommitmentHex : '';
    const processedTICommitment = tICommitment && tICommitment.length > 0 ? tICommitment : [];
    const processedACommitment = aCommitment && aCommitment.length > 0 ? aCommitment : [];
    const processedRoleTypes = roleTypes && roleTypes.length > 0 ? roleTypes : [];

    // Call contract function
    const payload = {
      type: 'entry_function_payload',
      function: DID.BURN_DID,
      type_arguments: [],
      arguments: [
        did,
        processedTableCommitmentHex,
        processedTICommitment,
        processedACommitment,
        processedRoleTypes
      ]
    };
    
    console.log('Burn profile payload:', JSON.stringify(payload, null, 2));
    
    return NextResponse.json({ success: true, payload });

  } catch (error: any) {
    console.error('Burn Profile API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create burn profile payload' 
      },
      { status: 500 }
    );
  }
}
