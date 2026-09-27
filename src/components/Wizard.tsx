import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Check, Loader } from 'lucide-react';

interface WizardProps {
  steps: { label: string }[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  children: ReactNode;
  hideNavigation?: boolean;
  isSubmitting?: boolean;
  nextButtonText?: string;
}

export default function Wizard({ steps, currentStep, onStepChange, onNext, onBack, onSubmit, children, hideNavigation = false, isSubmitting = false, nextButtonText }: WizardProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center mb-8 overflow-x-auto">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center">
            <button
              onClick={() => index < currentStep && onStepChange(index)}
              disabled={index > currentStep}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                index === currentStep ? 'bg-brand text-on-brand' : index < currentStep ? 'bg-brand-bg text-brand-text cursor-pointer hover:bg-brand/10' : 'bg-bg text-ink-secondary cursor-not-allowed'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index < currentStep ? 'bg-brand text-on-brand' : index === currentStep ? 'bg-on-brand/20' : 'bg-border text-ink-secondary'}`}>
                {index < currentStep ? <Check size={14} /> : index + 1}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {index < steps.length - 1 && <div className={`w-8 h-px mx-1 ${index < currentStep ? 'bg-brand' : 'bg-border'}`} />}
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-6 min-h-[400px]">{children}</div>

      {!hideNavigation && (
        <div className="flex items-center justify-between mt-6">
          {currentStep > 0 ? (
            <button 
              onClick={onBack} 
              disabled={isSubmitting} 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isSubmitting ? 'text-ink-secondary cursor-not-allowed' : 'text-ink hover:bg-card border border-border'}`}
            >
              <ChevronLeft size={16} /> Back
            </button>
          ) : (
            <div></div>
          )}
          {currentStep < steps.length - 1 ? (
            <button 
              onClick={onNext} 
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand text-on-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  {nextButtonText || 'Processing...'}
                </>
              ) : (
                <>
                  {nextButtonText || 'Next'} <ChevronRight size={16} />
                </>
              )}
            </button>
          ) : (
            <button 
              onClick={onSubmit} 
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand text-on-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check size={16} /> Submit
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
