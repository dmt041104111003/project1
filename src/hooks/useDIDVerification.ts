import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { VerificationData } from '@/constants/auth';
import { checkProfileExists, registerDidOnChain, registerProfileOnBlockchain } from '@/lib/client';
import { VerificationStatus } from '@/constants/did-verification';
import { IDCardData, FaceVerificationResult, BlockchainData } from '@/constants/profile';
import { prepareBlockchainData } from '@/utils/hashUtils';

const FACE_API_BASE_URL = process.env.NEXT_PUBLIC_FACE_API_BASE_URL;

export function useDIDVerification(account: string | null) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [idCardData, setIdCardData] = useState<IDCardData | null>(null);
  const [faceVerificationResult, setFaceVerificationResult] = useState<FaceVerificationResult | null>(null);
  const [isFaceApiLoading, setIsFaceApiLoading] = useState(false);
  const [showEncryptionPreview, setShowEncryptionPreview] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string>('');
  const [blockchainData, setBlockchainData] = useState<BlockchainData | null>(null);

  useEffect(() => {
    if (!account) {
      toast.error('Vui lòng kết nối ví Petra trước khi xác minh DID');
      router.push('/');
      return;
    }
  }, [account, router]);

  const handleNextStep = () => { setStep(prev => prev + 1); };
  const handleBackStep = () => { setStep(prev => Math.max(1, prev - 1)); };
  const handleError = (message: string) => { setErrorMessage(message); };

  const registerProfileOnChain = async () => {
    if (!account || !idCardData || !faceVerificationResult) {
      toast.error('Thiếu dữ liệu để đăng ký profile');
      return;
    }
    try {
      const exists = await checkProfileExists(account);
      if (exists) { toast.error('Profile đã tồn tại trên blockchain!'); return; }
      try {
        const res = await fetch('/api/ipfs/pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: idCardData.name,
            verification_message: faceVerificationResult.message,
            did: `did:aptos:${account}`,
            face: {
              success: faceVerificationResult.success,
              distance: faceVerificationResult.distance,
              is_real: faceVerificationResult.is_real,
              processing_time: faceVerificationResult.processing_time,
            },
            id_card: { cccd: idCardData.cccd },
            timestamp: Date.now(),
          }),
        });
        if (res.ok) {
          const { cid: realCid } = await res.json() as { cid: string };
          setIdCardData({ ...idCardData, cid: realCid });
        }
      } catch (_) {}
      setShowEncryptionPreview(true);
    } catch (error) {
      console.error('Error checking profile:', error);
      toast.error('Lỗi khi chuẩn bị dữ liệu. Vui lòng thử lại.');
    }
  };

  const handleConfirmBlockchain = async () => {
    let loadingToast: string | number | undefined;
    if (!account || !idCardData || !faceVerificationResult) {
      toast.error('Thiếu dữ liệu để đăng ký profile');
      return;
    }
    try {
      const verificationData: VerificationData = {
        did: `did:aptos:${account}`,
        cccd: idCardData.cccd,
        name: idCardData.name,
        cid: '', 
        face_verified: faceVerificationResult.success,
        distance: faceVerificationResult.distance,
        is_real: faceVerificationResult.is_real,
        processing_time: faceVerificationResult.processing_time,
        verify_message: faceVerificationResult.message
      };

      const prepared = prepareBlockchainData(verificationData) as unknown as BlockchainData;
      setBlockchainData(prepared);

      loadingToast = toast.loading('Đang đăng ký DID & profile trên blockchain...');
      if (!window.aptos) { toast.error('Ví Petra không được kết nối'); return; }

      try { await registerDidOnChain(); } catch { }

      // Use pre-pinned CID if available; otherwise pin now
      let cid = idCardData.cid || '';
      if (!cid) {
        const res = await fetch('/api/ipfs/pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: verificationData.name,
            verification_message: verificationData.verify_message,
            did: verificationData.did,
            face: {
              success: faceVerificationResult.success,
              distance: faceVerificationResult.distance,
              is_real: faceVerificationResult.is_real,
              processing_time: faceVerificationResult.processing_time,
            },
            id_card: { cccd: idCardData.cccd },
            timestamp: Date.now(),
          }),
        });
        if (!res.ok) { throw new Error(await res.text()); }
        const { cid: realCid } = await res.json() as { cid: string };
        cid = realCid;
        setIdCardData({ ...idCardData, cid });
      }
      
      verificationData.cid = cid;

      const txHash = await registerProfileOnBlockchain(cid, '', '', ''); 

      toast.dismiss(loadingToast);
      setTransactionHash(txHash);
      setShowEncryptionPreview(false);
      toast.success('Đăng ký profile thành công!');
      handleNextStep();
    } catch (error) {
      console.error('Blockchain registration error:', error);
      toast.dismiss(loadingToast);
      toast.error('Đăng ký profile thất bại. Vui lòng thử lại.');
    }
  };

  const uploadIdCard = async (file: File) => {
    setIsFaceApiLoading(true);
    try {
      const formData = new FormData();
      formData.append('id_card', file);
      const response = await fetch(`${FACE_API_BASE_URL}/upload_id_card`, { method: 'POST', body: formData });
      if (!response.ok) { throw new Error('Upload ID card failed'); }
      const data = await response.json();
      setIdCardData(data);
      toast.success('Upload căn cước thành công!');
      return data;
    } catch (error) {
      console.error('Upload ID card error:', error);
      toast.error('Upload căn cước thất bại. Vui lòng thử lại.');
      throw error;
    } finally { setIsFaceApiLoading(false); }
  };

  const verifyWebcam = async (file: File) => {
    setIsFaceApiLoading(true);
    try {
      const formData = new FormData(); formData.append('webcam', file);
      const response = await fetch(`${FACE_API_BASE_URL}/verify_webcam`, { method: 'POST', body: formData });
      if (!response.ok) { throw new Error('Face verification failed'); }
      const data = await response.json(); setFaceVerificationResult(data);
      if (data.success) { toast.success('Xác minh khuôn mặt thành công!'); return data; }
      toast.error(data.message || 'Xác minh khuôn mặt thất bại'); throw new Error(data.message);
    } catch (error) {
      console.error('Face verification error:', error);
      toast.error('Xác minh khuôn mặt thất bại. Vui lòng thử lại.');
      throw error;
    } finally { setIsFaceApiLoading(false); }
  };

  const signChallenge = async () => {
    setVerificationStatus('processing'); setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => { if (prev >= 100) { clearInterval(interval); setVerificationStatus('success'); setStep(4); return 100; } return prev + 10; });
    }, 200);
  };

  const handleViewProfile = () => { router.push('/dashboard'); };
  const handleBackToEncryption = () => { setShowEncryptionPreview(false); };

  return {
    step, verificationStatus, progress, errorMessage,
    idCardData, faceVerificationResult, isFaceApiLoading,
    showEncryptionPreview, transactionHash, blockchainData,
    handleNextStep, handleBackStep, handleError,
    registerProfileOnChain, handleConfirmBlockchain,
    uploadIdCard, verifyWebcam, signChallenge,
    handleViewProfile, handleBackToEncryption
  };
}
