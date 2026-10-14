import { useEffect, useId, useRef, type ReactNode } from 'react';
import { AlertTriangle, Loader, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  /** Extra content (inputs, impact lists) between description and actions. */
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  busy?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Accessible modal confirmation: focus moves in on open and back on close,
 * Tab is trapped inside, Esc and backdrop clicks cancel (unless busy).
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  busy = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  // Latest callbacks without re-running the focus effect on every render
  const cancelRef = useRef(onCancel);
  const busyRef = useRef(busy);
  cancelRef.current = onCancel;
  busyRef.current = busy;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    // Prefer the first form field, else the safe (cancel) action
    const field = panel?.querySelector<HTMLElement>('input, textarea, select');
    (field ?? panel?.querySelector<HTMLElement>('[data-autofocus]'))?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busyRef.current) {
        e.preventDefault();
        cancelRef.current();
      }
      if (e.key === 'Tab') {
        const items = focusables();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const danger = tone === 'danger';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-6"
      >
        <div className="flex items-start gap-3">
          {danger && (
            <div className="w-10 h-10 shrink-0 rounded-full bg-danger-bg flex items-center justify-center">
              <AlertTriangle size={20} className="text-danger-text" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 id={titleId} className="text-lg font-semibold font-display text-ink">
              {title}
            </h3>
            {description && (
              <div id={descId} className="text-sm text-ink-secondary mt-1">
                {description}
              </div>
            )}
          </div>
          <button
            onClick={onCancel}
            disabled={busy}
            aria-label="Close"
            className="p-1 -m-1 rounded-lg text-ink-secondary hover:bg-bg disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {children && <div className="mt-4">{children}</div>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
          <button
            data-autofocus
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 text-sm font-medium text-ink border border-border rounded-lg hover:bg-bg disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-on-brand disabled:opacity-50 ${
              danger ? 'bg-danger-solid hover:bg-danger-solid-hover' : 'bg-brand hover:bg-brand-hover'
            }`}
          >
            {busy && <Loader size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
