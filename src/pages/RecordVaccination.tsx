import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, MapPinOff, Search } from 'lucide-react';
import {
  animalApi,
  vaccinationApi,
  type Animal,
  type AnimalVaccinationEnrollment,
  type DueVaccination,
} from '../services/api';
import AnimalFinder from '../components/record/AnimalFinder';
import AnimalHeader from '../components/record/AnimalHeader';
import EnrollmentChooser from '../components/record/EnrollmentChooser';
import DoseForm, { type RecordResult } from '../components/record/DoseForm';
import RecordSuccess from '../components/record/RecordSuccess';
import {
  canWorkInZone,
  enrollmentDue,
  rememberAnimal,
  summarizeAnimal,
  type EnrollmentDue,
  type ZoneAccess,
} from '../utils/vaccinationRecord';

const STEPS = ['Find animal', 'Choose vaccination', 'Record dose'] as const;

interface Loaded {
  animalId: string;
  animal: Animal | null;
  enrollments: AnimalVaccinationEnrollment[];
  error: string | null;
}

/**
 * Record a vaccination: find animal → choose what's due → record → done.
 * Every step lives in the URL (?animalId, ?enrollmentId) so the phone's
 * back button steps back through the flow instead of leaving it.
 */
export default function RecordVaccination() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const animalId = params.get('animalId');
  const enrollmentId = params.get('enrollmentId');
  const auto = params.get('auto') === '1';
  const from = params.get('from');

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<RecordResult | null>(null);
  const [zoneAccess, setZoneAccess] = useState<ZoneAccess>(null);

  // Which zones this user can vaccinate in, so out-of-zone animals are
  // explained up front instead of failing on the final tap.
  useEffect(() => {
    vaccinationApi
      .getMyVaccinationZones()
      .then(setZoneAccess)
      .catch(() => setZoneAccess(null));
  }, []);

  // Leaving the success screen (back button, picking another dose) clears it
  useEffect(() => setResult(null), [animalId, enrollmentId]);

  useEffect(() => {
    if (!animalId) return;
    let cancelled = false;
    Promise.allSettled([
      animalApi.getAnimal(animalId),
      vaccinationApi.getAnimalEnrollments(animalId),
    ]).then(([animalRes, enrollmentsRes]) => {
      if (cancelled) return;
      const animal = animalRes.status === 'fulfilled' ? animalRes.value : null;
      const enrollments = enrollmentsRes.status === 'fulfilled' ? enrollmentsRes.value : [];
      const error =
        enrollmentsRes.status === 'rejected'
          ? "Couldn't load this animal's vaccinations. Check your connection and try again."
          : !animal && enrollments.length === 0
            ? "This animal wasn't found, or it's outside your zones."
            : null;
      setLoaded({ animalId, animal, enrollments, error });
    });
    return () => {
      cancelled = true;
    };
  }, [animalId, reloadKey]);

  // Only trust data loaded for the animal in the URL
  const data = loaded && loaded.animalId === animalId ? loaded : null;
  const summary = data ? summarizeAnimal(data.animal, data.enrollments[0]) : null;

  const dueItems = useMemo(
    () =>
      (data?.enrollments ?? [])
        .map((enrollment) => ({ enrollment, due: enrollmentDue(enrollment) }))
        .filter((i): i is { enrollment: AnimalVaccinationEnrollment; due: EnrollmentDue } =>
          Boolean(i.due),
        )
        .sort((a, b) => a.due.dueDate.getTime() - b.due.dueDate.getTime()),
    [data?.enrollments],
  );

  // ─── Navigation ────────────────────────────────────────────────
  const go = (next: { animalId?: string; enrollmentId?: string; auto?: boolean }, replace = false) => {
    const p = new URLSearchParams();
    if (next.animalId) p.set('animalId', next.animalId);
    if (next.enrollmentId) p.set('enrollmentId', next.enrollmentId);
    if (next.auto) p.set('auto', '1');
    if (from) p.set('from', from);
    setParams(p, { replace });
  };

  const exitPath = from === 'due' ? '/vaccinations/due' : '/vaccinations';

  const goBack = () => {
    // Same as the device back button when there's history inside the app
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else if (enrollmentId && animalId) go({ animalId });
    else if (animalId) go({});
    else navigate(exitPath);
  };

  // Picked from search with exactly one dose waiting → skip straight to it
  useEffect(() => {
    if (!auto || !data || data.error || !animalId) return;
    const canActHere = summary ? canWorkInZone(zoneAccess, summary.zoneId) : true;
    if (dueItems.length === 1 && canActHere) go({ animalId, enrollmentId: dueItems[0].enrollment.id }, true);
    else go({ animalId }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, data, dueItems]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [animalId, enrollmentId]);

  // ─── Stage ─────────────────────────────────────────────────────
  const enrollment = enrollmentId
    ? data?.enrollments.find((e) => e.id === enrollmentId)
    : undefined;
  const due = enrollment ? enrollmentDue(enrollment) : null;

  const stage: 'find' | 'loading' | 'error' | 'choose' | 'form' | 'done' | 'missing' = !animalId
    ? 'find'
    : !data || auto
      ? 'loading'
      : data.error || !summary
        ? 'error'
        : result && result.enrollment.id === enrollmentId
          ? 'done'
          : !enrollmentId
            ? 'choose'
            : enrollment && due
              ? 'form'
              : 'missing';

  const canAct = summary ? canWorkInZone(zoneAccess, summary.zoneId) : true;

  const stepIndex = stage === 'find' ? 0 : stage === 'form' ? 2 : 1;

  return (
    <div className="max-w-xl mx-auto">
      {stage !== 'done' && (
        <header className="mb-5">
          <div className="flex items-center gap-2 -ml-2">
            <button
              type="button"
              onClick={goBack}
              aria-label="Back"
              className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl text-ink-secondary hover:text-ink hover:bg-card"
            >
              <ArrowLeft size={22} />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-display font-semibold text-ink leading-tight">
                Record vaccination
              </h1>
              <p className="text-sm text-ink-secondary">
                Step {stepIndex + 1} of 3 · {STEPS[stepIndex]}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5" aria-hidden>
            {STEPS.map((label, i) => (
              <span
                key={label}
                className={`h-1 rounded-full transition-colors ${i <= stepIndex ? 'bg-brand' : 'bg-border'}`}
              />
            ))}
          </div>
        </header>
      )}

      {stage === 'find' && (
        <AnimalFinder
          zoneAccess={zoneAccess}
          onPickAnimal={(id) => go({ animalId: id, auto: true })}
          onPickDue={(row: DueVaccination) => go({ animalId: row.animal.id, enrollmentId: row.id })}
        />
      )}

      {stage === 'loading' && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading">
          <div className="h-[92px] rounded-2xl bg-card border border-border animate-pulse" />
          <div className="h-[76px] rounded-2xl bg-card border border-border animate-pulse" />
          <div className="h-[76px] rounded-2xl bg-card border border-border animate-pulse" />
        </div>
      )}

      {stage === 'error' && (
        <div className="p-6 bg-card border border-border rounded-2xl text-center space-y-4">
          <AlertCircle size={28} className="mx-auto text-danger-text" aria-hidden />
          <p className="text-ink">{data?.error ?? "This animal couldn't be loaded."}</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="h-11 px-5 rounded-xl border border-border text-sm font-medium text-ink hover:bg-bg"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => go({})}
              className="h-11 px-5 rounded-xl bg-brand text-on-brand text-sm font-semibold hover:bg-brand-hover inline-flex items-center justify-center gap-2"
            >
              <Search size={16} aria-hidden /> Search for an animal
            </button>
          </div>
        </div>
      )}

      {summary && (stage === 'choose' || stage === 'form' || stage === 'missing') && (
        <div className="mb-4">
          <AnimalHeader
            animal={summary}
            action={
              <button
                type="button"
                onClick={() => go({})}
                className="min-h-[44px] px-3 rounded-xl text-sm font-medium text-brand-text hover:bg-bg"
              >
                Change
              </button>
            }
          />
        </div>
      )}

      {summary && !canAct && (stage === 'choose' || stage === 'form') && (
        <div className="p-5 bg-card border border-warning-border rounded-2xl space-y-3">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 shrink-0 rounded-full bg-warning-bg text-warning-text flex items-center justify-center">
              <MapPinOff size={18} aria-hidden />
            </span>
            <div>
              <h2 className="font-semibold text-ink">Outside your zones</h2>
              <p className="text-sm text-ink-secondary mt-1">
                {summary.tagNumber} is registered in{' '}
                <strong className="text-ink font-medium">{summary.zoneName ?? 'another zone'}</strong>,
                which isn't one of your zones, so you can't enroll or vaccinate it here.
              </p>
              <p className="text-sm text-ink-secondary mt-2">
                Ask an admin or the zone's lead vet to add you to{' '}
                {summary.zoneName ?? 'that zone'}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => go({})}
            className="w-full h-11 rounded-xl border border-border text-sm font-medium text-ink hover:bg-bg"
          >
            Find another animal
          </button>
        </div>
      )}

      {stage === 'choose' && canAct && summary && data && (
        <EnrollmentChooser
          animal={summary}
          enrollments={data.enrollments}
          onPick={(id) => go({ animalId: summary.id, enrollmentId: id })}
          onEnrolled={(created) => {
            // Show it immediately, then refresh for the full history
            setLoaded((prev) =>
              prev && {
                ...prev,
                enrollments: [created, ...prev.enrollments.filter((e) => e.id !== created.id)],
              },
            );
            go({ animalId: summary.id, enrollmentId: created.id });
            setReloadKey((k) => k + 1);
          }}
        />
      )}

      {stage === 'form' && canAct && enrollment && due && (
        <DoseForm
            key={`${enrollment.id}:${enrollment.currentDose}`}
            enrollment={enrollment}
            due={due}
            onChangeVaccination={() => go({ animalId: summary!.id })}
            onReload={() => setReloadKey((k) => k + 1)}
            onRecorded={(r) => {
              setResult(r);
              if (summary) rememberAnimal(summary);
              setReloadKey((k) => k + 1);
            }}
          />
      )}

      {stage === 'missing' && (
        <div className="p-6 bg-card border border-border rounded-2xl text-center space-y-4">
          <p className="text-ink">
            {enrollment
              ? 'Nothing is due on this protocol — it has been completed or stopped.'
              : 'That vaccination is no longer open for this animal.'}
          </p>
          <button
            type="button"
            onClick={() => go({ animalId: summary!.id })}
            className="h-11 px-5 rounded-xl bg-brand text-on-brand text-sm font-semibold hover:bg-brand-hover"
          >
            See what's due for {summary!.tagNumber}
          </button>
        </div>
      )}

      {stage === 'done' && result && summary && (
        <RecordSuccess
          result={result}
          animal={summary}
          alsoDue={dueItems.filter(
            (i) => i.enrollment.id !== result.enrollment.id && i.due.status.tone !== 'later',
          )}
          onPickEnrollment={(id) => go({ animalId: summary.id, enrollmentId: id })}
          onRecordAnother={() => go({})}
          secondaryAction={
            from === 'due'
              ? { label: 'Back to due list', onClick: () => navigate('/vaccinations/due') }
              : { label: 'Done', onClick: () => navigate('/vaccinations') }
          }
        />
      )}
    </div>
  );
}
