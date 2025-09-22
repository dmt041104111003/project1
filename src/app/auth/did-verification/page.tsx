'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import DIDVerificationLayout from '@/components/auth/DIDVerificationLayout';
import DIDVerificationSteps from '@/components/auth/DIDVerificationSteps';
import { useDIDVerification } from '@/hooks/useDIDVerification';
import DIDVerifiedStatus from '@/components/auth/DIDVerifiedStatus';


export default function DIDVerificationPage() {
  const { account } = useWallet();
  const [checked, setChecked] = useState(false);
  const [hasVerified, setHasVerified] = useState(false);
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

  useEffect(() => {
    const run = async () => {
      if (!account) { setChecked(true); setHasVerified(false); return; }
      try {
        const res = await fetch(`/api/did/${account}`);
        if (res.ok) {
          const data = await res.json();
          setHasVerified(!!data.hasVerified);
        } else { setHasVerified(false); }
      } finally { setChecked(true); }
    };
    run();
  }, [account]);

  return (
    <DIDVerificationLayout>
      {checked && hasVerified ? (
        <DIDVerifiedStatus />
      ) : (
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
      )}
    </DIDVerificationLayout>
  );
}
