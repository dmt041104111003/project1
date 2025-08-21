'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, ExternalLink, Copy, Hash, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { BlockchainResultProps } from '@/constants/auth';

export default function BlockchainResult({ 
  transactionHash, 
  verificationData, 
  blockchainData, 
  onViewProfile 
}: BlockchainResultProps) {
  
  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${fieldName} đã được copy!`);
    } catch (err) {
      toast.error('Copy thất bại');
    }
  };

  const viewOnExplorer = () => {
    const explorerUrl = `https://explorer.aptoslabs.com/txn/${transactionHash}?network=testnet`;
    window.open(explorerUrl, '_blank');
  };

  return (
    <Card>
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-xl font-semibold text-green-800">Đăng ký DID thành công!</h3>
          </div>
          <p className="text-sm text-gray-600">
            Profile của bạn đã được lưu an toàn trên blockchain Aptos
          </p>
        </div>

        <div className="mb-6">
          <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Transaction Hash
          </h4>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <p 
                className="font-mono text-sm break-all text-green-800 cursor-pointer hover:bg-green-100 transition-colors p-2 rounded"
                onClick={() => copyToClipboard(transactionHash, 'Transaction Hash')}
                title="Click để copy Transaction Hash"
              >
                {transactionHash}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={viewOnExplorer}
                className="flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="font-medium text-gray-700 mb-3">Kết quả xác minh</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-800">Face Verification</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Trạng thái:</span>
                  <Badge variant={verificationData.face_verified ? "default" : "danger"}>
                    {verificationData.face_verified ? "Thành công" : "Thất bại"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Độ tương đồng:</span>
                  <span className="font-mono">{((1 - verificationData.distance) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Liveness check:</span>
                  <Badge variant={verificationData.is_real ? "default" : "danger"}>
                    {verificationData.is_real ? "Real" : "Fake"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Thời gian xử lý:</span>
                  <span>{verificationData.processing_time}ms</span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">Blockchain Data</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex flex-col gap-1">
                  <span>DID:</span>
                  <span 
                    className="font-mono text-xs break-all bg-white p-2 rounded border block cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => copyToClipboard(blockchainData.did, 'DID')}
                    title="Click để copy DID"
                  >
                    {blockchainData.did}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Distance (scaled):</span>
                  <span className="font-mono">{blockchainData.distance}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>CCCD Hash:</span>
                  <span 
                    className="font-mono text-xs cursor-pointer hover:bg-gray-100 transition-colors p-1 rounded"
                    onClick={() => copyToClipboard(blockchainData.cccd_hash, 'CCCD Hash')}
                    title="Click để copy CCCD Hash"
                  >
                    {blockchainData.cccd_hash.slice(0, 8)}...
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Name Hash:</span>
                  <span 
                    className="font-mono text-xs cursor-pointer hover:bg-gray-100 transition-colors p-1 rounded"
                    onClick={() => copyToClipboard(blockchainData.name_hash, 'Name Hash')}
                    title="Click để copy Name Hash"
                  >
                    {blockchainData.name_hash.slice(0, 8)}...
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="font-medium text-gray-700 mb-3">Bảo mật đã được đảm bảo</h4>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>CCCD đã được mã hóa SHA256</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Tên đã được mã hóa SHA256</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Verification hash đảm bảo tính toàn vẹn</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Dữ liệu an toàn trên blockchain</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={onViewProfile} className="flex-1">
            Xem Profile
          </Button>
          <Button variant="outline" onClick={viewOnExplorer}>
            Xem trên Explorer
          </Button>
        </div>
      </div>
    </Card>
  );
}
