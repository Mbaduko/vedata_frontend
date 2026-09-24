import { AlertTriangle, X } from 'lucide-react';

interface Impact {
  label: string;
  value: number | string;
}

interface ImpactConfirmDialogProps {
  title: string;
  message: string;
  impacts?: Impact[];
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
}

export default function ImpactConfirmDialog({ title, message, impacts, onConfirm, onCancel, confirmLabel = 'Confirm' }: ImpactConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30">
      <div className="bg-card border border-border rounded-xl max-w-lg w-full mx-4 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold-bg flex items-center justify-center">
              <AlertTriangle size={20} className="text-gold-text" />
            </div>
            <h3 className="text-lg font-semibold font-display">{title}</h3>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-bg rounded-lg">
            <X size={18} className="text-ink-secondary" />
          </button>
        </div>
        <p className="text-sm text-ink-secondary mb-4">{message}</p>
        {impacts && impacts.length > 0 && (
          <div className="bg-bg border border-border rounded-lg p-4 mb-6 space-y-2">
            {impacts.map((impact, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-ink-secondary">{impact.label}</span>
                <span className="font-medium text-ink tabular-nums">{impact.value}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-bg rounded-lg border border-border transition-colors">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium bg-clay-bg text-clay-text rounded-lg hover:opacity-90 transition-colors">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
