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

    const wasmPath = resolvePath(process.env.ZK_WASM_PATH || 'zk/membership_js/membership.wasm');
    const zkeyPath = resolvePath(process.env.ZK_ZKEY_PATH || 'zk/circuit.zkey');
    const inputPath = resolvePath(process.env.ZK_INPUT_PATH || 'zk/input.json');
    const vkPath = resolvePath(process.env.ZK_VK_PATH || 'zk/verification_key.json');

    if (!wasmPath || !zkeyPath || !inputPath) {
      return NextResponse.json({ error: 'Missing ZK paths' }, { status: 500 });
    }

    await Promise.all([wasmPath, zkeyPath, inputPath].map(p => fs.stat(p)));
    console.log('[fullprove] files ok', { wasmPath, zkeyPath, inputPath, vkPath });
    const snarkjs: any = await import('snarkjs');
    const input = JSON.parse(await fs.readFile(inputPath, 'utf8'));
    console.log('[fullprove] running groth16.fullProve');
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);
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
        // Use did_commitment for both t_I_commitment and a_commitment
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
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'fullprove failed' }, { status: 500 });
  }
}