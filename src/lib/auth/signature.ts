import nacl from 'tweetnacl';

export function verifyAptosSignature(
  fullMessage: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    console.log('verifyAptosSignature input:', {
      fullMessageLength: fullMessage.length,
      fullMessagePreview: fullMessage.substring(0, 100),
      signatureLength: signature.length,
      signaturePreview: signature.substring(0, 20),
      publicKeyLength: publicKey.length,
      publicKeyPreview: publicKey.substring(0, 20),
    });
    
    const cleanSignature = signature.startsWith('0x') ? signature.slice(2) : signature;
    const cleanPublicKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
    const key = cleanPublicKey.slice(0, 64);
    
    console.log('After cleaning:', {
      signatureLength: cleanSignature.length,
      publicKeyLength: key.length,
      expectedSigLength: 128,
      expectedPubKeyLength: 64,
    });
    
    const signatureBytes = hexToUint8Array(cleanSignature);
    const publicKeyBytes = hexToUint8Array(key);
    
    console.log('Byte arrays:', {
      signatureBytesLength: signatureBytes.length,
      publicKeyBytesLength: publicKeyBytes.length,
    });
    
    const messageBytes = new TextEncoder().encode(fullMessage);
    
    console.log('Message bytes length:', messageBytes.length);
    
    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );
    
    console.log('Verification result:', isValid);
    
    return isValid;
  } catch (error) {
    console.error('Signature verification error:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    }
    return false;
  }
}

function hexToUint8Array(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const matches = cleanHex.match(/.{1,2}/g);
  if (!matches) {
    throw new Error('Invalid hex string');
  }
  return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
}

export function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) + 
         Date.now().toString(36);
}

