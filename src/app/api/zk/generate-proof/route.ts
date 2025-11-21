import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { groth16 } from 'snarkjs';
import {
  CCCDData,
  SolidityCalldata,
  prepareInputData,
  checkDuplicateProof,
} from './zkProofUtils';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[ZK Proof] Raw request body keys:', Object.keys(body));
    
    // Validate address
    const userAddress = body.address || new URL(request.url).searchParams.get('address');
    if (!userAddress || typeof userAddress !== 'string' || userAddress.trim() === '') {
      console.log('[ZK Proof] ERROR: Missing or invalid address');
      return NextResponse.json({ 
        success: false, 
        error: 'Thiếu địa chỉ ví (address parameter)' 
      }, { status: 400 });
    }
    
    const requester = userAddress.trim().toLowerCase();
    if (!requester.startsWith('0x')) {
      console.log('[ZK Proof] WARNING: Address không có prefix 0x, thêm vào');
    }
    const normalizedRequester = requester.startsWith('0x') ? requester : `0x${requester}`;
    
    console.log('[ZK Proof] Request initiated by', normalizedRequester);
    console.log('[ZK Proof] ========== Bắt đầu tạo ZK Proof ==========');
    
    // Validate CCCD data
    const cccdBody: CCCDData = body;
    const missingFields: string[] = [];
    if (!cccdBody.id_number) missingFields.push('id_number');
    if (!cccdBody.name) missingFields.push('name');
    if (!cccdBody.date_of_birth) missingFields.push('date_of_birth');
    if (!cccdBody.gender) missingFields.push('gender');
    if (!cccdBody.nationality) missingFields.push('nationality');
    if (!cccdBody.date_of_expiry) missingFields.push('date_of_expiry');
    
    console.log('[ZK Proof] Nhận được dữ liệu CCCD:', {
      id_number: cccdBody.id_number ? '***' : 'missing',
      name: cccdBody.name ? '***' : 'missing',
      date_of_birth: cccdBody.date_of_birth || 'missing',
      gender: cccdBody.gender || 'missing',
      nationality: cccdBody.nationality || 'missing',
      date_of_expiry: cccdBody.date_of_expiry || 'missing',
      face_verified: cccdBody.face_verified
    });

    if (missingFields.length > 0) {
      console.log('[ZK Proof] ERROR: Thiếu thông tin CCCD:', missingFields.join(', '));
      return NextResponse.json(
        { 
          success: false,
          error: 'Thiếu thông tin CCCD',
          missing_fields: missingFields
        },
        { status: 400 }
      );
    }

    if (!cccdBody.face_verified) {
      console.log('[ZK Proof] ERROR: Face verification chưa thành công. face_verified =', cccdBody.face_verified);
      return NextResponse.json(
        { 
          success: false,
          error: 'Face verification chưa thành công' 
        },
        { status: 400 }
      );
    }

    // Prepare input data
    console.log('[ZK Proof] Bước 1: Parse và chuẩn bị input data...');
    const inputData = prepareInputData(cccdBody);
    
    console.log('[ZK Proof] Input data:', {
      dob: inputData.dob,
      expiry: inputData.expiry,
      id_hash: inputData.id_hash,
      name_hash: inputData.name_hash,
      today: inputData.today,
      min_age: inputData.min_age
    });

    // Setup file paths
    const zkpDir = path.join(process.cwd(), 'zkp');
    const wasmPath = path.join(zkpDir, 'circuit_js', 'circuit.wasm');
    const zkeyPath = path.join(zkpDir, 'circuit_final.zkey');
    
    const timestamp = Date.now();
    const uniqueInputPath = path.join(zkpDir, `input_${timestamp}.json`);
    const uniqueWitnessPath = path.join(zkpDir, `witness_${timestamp}.wtns`);
    const uniqueProofPath = path.join(zkpDir, `proof_${timestamp}.json`);
    const uniquePublicPath = path.join(zkpDir, `public_${timestamp}.json`);

    await fs.writeFile(uniqueInputPath, JSON.stringify(inputData, null, 2));

    // Check if circuit files exist
    try {
      await fs.access(wasmPath);
      await fs.access(zkeyPath);
    } catch {
      return NextResponse.json(
        { error: 'ZK circuit chưa được compile. Vui lòng chạy setup script trước.' },
        { status: 500 }
      );
    }

    // Generate witness
    console.log('[ZK Proof] Bước 2: Generate witness...');
    try {
      const witnessScript = path.join(zkpDir, 'circuit_js', 'generate_witness.js');
      const quotedWitnessScript = `"${witnessScript}"`;
      const quotedWasmPath = `"${wasmPath}"`;
      const quotedInputPath = `"${uniqueInputPath}"`;
      const quotedWitnessPath = `"${uniqueWitnessPath}"`;
      await execAsync(`node ${quotedWitnessScript} ${quotedWasmPath} ${quotedInputPath} ${quotedWitnessPath}`, {
        cwd: zkpDir
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

    // Generate proof
    console.log('[ZK Proof] Bước 3: Generate proof bằng snarkjs...');
    try {
      const quotedZkeyPath = `"${zkeyPath}"`;
      const quotedWitnessPath2 = `"${uniqueWitnessPath}"`;
      const quotedProofPath = `"${uniqueProofPath}"`;
      const quotedPublicPath = `"${uniquePublicPath}"`;
      await execAsync(`snarkjs groth16 prove ${quotedZkeyPath} ${quotedWitnessPath2} ${quotedProofPath} ${quotedPublicPath}`, {
        cwd: zkpDir
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

    // Read proof and public signals
    const proofContent = await fs.readFile(uniqueProofPath, 'utf-8');
    const publicContent = await fs.readFile(uniquePublicPath, 'utf-8');

    const proof = JSON.parse(proofContent);
    const publicSignals = JSON.parse(publicContent);
    if (!Array.isArray(publicSignals) || publicSignals.length < 3) {
      console.warn('[ZK Proof] Public signals thiếu identity/name hash. Dùng fallback metadata.');
    }

    const extendedPublicSignals = {
      signals: Array.isArray(publicSignals) ? publicSignals : [publicSignals],
      identity_hash: inputData.id_hash,
      name_hash: inputData.name_hash,
      owner: normalizedRequester
    };

    // Generate Solidity calldata
    let solidityCalldata: SolidityCalldata | null = null;
    try {
      const solidityCalldataRaw = await groth16.exportSolidityCallData(proof, publicSignals);
      const parsed = JSON.parse(`[${solidityCalldataRaw}]`);
      solidityCalldata = {
        a: parsed[0],
        b: parsed[1],
        c: parsed[2],
        publicSignals: parsed[3],
      };
      console.log('[ZK Proof] Solidity calldata generated');
    } catch (solidityErr) {
      console.error('[ZK Proof] Lỗi khi tạo solidity calldata:', solidityErr);
    }

    console.log('[ZK Proof] Proof đã được tạo thành công');
    console.log('[ZK Proof] Public signals:', JSON.stringify(publicSignals));

    // Check for duplicate proof
    console.log('[ZK Proof] Bắt đầu kiểm tra duplicate proof...');
    const { isDuplicate, matchedAddress } = await checkDuplicateProof(
      extendedPublicSignals,
      publicSignals,
      inputData,
      normalizedRequester
    );

    if (isDuplicate && matchedAddress) {
              console.log('[ZK Proof] Proof đã tồn tại với địa chỉ:', matchedAddress);
              
              try {
                await fs.unlink(uniqueInputPath);
                await fs.unlink(uniqueWitnessPath);
                await fs.unlink(uniqueProofPath);
                await fs.unlink(uniquePublicPath);
              } catch {}
              
              return NextResponse.json(
                { 
                  error: `Thông tin CCCD này đã được xác minh bởi địa chỉ khác (${matchedAddress}). Vui lòng xác minh lại với thông tin khác hoặc liên hệ hỗ trợ.`,
                  existing_address: matchedAddress,
                  requires_reauth: true
                },
                { status: 409 }
              );
    }

    console.log('[ZK Proof] Kiểm tra duplicate hoàn tất, proof hợp lệ và có thể lưu vào blockchain');

    // Cleanup temp files
    try {
      await fs.unlink(uniqueInputPath);
      await fs.unlink(uniqueWitnessPath);
      await fs.unlink(uniqueProofPath);
      await fs.unlink(uniquePublicPath);
      console.log('[ZK Proof] Đã cleanup temp files');
    } catch (error) {
      console.error('[ZK Proof] Lỗi khi cleanup temp files:', error);
    }

    // Return success response
    console.log('[ZK Proof] Trả về proof để client lưu vào blockchain');
    return NextResponse.json({
      success: true,
      proof,
      public_signals: extendedPublicSignals,
      raw_public_signals: publicSignals,
      solidity_calldata: solidityCalldata
    });
  } catch (error: unknown) {
    console.error('ZK Proof Generation Error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Lỗi khi tạo ZK proof' },
      { status: 500 }
    );
  }
}   
