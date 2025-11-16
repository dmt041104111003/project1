import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useWallet } from '@/contexts/WalletContext';
import { formatAddress, copyAddress } from '@/utils/addressUtils';
import { FaceVerification } from './FaceVerification';
import { VerificationResultDisplay } from './VerificationResult';

interface Role {
  name: string;
  cids?: string[];
}

export default function DIDActionsPanel() {
  const { account } = useWallet();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [checkingProof, setCheckingProof] = useState(true);
  const [message, setMessage] = useState('');
  const [role, setRole] = useState('');
  const [desc, setDesc] = useState('');
  const [faceVerified, setFaceVerified] = useState(false);
  const [verificationSessionId, setVerificationSessionId] = useState<string | null>(null);
  const [idInfo, setIdInfo] = useState<any>(null);
  const [showFaceVerification, setShowFaceVerification] = useState(false);
  const [uploadedCid, setUploadedCid] = useState<string>('');

  useEffect(() => {
    if (!account) {
      setRoles([]);
      setFaceVerified(false);
      setCheckingProof(false);
      return;
    }
    
    setCheckingProof(true);
    setLoadingRoles(true);
    
    Promise.all([
      fetch(`/api/role?address=${encodeURIComponent(account)}`)
        .then(res => res.json())
        .then(data => {
          const userRoles = data.roles || [];
          setRoles(userRoles);
          if (userRoles.length > 0) {
            setFaceVerified(true);
            setShowFaceVerification(false);
            setVerificationSessionId(null);
            setIdInfo(null);
          }
          return userRoles;
        })
        .catch(() => {
          setRoles([]);
          return [];
        }),
      
      (async () => {
        try {
          const { ROLE, APTOS_NODE_URL, APTOS_API_KEY } = await import('@/constants/contracts');
          const res = await fetch(`${APTOS_NODE_URL}/v1/view`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': APTOS_API_KEY,
              'Authorization': `Bearer ${APTOS_API_KEY}`
            },
            body: JSON.stringify({
              function: ROLE.HAS_PROOF,
              type_arguments: [],
              arguments: [account]
            })
          });

          if (res.ok) {
            const data = await res.json();
            const hasProof = Array.isArray(data) ? data[0] === true : data === true;
            setFaceVerified(hasProof);
            if (hasProof) {
              setShowFaceVerification(false);
              setVerificationSessionId(null);
              setIdInfo(null);
            }
          }
        } catch (error) {
          console.error('Error checking proof:', error);
        }
      })()
    ]).finally(() => {
      setLoadingRoles(false);
      setCheckingProof(false);
    });
  }, [account]);

  const handleFaceVerified = async (sessionId: string, idInfo: any) => {  
    setVerificationSessionId(sessionId);
    setIdInfo(idInfo);
    setShowFaceVerification(true);
  };

  const handleFaceVerificationSuccess = async () => {
    setLoading(true);
    setMessage('Đang tạo ZK proof...');
    
    try {
      const zkRes = await fetch('/api/zk/generate-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_number: idInfo.id_number,
          name: idInfo.name,
          date_of_birth: idInfo.date_of_birth,
          gender: idInfo.gender,
          nationality: idInfo.nationality,
          date_of_expiry: idInfo.date_of_expiry,
          face_verified: true
        })
      });

      const zkData = await zkRes.json();
      if (!zkRes.ok || !zkData.success) {
        if (zkData.requires_reauth) {
          setShowFaceVerification(false);
          setVerificationSessionId(null);
          setIdInfo(null);
          setFaceVerified(false);
          throw new Error(zkData.error || 'Thông tin CCCD đã được xác minh bởi địa chỉ khác. Vui lòng xác minh lại.');
        }
        throw new Error(zkData.error || 'Tạo ZK proof thất bại');
      }

      setMessage('Đang lưu proof vào blockchain...');
      
      if (!window.aptos) {
        throw new Error('Vui lòng kết nối ví Aptos');
      }
      
      const { roleHelpers } = await import('@/utils/contractHelpers');
      const proofPayload = roleHelpers.storeProof(
        JSON.stringify(zkData.proof),
        JSON.stringify(zkData.public_signals)
      );

      await window.aptos.signAndSubmitTransaction(proofPayload);
      
      setFaceVerified(true);
      setShowFaceVerification(false);
      
      if (role && (role === 'freelancer' || role === 'poster') && desc.trim()) {
        setMessage('Đang tải CID lên IPFS...');
        try {
          const ipfsRes = await fetch('/api/ipfs/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'profile', about: desc })
          });
          const ipfsData = await ipfsRes.json();
          if (!ipfsRes.ok || !ipfsData.success) {
            throw new Error(ipfsData.error || 'Tải lên IPFS thất bại');
          }
          const cid = ipfsData.encCid || ipfsData.ipfsHash || '';
          if (!cid) {
            throw new Error('CID là bắt buộc cho freelancer và poster');
          }
          setUploadedCid(cid);
          setMessage('Đã xác minh danh tính, tạo proof và tải CID lên IPFS. Bạn có thể đăng ký vai trò ngay bây giờ.');
        } catch (error: any) {
          setMessage(error?.message || 'Lỗi khi tải CID lên IPFS');
        }
      } else {
        setMessage('Đã xác minh danh tính và tạo proof thành công. Bạn có thể đăng ký vai trò ngay bây giờ.');
      }
    } catch (error: any) {
      setMessage(error?.message || 'Lỗi khi tạo hoặc lưu ZK proof');
      setFaceVerified(false);
    } finally {
      setLoading(false);
    }
  };

  const handleFaceVerificationCancel = () => {
    setShowFaceVerification(false);
    setVerificationSessionId(null);
    setIdInfo(null);
  };

  const handleRegister = async () => {
    if (!role || !window.aptos || !account) return;

    setLoading(true);
    setMessage('Đang kiểm tra proof...');
    
    try {
      // Check xem địa chỉ đã có proof chưa
      const { ROLE, APTOS_NODE_URL, APTOS_API_KEY } = await import('@/constants/contracts');
      const checkProofRes = await fetch(`${APTOS_NODE_URL}/v1/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': APTOS_API_KEY,
          'Authorization': `Bearer ${APTOS_API_KEY}`
        },
        body: JSON.stringify({
          function: ROLE.HAS_PROOF,
          type_arguments: [],
          arguments: [account]
        })
      });

      if (checkProofRes.ok) {
        const proofData = await checkProofRes.json();
        const hasProof = Array.isArray(proofData) ? proofData[0] === true : proofData === true;
        
        if (!hasProof) {
          setMessage('Vui lòng xác minh danh tính trước khi đăng ký vai trò.');
          setLoading(false);
          return;
        }
      } else {
        console.warn('Không thể kiểm tra proof, tiếp tục đăng ký...');
      }

      if ((role === 'freelancer' || role === 'poster') && !uploadedCid) {
        if (!desc.trim()) {
          setMessage('Vui lòng điền mô tả trước khi đăng ký vai trò này.');
          setLoading(false);
          return;
        }
        
        setMessage('Đang tải CID lên IPFS...');
        try {
          const ipfsRes = await fetch('/api/ipfs/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'profile', about: desc })
          });
          const ipfsData = await ipfsRes.json();
          if (!ipfsRes.ok || !ipfsData.success) {
            throw new Error(ipfsData.error || 'Tải lên IPFS thất bại');
          }
          const cid = ipfsData.encCid || ipfsData.ipfsHash || '';
          if (!cid) {
            throw new Error('CID là bắt buộc cho freelancer và poster');
          }
          setUploadedCid(cid);
        } catch (error: any) {
          setMessage(error?.message || 'Lỗi khi tải CID lên IPFS');
          setLoading(false);
          return;
        }
      }

      setMessage('Đang gửi giao dịch...');
      
      const { roleHelpers } = await import('@/utils/contractHelpers');
      
      let payload;
      if (role === 'freelancer') {
        payload = roleHelpers.registerFreelancer(uploadedCid);
      } else if (role === 'poster') {
        payload = roleHelpers.registerPoster(uploadedCid);
      } else if (role === 'reviewer') {
        payload = roleHelpers.registerReviewer();
      } else {
        throw new Error('Vai trò không hợp lệ');
      }
      
      await window.aptos.signAndSubmitTransaction(payload);
      
      setMessage('Đăng ký thành công!');
      setRole('');
      setDesc('');
      setFaceVerified(false);
      setVerificationSessionId(null);
      setUploadedCid('');
      
      setLoadingRoles(true);
      const refreshRes = await fetch(`/api/role?address=${encodeURIComponent(account!)}`);
      const refreshData = await refreshRes.json();
      setRoles(refreshData.roles || []);
      setLoadingRoles(false);
    } catch (error: any) {
      setMessage(error?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="outlined" className="space-y-4 mt-6 bg-white p-4">
      <div className="text-lg font-bold text-blue-800">Đăng ký vai trò</div>
      <div className="text-sm text-gray-700">
        Ví:{' '}
        {account ? (
          <span 
            className="font-bold text-blue-600 cursor-pointer hover:text-blue-800 hover:underline"
            onClick={() => copyAddress(account)}
          >
            {formatAddress(account)}
          </span>
        ) : (
          'Chưa kết nối'
        )}
      </div>
      
      {loadingRoles ? (
        <div className="text-xs text-gray-500">Đang tải vai trò...</div>
      ) : roles.length > 0 ? (
        <div className="my-2">
          {roles.map(r => (
            <div key={r.name} className="rounded p-2 text-xs mb-1 bg-blue-50 text-blue-900">
              Đã đăng ký: <b>{r.name}</b>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-gray-500">Chưa đăng ký vai trò nào</div>
      )}

      {checkingProof ? (
        <div className="mt-4 text-xs text-gray-500">Đang kiểm tra...</div>
      ) : (
        !faceVerified && !showFaceVerification && roles.length === 0 && (
          <div className="mt-4">
            <FaceVerification onVerified={handleFaceVerified} />
          </div>
        )
      )}

      {showFaceVerification && verificationSessionId && idInfo && (
        <div className="mt-4">
          <VerificationResultDisplay
            sessionId={verificationSessionId}
            idInfo={idInfo}
            onRetry={() => {
            }}
            onCancel={handleFaceVerificationCancel}
            onSuccess={handleFaceVerificationSuccess}
          />
        </div>
      )}
      
      {!checkingProof && (faceVerified || roles.length > 0) && (
        <>
          {faceVerified && (
            <div className="mt-4 p-3 bg-green-50 border border-green-300 rounded">
              <div className="text-xs text-green-700 font-bold mb-2">
                ✓ Đã xác minh danh tính thành công
              </div>
            </div>
          )}
          
          <div className="space-y-3 mt-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">Vai trò</label>
              <select
                className="w-full px-3 py-2 border border-gray-400 bg-white text-sm"
                value={role}
                disabled={loading}
                onChange={e => {
                  setRole(e.target.value);
                  if (e.target.value === 'reviewer') {
                    setDesc('');
                  }
                }}
              >
                <option value="">Chọn vai trò...</option>
                <option value="freelancer">Freelancer</option>
                <option value="poster">Poster</option>
                <option value="reviewer">Reviewer</option>
              </select>
            </div>
            
            {role !== 'reviewer' && (
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Mô tả</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-400 bg-white text-sm"
                  rows={3}
                  value={desc}
                  disabled={loading}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="Giới thiệu về bạn / kỹ năng..."
                />
              </div>
            )}
            
            <Button
              className="w-full"
              size="sm"
              variant="outline"
              onClick={handleRegister}
              disabled={loading || !role}
            >
              {loading ? 'Đang xử lý...' : 'Đăng ký vai trò'}
            </Button>
          </div>
        </>
      )}
      
      {message && (
        <div className={`text-xs ${message.includes('thành công') ? 'text-green-700' : message.includes('lỗi') || message.includes('Lỗi') ? 'text-red-700' : 'text-gray-700'}`}>
          {message}
        </div>
      )}
    </Card>
  );
}
