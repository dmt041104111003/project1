/**
 * Script kiểm tra UT points trực tiếp từ contract
 */

const APTOS_NODE_URL = 'https://api.testnet.aptoslabs.com';
const CONTRACT_ADDRESS = '0x03e18f7d891156850e51e6e4ff770ad7d10801b0edb168de50dd5c00919261ca';
// Hardcode API key hoặc để trống
const APTOS_API_KEY = process.env.APTOS_API_KEY || '';

const TEST_ADDRESSES = {
  poster: '0x9f91cd92705e69d7387ba3a4d4703cba1a94f97086b0f7273459a938135b23f5',
  freelancer: '0x2b3c1c44ac610399eef451c27968d030a07dbc25a7cbaf3c8324a1e7c7417e26',
  reviewer1: '0x840f14231a87be9b3a41638bd8a3f8879ca1a517db3f9f23e181dfbbfb2beccb',
  reviewer2: '0x28360a9a93c9240c28c1ecd45c46685f65d05d3ba0abf90353f352943ba755ff',
  reviewer3: '0x579024a64f477ef1fd1ddad0014a0c14f0f97e4c450ed8272528415fd56d00d6',
  reviewer4: '0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9',
};

const EXPECTED_UT = {
  poster: 100,
  freelancer: 80,
  reviewer1: 50,
  reviewer2: 150,
  reviewer3: 200,
  reviewer4: 120,
};

const getHeaders = () => ({
  'Content-Type': 'application/json',
  ...(APTOS_API_KEY && { 'Authorization': `Bearer ${APTOS_API_KEY}` }),
});

async function getUT(address) {
  const payload = {
    function: `${CONTRACT_ADDRESS}::reputation::get`,
    type_arguments: [],
    arguments: [address],
  };

  try {
    const response = await fetch(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      return { error: text, ut: 0 };
    }

    const data = await response.json();
    return { ut: Number(data[0] || 0), raw: data };
  } catch (error) {
    return { error: error.message, ut: 0 };
  }
}

async function hasRole(address, roleKind) {
  const funcName = roleKind === 1 ? 'has_freelancer' : roleKind === 2 ? 'has_poster' : 'has_reviewer';
  const payload = {
    function: `${CONTRACT_ADDRESS}::role::${funcName}`,
    type_arguments: [],
    arguments: [address],
  };

  try {
    const response = await fetch(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) return false;
    const data = await response.json();
    return data[0] === true;
  } catch {
    return false;
  }
}

async function getReputationEvents() {
  try {
    const response = await fetch(
      `${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/events/${CONTRACT_ADDRESS}::reputation::RepStore/reputation_changed_events?limit=50`,
      { headers: getHeaders() }
    );

    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

async function main() {
  console.log('==========================================');
  console.log('🔍 Kiểm tra UT Points trực tiếp từ Contract');
  console.log('==========================================');
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`API Key: ${APTOS_API_KEY ? 'Có' : 'Không có'}\n`);

  // Check each address
  for (const [name, address] of Object.entries(TEST_ADDRESSES)) {
    const { ut, error, raw } = await getUT(address);
    const expected = EXPECTED_UT[name];
    const status = ut === expected ? '✅' : '❌';
    
    // Check roles
    const roleKind = name === 'poster' ? 2 : name === 'freelancer' ? 1 : 3;
    const hasRoleResult = await hasRole(address, roleKind);
    
    console.log(`${status} ${name.toUpperCase()}`);
    console.log(`   Address: ${address}`);
    console.log(`   UT: ${ut} (mong đợi: ${expected})`);
    console.log(`   Có role: ${hasRoleResult ? 'Có' : 'Không'}`);
    if (error) console.log(`   Error: ${error}`);
    console.log('');
  }

  // Check events
  console.log('==========================================');
  console.log('📜 ReputationChangedEvents gần đây:');
  console.log('==========================================');
  
  const events = await getReputationEvents();
  if (events.length === 0) {
    console.log('❌ Không có event nào! Contract có thể chưa được deploy với logic mới.');
  } else {
    events.slice(0, 10).forEach((e, i) => {
      const data = e.data;
      console.log(`${i + 1}. Address: ${data.address}`);
      console.log(`   ${data.old_value} → ${data.new_value} (+${data.delta})`);
      console.log(`   Time: ${new Date(Number(data.changed_at) * 1000).toLocaleString()}`);
      console.log('');
    });
  }

  console.log('==========================================');
  console.log('💡 Nếu UT = 0 và không có events:');
  console.log('   1. Deploy lại contract với code mới');
  console.log('   2. Đăng ký lại role để nhận UT khởi tạo');
  console.log('==========================================');
}

main().catch(console.error);

