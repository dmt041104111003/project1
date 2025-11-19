import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CONTRACT_ADDRESS } from "@/constants/contracts";
import { fetchContractResourceData, queryTableItem } from '@/app/api/onchain/_lib/tableClient';
import { requireAuth } from '@/app/api/auth/_lib/helpers';

const execAsync = promisify(exec);

interface CCCDData {
  id_number: string;
  name: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  date_of_expiry: string;
  face_verified: boolean;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const fieldSize = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
  const hashBigInt = BigInt(Math.abs(hash));
  return (hashBigInt % fieldSize).toString();
}

export async function POST(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      const requester = (user.address || '').toLowerCase();
      console.log('[ZK Proof] Request initiated by', requester);
      console.log('[ZK Proof] ========== Bắt đầu tạo ZK Proof ==========');
      const body: CCCDData = await req.json();
      console.log('[ZK Proof] Nhận được dữ liệu CCCD:', {
        id_number: body.id_number ? '***' : 'missing',
        name: body.name ? '***' : 'missing',
        date_of_birth: body.date_of_birth || 'missing',
        gender: body.gender || 'missing',
        nationality: body.nationality || 'missing',
        date_of_expiry: body.date_of_expiry || 'missing',
        face_verified: body.face_verified
      });

      if (!body.id_number || !body.name || !body.date_of_birth || 
          !body.gender || !body.nationality || !body.date_of_expiry) {
        console.log('[ZK Proof] Thiếu thông tin CCCD');
        return NextResponse.json(
          { error: 'Thiếu thông tin CCCD' },
          { status: 400 }
        );
      }

      if (!body.face_verified) {
        console.log('[ZK Proof] Face verification chưa thành công');
        return NextResponse.json(
          { error: 'Face verification chưa thành công' },
          { status: 400 }
        );
      }

      console.log('[ZK Proof] Bước 1: Hash các thông tin CCCD...');
      const id_number_hash = simpleHash(body.id_number);
      const name_hash = simpleHash(body.name);
      const dob_hash = simpleHash(body.date_of_birth);
      const gender_hash = simpleHash(body.gender);
      const nationality_hash = simpleHash(body.nationality);
      const expiry_hash = simpleHash(body.date_of_expiry);
      const face_verified = body.face_verified ? '1' : '0';

      const inputData = {
        id_number: id_number_hash,
        name_hash: name_hash,
        dob_hash: dob_hash,
        gender_hash: gender_hash,
        nationality_hash: nationality_hash,
        expiry_hash: expiry_hash,
        face_verified: face_verified
      };
      console.log('[ZK Proof] Input data đã được hash:', {
        id_number: id_number_hash.substring(0, 20) + '...',
        name_hash: name_hash.substring(0, 20) + '...',
        dob_hash: dob_hash.substring(0, 20) + '...',
        face_verified
      });

      const zkDir = path.join(process.cwd(), 'zk');
      const inputPath = path.join(zkDir, 'cccd_input.json');
      const wasmPath = path.join(zkDir, 'cccd_verification_js', 'cccd_verification.wasm');
      const zkeyPath = path.join(zkDir, 'cccd_verification.zkey');
      const witnessPath = path.join(zkDir, 'cccd_witness.wtns');
      const proofPath = path.join(zkDir, 'cccd_proof.json');
      const publicPath = path.join(zkDir, 'cccd_public.json');
      
      const timestamp = Date.now();
      const uniqueInputPath = path.join(zkDir, `cccd_input_${timestamp}.json`);
      const uniqueWitnessPath = path.join(zkDir, `cccd_witness_${timestamp}.wtns`);
      const uniqueProofPath = path.join(zkDir, `cccd_proof_${timestamp}.json`);
      const uniquePublicPath = path.join(zkDir, `cccd_public_${timestamp}.json`);

      await fs.writeFile(uniqueInputPath, JSON.stringify(inputData, null, 2));

      try {
        await fs.access(wasmPath);
        await fs.access(zkeyPath);
      } catch {
        return NextResponse.json(
          { error: 'ZK circuit chưa được compile. Vui lòng chạy setup script trước.' },
          { status: 500 }
        );
      }

      console.log('[ZK Proof] Bước 2: Generate witness...');
      try {
        const witnessScript = path.join(zkDir, 'cccd_verification_js', 'generate_witness.js');
        const quotedWitnessScript = `"${witnessScript}"`;
        const quotedWasmPath = `"${wasmPath}"`;
        const quotedInputPath = `"${uniqueInputPath}"`;
        const quotedWitnessPath = `"${uniqueWitnessPath}"`;
        await execAsync(`node ${quotedWitnessScript} ${quotedWasmPath} ${quotedInputPath} ${quotedWitnessPath}`, {
          cwd: zkDir
        });
        console.log('[ZK Proof] Witness đã được generate');
      } catch (error: any) {
        console.error('[ZK Proof] Lỗi generate witness:', error);
        try {
          await fs.unlink(uniqueInputPath);
        } catch {}
        return NextResponse.json(
          { error: `Lỗi generate witness: ${error.message}` },
          { status: 500 }
        );
      }

      console.log('[ZK Proof] Bước 3: Generate proof bằng snarkjs...');
      try {
        const quotedZkeyPath = `"${zkeyPath}"`;
        const quotedWitnessPath2 = `"${uniqueWitnessPath}"`;
        const quotedProofPath = `"${uniqueProofPath}"`;
        const quotedPublicPath = `"${uniquePublicPath}"`;
        await execAsync(`snarkjs groth16 prove ${quotedZkeyPath} ${quotedWitnessPath2} ${quotedProofPath} ${quotedPublicPath}`, {
          cwd: zkDir
        });
        console.log('[ZK Proof] Proof đã được generate');
      } catch (error: any) {
        console.error('[ZK Proof] Lỗi generate proof:', error);
        try {
          await fs.unlink(uniqueInputPath);
          await fs.unlink(uniqueWitnessPath);
        } catch {}
        return NextResponse.json(
          { error: `Lỗi generate proof: ${error.message}` },
          { status: 500 }
        );
      }
      const proofContent = await fs.readFile(uniqueProofPath, 'utf-8');
      const publicContent = await fs.readFile(uniquePublicPath, 'utf-8');

      const proof = JSON.parse(proofContent);
      const publicSignals = JSON.parse(publicContent);

      console.log('[ZK Proof] Proof đã được tạo thành công');
      console.log('[ZK Proof] Public signals:', JSON.stringify(publicSignals));

      console.log('[ZK Proof] Bắt đầu kiểm tra duplicate proof...');
      try {
        const roleStore = await fetchContractResourceData('role::RoleStore');
        const proofHashesHandle = roleStore?.proof_hashes?.handle;
        
        if (!proofHashesHandle) {
          console.log('[ZK Proof] Không có proof_hashes table handle, tiếp tục');
        } else {
          const publicSignalsJson = JSON.stringify(publicSignals);
          const publicSignalsBytes = new TextEncoder().encode(publicSignalsJson);
          const publicSignalsHex = Array.from(publicSignalsBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
          
          console.log('[ZK Proof] Querying proof_hashes table với public signals...');
          console.log('[ZK Proof] Public signals hex length:', publicSignalsHex.length);
          console.log('[ZK Proof] Public signals hex (first 50):', publicSignalsHex.substring(0, 50));
          
          const tableData = await queryTableItem({
            handle: proofHashesHandle,
            keyType: 'vector<u8>',
            valueType: 'address',
            key: `0x${publicSignalsHex}`,
          });

          if (tableData && tableData !== null) {
            const existingAddress = tableData;
            console.log('[ZK Proof] Proof đã tồn tại với địa chỉ:', existingAddress);
            
            try {
              await fs.unlink(uniqueInputPath);
              await fs.unlink(uniqueWitnessPath);
              await fs.unlink(uniqueProofPath);
              await fs.unlink(uniquePublicPath);
            } catch {}
            
            return NextResponse.json(
              { 
                error: `Thông tin CCCD này đã được xác minh bởi địa chỉ khác (${existingAddress}). Vui lòng xác minh lại với thông tin khác hoặc liên hệ hỗ trợ.`,
                existing_address: existingAddress,
                requires_reauth: true
              },
              { status: 409 }
            );
          } else {
            console.log('[ZK Proof] Proof chưa tồn tại trong table, có thể tiếp tục');
          }
        }
      } catch (error: any) {
        console.error('[ZK Proof] Lỗi khi kiểm tra duplicate proof:', error);
      }

      console.log('[ZK Proof] Kiểm tra duplicate hoàn tất, proof hợp lệ và có thể lưu vào blockchain');

      try {
        await fs.unlink(uniqueInputPath);
        await fs.unlink(uniqueWitnessPath);
        await fs.unlink(uniqueProofPath);
        await fs.unlink(uniquePublicPath);
        console.log('[ZK Proof] Đã cleanup temp files');
      } catch (error) {
        console.error('[ZK Proof] Lỗi khi cleanup temp files:', error);
      }

      console.log('[ZK Proof] Trả về proof để client lưu vào blockchain');
      return NextResponse.json({
        success: true,
        proof: proof,
        public_signals: publicSignals
      });

    } catch (error: unknown) {
      console.error('ZK Proof Generation Error:', error);
      return NextResponse.json(
        { error: (error as Error).message || 'Lỗi khi tạo ZK proof' },
        { status: 500 }
      );
    }
  });
}

