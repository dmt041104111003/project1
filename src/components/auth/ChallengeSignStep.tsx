'use client';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert } from '@/components/ui/alert';
import { Upload, AlertCircle } from 'lucide-react';
import { ChallengeSignStepProps } from '@/constants/auth';
import { VERIFICATION_MESSAGES } from '@/constants/did-verification';


export default function ChallengeSignStep({ 
  verificationStatus, 
  progress, 
  onSignChallenge 
}: ChallengeSignStepProps) {
  return (
    <div className="space-y-4">
      <Alert>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{VERIFICATION_MESSAGES.CHALLENGE_SIGN}</span>
        </div>
      </Alert>
      
      {verificationStatus === 'processing' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Đang xác minh...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      )}

      <div className="flex justify-center">
        <Button 
          onClick={onSignChallenge}
          disabled={verificationStatus === 'processing'}
        >
          <Upload className="w-4 h-4 mr-2" />
          Ký Challenge
        </Button>
      </div>
    </div>
  );
}
