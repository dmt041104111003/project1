'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft, Wallet } from 'lucide-react';
import { VERIFICATION_STEPS, VerificationStatus } from '@/constants/did-verification';
import VerificationProgress from '@/components/auth/VerificationProgress';
import SelfieStep from '@/components/auth/SelfieStep';
import IDUploadStep from '@/components/auth/IDUploadStep';
import ChallengeSignStep from '@/components/auth/ChallengeSignStep';
import SuccessStep from '@/components/auth/SuccessStep';
import { useWallet } from '@/contexts/WalletContext';
import { toast } from 'sonner';

const robotoCondensed = {
    fontFamily: "'Roboto Condensed', sans-serif",
    fontWeight: 400,
    fontStyle: 'normal',
  };

const FACE_API_BASE_URL = 'http://localhost:5000'; 

export default function DIDVerificationPage() {
  const router = useRouter();
  const { account, connectWallet, isConnecting } = useWallet();
  const [step, setStep] = useState(1);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [idCardData, setIdCardData] = useState<{cccd: string, name: string} | null>(null);
  const [faceVerificationResult, setFaceVerificationResult] = useState<any>(null);
  const [isFaceApiLoading, setIsFaceApiLoading] = useState(false);

  useEffect(() => {
    if (!account) {
      toast.error('Vui lòng kết nối ví Petra trước khi xác minh DID');
      router.push('/');
      return;
    }
  }, [account, router]);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700&family=Roboto+Condensed:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const handleNextStep = () => {
    setStep(prev => prev + 1);
  };

  const handleBackStep = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  const handleError = (message: string) => {
    setErrorMessage(message);
  };

  const uploadIdCard = async (file: File) => {
    setIsFaceApiLoading(true);
    try {
      const formData = new FormData();
      formData.append('id_card', file);

      const response = await fetch(`${FACE_API_BASE_URL}/upload_id_card`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload ID card failed');
      }

      const data = await response.json();
      setIdCardData(data);
      toast.success('Upload căn cước thành công!');
      return data;
    } catch (error) {
      console.error('Upload ID card error:', error);
      toast.error('Upload căn cước thất bại. Vui lòng thử lại.');
      throw error;
    } finally {
      setIsFaceApiLoading(false);
    }
  };

  const verifyWebcam = async (file: File) => {
    setIsFaceApiLoading(true);
    try {
      const formData = new FormData();
      formData.append('webcam', file);

      const response = await fetch(`${FACE_API_BASE_URL}/verify_webcam`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Face verification failed');
      }

      const data = await response.json();
      setFaceVerificationResult(data);
      
      if (data.success) {
        toast.success('Xác minh khuôn mặt thành công!');
        return data;
      } else {
        toast.error(data.message || 'Xác minh khuôn mặt thất bại');
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Face verification error:', error);
      toast.error('Xác minh khuôn mặt thất bại. Vui lòng thử lại.');
      throw error;
    } finally {
      setIsFaceApiLoading(false);
    }
  };

  const signChallenge = async () => {
    setVerificationStatus('processing');
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setVerificationStatus('success');
          setStep(4);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  if (!account) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link href="/">
              <Button variant="ghost" size="sm" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
                Quay về trang chủ
              </Button>
            </Link>
          </div>

          <Card className="p-8 text-center">
            <div className="space-y-4">
              <Wallet className="w-16 h-16 mx-auto text-gray-400" />
              <h2 className="text-2xl font-bold">Cần kết nối ví</h2>
              <p className="text-muted-foreground">
                Vui lòng kết nối ví Petra để tiếp tục xác minh DID
              </p>
              <div className="flex justify-center space-x-4">
                <Button onClick={connectWallet} disabled={isConnecting}>
                  {isConnecting ? 'Đang kết nối...' : 'Kết nối ví Petra'}
                </Button>
                <Link href="/">
                  <Button variant="outline">
                    Quay về trang chủ
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Quay về trang chủ
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 style={robotoCondensed} className="text-3xl font-bold mb-2">Xác minh Danh tính (DID)</h1>
          <p style={robotoCondensed} className="text-muted-foreground">
            Xác minh danh tính của bạn để tham gia nền tảng Web2.5 Freelancer
          </p>
          <div className="mt-2 text-sm text-blue-600">
            Ví đã kết nối: {account.slice(0, 6)}...{account.slice(-4)}
          </div>
        </div>

        <VerificationProgress steps={VERIFICATION_STEPS} currentStep={step} />

        <Card>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">{VERIFICATION_STEPS[step - 1]?.title}</h2>
          </div>
          <div>
            {step === 1 && (
              <IDUploadStep 
                onNext={handleNextStep}
                onUploadIdCard={uploadIdCard}
                isApiLoading={isFaceApiLoading}
                idCardData={idCardData}
              />
            )}

            {step === 2 && (
              <SelfieStep 
                onNext={handleNextStep} 
                onBack={handleBackStep}
                onError={handleError}
                onVerifyWebcam={verifyWebcam}
                isApiLoading={isFaceApiLoading}
                verificationResult={faceVerificationResult}
                idCardData={idCardData}
              />
            )}

            {step === 3 && (
              <ChallengeSignStep 
                verificationStatus={verificationStatus}
                progress={progress}
                onSignChallenge={signChallenge}
              />
            )}

            {step === 4 && <SuccessStep />}

            {errorMessage && (
              <Alert variant="danger">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  <span>{errorMessage}</span>
                </div>
              </Alert>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
