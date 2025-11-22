"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { useWallet } from '@/contexts/WalletContext';
import { useRoleManagement } from '@/hooks/useRoleManagement';
import { useWebcam } from '@/hooks/useWebcam';
import { useFaceVerification } from '@/hooks/useFaceVerification';
import { useOcrUpload } from '@/hooks/useOcrUpload';
import { MESSAGES } from '@/constants/auth';
import {
  WalletAddressDisplay,
  RoleList,
  VerificationStatus,
  RoleRegistrationForm,
  MessageDisplay,
} from './VerificationUI';
import { IDCardUploadStep } from './IDCardUploadStep';
import { FaceVerificationStep } from './FaceVerificationStep';

export default function DIDVerification() {
  const { account } = useWallet();
  const [role, setRole] = useState('');
  const [desc, setDesc] = useState('');
  const [verificationSessionId, setVerificationSessionId] = useState<string | null>(null);
  const [showFaceVerification, setShowFaceVerification] = useState(false);
  const [uploadedCid, setUploadedCid] = useState<string>('');
  const [step, setStep] = useState<'upload' | 'verify'>('upload');

  const {
    roles,
    loading,
    loadingRoles,
    checkingProof,
    message,
    faceVerified,
    handleFaceVerificationSuccess: handleFaceVerificationSuccessHook,
    handleRegister: handleRegisterHook,
  } = useRoleManagement(account);

  const {
    uploading,
    uploadingFace,
    ocrError,
    idCardPreview,
    idCardFile,
    idInfo,
    fileInputRef,
    handleIdCardUpload,
    handleUploadFaceAuto,
    resetOcr,
    setOcrError,
  } = useOcrUpload(
    undefined,
    (sessionId) => {
      setVerificationSessionId(sessionId);
      setShowFaceVerification(true);
    }
  );

  const { videoRef, canvasRef, capturePhoto } = useWebcam(showFaceVerification);
  const {
    result,
    isVerifying,
    verificationStep,
    currentAction,
    startVerification
  } = useFaceVerification(verificationSessionId || '');

  const handleUploadFace = async () => {
    if (!idCardFile) return;
    try {
      const sessionId = await handleUploadFaceAuto(idCardFile);
      if (sessionId) {
        setVerificationSessionId(sessionId);
        setShowFaceVerification(true);
      }
    } catch {
    }
  };

  const handleFaceVerificationSuccess = async () => {
    if (!idInfo) return;
    await handleFaceVerificationSuccessHook(idInfo, role, desc, setUploadedCid);
    setShowFaceVerification(false);
  };

  const handleFaceVerificationCancel = () => {
    setShowFaceVerification(false);
    setVerificationSessionId(null);
    resetOcr();
    setStep('upload');
    setOcrError(null);
  };

  const handleRegister = async () => {
    await handleRegisterHook(role, desc, uploadedCid, setUploadedCid, setRole, setDesc);
    // Trigger global refresh
    window.dispatchEvent(new CustomEvent('rolesUpdated'));
  };

  const handleRetryUpload = () => {
    setStep("upload");
    resetOcr();
    setOcrError(null);
  };

  return (
    <Card variant="outlined" className="space-y-4 mt-6 bg-white p-4">
      <div className="text-lg font-bold text-blue-800">Đăng ký vai trò</div>
      
      <WalletAddressDisplay address={account} />
      <RoleList roles={roles} loading={loadingRoles} />

      {checkingProof ? (
        <div className="mt-4 text-xs text-gray-500">{MESSAGES.LOADING.CHECKING_PROOF}</div>
      ) : !faceVerified && !showFaceVerification && roles.length === 0 ? (
        <IDCardUploadStep
          step={step}
          uploading={uploading}
          uploadingFace={uploadingFace}
          ocrError={ocrError}
          idCardPreview={idCardPreview}
          idInfo={idInfo}
          onFileChange={handleIdCardUpload}
          onRetry={handleRetryUpload}
          onUploadFace={step === 'verify' ? handleUploadFace : undefined}
        />
      ) : null}

      {showFaceVerification && verificationSessionId && idInfo && (
        <FaceVerificationStep
          verificationSessionId={verificationSessionId}
          idInfo={idInfo}
          videoRef={videoRef}
          canvasRef={canvasRef}
          isVerifying={isVerifying}
          verificationStep={verificationStep}
          currentAction={currentAction}
          result={result}
          onStartVerification={() => startVerification(capturePhoto)}
          onSuccess={handleFaceVerificationSuccess}
          onCancel={handleFaceVerificationCancel}
        />
      )}
      
      {!checkingProof && (faceVerified || roles.length > 0) && (
        <>
          <VerificationStatus verified={faceVerified || roles.length > 0} />
          <RoleRegistrationForm
            role={role}
            desc={desc}
            roles={roles}
            loading={loading}
            onRoleChange={setRole}
            onDescChange={setDesc}
            onRegister={handleRegister}
          />
        </>
      )}
      
      <MessageDisplay message={message} />
    </Card>
  );
}

