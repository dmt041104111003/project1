"use client";

import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AddressDisplay } from '@/components/common';
import { ROLES, ROLE_OPTIONS, ROLE_LABELS, MESSAGES } from '@/constants/auth';

export { MessageDisplay } from '@/components/common';

// ==================== Verification Status ====================
interface VerificationStatusProps {
  verified: boolean;
}

export function VerificationStatus({ verified }: VerificationStatusProps) {
  if (!verified) return null;
  return (
    <div className="mt-4 p-3 bg-blue-50 border border-blue-300 rounded">
      <div className="text-xs text-blue-800 font-bold mb-2">
        {MESSAGES.SUCCESS.VERIFICATION_SUCCESS}
      </div>
    </div>
  );
}

// ==================== Role List ====================
interface Role {
  name: string;
  cids?: string[];
}

interface RoleListProps {
  roles: Role[];
  loading: boolean;
}

// Hàm dịch tên vai trò từ contract sang tiếng Việt
const translateRoleName = (name: string): string => {
  const lowerName = name.toLowerCase();
  if (lowerName === 'freelancer') return ROLE_LABELS.freelancer;
  if (lowerName === 'poster') return ROLE_LABELS.poster;
  if (lowerName === 'reviewer') return ROLE_LABELS.reviewer;
  return name;
};

export function RoleList({ roles, loading }: RoleListProps) {
  if (loading) {
    return <div className="text-xs text-gray-500">{MESSAGES.LOADING.LOADING_ROLES}</div>;
  }
  if (roles.length === 0) {
    return <div className="text-xs text-gray-500">{MESSAGES.STATUS.NO_ROLES}</div>;
  }
  return (
    <div className="my-2">
      {roles.map(role => (
        <div key={role.name} className="rounded p-2 text-xs mb-1 bg-blue-50 text-blue-900">
          {MESSAGES.STATUS.REGISTERED}: <b>{translateRoleName(role.name)}</b>
        </div>
      ))}
    </div>
  );
}

export { AddressDisplay as WalletAddressDisplay } from '@/components/common';

import { InfoCard, InfoField } from '@/components/common';

interface OCRResultProps {
  idInfo: any;
}

export function OCRResult({ idInfo }: OCRResultProps) {
  if (!idInfo) return null;
  
  return (
    <InfoCard title="Thông tin OCR đã đọc:" variant="windows">
      <InfoField 
        label="Số CMND/CCCD" 
        value={idInfo.id_number} 
        valueClassName="font-mono text-windows-blue break-all"
      />
      <InfoField label="Họ và tên" value={idInfo.name} />
      <InfoField label="Ngày sinh" value={idInfo.date_of_birth} />
      <InfoField label="Giới tính" value={idInfo.gender} />
      <InfoField label="Quốc tịch" value={idInfo.nationality} />
      <InfoField label="Có giá trị đến" value={idInfo.date_of_expiry} />
      {idInfo.expiry_status && (
        <InfoField
          label="Trạng thái"
          value={idInfo.expiry_status === 'valid' ? 'Còn hiệu lực' : 'Hết hiệu lực'}
          valueClassName={idInfo.expiry_status === 'valid' 
            ? 'text-windows-blue font-semibold' 
            : 'text-blue-800 font-semibold'
          }
        />
      )}
      {idInfo.expiry_message && (
        <div className="mt-2 p-2 bg-windows-bg border-2 border-windows-border-dark rounded text-xs sm:text-sm text-black">
          {typeof idInfo.expiry_message === 'string' && idInfo.expiry_message.toLowerCase().includes('expired') 
            ? 'CCCD đã hết hiệu lực' 
            : idInfo.expiry_message}
        </div>
      )}
    </InfoCard>
  );
}

// ==================== Verification Progress ====================
interface VerificationProgressProps {
  verificationStep: 'idle' | 'face-matching';
  isVerifying: boolean;
}

export function VerificationProgress({ verificationStep, isVerifying }: VerificationProgressProps) {
  if (!isVerifying) {
    return (
      <div className="text-sm text-black">
        <p className="mb-2 font-semibold">Vui lòng đảm bảo:</p>
        <ul className="list-disc list-inside space-y-1 ml-2 text-xs sm:text-sm">
          <li>Khuôn mặt rõ ràng, đầy đủ ánh sáng</li>
          <li>Nhìn thẳng vào camera</li>
          <li>Không đeo khẩu trang, kính râm</li>
        </ul>
      </div>
    );
  }
  return (
    <div className="text-center">
      <p className="font-semibold mb-2 text-sm sm:text-base">
        {verificationStep === 'face-matching' && 'Đang xử lý...'}
      </p>
      <p className="text-xs sm:text-sm text-gray-600">
        {verificationStep === 'face-matching' && 'Đang kiểm tra ảnh thật và so sánh khuôn mặt'}
      </p>
    </div>
  );
}

// ==================== Webcam View ====================
interface WebcamViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isVerifying: boolean;
  verificationStep: 'idle' | 'face-matching';
  currentAction: string;
}

