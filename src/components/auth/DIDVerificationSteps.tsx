'use client';

import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { XCircle } from 'lucide-react';
import { VERIFICATION_STEPS, DIDVerificationStepsProps } from '@/constants/did-verification';
import VerificationProgress from '@/components/auth/VerificationProgress';
import SelfieStep from '@/components/auth/SelfieStep';
import IDUploadStep from '@/components/auth/IDUploadStep';
import ChallengeSignStep from '@/components/auth/ChallengeSignStep';
import EncryptionPreview from '@/components/debug/EncryptionPreview';
import BlockchainResult from '@/components/debug/BlockchainResult';

export default function DIDVerificationSteps({
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
  account,
  onNext,
  onBack,
  onError,
  onUploadIdCard,
  onVerifyWebcam,
  onRegisterProfile,
  onConfirmBlockchain,
  onBackToEncryption,
  onViewProfile
}: DIDVerificationStepsProps) {
  return (
    <>
      <VerificationProgress steps={VERIFICATION_STEPS} currentStep={step} />

      <Card>
        <div className="mb-4">
          <h2 className="text-xl font-semibold">{VERIFICATION_STEPS[step - 1]?.title}</h2>
        </div>
        <div>
          {step === 1 && (
            <IDUploadStep 
              onNext={onNext}
              onUploadIdCard={onUploadIdCard}
              isApiLoading={isFaceApiLoading}
              idCardData={idCardData}
            />
          )}

          {step === 2 && (
            <SelfieStep 
              onNext={onNext} 
              onBack={onBack}
              onError={onError}
              onVerifyWebcam={onVerifyWebcam}
              isApiLoading={isFaceApiLoading}
              verificationResult={faceVerificationResult}
              idCardData={idCardData}
            />
          )}

          {step === 3 && !showEncryptionPreview && (
            <ChallengeSignStep 
              verificationStatus={verificationStatus}
              progress={progress}
              onSignChallenge={onRegisterProfile}
            />
          )}

          {step === 3 && showEncryptionPreview && (
            <EncryptionPreview
              verificationData={{
                did: `did:aptos:${account}`,
                cccd: idCardData?.cccd || '',
                name: idCardData?.name || '',
                cid: 'ipfs://QmExampleCID',
                face_verified: faceVerificationResult?.success || false,
                distance: faceVerificationResult?.distance || 0,
                is_real: faceVerificationResult?.is_real || true,
                processing_time: faceVerificationResult?.processing_time || 0,
                verify_message: faceVerificationResult?.message || 'Face verification completed'
              }}
              onConfirm={onConfirmBlockchain}
              onBack={onBackToEncryption}
            />
          )}

          {step === 4 && transactionHash && blockchainData && (
            <BlockchainResult
              transactionHash={transactionHash}
              verificationData={{
                did: `did:aptos:${account}`,
                cccd: idCardData?.cccd || '',
                name: idCardData?.name || '',
                cid: 'ipfs://QmExampleCID',
                face_verified: faceVerificationResult?.success || false,
                distance: faceVerificationResult?.distance || 0,
                is_real: faceVerificationResult?.is_real || true,
                processing_time: faceVerificationResult?.processing_time || 0,
                verify_message: faceVerificationResult?.message || 'Face verification completed'
              }}
              blockchainData={blockchainData}
              onViewProfile={onViewProfile}
            />
          )}

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
    </>
  );
}
