// import { NextRequest, NextResponse } from 'next/server';
// import { exec } from 'child_process';
// import { promisify } from 'util';
// import * as fs from 'fs/promises';
// import * as path from 'path';

// const execAsync = promisify(exec);

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { proof, public_signals } = body;

//     if (!proof || !public_signals) {
//       return NextResponse.json(
//         { success: false, error: 'Proof và public_signals là bắt buộc' },
//         { status: 400 }
//       );
//     }

//     const zkDir = path.join(process.cwd(), 'zk');
//     const verificationKeyPath = path.join(zkDir, 'verification_key.json');
//     const proofPath = path.join(zkDir, 'verify_proof_temp.json');
//     const publicPath = path.join(zkDir, 'verify_public_temp.json');

//     const timestamp = Date.now();
//     const uniqueProofPath = path.join(zkDir, `verify_proof_${timestamp}.json`);
//     const uniquePublicPath = path.join(zkDir, `verify_public_${timestamp}.json`);

//     try {
//       await fs.access(verificationKeyPath);
//     } catch {
//       return NextResponse.json(
//         { success: false, error: 'Verification key chưa được tạo. Vui lòng chạy setup script trước.' },
//         { status: 500 }
//       );
//     }

//     await fs.writeFile(uniqueProofPath, JSON.stringify(proof, null, 2));
//     await fs.writeFile(uniquePublicPath, JSON.stringify(public_signals, null, 2));

//     try {
//       const quotedVerificationKeyPath = `"${verificationKeyPath}"`;
//       const quotedPublicPath = `"${uniquePublicPath}"`;
//       const quotedProofPath = `"${uniqueProofPath}"`;

//       const { stdout, stderr } = await execAsync(
//         `snarkjs groth16 verify ${quotedVerificationKeyPath} ${quotedPublicPath} ${quotedProofPath}`,
//         { cwd: zkDir }
//       );

//       const isValid = stdout.includes('OK') || stdout.includes('ok');

//       return NextResponse.json({
//         success: true,
//         isValid: isValid,
//         message: isValid ? 'Proof hợp lệ' : 'Proof không hợp lệ',
//         stdout: stdout,
//         stderr: stderr
//       });

//     } catch (error: any) {
//       console.error('Verify error:', error);
//       return NextResponse.json({
//         success: true,
//         isValid: false,
//         error: error.message || 'Proof không hợp lệ hoặc không khớp với verification key',
//         stderr: error.stderr || ''
//       });
//     } finally {
//       try {
//         await fs.unlink(uniqueProofPath);
//         await fs.unlink(uniquePublicPath);
//       } catch {
//       }
//     }

//   } catch (error: unknown) {
//     console.error('ZK Proof Verification Error:', error);
//     return NextResponse.json(
//       { success: false, error: (error as Error).message || 'Lỗi khi verify proof' },
//       { status: 500 }
//     );
//   }
// }

