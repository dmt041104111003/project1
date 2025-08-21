'use client';

import { useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import DIDVerificationLayout from '@/components/auth/DIDVerificationLayout';
import DIDVerificationSteps from '@/components/auth/DIDVerificationSteps';
import { useDIDVerification } from '@/hooks/useDIDVerification';

export default function DIDVerificationPage() {
  const { account } = useWallet();
  const {
    step,
    verificationStatus,
    progress,
    errorMessage,
    idCardData,
    faceVerificationResult,
    isFaceApiLoading,
    showEncryptionPreview,
    transactionHash,
    blockchainData,
    handleNextStep,
    handleBackStep,
    handleError,
    registerProfileOnChain,
    handleConfirmBlockchain,
    uploadIdCard,
    verifyWebcam,
    signChallenge,
    handleViewProfile,
    handleBackToEncryption
  } = useDIDVerification(account);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700&family=Roboto+Condensed:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  return (
    <DIDVerificationLayout>
      <DIDVerificationSteps
        step={step}
        verificationStatus={verificationStatus}
        progress={progress}
        errorMessage={errorMessage}
        idCardData={idCardData}
        faceVerificationResult={faceVerificationResult}
        isFaceApiLoading={isFaceApiLoading}
        showEncryptionPreview={showEncryptionPreview}
        transactionHash={transactionHash}
        blockchainData={blockchainData}
        account={account || ''}
        onNext={handleNextStep}
        onBack={handleBackStep}
        onError={handleError}
        onUploadIdCard={uploadIdCard}
        onVerifyWebcam={verifyWebcam}
        onRegisterProfile={registerProfileOnChain}
        onConfirmBlockchain={handleConfirmBlockchain}
        onBackToEncryption={handleBackToEncryption}
        onViewProfile={handleViewProfile}
      />
    </DIDVerificationLayout>
  );
}
