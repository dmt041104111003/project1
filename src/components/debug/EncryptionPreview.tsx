'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Eye, Copy, CheckCircle } from 'lucide-react';
import { prepareBlockchainData } from '@/utils/hashUtils';
import { toast } from 'sonner';
import { EncryptionPreviewProps } from '@/constants/auth';

export default function EncryptionPreview({ verificationData, onConfirm, onBack }: EncryptionPreviewProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const blockchainData = prepareBlockchainData(verificationData);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(`${fieldName} đã được copy!`);
      setTimeout(() => setCopiedField(null), 1500);
    } catch (err) {
      toast.error('Không thể copy vào clipboard');
    }
  };

  const Block = ({ label, value }: { label: string; value: string }) => (
    <div className="select-none">
      <label className="block text-sm font-medium text-foreground/80 mb-1">{label}</label>
      <div
        role="button"
        aria-label={`Copy ${label}`}
        className="p-3 bg-card text-card-foreground rounded-lg border border-border cursor-pointer hover:bg-accent/40 transition-colors select-none"
        onClick={() => copyToClipboard(value, label)}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm break-all">{value}</span>
          {copiedField === label ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 select-none">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-4">Xem trước dữ liệu trước khi lưu</h2>
        <p className="text-muted-foreground">Kiểm tra thông tin trước khi đăng ký trên blockchain</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4 select-none">
              <Eye className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-semibold text-foreground">Thông tin gốc</h3>
            </div>
            <div className="space-y-4">
              <Block label="DID" value={verificationData.did} />
              <Block label="Tên" value={verificationData.name} />
              <Block label="CCCD" value={verificationData.cccd} />
              <Block label="CID" value={verificationData.cid || 'Sẽ được tạo sau khi pin lên IPFS'} />
            </div>
          </div>
        </Card>
        <Card className="border">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4 select-none">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-semibold text-foreground">Dữ liệu blockchain</h3>
            </div>

            <div className="space-y-4">
              <div className="select-none">
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  CCCD (Encrypted)
                  <Badge variant="secondary" className="ml-2">SHA256</Badge>
                </label>
                <div
                  role="button"
                  aria-label="Copy CCCD Hash"
                  className="p-3 bg-card text-card-foreground rounded-lg border border-border cursor-pointer hover:bg-accent/40 transition-colors select-none"
                  onClick={() => copyToClipboard(blockchainData.cccd_hash, 'CCCD Hash')}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs break-all">{blockchainData.cccd_hash}</span>
                    {copiedField === 'CCCD Hash' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>

              <div className="select-none">
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  Name
                  <Badge variant="secondary" className="ml-2">Plain Text</Badge>
                </label>
                <div
                  role="button"
                  aria-label="Copy Name"
                  className="p-3 bg-card text-card-foreground rounded-lg border border-border cursor-pointer hover:bg-accent/40 transition-colors select-none"
                  onClick={() => copyToClipboard(blockchainData.name_hash, 'Name')}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{blockchainData.name_hash}</span>
                    {copiedField === 'Name' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>

              <div className="select-none">
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  Verification Message
                  <Badge variant="secondary" className="ml-2">Plain Text</Badge>
                </label>
                <div
                  role="button"
                  aria-label="Copy Verification Message"
                  className="p-3 bg-card text-card-foreground rounded-lg border border-border cursor-pointer hover:bg-accent/40 transition-colors select-none"
                  onClick={() => copyToClipboard(blockchainData.verify_message, 'Verification Message')}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{blockchainData.verify_message}</span>
                    {copiedField === 'Verification Message' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 select-none">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Face Verified</label>
                  <div className="p-2 bg-card text-card-foreground rounded border border-border text-center">
                    <Badge variant={blockchainData.face_verified ? 'default' : 'danger'}>
                      {blockchainData.face_verified ? '✓' : '✗'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Distance</label>
                  <div className="p-2 bg-card text-card-foreground rounded border border-border text-center">
                    <span className="text-sm font-mono">{(blockchainData.distance / 1e6).toFixed(4)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-between pt-6 select-none">
        <Button variant="outline" onClick={onBack} className="px-8">Quay lại</Button>
        <Button variant="primary" onClick={onConfirm} className="px-8">Xác nhận & Lưu trên Blockchain</Button>
      </div>
    </div>
  );
}
