import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Loader, Plus, Syringe } from 'lucide-react';
import {
  ApiError,
  vaccinationApi,
  type AnimalVaccinationEnrollment,
  type VaccinationProtocol,
} from '../../services/api';
import ScheduleTimeline from '../protocol/ScheduleTimeline';
import { describeSteps, stepsFromDoses } from '../../utils/protocolSchedule';
import {
  doseLabel,
  enrollmentDue,
  type AnimalSummary,
  type EnrollmentDue,
} from '../../utils/vaccinationRecord';
import { DueBadge } from './AnimalHeader';

interface EnrollmentChooserProps {
  animal: AnimalSummary;
  enrollments: AnimalVaccinationEnrollment[];
  onPick: (enrollmentId: string) => void;
  onEnrolled: (enrollment: AnimalVaccinationEnrollment) => void;
}

/** Step 2 — pick which protocol's dose to give, or enroll in one. */
export default function EnrollmentChooser({
  animal,
  enrollments,
  onPick,
  onEnrolled,
}: EnrollmentChooserProps) {
  const deceased = animal.healthStatus === 'deceased';

  const dueItems = useMemo(
    () =>
      enrollments
        .map((enrollment) => ({ enrollment, due: enrollmentDue(enrollment) }))
        .filter((item): item is { enrollment: AnimalVaccinationEnrollment; due: EnrollmentDue } =>
          Boolean(item.due),
        )
        .sort((a, b) => a.due.dueDate.getTime() - b.due.dueDate.getTime()),
    [enrollments],
  );
  const completed = enrollments.filter((e) => e.status === 'completed');

  if (deceased) {
    return (
      <p className="p-4 rounded-2xl bg-danger-bg text-danger-text text-sm">
        This animal is recorded as deceased, so it can't be vaccinated.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {dueItems.length > 0 && (
        <section aria-labelledby="due-heading" className="space-y-3">
          <h2 id="due-heading" className="px-1 text-sm font-semibold text-ink">
            Which vaccination are you giving?
          </h2>
          <ul className="space-y-2">
            {dueItems.map(({ enrollment, due }) => (
              <li key={enrollment.id}>
                <button
                  type="button"
                  onClick={() => onPick(enrollment.id)}
                  className="w-full flex items-center gap-3 p-4 min-h-[76px] bg-card border border-border rounded-2xl text-left hover:border-brand-border active:bg-bg"
                >
                  <span
                    aria-hidden
                    className="w-10 h-10 shrink-0 rounded-full bg-brand-bg text-brand-text flex items-center justify-center"
                  >
                    <Syringe size={18} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink truncate">
                        {enrollment.protocol.disease.name}
                      </span>
                      <DueBadge status={due.status} />
                    </span>
                    <span className="block text-sm text-ink">{due.label}</span>
                    <span className="block text-xs text-ink-secondary truncate">
                      {enrollment.protocol.name}
                    </span>
                  </span>
                  <ChevronRight size={20} className="text-ink-secondary shrink-0" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <EnrollSection
        animal={animal}
        enrollments={enrollments}
        prominent={dueItems.length === 0}
        onEnrolled={onEnrolled}
      />

      {completed.length > 0 && (
        <section aria-labelledby="completed-heading" className="space-y-2">
          <h2 id="completed-heading" className="px-1 text-sm font-semibold text-ink-secondary">
            Completed
          </h2>
          <ul className="space-y-1">
            {completed.map((e) => (
              <li key={e.id} className="flex items-center gap-2 px-1 text-sm text-ink-secondary">
                <CheckCircle2 size={16} className="text-success-text shrink-0" aria-hidden />
                <span className="truncate">
                  {e.protocol.disease.name} · {e.protocol.name}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function EnrollSection({
  animal,
  enrollments,
  prominent,
  onEnrolled,
}: {
  animal: AnimalSummary;
  enrollments: AnimalVaccinationEnrollment[];
  prominent: boolean;
  onEnrolled: (enrollment: AnimalVaccinationEnrollment) => void;
}) {
  const [protocols, setProtocols] = useState<VaccinationProtocol[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [open, setOpen] = useState(prominent);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || protocols) return;
    let cancelled = false;
    vaccinationApi
      .getProtocols({ speciesId: animal.speciesId, isActive: true })
      .then((data) => {
        if (!cancelled) setProtocols(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, protocols, animal.speciesId]);

  const byProtocol = useMemo(
    () => new Map(enrollments.map((e) => [e.protocolId, e])),
    [enrollments],
  );
  const options = useMemo(
    () =>
      (protocols ?? []).filter((p) => {
        const status = byProtocol.get(p.id)?.status;
        return status !== 'active' && status !== 'completed';
      }),
    [protocols, byProtocol],
  );

  // Only one choice: open it straight away (once, so it can still be collapsed)
  const autoExpanded = useRef(false);
  useEffect(() => {
    if (autoExpanded.current || !protocols) return;
    autoExpanded.current = true;
    if (prominent && options.length === 1) setExpandedId(options[0].id);
  }, [protocols, prominent, options]);

  const enroll = async (protocol: VaccinationProtocol) => {
    try {
      setEnrollingId(protocol.id);
      setEnrollError(null);
      const enrollment = await vaccinationApi.enrollAnimal({
        animalId: animal.id,
        protocolId: protocol.id,
      });
      onEnrolled(enrollment);
    } catch (err) {
      setEnrollError(err instanceof ApiError || err instanceof Error ? err.message : 'Could not enroll');
      setEnrollingId(null);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-brand-text rounded-2xl border border-dashed border-border hover:border-brand-border"
      >
        <Plus size={16} aria-hidden /> Start another protocol
      </button>
    );
  }

  return (
    <section aria-labelledby="enroll-heading" className="space-y-3">
      <div className="px-1">
        <h2 id="enroll-heading" className="text-sm font-semibold text-ink">
          {prominent ? 'Not on a vaccination protocol yet' : 'Start another protocol'}
        </h2>
        {prominent && (
          <p className="text-sm text-ink-secondary mt-0.5">
            Pick one to enroll {animal.tagNumber} and record the first dose.
          </p>
        )}
      </div>

      {enrollError && (
        <p role="alert" className="p-3 text-sm rounded-xl bg-danger-bg text-danger-text">
          {enrollError}
        </p>
      )}

      {loadError ? (
        <p className="px-1 text-sm text-danger-text">Couldn't load protocols. Try again later.</p>
      ) : protocols === null ? (
        <div className="space-y-2" aria-hidden>
          {[0, 1].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : options.length === 0 ? (
        <p className="px-4 py-5 text-sm text-ink-secondary bg-card border border-border rounded-2xl text-center">
          No other active protocols for {animal.speciesName || 'this species'}. A vet can create one
          in Vaccination protocols.
        </p>
      ) : (
        <ul className="space-y-2">
          {options.map((protocol) => {
            const expanded = expandedId === protocol.id;
            const steps = stepsFromDoses(protocol.doses);
            const previous = byProtocol.get(protocol.id);
            const resuming = previous?.status === 'discontinued';
            const firstLabel = resuming
              ? doseLabel(protocol.doses, previous.currentDose + 1).toLowerCase()
              : 'dose 1';
            return (
              <li key={protocol.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : protocol.id)}
                  aria-expanded={expanded}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-bg"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-ink">{protocol.disease.name}</span>
                    <span className="block text-sm text-ink-secondary truncate">{protocol.name}</span>
                    <span className="block text-xs text-ink-secondary mt-0.5">
                      {describeSteps(steps)}
                    </span>
                  </span>
                  <ChevronDown
                    size={20}
                    aria-hidden
                    className={`text-ink-secondary shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
                  />
                </button>
                {expanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                    {resuming && (
                      <p className="text-sm text-warning-text bg-warning-bg rounded-xl p-3">
                        Stopped earlier
                        {previous.currentDose > 0
                          ? ` after ${doseLabel(protocol.doses, previous.currentDose).toLowerCase()}`
                          : ''}
                        {previous.discontinuedReason ? ` — ${previous.discontinuedReason}` : ''}.
                        Resuming continues from {firstLabel}.
                      </p>
                    )}
                    <ScheduleTimeline steps={steps} startDate={new Date()} />
                    <button
                      type="button"
                      onClick={() => enroll(protocol)}
                      disabled={enrollingId !== null}
                      className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-brand text-on-brand font-semibold hover:bg-brand-hover disabled:opacity-60"
                    >
                      {enrollingId === protocol.id ? (
                        <Loader size={18} className="animate-spin" aria-hidden />
                      ) : (
                        <Syringe size={18} aria-hidden />
                      )}
                      {resuming ? 'Resume' : 'Enroll'} and record {firstLabel}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
