import type { ReactNode } from 'react';
import { Phone } from 'lucide-react';
import {
  formatAge,
  telHref,
  type AnimalSummary,
  type DueStatus,
  type DueTone,
} from '../../utils/vaccinationRecord';

// Static class maps — Tailwind can't see dynamically built names.
const toneClasses: Record<DueTone, string> = {
  overdue: 'bg-danger-bg text-danger-text border-danger-border',
  today: 'bg-warning-bg text-warning-text border-warning-border',
  soon: 'bg-info-bg text-info-text border-info-border',
  later: 'bg-muted-bg text-muted-text border-muted-border',
};

export function DueBadge({ status, className = '' }: { status: DueStatus; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium whitespace-nowrap ${toneClasses[status.tone]} ${className}`}
    >
      <span
        aria-hidden
        className={`w-1.5 h-1.5 rounded-full ${
          status.tone === 'overdue'
            ? 'bg-danger-text'
            : status.tone === 'today'
              ? 'bg-warning-text'
              : status.tone === 'soon'
                ? 'bg-info-text'
                : 'bg-muted-text'
        }`}
      />
      {status.label}
    </span>
  );
}

const healthLabels: Record<string, string> = {
  sick: 'Sick',
  under_treatment: 'Under treatment',
  deceased: 'Deceased',
};

/** Compact identity card for the animal being vaccinated. */
export default function AnimalHeader({
  animal,
  action,
}: {
  animal: AnimalSummary;
  action?: ReactNode;
}) {
  const facts = [
    animal.speciesName,
    animal.sex && animal.sex.charAt(0).toUpperCase() + animal.sex.slice(1),
    animal.dateOfBirth && formatAge(animal.dateOfBirth),
  ].filter(Boolean);
  const health = healthLabels[animal.healthStatus];

  return (
    <div className="flex items-start gap-3 p-4 bg-card border border-border rounded-2xl">
      <div
        aria-hidden
        className="w-11 h-11 shrink-0 rounded-xl bg-brand-bg text-brand-text font-display text-lg font-semibold flex items-center justify-center"
      >
        {animal.speciesName.charAt(0) || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-lg font-semibold text-ink tracking-wide break-all">{animal.tagNumber}</p>
          {health && (
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                animal.healthStatus === 'deceased'
                  ? 'bg-danger-bg text-danger-text'
                  : 'bg-warning-bg text-warning-text'
              }`}
            >
              {health}
            </span>
          )}
        </div>
        {facts.length > 0 && <p className="text-sm text-ink-secondary">{facts.join(' · ')}</p>}
        <div className="mt-1.5 flex items-center gap-x-3 gap-y-1 flex-wrap text-sm">
          <span className="text-ink truncate">{animal.ownerName}</span>
          {animal.ownerPhone && (
            <a
              href={telHref(animal.ownerPhone)}
              className="inline-flex items-center gap-1 text-brand-text font-medium min-h-[32px]"
            >
              <Phone size={13} aria-hidden />
              {animal.ownerPhone}
            </a>
          )}
        </div>
      </div>
      {action && <div className="shrink-0 -mr-1 -mt-1">{action}</div>}
    </div>
  );
}
