import { useEffect, useRef } from 'react';
import { CalendarCheck, Check, ChevronRight, MapPin, MessageSquare, Phone, Plus } from 'lucide-react';
import { mapHref } from './useLiveLocation';
import { formatShortDate } from '../../utils/protocolSchedule';
import {
  daysBetween,
  formatRelativeDays,
  telHref,
  type AnimalSummary,
  type EnrollmentDue,
} from '../../utils/vaccinationRecord';
import type { AnimalVaccinationEnrollment } from '../../services/api';
import type { RecordResult } from './DoseForm';
import { DueBadge } from './AnimalHeader';

interface RecordSuccessProps {
  result: RecordResult;
  animal: AnimalSummary;
  /** Other doses this animal could get now, from other protocols. */
  alsoDue: Array<{ enrollment: AnimalVaccinationEnrollment; due: EnrollmentDue }>;
  onPickEnrollment: (enrollmentId: string) => void;
  onRecordAnother: () => void;
  secondaryAction: { label: string; onClick: () => void };
}

export default function RecordSuccess({
  result,
  animal,
  alsoDue,
  onPickEnrollment,
  onRecordAnother,
  secondaryAction,
}: RecordSuccessProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    window.scrollTo({ top: 0 });
    headingRef.current?.focus();
  }, []);

  const disease = result.enrollment.protocol.disease.name;
  const editableUntil = result.vaccination.editableUntil
    ? new Date(result.vaccination.editableUntil)
    : null;

  const smsBody = [
    `Hello ${animal.ownerName}, ${animal.tagNumber} was vaccinated against ${disease} on ${formatShortDate(result.dateGiven)}.`,
    result.next
      ? `The next ${result.next.label.toLowerCase()} is due on ${formatShortDate(result.next.date)}.`
      : 'The vaccination course is now complete.',
  ].join(' ');

  return (
    <div className="space-y-4">
      <div className="pt-4 pb-2 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-success-bg text-success-text flex items-center justify-center animate-[pop_300ms_ease-out]">
          <Check size={32} strokeWidth={3} aria-hidden />
        </div>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mt-4 text-2xl font-display font-semibold text-ink focus:outline-none"
        >
          {result.doseLabel} recorded
        </h1>
        <p className="mt-1 text-ink-secondary">
          {animal.tagNumber} · {disease}
        </p>
      </div>

      <dl className="bg-card border border-border rounded-2xl divide-y divide-border text-sm">
        {[
          ['Vaccine', result.vaccineName],
          ['Batch', result.batch],
          ['Given', formatShortDate(result.dateGiven)],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-ink-secondary">{label}</dt>
            <dd className="text-ink font-medium text-right break-all">{value}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-ink-secondary">Location</dt>
          <dd className="text-right">
            <a
              href={mapHref(result.location)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-brand-text"
            >
              <MapPin size={14} aria-hidden />
              {result.location.lat.toFixed(5)}, {result.location.lng.toFixed(5)}
            </a>
            <span className="block text-xs text-ink-secondary">±{result.location.accuracy} m</span>
          </dd>
        </div>
      </dl>

      <div className="flex gap-3 p-4 rounded-2xl bg-info-bg border border-info-border text-info-text">
        <CalendarCheck size={20} aria-hidden className="shrink-0 mt-0.5" />
        <p className="text-sm">
          {result.next ? (
            <>
              Next: <strong className="font-semibold">{result.next.label}</strong> on{' '}
              <strong className="font-semibold">{formatShortDate(result.next.date)}</strong> (
              {formatRelativeDays(daysBetween(new Date(), result.next.date))})
            </>
          ) : (
            <>Vaccination course complete — no more doses due.</>
          )}
        </p>
      </div>

      {editableUntil && (
        <p className="px-1 text-xs text-ink-secondary text-center">
          You can correct this record until{' '}
          {editableUntil.toLocaleString(undefined, {
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
          .
        </p>
      )}

      {animal.ownerPhone && (
        <div className="grid grid-cols-2 gap-2">
          <a
            href={`sms:${animal.ownerPhone.replace(/[^\d+]/g, '')}?&body=${encodeURIComponent(smsBody)}`}
            className="h-12 flex items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium text-ink hover:border-brand-border"
          >
            <MessageSquare size={16} aria-hidden /> Text owner
          </a>
          <a
            href={telHref(animal.ownerPhone)}
            className="h-12 flex items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium text-ink hover:border-brand-border"
          >
            <Phone size={16} aria-hidden /> Call owner
          </a>
        </div>
      )}

      {alsoDue.length > 0 && (
        <section aria-labelledby="also-due-heading" className="space-y-2 pt-2">
          <h2 id="also-due-heading" className="px-1 text-sm font-semibold text-ink">
            Also due for {animal.tagNumber}
          </h2>
          <ul className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
            {alsoDue.map(({ enrollment, due }) => (
              <li key={enrollment.id}>
                <button
                  type="button"
                  onClick={() => onPickEnrollment(enrollment.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 min-h-[64px] text-left hover:bg-bg active:bg-bg"
                >
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink truncate">
                        {enrollment.protocol.disease.name}
                      </span>
                      <DueBadge status={due.status} />
                    </span>
                    <span className="block text-sm text-ink-secondary">{due.label}</span>
                  </span>
                  <ChevronRight size={20} aria-hidden className="text-ink-secondary shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="sticky bottom-0 -mx-4 sm:mx-0 px-4 sm:px-0 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-bg/95 backdrop-blur-sm space-y-2">
        <button
          type="button"
          onClick={onRecordAnother}
          className="w-full h-14 flex items-center justify-center gap-2 rounded-2xl bg-brand text-on-brand text-base font-semibold shadow-md hover:bg-brand-hover"
        >
          <Plus size={20} aria-hidden /> Vaccinate another animal
        </button>
        <button
          type="button"
          onClick={secondaryAction.onClick}
          className="w-full h-12 rounded-2xl text-sm font-medium text-ink-secondary hover:text-ink"
        >
          {secondaryAction.label}
        </button>
      </div>
    </div>
  );
}
