/**
 * Script để query RoleStore tables
 * Usage: 
 *   node scripts/query-role-store.js <address>
 *   node scripts/query-role-store.js --all  (lấy tất cả proofs)
 * Example: 
 *   node scripts/query-role-store.js 0x9f91cd92705e69d7387ba3a4d4703cba1a94f97086b0f7273459a938135b23f5
 *   node scripts/query-role-store.js --all
 */

const CONTRACT_ADDRESS = '0x84570ca591644c50b6f6ed02f1cc538c53a142bb67e198c8fbd4c03dae0ee198';
const APTOS_NODE_URL = 'https://api.testnet.aptoslabs.com';
const APTOS_API_KEY = process.env.NEXT_PUBLIC_APTOS_API_KEY || process.env.APTOS_API_KEY || '';

function withAptosHeaders(init = {}) {
  const headers = { ...(init.headers || {}) };
  if (APTOS_API_KEY) {
    if (!headers['x-api-key']) {
      headers['x-api-key'] = APTOS_API_KEY;
    }
    if (!headers['Authorization']) {
      headers['Authorization'] = `Bearer ${APTOS_API_KEY}`;
    }
  }
  return {
    ...init,
    headers,
  };
}

async function fetchContractResource(resourcePath) {
  const resourceType = `${CONTRACT_ADDRESS}::${resourcePath}`;
  const res = await fetch(
    `${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/resource/${resourceType}`,
    withAptosHeaders()
  );
  if (!res.ok) {
    return null;
  }
  const data = await res.json();
  return data?.data ?? null;
}

function normalizeKey(keyType, key) {
  if (!keyType) return key;
  if (keyType === 'address') return key;
  if (keyType === 'u8') {
    if (typeof key === 'number') return key;
    const num = Number(key);
    return isNaN(num) ? key : num;
  }
  if (keyType === 'u64') return String(key);
  if (keyType.startsWith('u')) return String(key);
  if (keyType === 'vector<u8>') {
    if (typeof key === 'string') {
      // Convert hex string to array
      if (key.startsWith('0x')) {
        const hex = key.slice(2);
        const bytes = [];
        for (let i = 0; i < hex.length; i += 2) {
          bytes.push(parseInt(hex.substr(i, 2), 16));
        }
        return bytes;
      }
      // Try to parse as JSON array
      try {
        return JSON.parse(key);
      } catch {
        // Convert string to bytes
        return Array.from(new TextEncoder().encode(key));
      }
    }
    return key;
  }
  return key;
}

