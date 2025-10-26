import { NextRequest, NextResponse } from 'next/server';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { JOB } from '@/constants/contracts';

const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

export async function POST(request: NextRequest) {
  try {
    const { job_id, user_address, user_commitment } = await request.json();

    if (!job_id || !user_address || !user_commitment) {
      return NextResponse.json({ success: false, error: 'Missing required parameters: job_id, user_address, user_commitment' });
    }

    const isExpired = await aptos.view({
      payload: {
        function: JOB.IS_MILESTONE_EXPIRED,
        functionArguments: [job_id.toString(), "0"] 
      }
    });

    if (!isExpired[0]) {
      return NextResponse.json({ success: false, error: 'Milestone not expired yet' });
    }

    const payload = {
      type: "entry_function_payload",
      function: JOB.EXECUTE_JOB_ACTION,
      type_arguments: [],
      arguments: [JOB.ACTION_AUTO_RETURN_STAKE, job_id.toString(), user_commitment, "0x", "0", "0x", "0x", [], [], "0"]
    };

    return NextResponse.json({
      success: true,
      payload,
      message: 'Auto-return stake transaction ready for signing'
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to create auto-return stake transaction' });
  }
}