import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: number;
  message: string;
  tone?: 'success' | 'error';
  /** Optional inline action, e.g. Undo. */
  action?: { label: string; onClick: () => void };
}

/** Page-local toast queue. Render <ToastViewport> once per page. */
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = ++seq.current;
    setToasts((prev) => [...prev.slice(-2), { ...toast, id }]);
    return id;
  }, []);

  return { toasts, show, dismiss };
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    // Actions get longer so people have time to hit Undo
    const timer = setTimeout(() => onDismiss(toast.id), toast.action ? 7000 : 4000);
    return () => clearTimeout(timer);
  }, [paused, toast, onDismiss]);

  const error = toast.tone === 'error';
  const Icon = error ? AlertCircle : CheckCircle;

  return (
    <div
      role={error ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="pointer-events-auto flex items-center gap-3 min-w-[16rem] max-w-md px-4 py-3 rounded-xl border border-border bg-card shadow-lg"
    >
      <Icon size={18} className={`shrink-0 ${error ? 'text-danger-text' : 'text-success-text'}`} />
      <p className="flex-1 text-sm text-ink">{toast.message}</p>
      {toast.action && (
        <button
          onClick={() => {
            toast.action!.onClick();
            onDismiss(toast.id);
          }}
          className="text-sm font-semibold text-brand-text hover:underline"
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="p-1 -m-1 rounded text-ink-secondary hover:text-ink"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-[60] flex flex-col gap-2 items-center sm:items-end"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
