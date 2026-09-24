import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: LucideIcon;
  className?: string;
}

export default function MetricCard({ label, value, sublabel, icon: Icon, className = '' }: MetricCardProps) {
  return (
    <div className={`bg-card border border-border rounded-xl p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-ink-secondary uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-ink mt-1 tabular-nums">{value}</p>
          {sublabel && <p className="text-xs text-ink-secondary mt-1">{sublabel}</p>}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-brand-bg flex items-center justify-center shrink-0">
            <Icon size={20} className="text-brand-text" />
          </div>
        )}
      </div>
    </div>
  );
}
