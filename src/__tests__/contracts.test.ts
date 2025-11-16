import {
  ROLE,
  ESCROW,
  DISPUTE,
  REPUTATION,
  ROLE_KIND,
  CONTRACT_ADDRESS,
  APTOS_NODE_URL
} from '@/constants/contracts';
import {
  buildTransactionPayload,
  escrowHelpers,
  disputeHelpers,
  roleHelpers,
  reputationHelpers
} from '@/utils/contractHelpers';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

interface TestProfile {
  publicKey: string;
  privateKey: string;
  seedPhrase?: string;
  address: string;
}

const testProfile: TestProfile = {
  publicKey: '',
  privateKey: '',
  address: ''
};

async function testContractFunctions() {
  console.log('=== Testing Contract Functions ===\n');

  console.log('1. Testing Contract Constants');
  console.log('CONTRACT_ADDRESS:', CONTRACT_ADDRESS);
  console.log('ROLE_KIND:', ROLE_KIND);
  console.log('ROLE functions:', Object.keys(ROLE));
  console.log('ESCROW functions:', Object.keys(ESCROW));
  console.log('DISPUTE functions:', Object.keys(DISPUTE));
  console.log('REPUTATION functions:', Object.keys(REPUTATION));
  console.log('');

  console.log('2. Testing buildTransactionPayload');
  const payload = buildTransactionPayload('test_function', ['arg1', 'arg2'], ['Type1']);
  console.log('Payload:', JSON.stringify(payload, null, 2));
  console.log('');

  console.log('3. Testing escrowHelpers');
  const createJobPayload = escrowHelpers.createJob(
    'job_cid_123',
    [86400, 172800],
    [100_000_000, 200_000_000],
    [3600, 3600],
    604800
  );
  console.log('Create Job Payload:', JSON.stringify(createJobPayload, null, 2));
  console.log('Job Creation Cost:', escrowHelpers.calculateJobCreationCost([100_000_000, 200_000_000]));
  console.log('');

  console.log('4. Testing disputeHelpers');
  const openDisputePayload = disputeHelpers.openDispute(1, 0, 'evidence_cid');
  console.log('Open Dispute Payload:', JSON.stringify(openDisputePayload, null, 2));
  console.log('');

  console.log('5. Testing roleHelpers');
  const registerFreelancerPayload = roleHelpers.registerFreelancer('cid123');
  console.log('Register Freelancer Payload:', JSON.stringify(registerFreelancerPayload, null, 2));
  
  const storeProofPayload = roleHelpers.storeProof('{"proof":"test"}', '["signals"]');
  console.log('Store Proof Payload function:', storeProofPayload.function);
  console.log('Store Proof Payload args length:', storeProofPayload.arguments.length);
  console.log('');

  console.log('6. Testing reputationHelpers');
  if (testProfile.address) {
    try {
      const reputation = await reputationHelpers.getReputationPoints(testProfile.address);
      console.log('Reputation:', reputation);
    } catch (error) {
      console.log('Reputation fetch error:', error);
    }
  } else {
    console.log('No test profile address provided');
  }
  console.log('');

  console.log('=== All Tests Completed ===');
}

async function testWithProfile(profile: TestProfile) {
  testProfile.publicKey = profile.publicKey;
  testProfile.privateKey = profile.privateKey;
  testProfile.seedPhrase = profile.seedPhrase;
  testProfile.address = profile.address;

  console.log('Using profile address:', profile.address);
  console.log('');

  await testContractFunctions();

  if (profile.privateKey) {
    console.log('\n=== Testing with Real Transactions ===');
    console.log('Note: These would require actual private key signing');
    console.log('Skipping real transaction tests for safety');
  }
}

async function main() {
  const profile: TestProfile = {
    publicKey: process.env.TEST_PUBLIC_KEY || '',
    privateKey: process.env.TEST_PRIVATE_KEY || '',
    seedPhrase: process.env.TEST_SEED_PHRASE || '',
    address: process.env.TEST_ADDRESS || ''
  };

  if (profile.address) {
    await testWithProfile(profile);
  } else {
    console.log('No test profile provided. Set TEST_ADDRESS, TEST_PUBLIC_KEY, TEST_PRIVATE_KEY environment variables.');
    console.log('Running basic function tests only...\n');
    await testContractFunctions();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { testContractFunctions, testWithProfile };
export type { TestProfile };
