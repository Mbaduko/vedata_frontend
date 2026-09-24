import { CheckCircle, AlertCircle, Stethoscope, Flag, type LucideIcon } from 'lucide-react';

const statusConfig: Record<string, { label: string; bgClass: string; textClass: string; Icon: LucideIcon }> = {
  healthy: { label: 'Healthy', bgClass: 'bg-brand-bg', textClass: 'text-brand-text', Icon: CheckCircle },
  sick: { label: 'Sick', bgClass: 'bg-gold-bg', textClass: 'text-gold-text', Icon: AlertCircle },
  under_treatment: { label: 'Under Treatment', bgClass: 'bg-sky-bg', textClass: 'text-sky-text', Icon: Stethoscope },
  deceased: { label: 'Deceased', bgClass: 'bg-clay-bg', textClass: 'text-clay-text', Icon: Flag },
};

export default function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) {
  const config = statusConfig[status];
  if (!config) return null;

  const { label, bgClass, textClass, Icon } = config;
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${bgClass} ${textClass} ${sizeClasses}`}>
      <Icon size={size === 'sm' ? 12 : 16} />
      {label}
    </span>
  );
}
