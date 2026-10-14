import { Repeat } from 'lucide-react';
import {
  addDays,
  formatDuration,
  formatEvery,
  formatShortDate,
  type TimelineStep,
} from '../../utils/protocolSchedule';

interface ScheduleTimelineProps {
  steps: TimelineStep[];
  /** `compact`: one-line strip for cards. `full`: vertical list with gaps and vaccines. */
  variant?: 'compact' | 'full';
  /** When set, each step shows the date it would fall on. */
  startDate?: Date;
  showVaccines?: boolean;
}

function Node({ step, size }: { step: TimelineStep; size: 'sm' | 'md' }) {
  const dims = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  return step.isBooster ? (
    <span
      className={`${dims} shrink-0 rounded-full border-2 border-dashed border-brand text-brand-text bg-brand-bg flex items-center justify-center`}
      aria-hidden
    >
      <Repeat size={size === 'sm' ? 12 : 15} />
    </span>
  ) : (
    <span
      className={`${dims} shrink-0 rounded-full bg-brand text-on-brand font-semibold flex items-center justify-center tabular-nums`}
      aria-hidden
    >
      {step.label.replace('Dose ', '')}
    </span>
  );
}

export default function ScheduleTimeline({
  steps,
  variant = 'full',
  startDate,
  showVaccines = true,
}: ScheduleTimelineProps) {
  if (steps.length === 0) return null;

  if (variant === 'compact') {
    return (
      <ol className="flex items-center gap-1 overflow-x-auto pb-1" aria-label="Dose schedule">
        {steps.map((step, i) => (
          <li key={step.id} className="flex items-center gap-1 shrink-0">
            {i > 0 && (
              <span className="flex flex-col items-center px-1">
                <span className="text-[11px] leading-none text-ink-secondary whitespace-nowrap">
                  {formatDuration(step.gapDays)}
                </span>
                <span
                  className={`mt-1 h-px w-12 ${step.isBooster ? 'border-t border-dashed border-brand' : 'bg-border'}`}
                />
              </span>
            )}
            <span className="sr-only">
              {step.label}
              {i > 0 ? `, ${formatDuration(step.gapDays)} later` : ', day 0'}
              {step.isBooster && step.repeatDays ? `, repeats ${formatEvery(step.repeatDays)}` : ''}
            </span>
            <Node step={step} size="sm" />
            {step.isBooster && step.repeatDays && (
              <span className="text-[11px] text-brand-text whitespace-nowrap ml-1">
                {formatEvery(step.repeatDays)}
              </span>
            )}
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ol className="relative" aria-label="Dose schedule">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <li key={step.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast && (
              <span
                aria-hidden
                className={`absolute left-[17px] top-9 bottom-0 w-0 border-l-2 ${
                  steps[i + 1].isBooster ? 'border-dashed border-brand/60' : 'border-border'
                }`}
              />
            )}
            <Node step={step} size="md" />
            <div className="flex-1 min-w-0 pt-1.5">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <p className="text-sm font-semibold text-ink">{step.label}</p>
                {startDate && (
                  <p className="text-xs text-ink-secondary tabular-nums">
                    {formatShortDate(addDays(startDate, step.dayOffset))}
                  </p>
                )}
              </div>
              <p className="text-xs text-ink-secondary mt-0.5">
                {i === 0
                  ? 'Start (day 0)'
                  : `${formatDuration(step.gapDays)} after ${steps[i - 1].label.toLowerCase()}`}
                {step.isBooster && step.repeatDays && (
                  <span className="text-brand-text">
                    {' '}
                    · then {formatEvery(step.repeatDays)}
                  </span>
                )}
              </p>
              {showVaccines && (
                <p className="text-xs mt-1 text-ink-secondary truncate">
                  {step.vaccines.length > 0 ? (
                    <span className="text-ink">{step.vaccines.join(', ')}</span>
                  ) : (
                    <span className="italic">No vaccine selected</span>
                  )}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
