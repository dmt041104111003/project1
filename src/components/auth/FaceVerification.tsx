"use client";

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/utils/api';

interface FaceVerificationProps {
  onVerified: (sessionId: string, idInfo: any) => void;
  onCancel?: () => void;
}

export const FaceVerification: React.FC<FaceVerificationProps> = ({ onVerified, onCancel }) => {
  const [step, setStep] = useState<'upload' | 'verify'>('upload');
  const [uploading, setUploading] = useState(false);
  const [uploadingFace, setUploadingFace] = useState(false);
  const [idInfo, setIdInfo] = useState<any>(null);
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleIdCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh");
      return;
    }

    setIdCardFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      setIdCardPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetchWithAuth("/api/ocr", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Lỗi OCR" }));
        throw new Error(errorData.error || "Lỗi OCR từ API");
      }

      const data = await response.json();
      console.log("OCR result:", data);

      const missingFields: string[] = [];
      
      if (!data.id_number) {
        missingFields.push("Số CMND/CCCD");
      }
      if (!data.name) {
        missingFields.push("Họ và tên");
      }
      if (!data.date_of_birth) {
        missingFields.push("Ngày sinh");
      }
      if (!data.gender) {
        missingFields.push("Giới tính");
      }
      if (!data.nationality) {
        missingFields.push("Quốc tịch");
      }
      if (!data.date_of_expiry) {
        missingFields.push("Ngày hết hạn");
      }

      if (missingFields.length > 0) {
        const missingImportant = !data.id_number || !data.date_of_birth || !data.name;
        
        if (missingImportant) {
          toast.error(`Không đọc được thông tin: ${missingFields.join(", ")}. Vui lòng thực hiện lại chụp rõ ảnh CCCD.`);
        } else if (!data.date_of_expiry) {
          toast.error("Không đọc được ngày hết hạn. Vui lòng thực hiện lại chụp rõ ảnh CCCD.");
        } else {
          toast.error(`Thiếu thông tin: ${missingFields.join(", ")}. Vui lòng thực hiện lại chụp rõ ảnh CCCD.`);
        }
        setIdCardPreview(null);
        setIdCardFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      setIdInfo({
        ...data,
        has_ocr_data: true
      });

      toast.success("Đã đọc thông tin CCCD!");
      setStep("verify");

    } catch (err: any) {
      toast.error(err.message || "Lỗi OCR");
      setIdCardPreview(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card variant="outlined" className="p-6 bg-white">
      <div className="text-lg font-bold text-windows-blue mb-4">Xác minh danh tính</div>

      {step === "upload" && (
        <div className="space-y-4">
          <label className="block text-sm font-bold text-black mb-2">
            Bước 1: Tải ảnh CCCD/CMND
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleIdCardUpload}
            className="hidden"
          />

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            variant="outline"
            className="w-full"
          >
            {uploading ? "Đang xử lý OCR..." : "Chọn ảnh CCCD/CMND"}
          </Button>

          {idCardPreview && (
            <div className="mt-4">
              <img
                src={idCardPreview}
                alt="CCCD Preview"
                className="max-w-full h-auto border-2 border-windows-border rounded"
              />
            </div>
          )}

          {idInfo && step === "upload" && (
            <div className="mt-4 p-3 bg-windows-bg border-2 border-windows-border rounded text-sm">
              <div className="font-bold text-windows-blue mb-2">Thông tin OCR đã đọc:</div>

              <div className="space-y-1 text-black">
                {idInfo.id_number && <div><strong>Số CMND/CCCD:</strong> {idInfo.id_number}</div>}
                {idInfo.name && <div><strong>Họ và tên:</strong> {idInfo.name}</div>}
                {idInfo.date_of_birth && <div><strong>Ngày sinh:</strong> {idInfo.date_of_birth}</div>}
                {idInfo.gender && <div><strong>Giới tính:</strong> {idInfo.gender}</div>}
                {idInfo.nationality && <div><strong>Quốc tịch:</strong> {idInfo.nationality}</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {step === "verify" && (
        <div className="space-y-4">
      

          {idCardPreview && (
            <div className="mt-4">
              <div className="text-sm font-semibold text-black mb-2">Ảnh CCCD đã upload:</div>
              <img
                src={idCardPreview}
                alt="CCCD Preview"
                className="max-w-full h-auto border-2 border-windows-border rounded"
              />
            </div>
          )}

          {idInfo && (
            <div className="mt-4 p-4 bg-windows-bg border-2 border-windows-border rounded-lg">
         

              <div className="space-y-2 text-black">
                {idInfo.id_number && (
                  <div className="flex items-start">
                    <span className="font-semibold min-w-[140px]">Số CMND/CCCD:</span>
                    <span className="font-mono text-windows-blue">{idInfo.id_number}</span>
                  </div>
                )}
                {idInfo.name && (
                  <div className="flex items-start">
                    <span className="font-semibold min-w-[140px]">Họ và tên:</span>
                    <span className="text-windows-blue">{idInfo.name}</span>
                  </div>
                )}
                {idInfo.date_of_birth && (
                  <div className="flex items-start">
                    <span className="font-semibold min-w-[140px]">Ngày sinh:</span>
                    <span className="text-windows-blue">{idInfo.date_of_birth}</span>
                  </div>
                )}
                {idInfo.gender && (
                  <div className="flex items-start">
                    <span className="font-semibold min-w-[140px]">Giới tính:</span>
                    <span className="text-windows-blue">{idInfo.gender}</span>
                  </div>
                )}
                {idInfo.nationality && (
                  <div className="flex items-start">
                    <span className="font-semibold min-w-[140px]">Quốc tịch:</span>
                    <span className="text-windows-blue">{idInfo.nationality}</span>
                  </div>
                )}
                {idInfo.date_of_expiry && (
                  <div className="flex items-start">
                    <span className="font-semibold min-w-[140px]">Có giá trị đến:</span>
                    <span className="text-windows-blue">{idInfo.date_of_expiry}</span>
                  </div>
                )}
                {idInfo.expiry_status && (
                  <div className="flex items-start">
                    <span className="font-semibold min-w-[140px]">Trạng thái:</span>
                    <span className={idInfo.expiry_status === 'valid' ? 'text-windows-blue font-semibold' : 'text-red-600 font-semibold'}>
                      {idInfo.expiry_status === 'valid' ? 'Còn hiệu lực' : 'Hết hiệu lực'}
                    </span>
                  </div>
                )}
                {idInfo.expiry_message && (
                  <div className="mt-2 p-2 bg-windows-bg border-2 border-windows-border-dark rounded text-sm text-black">
                    {idInfo.expiry_message}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2">
            <Button
              className="w-full"
              onClick={async () => {
                if (!idCardFile) {
                  toast.error("Không có ảnh CCCD để upload");
                  return;
                }

                setUploadingFace(true);
                try {
                  const formData = new FormData();
                  formData.append("image", idCardFile);
                  formData.append("action", "upload_id_card");

                  const response = await fetch("/api/face", {
                    method: "POST",
                    body: formData
                  });

                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: "Lỗi upload face" }));
                    throw new Error(errorData.error || "Lỗi upload ảnh CCCD cho face verification");
                  }

                  const data = await response.json();
                  
                  if (!data.success || !data.session_id) {
                    throw new Error("Không nhận được session_id từ API");
                  }

                  toast.success("Đã upload ảnh CCCD thành công!");
                  onVerified(data.session_id, idInfo);
                } catch (err: any) {
                  toast.error(err.message || "Lỗi upload ảnh CCCD");
                } finally {
                  setUploadingFace(false);
                }
              }}
              disabled={uploadingFace}
            >
              {uploadingFace ? "Đang upload ảnh CCCD..." : "Xác nhận và tiếp tục"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setStep("upload");
                setIdInfo(null);
                setIdCardPreview(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              Upload lại ảnh khác
            </Button>
          </div>
        </div>
      )}

      {onCancel && (
        <div className="mt-4">
          <Button
            onClick={onCancel}
            variant="outline"
            className="w-full"
            disabled={uploading}
          >
            Hủy
          </Button>
        </div>
      )}
    </Card>
  );
};
