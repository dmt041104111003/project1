// "use client";

// import React, { useState } from 'react';
// import { Card } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { copyAddress, formatAddress } from '@/utils/addressUtils';

// interface ProofData {
//   proof: any;
//   public_signals: any;
//   timestamp?: number;
// }

// interface VerificationResult {
//   isValid: boolean;
//   message?: string;
//   error?: string;
// }

// interface ProofVerifierProps {
//   initialProof?: string;
//   initialPublicSignals?: string;
// }

// export const ProofVerifier: React.FC<ProofVerifierProps> = ({ 
//   initialProof = '', 
//   initialPublicSignals = '' 
// }) => {
//   const [proofJson, setProofJson] = useState(initialProof);
//   const [publicSignalsJson, setPublicSignalsJson] = useState(initialPublicSignals);
//   const [verifying, setVerifying] = useState(false);
//   const [result, setResult] = useState<VerificationResult | null>(null);

//   const handleVerify = async () => {
//     if (!proofJson.trim() || !publicSignalsJson.trim()) {
//       setResult({
//         isValid: false,
//         error: 'Vui lòng nhập proof và public signals'
//       });
//       return;
//     }

//     setVerifying(true);
//     setResult(null);

//     try {
//       // Parse JSON
//       const proof = JSON.parse(proofJson);
//       const publicSignals = JSON.parse(publicSignalsJson);

//       // Verify proof bằng verification key
//       const verifyRes = await fetch('/api/zk/verify-proof', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           proof,
//           public_signals: publicSignals
//         })
//       });

//       const verifyData = await verifyRes.json();
      
//       if (!verifyRes.ok || !verifyData.success) {
//         setResult({
//           isValid: false,
//           error: verifyData.error || 'Lỗi khi verify proof'
//         });
//         return;
//       }

//       setResult({
//         isValid: verifyData.isValid === true,
//         message: verifyData.message || (verifyData.isValid ? 'Proof hợp lệ' : 'Proof không hợp lệ'),
//         error: verifyData.isValid ? undefined : (verifyData.error || 'Proof không hợp lệ')
//       });

//     } catch (error: any) {
//       setResult({
//         isValid: false,
//         error: error?.message || 'Lỗi khi parse JSON hoặc verify proof'
//       });
//     } finally {
//       setVerifying(false);
//     }
//   };

//   const formatProof = (text: string): string => {
//     if (!text) return '-';
//     if (text.length <= 30) return text;
//     return formatAddress(text);
//   };

//   return (
//     <Card variant="outlined" className="p-6">
//       <div className="space-y-4">
//         <div>
//           <h2 className="text-xl font-bold text-blue-800 mb-2">Verify ZK Proof</h2>
//           <p className="text-sm text-gray-600">Nhập proof và public signals để verify</p>
//         </div>

//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Proof (JSON):
//           </label>
//           <textarea
//             value={proofJson}
//             onChange={(e) => setProofJson(e.target.value)}
//             placeholder='{"pi_a": [...], "pi_b": [...], "pi_c": [...]}'
//             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
//             rows={4}
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Public Signals (JSON):
//           </label>
//           <textarea
//             value={publicSignalsJson}
//             onChange={(e) => setPublicSignalsJson(e.target.value)}
//             placeholder='["hash1", "hash2", ...]'
//             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
//             rows={3}
//           />
//         </div>

//         <Button 
//           onClick={handleVerify} 
//           disabled={verifying} 
//           variant="primary"
//           className="w-full"
//         >
//           {verifying ? 'Đang verify...' : 'Verify Proof'}
//         </Button>

//         {result && (
//           <div className="mt-4">
//             <div className={`p-4 rounded-md ${result.isValid ? 'bg-green-50 border border-green-300' : 'bg-red-50 border border-red-300'}`}>
//               <div className="text-sm font-bold mb-2">
//                 {result.isValid ? 'Proof hợp lệ' : 'Proof không hợp lệ'}
//               </div>
//               {result.message && (
//                 <div className={`text-sm ${result.isValid ? 'text-green-700' : 'text-red-700'}`}>
//                   {result.message}
//                 </div>
//               )}
//               {result.error && (
//                 <div className="text-sm text-red-700 mt-1">{result.error}</div>
//               )}
//             </div>
//           </div>
//         )}
//       </div>
//     </Card>
//   );
// };

