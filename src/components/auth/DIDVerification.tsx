"use client";

import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useWallet } from '@/contexts/WalletContext';
import { useRoleManagement } from '@/hooks/useRoleManagement';
import { useWebcam } from '@/hooks/useWebcam';
import { useFaceVerification } from '@/hooks/useFaceVerification';
import { MESSAGES } from '@/constants/auth';
import {
  WalletAddressDisplay,
  RoleList,
  VerificationStatus,
  RoleRegistrationForm,
  MessageDisplay,
  OCRResult,
  WebcamView,
  VerificationProgress,
  VerificationResultDisplay,
} from './VerificationUI';

export default function DIDVerification() {
  const { account } = useWallet();
  const [role, setRole] = useState('');
  const [desc, setDesc] = useState('');
  const [verificationSessionId, setVerificationSessionId] = useState<string | null>(null);
  const [idInfo, setIdInfo] = useState<any>(null);
  const [showFaceVerification, setShowFaceVerification] = useState(false);
  const [uploadedCid, setUploadedCid] = useState<string>('');
  const [step, setStep] = useState<'upload' | 'verify'>('upload');
  const [uploading, setUploading] = useState(false);
  const [uploadingFace, setUploadingFace] = useState(false);
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    roles,
    loading,
    loadingRoles,
    checkingProof,
    message,
    faceVerified,
    setFaceVerified,
    setMessage,
    handleFaceVerificationSuccess: handleFaceVerificationSuccessHook,
    handleRegister: handleRegisterHook,
  } = useRoleManagement(account);

  const { videoRef, canvasRef, capturePhoto } = useWebcam(showFaceVerification);
  const {
    result,
    isVerifying,
    verificationStep,
    currentAction,
    startVerification
  } = useFaceVerification(verificationSessionId || '');

  // ==================== ID Card Upload & OCR ====================
  const handleIdCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh");
      return;
    }

    if (uploading) return;
    setUploading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const preview = e.target?.result as string;
      try {
        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch("/api/ocr", {
          method: "POST",
          body: formData
        });

        const responseText = await response.text();
        
        if (!response.ok) {
          let errorData;
          try {
            errorData = JSON.parse(responseText);
          } catch {
            errorData = { error: "Lỗi OCR" };
          }
          throw new Error(errorData.error || "Lỗi OCR từ API");
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (error) {
          console.error("Failed to parse OCR response:", responseText);
          throw new Error("Lỗi khi xử lý response từ API OCR");
        }

        const missingFields: string[] = [];
        if (!data.id_number) missingFields.push("Số CMND/CCCD");
        if (!data.name) missingFields.push("Họ và tên");
        if (!data.date_of_birth) missingFields.push("Ngày sinh");
        if (!data.gender) missingFields.push("Giới tính");
        if (!data.nationality) missingFields.push("Quốc tịch");
        if (!data.date_of_expiry) missingFields.push("Ngày hết hạn");

        if (missingFields.length > 0) {
          const missingImportant = !data.id_number || !data.date_of_birth || !data.name;
          if (missingImportant) {
            toast.error(`Không đọc được thông tin: ${missingFields.join(", ")}. Vui lòng thực hiện lại chụp rõ ảnh CCCD.`);
          } else if (!data.date_of_expiry) {
            toast.error("Không đọc được ngày hết hạn. Vui lòng thực hiện lại chụp rõ ảnh CCCD.");
          } else {
            toast.error(`Thiếu thông tin: ${missingFields.join(", ")}. Vui lòng thực hiện lại chụp rõ ảnh CCCD.`);
          }
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }

        setIdInfo({ ...data, has_ocr_data: true });
        setIdCardPreview(preview);
        setIdCardFile(file);
        setStep("verify");
        toast.success("Đã đọc thông tin CCCD!");
      } catch (err: any) {
        toast.error(err.message || "Lỗi OCR");
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // ==================== Face Verification Upload ====================
  const handleUploadFace = async () => {
    if (!idCardFile) {
      toast.error("Không có ảnh CCCD để upload");
      return;
    }

    setUploadingFace(true);
    try {
      toast.info("Đang upload ảnh CCCD cho face matching...");
      const formData = new FormData();
      formData.append("image", idCardFile);

      const response = await fetch("/api/face/upload", {
        method: "POST",
        body: formData
      });

      const responseText = await response.text();

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: "Lỗi upload face" };
        }
        throw new Error(errorData.error || "Lỗi upload ảnh CCCD cho face verification");
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        console.error("Failed to parse upload response:", responseText);
        throw new Error("Lỗi khi xử lý response từ API upload");
      }

      if (!data.success || !data.session_id) {
        throw new Error("Không nhận được session_id từ API");
      }

      toast.success("Đã upload ảnh CCCD thành công!");
      setVerificationSessionId(data.session_id);
      setShowFaceVerification(true);
    } catch (err: any) {
      toast.error(err.message || "Lỗi upload ảnh CCCD");
    } finally {
      setUploadingFace(false);
    }
  };

  // ==================== Face Verification Success ====================
  const handleFaceVerificationSuccess = async () => {
    await handleFaceVerificationSuccessHook(idInfo, role, desc, setUploadedCid);
    setShowFaceVerification(false);
  };

  const handleFaceVerificationCancel = () => {
    setShowFaceVerification(false);
    setVerificationSessionId(null);
    setIdInfo(null);
    setStep('upload');
    setIdCardPreview(null);
    setIdCardFile(null);
  };

  // ==================== Role Registration ====================
  const handleRegister = async () => {
    await handleRegisterHook(role, desc, uploadedCid, setUploadedCid, setRole, setDesc);
  };

  return (
    <Card variant="outlined" className="space-y-4 mt-6 bg-white p-4">
      <div className="text-lg font-bold text-blue-800">Đăng ký vai trò</div>
      
      <WalletAddressDisplay address={account} />
      <RoleList roles={roles} loading={loadingRoles} />

      {/* ID Card Upload & OCR Step */}
      {checkingProof ? (
        <div className="mt-4 text-xs text-gray-500">{MESSAGES.LOADING.CHECKING_PROOF}</div>
      ) : (
        !faceVerified && !showFaceVerification && roles.length === 0 && (
          <Card variant="outlined" className="p-4 sm:p-6 bg-white mt-4">
            <div className="text-base sm:text-lg font-bold text-windows-blue mb-4">
              Xác minh danh tính
            </div>

            {step === "upload" && (
              <div className="space-y-4">
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-black mb-2">
                    Bước 1: Tải ảnh CCCD/CMND
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleIdCardUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    variant="outline"
                    className="w-full text-sm sm:text-base"
                  >
                    {uploading ? "Đang xử lý OCR..." : "Chọn ảnh CCCD/CMND"}
                  </Button>
                </div>

                {idCardPreview && (
                  <div className="mt-4">
                    <img
                      src={idCardPreview}
                      alt="CCCD Preview"
                      className="w-full h-auto max-w-full border-2 border-windows-border rounded"
                    />
                  </div>
                )}

                {idInfo && <OCRResult idInfo={idInfo} />}
              </div>
            )}

            {step === "verify" && (
              <div className="space-y-4">
                {idCardPreview && (
                  <div className="mt-4">
                    <div className="text-xs sm:text-sm font-semibold text-black mb-2">
                      Ảnh CCCD đã upload:
                    </div>
                    <img
                      src={idCardPreview}
                      alt="CCCD Preview"
                      className="w-full h-auto max-w-full border-2 border-windows-border rounded"
                    />
                  </div>
                )}

                {idInfo && <OCRResult idInfo={idInfo} />}

                <div className="mt-4 space-y-2">
                  <Button
                    className="w-full text-sm sm:text-base"
                    onClick={handleUploadFace}
                    disabled={uploadingFace}
                  >
                    {uploadingFace ? "Đang xử lý..." : "Xác nhận và tiếp tục"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-sm sm:text-base"
                    onClick={() => {
                      setStep("upload");
                      setIdInfo(null);
                      setIdCardPreview(null);
                      setIdCardFile(null);
                    }}
                    disabled={uploadingFace}
                  >
                    Tải lại ảnh khác
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )
      )}

      {/* Face Verification Step */}
      {showFaceVerification && verificationSessionId && idInfo && (
        <Card variant="outlined" className="p-4 sm:p-6 bg-white mt-4">
          <div className="text-base sm:text-lg font-bold text-windows-blue mb-4">
            Xác minh khuôn mặt
          </div>

          <div className="space-y-4">
            <WebcamView
              videoRef={videoRef}
              canvasRef={canvasRef}
              isVerifying={isVerifying}
              verificationStep={verificationStep}
              currentAction={currentAction}
            />

            <VerificationProgress
              verificationStep={verificationStep}
              isVerifying={isVerifying}
            />

            {!result && (
              <Button
                onClick={() => startVerification(capturePhoto)}
                disabled={isVerifying}
                className="w-full text-sm sm:text-base"
              >
                {isVerifying ? "Đang so sánh khuôn mặt..." : "Bắt đầu xác minh"}
              </Button>
            )}

            {result && (
              <VerificationResultDisplay
                result={result}
                onRetry={() => startVerification(capturePhoto)}
                onSuccess={handleFaceVerificationSuccess}
                onCancel={handleFaceVerificationCancel}
              />
            )}

            {idInfo && idInfo.has_ocr_data && (
              <div className="p-3 bg-windows-bg border-2 border-windows-border rounded text-xs sm:text-sm">
                <div className="font-bold text-windows-blue mb-2">Thông tin CCCD đã đọc:</div>
                <div className="space-y-1 text-black">
                  {idInfo.id_number && <div>Số CMND/CCCD: {idInfo.id_number}</div>}
                  {idInfo.name && <div>Họ và tên: {idInfo.name}</div>}
                  {idInfo.date_of_birth && <div>Ngày sinh: {idInfo.date_of_birth}</div>}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
      
      {/* Role Registration */}
      {!checkingProof && (faceVerified || roles.length > 0) && (
        <>
          <VerificationStatus verified={faceVerified} />
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

