import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export const runtime = 'nodejs';

function resolvePath(relOrAbs?: string): string | null {
  if (!relOrAbs) return null;
  if (path.isAbsolute(relOrAbs)) return relOrAbs;
  return path.join(process.cwd(), relOrAbs);
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  const bytes = new Uint8Array(hash);
  let hex = '0x';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return hex;
}

function shortHex(h?: string, n = 10) {
  if (!h) return '';
  if (!h.startsWith('0x')) return h;
  if (h.length <= 2 + 2 * n) return h;
  return h.slice(0, 2 + n) + '...' + h.slice(-n);
}

export async function POST(req: NextRequest) {
  try {
    console.log('[fullprove] start');
    let did = '';
    try {
      const body = await req.json();
      did = String(body?.did || '');
      console.log('[fullprove] body parsed', { didLen: did.length });
    } catch {}

    const wasmPath = resolvePath(process.env.ZK_WASM_PATH || 'public/zk/membership_js/membership.wasm');
    const zkeyPath = resolvePath(process.env.ZK_ZKEY_PATH || 'public/zk/circuit.zkey');
    const inputPath = resolvePath(process.env.ZK_INPUT_PATH || 'public/zk/input.json');
    const vkPath = resolvePath(process.env.ZK_VK_PATH || 'public/zk/verification_key.json');

    if (!wasmPath || !zkeyPath || !inputPath) {
      return NextResponse.json({ error: 'Missing ZK paths' }, { status: 500 });
    }

    const fileChecks = await Promise.allSettled([
      fs.stat(wasmPath),
      fs.stat(zkeyPath), 
      fs.stat(inputPath)
    ]);
    
    const missingFiles = fileChecks
      .map((result, index) => result.status === 'rejected' ? [wasmPath, zkeyPath, inputPath][index] : null)
      .filter(Boolean);
    
    if (missingFiles.length > 0) {
      console.error('[fullprove] Missing files:', missingFiles);
      return NextResponse.json({ error: `Missing files: ${missingFiles.join(', ')}` }, { status: 500 });
    }
    
    console.log('[fullprove] files ok', { wasmPath, zkeyPath, inputPath, vkPath });
    const snarkjs: Record<string, unknown> = await import('snarkjs');
    const input = JSON.parse(await fs.readFile(inputPath, 'utf8'));
    console.log('[fullprove] running groth16.fullProve');
    const { proof, publicSignals } = await (snarkjs.groth16 as { fullProve: (input: unknown, wasmPath: string, zkeyPath: string) => Promise<{ proof: unknown; publicSignals: unknown }> }).fullProve(input, wasmPath, zkeyPath);
    console.log('[fullprove] prover done', { publicSignalsLen: Array.isArray(publicSignals) ? publicSignals.length : 0 });

    const proofData = {
      proof: proof,
      publicSignals: publicSignals
    };

    let verification_key_hash_sha256 = '';
    try {
      if (vkPath) {
        const vkBuf = await fs.readFile(vkPath);
        const copy = new Uint8Array(vkBuf.byteLength);
        copy.set(new Uint8Array(vkBuf.buffer, vkBuf.byteOffset, vkBuf.byteLength));
        verification_key_hash_sha256 = await sha256Hex(copy.buffer);
        console.log('[fullprove] vk hash', shortHex(verification_key_hash_sha256));
      }
    } catch {}

    let did_commitment = '';
    let t_I_commitment = '';
    let a_commitment = '';
    try {
      if (did) {
        const enc = new TextEncoder();
        did_commitment = await sha256Hex(enc.encode(did).buffer);
        console.log('[fullprove] did_commitment', shortHex(did_commitment));
        t_I_commitment = did_commitment;
        a_commitment = did_commitment;
      }
    } catch {}

    const debug = {
      vkHash: shortHex(verification_key_hash_sha256),
      didCommit: shortHex(did_commitment),
    };

    console.log('[fullprove] done', debug);

    return NextResponse.json({ 
      ok: true, 
      proof: proofData.proof, 
      public: proofData.publicSignals, 
      verification_key_hash_sha256,
      did_commitment,
      t_I_commitment,
      a_commitment,
      debug
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error)?.message || 'fullprove failed' }, { status: 500 });
  }
}