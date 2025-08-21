import { CheckCircle } from 'lucide-react';
import { VerificationProgressProps } from '@/constants/auth';

export default function VerificationProgress({ steps, currentStep }: VerificationProgressProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((stepItem, index) => (
          <div key={stepItem.id} className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              currentStep >= stepItem.id ? 'bg-primary border-primary text-primary-foreground' : 'border-muted'
            }`}>
              {currentStep > stepItem.id ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <span className="text-sm font-medium">{stepItem.id}</span>
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={`w-16 h-0.5 mx-2 ${currentStep > stepItem.id ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 text-center">
        <h3 className="font-medium">{steps[currentStep - 1]?.title}</h3>
        <p className="text-sm text-muted-foreground">{steps[currentStep - 1]?.description}</p>
      </div>
    </div>
  );
}