async function queryTableItem(params) {
  const normalizedKey = normalizeKey(params.keyType, params.key);
  const requestBody = {
    key_type: params.keyType,
    value_type: params.valueType,
    key: normalizedKey,
  };

  const headerConfig = withAptosHeaders();
  const res = await fetch(`${APTOS_NODE_URL}/v1/tables/${params.handle}/item`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headerConfig.headers,
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    const text = await res.text();
    throw new Error(`Query failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data;
}

function decodeVectorU8(vec) {
  if (!vec) return null;
  
  if (Array.isArray(vec)) {
    try {
      const jsonString = String.fromCharCode(...vec).replace(/\0/g, '');
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  }
  
  if (typeof vec === 'string') {
    try {
      return JSON.parse(vec);
    } catch {
      if (vec.startsWith('0x')) {
        const hexString = vec.slice(2);
        const bytes = [];
        for (let i = 0; i < hexString.length; i += 2) {
          bytes.push(parseInt(hexString.substr(i, 2), 16));
        }
        const jsonString = String.fromCharCode(...bytes).replace(/\0/g, '');
        return JSON.parse(jsonString);
      }
    }
  }
  
  return null;
}

async function main() {
  const address = process.argv[2];
  const getAll = process.argv.includes('--all') || process.argv.includes('-a');
  
  if (!address && !getAll) {
    console.log('Usage:');
    console.log('  node scripts/query-role-store.js <address>');
    console.log('  node scripts/query-role-store.js --all  (lấy tất cả proofs)');
    console.log('');
    console.log('Example:');
    console.log('  node scripts/query-role-store.js 0x9f91cd92705e69d7387ba3a4d4703cba1a94f97086b0f7273459a938135b23f5');
    console.log('  node scripts/query-role-store.js --all');
    process.exit(1);
  }

  console.log('='.repeat(80));
  if (getAll) {
    console.log('Querying ALL proofs from RoleStore');
  } else {
    console.log('Querying RoleStore for address:', address);
  }
  console.log('Contract:', CONTRACT_ADDRESS);
  console.log('='.repeat(80));

  try {
    // 1. Get RoleStore resource
    console.log('\n[1] Fetching RoleStore resource...');
    const roleStore = await fetchContractResource('role::RoleStore');
    if (!roleStore) {
      console.error('RoleStore not found!');
      process.exit(1);
    }

    console.log('RoleStore structure:');
    console.log('  - users.handle:', roleStore.users?.handle || 'N/A');
    console.log('  - proofs.handle:', roleStore.proofs?.handle || 'N/A');
    console.log('  - identity_hashes.handle:', roleStore.identity_hashes?.handle || 'N/A');
    console.log('  - reviewers count:', roleStore.reviewers?.length || 0);

    // If --all, query all proofs
    if (getAll) {
      console.log('\n[ALL PROOFS] Querying all proofs from table...');
      
      const allProofs = [];
      
      // Get all addresses from users table (vì register role cần có proof)
      const allAddresses = new Set();
      
      // Add reviewers
      const reviewers = roleStore.reviewers || [];
      reviewers.forEach(addr => allAddresses.add(addr));
      console.log(`Found ${reviewers.length} reviewers`);
      
      // Scan users table để lấy tất cả addresses đã register role
      // Note: Aptos Table không có API list all keys, nên cần scan qua known addresses
      // Hoặc có thể query từ events, nhưng giờ scan qua reviewers + known addresses
      
      // Thêm addresses đã biết có proof (từ logs)
      const knownAddresses = [
        '0x9f91cd92705e69d7387ba3a4d4703cba1a94f97086b0f7273459a938135b23f5',
        '0x2b3c1c44ac610399eef451c27968d030a07dbc25a7cbaf3c8324a1e7c7417e26',
        '0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9'
      ];
      knownAddresses.forEach(addr => allAddresses.add(addr));
      
      console.log(`Scanning ${allAddresses.size} addresses for proofs...`);
      
      for (const addr of allAddresses) {
        const proof = await queryTableItem({
          handle: roleStore.proofs.handle,
          keyType: 'address',
          valueType: `${CONTRACT_ADDRESS}::role::CCCDProof`,
          key: addr,
        });
        
        if (proof) {
          const decodedPublicSignals = decodeVectorU8(proof.public_signals);
          allProofs.push({
            address: addr,
            timestamp: proof.timestamp ? Number(proof.timestamp) : null,
            public_signals: decodedPublicSignals,
            raw_public_signals: proof.public_signals,
          });
        }
      }
      
      console.log(`\nFound ${allProofs.length} proofs`);
      console.log('='.repeat(80));
      
      allProofs.forEach((proof, index) => {
        console.log(`\n[${index + 1}] Address: ${proof.address}`);
        console.log(`  Timestamp: ${proof.timestamp ? new Date(proof.timestamp * 1000).toISOString() : 'N/A'}`);
        
        if (proof.public_signals) {
          if (Array.isArray(proof.public_signals) && proof.public_signals.length >= 3) {
            console.log(`  Public Signals:`);
            console.log(`    - valid: ${proof.public_signals[0]}`);
            console.log(`    - identity_hash: ${proof.public_signals[1]}`);
            console.log(`    - name_hash: ${proof.public_signals[2]}`);
          } else if (proof.public_signals.signals) {
            console.log(`  Public Signals:`, JSON.stringify(proof.public_signals.signals));
            if (proof.public_signals.meta) {
              console.log(`  Meta:`, JSON.stringify(proof.public_signals.meta));
            }
          } else {
            console.log(`  Public Signals:`, JSON.stringify(proof.public_signals, null, 2));
          }
        } else {
          console.log(`  Public Signals: (raw ${proof.raw_public_signals?.length || 0} bytes)`);
        }
      });
      
      // Summary by identity_hash
      console.log('\n' + '='.repeat(80));
      console.log('SUMMARY BY IDENTITY_HASH:');
      console.log('='.repeat(80));
      
      const byIdentityHash = {};
      allProofs.forEach(proof => {
        let identityHash = null;
        if (Array.isArray(proof.public_signals) && proof.public_signals.length >= 2) {
          identityHash = proof.public_signals[1];
        } else if (proof.public_signals?.meta?.identity_hash) {
          identityHash = proof.public_signals.meta.identity_hash;
        } else if (proof.public_signals?.signals && Array.isArray(proof.public_signals.signals) && proof.public_signals.signals.length >= 2) {
          identityHash = proof.public_signals.signals[1];
        }
        
        if (identityHash) {
          if (!byIdentityHash[identityHash]) {
            byIdentityHash[identityHash] = [];
          }
          byIdentityHash[identityHash].push(proof.address);
        }
      });
      
      Object.entries(byIdentityHash).forEach(([hash, addresses]) => {
        if (addresses.length > 1) {
          console.log(`\n⚠ DUPLICATE DETECTED! identity_hash: ${hash}`);
          console.log(`  Used by ${addresses.length} addresses:`);
          addresses.forEach(addr => console.log(`    - ${addr}`));
        } else {
          console.log(`\n✓ identity_hash: ${hash} -> ${addresses[0]}`);
        }
      });
      
      console.log('\n' + '='.repeat(80));
      console.log('Query completed!');
      console.log('='.repeat(80));
      return;
    }

    // 2. Query proofs table (address -> CCCDProof)
    if (roleStore.proofs?.handle) {
      console.log('\n[2] Querying proofs table...');
      const proof = await queryTableItem({
        handle: roleStore.proofs.handle,
        keyType: 'address',
        valueType: `${CONTRACT_ADDRESS}::role::CCCDProof`,
        key: address,
      });

      if (proof) {
        console.log('✓ Proof found:');
        console.log('  - timestamp:', proof.timestamp ? Number(proof.timestamp) : 'N/A');
        
        const decodedPublicSignals = decodeVectorU8(proof.public_signals);
        if (decodedPublicSignals) {
          console.log('  - public_signals (decoded):', JSON.stringify(decodedPublicSignals, null, 2));
          
          // Extract identity_hash and name_hash from public signals
          if (Array.isArray(decodedPublicSignals) && decodedPublicSignals.length >= 3) {
            console.log('    * valid:', decodedPublicSignals[0]);
            console.log('    * identity_hash:', decodedPublicSignals[1]);
            console.log('    * name_hash:', decodedPublicSignals[2]);
          } else if (decodedPublicSignals.signals && Array.isArray(decodedPublicSignals.signals)) {
            console.log('    * signals:', decodedPublicSignals.signals);
            if (decodedPublicSignals.meta) {
              console.log('    * meta:', decodedPublicSignals.meta);
            }
          }
        } else {
          console.log('  - public_signals (raw):', proof.public_signals?.length || 0, 'bytes');
        }
        console.log('  - proof (raw):', proof.proof?.length || 0, 'bytes');
      } else {
        console.log('✗ No proof found for this address');
      }
    }

    // 3. Query users table (address -> UserRoles)
    if (roleStore.users?.handle) {
      console.log('\n[3] Querying users table...');
      const userRoles = await queryTableItem({
        handle: roleStore.users.handle,
        keyType: 'address',
        valueType: `${CONTRACT_ADDRESS}::role::UserRoles`,
        key: address,
      });

      if (userRoles) {
        console.log('✓ UserRoles found:');
        console.log('  - roles.handle:', userRoles.roles?.handle || 'N/A');
        console.log('  - cids.handle:', userRoles.cids?.handle || 'N/A');

        // Query roles
        if (userRoles.roles?.handle) {
          const [hasFreelancer, hasPoster, hasReviewer] = await Promise.all([
            queryTableItem({ handle: userRoles.roles.handle, keyType: 'u8', valueType: 'bool', key: 1 }),
            queryTableItem({ handle: userRoles.roles.handle, keyType: 'u8', valueType: 'bool', key: 2 }),
            queryTableItem({ handle: userRoles.roles.handle, keyType: 'u8', valueType: 'bool', key: 3 }),
          ]);

          console.log('  - Roles:');
          console.log('    * FREELANCER (1):', hasFreelancer === true ? 'YES' : 'NO');
          console.log('    * POSTER (2):', hasPoster === true ? 'YES' : 'NO');
          console.log('    * REVIEWER (3):', hasReviewer === true ? 'YES' : 'NO');
        }

        // Query CIDs
        if (userRoles.cids?.handle) {
          const [freelancerCid, posterCid] = await Promise.all([
            queryTableItem({ handle: userRoles.cids.handle, keyType: 'u8', valueType: '0x1::string::String', key: 1 }),
            queryTableItem({ handle: userRoles.cids.handle, keyType: 'u8', valueType: '0x1::string::String', key: 2 }),
          ]);

          console.log('  - CIDs:');
          if (freelancerCid) console.log('    * FREELANCER CID:', freelancerCid);
          if (posterCid) console.log('    * POSTER CID:', posterCid);
        }
      } else {
        console.log('✗ No UserRoles found for this address');
      }
    }

    // 4. Query identity_hashes table (identity_hash -> address)
    if (roleStore.identity_hashes?.handle && roleStore.proofs?.handle) {
      console.log('\n[4] Querying identity_hashes table...');
      
      // First get the proof to extract identity_hash
      const proof = await queryTableItem({
        handle: roleStore.proofs.handle,
        keyType: 'address',
        valueType: `${CONTRACT_ADDRESS}::role::CCCDProof`,
        key: address,
      });

      if (proof?.public_signals) {
        const decoded = decodeVectorU8(proof.public_signals);
        if (decoded) {
          // Extract identity_hash from public signals
          let identityHash = null;
          if (Array.isArray(decoded) && decoded.length >= 2) {
            identityHash = Number(decoded[1]);
          } else if (decoded.meta?.identity_hash) {
            identityHash = decoded.meta.identity_hash;
          } else if (decoded.signals && Array.isArray(decoded.signals) && decoded.signals.length >= 2) {
            identityHash = Number(decoded.signals[1]);
          }
          
          if (identityHash) {
            const ownerAddress = await queryTableItem({
              handle: roleStore.identity_hashes.handle,
              keyType: 'u64',
              valueType: 'address',
              key: identityHash,
            });

            if (ownerAddress) {
              console.log('✓ Identity hash found in identity_hashes table:');
              console.log('  - Identity hash:', identityHash);
              console.log('  - Owner address:', ownerAddress);
              console.log('  - Matches query address:', String(ownerAddress).toLowerCase() === address.toLowerCase() ? 'YES' : 'NO');
            } else {
              console.log('✗ Identity hash not found in identity_hashes table');
            }
          } else {
            console.log('⚠ Cannot extract identity_hash from public_signals');
          }
        } else {
          console.log('⚠ Cannot decode public_signals');
        }
      } else {
        console.log('⚠ Cannot query identity_hashes: no proof found for this address');
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('Query completed!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();

