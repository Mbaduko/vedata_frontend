import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-12 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-brand-bg flex items-center justify-center mx-auto mb-4">
          <Icon size={24} className="text-brand-text" />
        </div>
      )}
      <h3 className="text-lg font-semibold font-display text-ink mb-2">{title}</h3>
      <p className="text-sm text-ink-secondary max-w-sm mx-auto mb-6">{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="px-4 py-2 bg-brand text-on-brand text-sm font-medium rounded-lg hover:bg-brand-hover transition-colors">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
