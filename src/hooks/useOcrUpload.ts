import { useState, useRef } from 'react';
import { toast } from 'sonner';

interface OcrData {
  id_number: string;
  name: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  date_of_expiry: string;
  expiry_status?: 'valid' | 'expired';
  expiry_message?: string;
}

interface UseOcrUploadReturn {
  uploading: boolean;
  uploadingFace: boolean;
  ocrError: string | null;
  idCardPreview: string | null;
  idCardFile: File | null;
  idInfo: OcrData | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleIdCardUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleUploadFaceAuto: (file: File) => Promise<string | null>;
  resetOcr: () => void;
  setOcrError: (error: string | null) => void;
}

export function useOcrUpload(
  onOcrSuccess?: (data: OcrData, preview: string, file: File) => void,
  onFaceUploadSuccess?: (sessionId: string) => void
): UseOcrUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [uploadingFace, setUploadingFace] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [idInfo, setIdInfo] = useState<OcrData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          
          if (errorData.error && errorData.error.includes('hết hiệu lực')) {
            setOcrError(errorData.expiry_message || errorData.error);
            resetOcr();
            return;
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
          setOcrError(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }

        if (data.expiry_status === 'expired') {
          setOcrError(data.expiry_message || "CCCD đã hết hiệu lực");
          resetOcr();
          return;
        }

        setOcrError(null);
        const ocrData = { ...data, has_ocr_data: true };
        setIdInfo(ocrData);
        setIdCardPreview(preview);
        setIdCardFile(file);
        
        toast.success("Đã đọc thông tin CCCD! Đang chuyển sang xác minh khuôn mặt...");
        
        if (onOcrSuccess) {
          onOcrSuccess(ocrData, preview, file);
        }

        setTimeout(async () => {
          const sessionId = await handleUploadFaceAuto(file);
          if (sessionId && onFaceUploadSuccess) {
            onFaceUploadSuccess(sessionId);
          }
        }, 500);
      } catch (err: any) {
        setOcrError(null);
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

  const handleUploadFaceAuto = async (file: File): Promise<string | null> => {
    setUploadingFace(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

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

      return data.session_id;
    } catch (err: any) {
      toast.error(err.message || "Lỗi upload ảnh CCCD");
      resetOcr();
      throw err;
    } finally {
      setUploadingFace(false);
    }
  };

  const resetOcr = () => {
    setIdInfo(null);
    setIdCardPreview(null);
    setIdCardFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return {
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
  };
}

