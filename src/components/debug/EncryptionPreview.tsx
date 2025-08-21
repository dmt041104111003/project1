'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Hash, Eye, EyeOff, Copy, CheckCircle } from 'lucide-react';
import { prepareBlockchainData } from '@/utils/hashUtils';
import { toast } from 'sonner';
import { EncryptionPreviewProps } from '@/constants/auth';

export default function EncryptionPreview({ verificationData, onConfirm, onBack }: EncryptionPreviewProps) {
  const [showHashes, setShowHashes] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const blockchainData = prepareBlockchainData(verificationData);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(`${fieldName} đã được copy!`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast.error('Không thể copy vào clipboard');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Xem trước dữ liệu trước khi lưu
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Kiểm tra thông tin trước khi đăng ký trên blockchain
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2 border-blue-200 dark:border-blue-800">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-5 w-5 text-blue-600" />
              <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100">
                Thông tin gốc
              </h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  DID
                </label>
                <div 
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => copyToClipboard(verificationData.did, 'DID')}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm break-all">{verificationData.did}</span>
                    {copiedField === 'DID' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tên
                </label>
                <div 
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => copyToClipboard(verificationData.name, 'Tên')}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{verificationData.name}</span>
                    {copiedField === 'Tên' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CCCD
                </label>
                <div 
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => copyToClipboard(verificationData.cccd, 'CCCD')}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm break-all">{verificationData.cccd}</span>
                    {copiedField === 'CCCD' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CID
                </label>
                <div 
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => copyToClipboard(verificationData.cid, 'CID')}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm break-all">{verificationData.cid}</span>
                    {copiedField === 'CID' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-2 border-green-200 dark:border-green-800">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-green-600" />
              <h3 className="text-xl font-semibold text-green-900 dark:text-green-100">
                Dữ liệu blockchain
              </h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CCCD (Encrypted)
                  <Badge variant="secondary" className="ml-2">SHA256</Badge>
                </label>
                <div 
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => copyToClipboard(blockchainData.cccd_hash, 'CCCD Hash')}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs break-all">{blockchainData.cccd_hash}</span>
                    {copiedField === 'CCCD Hash' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                  <Badge variant="secondary" className="ml-2">Plain Text</Badge>
                </label>
                <div 
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => copyToClipboard(blockchainData.name_hash, 'Name')}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{blockchainData.name_hash}</span>
                    {copiedField === 'Name' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Verification Message
                  <Badge variant="secondary" className="ml-2">Plain Text</Badge>
                </label>
                <div 
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => copyToClipboard(blockchainData.verify_message, 'Verification Message')}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{blockchainData.verify_message}</span>
                    {copiedField === 'Verification Message' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Face Verified
                  </label>
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border text-center">
                    <Badge variant={blockchainData.face_verified ? "default" : "danger"}>
                      {blockchainData.face_verified ? "✓" : "✗"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Distance
                  </label>
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border text-center">
                    <span className="text-sm font-mono">{(blockchainData.distance / 1e6).toFixed(4)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-between pt-6">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="px-8"
        >
          Quay lại
        </Button>
        <Button 
          onClick={onConfirm}
          className="px-8 bg-green-600 hover:bg-green-700"
        >
          Xác nhận & Lưu trên Blockchain
        </Button>
      </div>
    </div>
  );
}
