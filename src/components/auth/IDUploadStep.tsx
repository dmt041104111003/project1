'use client';

import { useState, useEffect } from 'react';
import { Button, FileUploadInput } from '@/components/ui';
import { IDUploadStepProps } from '@/constants/auth';
import { Upload, Loader2, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';

export default function IDUploadStep({ 
  onNext, 
  onUploadIdCard, 
  isApiLoading = false, 
  idCardData 
}: IDUploadStepProps) {
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [uploadedFront, setUploadedFront] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0); 

  useEffect(() => {
    if (idCardData) {
      setUploadError(null);
    }
  }, [idCardData]);

  const resetUpload = () => {
    setFrontImage(null);
    setBackImage(null);
    setUploadedFront(false);
    setUploadError(null);
    setInputKey(prev => prev + 1); 
  };

  const handleFrontImageUpload = async (file: File) => {
      setFrontImage(file);
      setUploadError(null); 
      
      if (onUploadIdCard) {
        try {
          await onUploadIdCard(file);
          setUploadedFront(true);
        } catch (error) {
          console.error('Upload front image error:', error);
          setUploadError('Upload thất bại. Vui lòng thử lại với ảnh khác.');
          setUploadedFront(false);
          setTimeout(() => {
            resetUpload();
          }, 2000); 
        }
      }
  };

  const handleBackImageUpload = (file: File) => { setBackImage(file); };

  const handleContinue = () => {
    if (uploadedFront && backImage) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="block text-sm font-medium">Ảnh mặt trước CCCD/Hộ chiếu</label>
          <div className="relative">
            <FileUploadInput label="Chọn ảnh" accept="image/*" onFile={handleFrontImageUpload} />
            {isApiLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            )}
            {uploadedFront && !isApiLoading && !uploadError && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
            )}
          </div>
          
          {uploadError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <div>
                  <p className="text-sm text-red-800 font-medium">Upload thất bại</p>
                  <p className="text-xs text-red-600">{uploadError}</p>
                </div>
              </div>
              <Button 
                onClick={resetUpload} 
                variant="outline" 
                size="sm" 
                className="mt-2"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Thử lại
              </Button>
            </div>
          )}
          
          {idCardData && !uploadError && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Thông tin đọc được:</h4>
              <div className="space-y-1 text-xs text-blue-800">
                <p><span className="font-medium">CCCD:</span> {idCardData.cccd || 'Không đọc được'}</p>
                <p><span className="font-medium">Họ tên:</span> {idCardData.name || 'Không đọc được'}</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          <label className="block text-sm font-medium">Ảnh mặt sau CCCD/Hộ chiếu</label>
          <FileUploadInput label="Chọn ảnh" accept="image/*" onFile={handleBackImageUpload} />
          {backImage && !uploadError && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">✓ Đã chọn ảnh mặt sau</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex justify-center">
        <Button 
          onClick={handleContinue}
          disabled={!uploadedFront || !backImage || isApiLoading || uploadError !== null}
          className="min-w-[120px]"
        >
          {isApiLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Đang xử lý...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Tiếp tục
            </>
          )}
        </Button>
      </div>
    </div>

  );
}