export function WebcamView({ videoRef, canvasRef, isVerifying, verificationStep, currentAction }: WebcamViewProps) {
  return (
    <div className="relative w-full max-w-md mx-auto">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-auto border-2 border-windows-border rounded-lg"
      />
      <canvas ref={canvasRef} className="hidden" />
      {isVerifying && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 rounded-lg">
          <div className="text-white text-lg sm:text-xl md:text-2xl font-bold mb-4 px-4 text-center">
            {currentAction}
          </div>
          {verificationStep === 'face-matching' && (
            <div className="text-white text-xs sm:text-sm px-4 text-center">
              Đang kiểm tra ảnh thật và so sánh khuôn mặt...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== Verification Result Display ====================
interface VerificationResult {
  success: boolean;
  verified?: boolean;
  similarity?: number;
  is_real?: boolean;
  message: string;
  processing_time?: number;
}

interface VerificationResultDisplayProps {
  result: VerificationResult;
  onRetry: () => void;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function VerificationResultDisplay({ result, onRetry, onSuccess, onCancel }: VerificationResultDisplayProps) {
  const hasTriggeredAutoSuccess = useRef(false);

  useEffect(() => {
    if (result?.success && onSuccess && !hasTriggeredAutoSuccess.current) {
      hasTriggeredAutoSuccess.current = true;
      onSuccess();
    }
  }, [result?.success, onSuccess]);

  return (
    <div className={`p-4 rounded-lg border-2 ${
      result.success 
        ? 'bg-windows-bg border-windows-blue' 
        : 'bg-windows-bg border-blue-600'
    }`}>
      <div className="flex items-center gap-3 mb-3">
        {result.success ? (
          <div className="text-2xl sm:text-3xl text-windows-blue">✓</div>
        ) : (
          <div className="text-2xl sm:text-3xl text-blue-800">✗</div>
        )}
        <div className="flex-1 min-w-0">
          <div className={`text-base sm:text-lg font-bold ${
            result.success ? 'text-windows-blue' : 'text-blue-800'
          }`}>
            {result.success ? 'Xác minh thành công' : 'Xác minh thất bại'}
          </div>
          <div className="text-xs sm:text-sm text-black break-words">
            {result.message && typeof result.message === 'string' 
              ? (result.message.toLowerCase().includes('face') || result.message.toLowerCase().includes('match') || result.message.toLowerCase().includes('similarity')
                  ? 'Khuôn mặt không khớp'
                  : result.message.toLowerCase().includes('real') || result.message.toLowerCase().includes('fake')
                  ? 'Không phải từ camera thật'
                  : result.message)
              : result.message}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-xs sm:text-sm">
        {result.processing_time !== undefined && (
          <div className="flex justify-between">
            <span className="text-black">Thời gian xử lý:</span>
            <span className="font-bold text-windows-blue">
              {(result.processing_time * 1000).toFixed(0)}ms
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mt-4">
        {result.success ? (
          <Button
            onClick={() => onSuccess?.()}
            className="w-full sm:flex-1"
            disabled
          >
            Đang chuyển sang bước tiếp theo...
          </Button>
        ) : (
          <>
            <Button onClick={onRetry} variant="outline" className="w-full sm:flex-1">
              Xác minh lại
            </Button>
            {onCancel && (
              <Button onClick={onCancel} variant="outline" className="w-full sm:flex-1">
                Đóng
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ==================== Role Registration Form ====================
interface RoleRegistrationFormProps {
  role: string;
  desc: string;
  roles: Role[];
  loading: boolean;
  onRoleChange: (role: string) => void;
  onDescChange: (desc: string) => void;
  onRegister: () => void;
}

export function RoleRegistrationForm({
  role,
  desc,
  roles,
  loading,
  onRoleChange,
  onDescChange,
  onRegister,
}: RoleRegistrationFormProps) {
  const roleRegistered = role && roles.some(r => r.name === role);
  const requiresDescription = role === ROLES.FREELANCER || role === ROLES.POSTER;
  const showRegisterButton = role && (role !== ROLES.REVIEWER || !roleRegistered);

  return (
    <div className="space-y-3 mt-4">
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-1">
          {MESSAGES.STATUS.SELECT_ROLE.replace('...', '')}
        </label>
        <select
          className="w-full px-3 py-2 border border-gray-400 bg-white text-sm"
          value={role}
          disabled={loading}
          onChange={e => {
            onRoleChange(e.target.value);
            if (e.target.value === ROLES.REVIEWER) {
              onDescChange('');
            }
          }}
        >
          <option value="">{MESSAGES.STATUS.SELECT_ROLE}</option>
          {ROLE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      
      {requiresDescription && (
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-1">
            {roleRegistered ? MESSAGES.STATUS.CURRENT_INFO : MESSAGES.STATUS.DESCRIPTION}
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-400 bg-white text-sm"
            rows={3}
            value={desc}
            disabled={loading}
            onChange={e => onDescChange(e.target.value)}
            placeholder={MESSAGES.STATUS.DESCRIPTION_PLACEHOLDER}
          />
        </div>
      )}
      
      {showRegisterButton && (
        <Button
          className="w-full"
          size="sm"
          variant="outline"
          onClick={onRegister}
          disabled={loading || !role}
        >
          {loading
            ? MESSAGES.LOADING.PROCESSING
            : roleRegistered && role !== ROLES.REVIEWER
              ? MESSAGES.STATUS.UPDATE_INFO
              : MESSAGES.STATUS.REGISTER_ROLE}
        </Button>
      )}
    </div>
  );
}

