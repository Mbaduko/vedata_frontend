import { forwardRef, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CalendarClock,
  Check,
  ChevronDown,
  Info,
  Loader,
  MapPin,
  MapPinOff,
  RefreshCw,
} from 'lucide-react';
import {
  ApiError,
  vaccinationApi,
  type AnimalVaccinationEnrollment,
  type Vaccination,
} from '../../services/api';
import { formatShortDate } from '../../utils/protocolSchedule';
import {
  daysBetween,
  doseNoun,
  formatRelativeDays,
  fromDateInput,
  nextDueAfter,
  recentBatches,
  rememberBatch,
  toDateInput,
  type EnrollmentDue,
} from '../../utils/vaccinationRecord';
import { DueBadge } from './AnimalHeader';
import { useLiveLocation, WEAK_ACCURACY_M, type GeoFix, type GeoStatus } from './useLiveLocation';

export interface RecordResult {
  vaccination: Vaccination;
  enrollment: AnimalVaccinationEnrollment;
  doseLabel: string;
  vaccineName: string;
  batch: string;
  dateGiven: Date;
  next: { date: Date; label: string } | null;
  location: GeoFix;
}

interface DoseFormProps {
  enrollment: AnimalVaccinationEnrollment;
  due: EnrollmentDue;
  onRecorded: (result: RecordResult) => void;
  onReload: () => void;
  /** Go back to pick a different protocol/dose for this animal. */
  onChangeVaccination: () => void;
}

type DateChoice = 'today' | 'yesterday' | 'other';
type Field = 'vaccine' | 'batch' | 'date' | 'location';

const NOTE_SUGGESTIONS = ['No reaction', 'Mild swelling at site', 'Animal was stressed', 'Owner told next date'];

/** A batch typed within this window is pre-filled — the same vial is likely still in use. */
const BATCH_REUSE_MS = 24 * 60 * 60 * 1000;

/** Step 3 — the vaccination itself. Built for one-handed use on a phone. */
export default function DoseForm({
  enrollment,
  due,
  onRecorded,
  onReload,
  onChangeVaccination,
}: DoseFormProps) {
  const vaccines = useMemo(
    () => due.definition.allowedVaccines.map((av) => av.vaccine),
    [due.definition],
  );
  const doses = enrollment.protocol.doses;
  const today = useMemo(() => new Date(), []);
  const todayValue = toDateInput(today);
  const yesterdayValue = toDateInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1));
  const lastDose = [...(enrollment.vaccinations ?? [])].sort((a, b) => b.doseNumber - a.doseNumber)[0];
  const minDateValue = due.previousDate ? toDateInput(due.previousDate) : undefined;

  // Pre-select: the only vaccine, or the one most recently used on this device.
  const initialVaccineId = useMemo(() => {
    if (vaccines.length === 1) return vaccines[0].id;
    const ranked = vaccines
      .map((v) => ({ id: v.id, at: recentBatches(v.id)[0]?.at ?? 0 }))
      .filter((v) => v.at > 0)
      .sort((a, b) => b.at - a.at);
    return ranked[0]?.id ?? '';
  }, [vaccines]);

  const freshBatchFor = (vaccineId: string) => {
    const latest = vaccineId ? recentBatches(vaccineId)[0] : undefined;
    return latest && Date.now() - latest.at < BATCH_REUSE_MS ? latest.batch : '';
  };

  const [vaccineId, setVaccineId] = useState(initialVaccineId);
  const [batch, setBatch] = useState(() => freshBatchFor(initialVaccineId));
  const [batchPrefilled, setBatchPrefilled] = useState(() => Boolean(freshBatchFor(initialVaccineId)));
  const [dateChoice, setDateChoice] = useState<DateChoice>('today');
  const [otherDate, setOtherDate] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const { fix: location, status: locationStatus, retry: retryLocation } = useLiveLocation();
  /** Save was tapped before the first GPS fix — submit as soon as it lands. */
  const [waitingForLocation, setWaitingForLocation] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{ message: string; stale: boolean } | null>(null);

  const fieldRefs = {
    vaccine: useRef<HTMLFieldSetElement>(null),
    batch: useRef<HTMLInputElement>(null),
    date: useRef<HTMLFieldSetElement>(null),
    location: useRef<HTMLDivElement>(null),
  };
  const submittingRef = useRef(false);

  const dateValue =
    dateChoice === 'today' ? todayValue : dateChoice === 'yesterday' ? yesterdayValue : otherDate;
  const dateGiven = dateValue ? fromDateInput(dateValue) : null;
  const selectedVaccine = vaccines.find((v) => v.id === vaccineId);
  const batchOptions = vaccineId ? recentBatches(vaccineId) : [];

  const errors: Partial<Record<Field, string>> = {};
  if (!vaccineId) errors.vaccine = 'Choose the vaccine you used';
  if (!batch.trim()) errors.batch = 'Enter the batch number printed on the vial';
  if (!dateValue) errors.date = 'Pick the date it was given';
  else if (dateValue > todayValue) errors.date = "The date can't be in the future";
  else if (minDateValue && dateValue < minDateValue)
    errors.date = `Can't be before the previous dose (${formatShortDate(due.previousDate!)})`;
  // Only hard failures block outright; while searching, Save waits for the fix
  if (!location && (locationStatus === 'denied' || locationStatus === 'unsupported' || locationStatus === 'insecure'))
    errors.location = LOCATION_ERRORS[locationStatus];

  const next = dateGiven ? nextDueAfter(doses, due.doseNumber, dateGiven) : null;
  const daysEarly = dateGiven && due.doseNumber > 1 ? daysBetween(dateGiven, due.dueDate) : 0;

  // Keep focused/scrolled-to fields clear of the sticky header and save bar —
  // otherwise a tap near the bottom edge lands on "Save" instead.
  useEffect(() => {
    const root = document.documentElement.style;
    root.scrollPaddingTop = '80px';
    root.scrollPaddingBottom = '140px';
    return () => {
      root.scrollPaddingTop = '';
      root.scrollPaddingBottom = '';
    };
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────
  const chooseVaccine = (id: string) => {
    setVaccineId(id);
    // Swap in that vaccine's batch unless the person typed their own
    if (!batch.trim() || batchPrefilled) {
      const fresh = freshBatchFor(id);
      setBatch(fresh);
      setBatchPrefilled(Boolean(fresh));
    }
  };

  const addNote = (text: string) => {
    setNotes((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return text;
      return `${trimmed}${/[.!?]$/.test(trimmed) ? '' : '.'} ${text}`;
    });
  };

  const revealError = (field: Field) => {
    setShowErrors(true);
    fieldRefs[field].current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (field === 'batch') fieldRefs.batch.current?.focus({ preventScroll: true });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || waitingForLocation) return;

    const firstError = (['vaccine', 'batch', 'date', 'location'] as Field[]).find((f) => errors[f]);
    if (firstError) {
      revealError(firstError);
      return;
    }
    if (!location) {
      // Still getting a fix: hold the save and send it the moment one arrives
      setWaitingForLocation(true);
      return;
    }
    void save(location);
  };

  const save = async (fix: GeoFix) => {
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const vaccination = await vaccinationApi.recordVaccination({
        animalVaccinationId: enrollment.id,
        vaccineId,
        doseNumber: due.doseNumber,
        batchNumber: batch.trim(),
        dateAdministered: dateValue,
        notes: notes.trim() || undefined,
        gpsLat: fix.lat,
        gpsLng: fix.lng,
      });
      rememberBatch(vaccineId, batch.trim());
      onRecorded({
        vaccination,
        enrollment,
        doseLabel: due.label,
        vaccineName: selectedVaccine?.name ?? '',
        batch: batch.trim(),
        dateGiven: dateGiven!,
        next,
        location: fix,
      });
    } catch (err) {
      const status = err instanceof ApiError ? err.statusCode : -1;
      const message =
        status === 0
          ? "Couldn't reach the server. Your entries are kept — check the connection and try again."
          : err instanceof Error
            ? err.message
            : 'Could not save the vaccination';
      // "Expected dose N" means someone recorded this dose in the meantime
      setSubmitError({ message, stale: /expected dose/i.test(message) });
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // Finish a save that was waiting on GPS (or explain why it can't)
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (!waitingForLocation) return;
    if (location) {
      setWaitingForLocation(false);
      void saveRef.current(location);
      return;
    }
    // "Unavailable" is often transient (cold GPS start) and the watch keeps
    // trying, so only a hard failure ends the wait early.
    const hardFailure =
      locationStatus === 'denied' || locationStatus === 'unsupported' || locationStatus === 'insecure';
    if (hardFailure) {
      setWaitingForLocation(false);
      revealError('location');
      return;
    }
    const giveUp = setTimeout(() => {
      setWaitingForLocation(false);
      revealError('location');
    }, 30_000);
    return () => clearTimeout(giveUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingForLocation, location, locationStatus]);

  const fieldError = (field: Field) =>
    showErrors && errors[field] ? (
      <p id={`${field}-error`} className="mt-2 flex items-center gap-1.5 text-sm text-danger-text">
        <AlertCircle size={14} aria-hidden className="shrink-0" />
        {errors[field]}
      </p>
    ) : null;

  const actionLabel = `Save ${doseNoun(doses, due.doseNumber)}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* What's being given */}
      <div className="p-4 bg-card border border-border rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-ink-secondary">
              {enrollment.protocol.disease.name}
            </p>
            <p className="text-xl font-display font-semibold text-ink">{due.label}</p>
            <p className="text-sm text-ink-secondary truncate">{enrollment.protocol.name}</p>
          </div>
          <DueBadge status={due.status} className="mt-1" />
        </div>
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-3">
          <p className="text-sm text-ink-secondary min-w-0 truncate">
            {lastDose
              ? `Last dose ${formatShortDate(new Date(lastDose.dateAdministered))}${
                  lastDose.vaccine?.name ? ` · ${lastDose.vaccine.name}` : ''
                }`
              : 'First dose of this protocol'}
          </p>
          <button
            type="button"
            onClick={onChangeVaccination}
            className="shrink-0 min-h-[40px] -my-2 px-2 rounded-lg text-sm font-medium text-brand-text hover:bg-bg"
          >
            Change
          </button>
        </div>
      </div>

      {/* Vaccine */}
      <fieldset
        ref={fieldRefs.vaccine}
        className="p-4 bg-card border border-border rounded-2xl scroll-mt-24"
        aria-describedby={showErrors && errors.vaccine ? 'vaccine-error' : undefined}
      >
        <legend className="sr-only">Vaccine used</legend>
        <p aria-hidden className="text-sm font-semibold text-ink mb-3">
          Vaccine used
        </p>
        {vaccines.length === 0 ? (
          <p className="text-sm text-danger-text">
            No vaccine is set up for this dose. Ask a vet to update the protocol.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {vaccines.map((vaccine) => {
              const checked = vaccine.id === vaccineId;
              return (
                <label
                  key={vaccine.id}
                  className={`relative flex items-center gap-3 min-h-[56px] px-4 py-3 rounded-xl border cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40 ${
                    checked
                      ? 'border-brand bg-brand-bg'
                      : showErrors && errors.vaccine
                        ? 'border-danger-border bg-card'
                        : 'border-border bg-card hover:border-brand-border'
                  }`}
                >
                  <input
                    type="radio"
                    name="vaccine"
                    value={vaccine.id}
                    checked={checked}
                    onChange={() => chooseVaccine(vaccine.id)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center ${
                      checked ? 'border-brand bg-brand' : 'border-border'
                    }`}
                  >
                    {checked && <Check size={12} strokeWidth={3} className="text-on-brand" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium text-ink">{vaccine.name}</span>
                    {vaccine.manufacturer && (
                      <span className="block text-xs text-ink-secondary">{vaccine.manufacturer}</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        )}
        {fieldError('vaccine')}
      </fieldset>

      {/* Batch */}
      <div className="p-4 bg-card border border-border rounded-2xl">
        <label htmlFor="batch" className="block text-sm font-semibold text-ink mb-2">
          Batch number
        </label>
        <input
          ref={fieldRefs.batch}
          id="batch"
          type="text"
          value={batch}
          onChange={(e) => {
            setBatch(e.target.value.toUpperCase());
            setBatchPrefilled(false);
          }}
          placeholder="As printed on the vial"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="done"
          aria-invalid={showErrors && Boolean(errors.batch)}
          aria-describedby={showErrors && errors.batch ? 'batch-error' : 'batch-hint'}
          className={`w-full h-12 px-4 bg-bg border rounded-xl text-base text-ink tracking-wide placeholder:tracking-normal placeholder:text-ink-secondary focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand scroll-mt-24 ${
            showErrors && errors.batch ? 'border-danger-border' : 'border-border'
          }`}
        />
        {batchPrefilled && batch && !(showErrors && errors.batch) && (
          <p id="batch-hint" className="mt-2 text-xs text-ink-secondary">
            Same as your last {selectedVaccine?.name ?? ''} vaccination — change it if you opened a new
            vial.
          </p>
        )}
        {batchOptions.length > 0 && (
          <div className="mt-3 flex gap-2 flex-wrap" aria-label="Recent batches">
            {batchOptions
              .filter((b) => b.batch !== batch)
              .map((b) => (
                <button
                  key={b.batch}
                  type="button"
                  onClick={() => {
                    setBatch(b.batch);
                    setBatchPrefilled(false);
                  }}
                  className="min-h-[36px] px-3 rounded-lg border border-border bg-bg text-sm text-ink hover:border-brand-border"
                >
                  {b.batch}
                  <span className="ml-1.5 text-xs text-ink-secondary">
                    {formatRelativeDays(daysBetween(new Date(), new Date(b.at)))}
                  </span>
                </button>
              ))}
          </div>
        )}
        {fieldError('batch')}
      </div>

      {/* Date */}
      <fieldset ref={fieldRefs.date} className="p-4 bg-card border border-border rounded-2xl scroll-mt-24">
        <legend className="sr-only">Date given</legend>
        <p aria-hidden className="text-sm font-semibold text-ink mb-3">
          Date given
        </p>
        <div className="grid grid-cols-3 gap-1 p-1 bg-bg rounded-xl" role="radiogroup" aria-label="Date given">
          {(
            [
              ['today', 'Today'],
              ['yesterday', 'Yesterday'],
              ['other', 'Other date'],
            ] as const
          ).map(([value, label]) => {
            const disabled = value === 'yesterday' && Boolean(minDateValue && yesterdayValue < minDateValue);
            const active = dateChoice === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled}
                onClick={() => {
                  setDateChoice(value);
                  if (value === 'other' && !otherDate) setOtherDate(yesterdayValue);
                }}
                className={`h-11 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${
                  active ? 'bg-card text-ink shadow-sm' : 'text-ink-secondary hover:text-ink'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {dateChoice === 'other' && (
          <input
            type="date"
            aria-label="Date given"
            value={otherDate}
            min={minDateValue}
            max={todayValue}
            onChange={(e) => setOtherDate(e.target.value)}
            className="mt-3 w-full h-12 px-4 bg-bg border border-border rounded-xl text-base text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        )}
        {fieldError('date')}
        {!errors.date && daysEarly > 0 && (
          <p className="mt-3 flex gap-2 p-3 rounded-xl bg-warning-bg text-sm text-warning-text">
            <Info size={16} aria-hidden className="shrink-0 mt-0.5" />
            <span>
              This is {daysEarly} day{daysEarly === 1 ? '' : 's'} before it's due (
              {formatShortDate(due.dueDate)}). That's fine if intended — the next dose is counted from
              the day it's given.
            </span>
          </p>
        )}
      </fieldset>

      {/* Location — required, captured automatically */}
      <LocationField
        ref={fieldRefs.location}
        fix={location}
        status={locationStatus}
        onRetry={retryLocation}
        error={showErrors ? errors.location : undefined}
      />

      {/* Notes (optional) */}
      <div className="bg-card border border-border rounded-2xl">
        <div className="p-4">
          {notesOpen || notes ? (
            <>
              <label htmlFor="notes" className="block text-sm font-semibold text-ink mb-2">
                Notes <span className="font-normal text-ink-secondary">(optional)</span>
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                autoFocus={notesOpen && !notes}
                placeholder="Reactions, observations, follow-ups…"
                className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-base text-ink placeholder:text-ink-secondary focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
              <div className="mt-2 flex gap-2 flex-wrap">
                {NOTE_SUGGESTIONS.filter((n) => !notes.includes(n)).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => addNote(n)}
                    className="min-h-[36px] px-3 rounded-full border border-border bg-bg text-sm text-ink-secondary hover:text-ink hover:border-brand-border"
                  >
                    + {n}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setNotesOpen(true)}
              className="w-full flex items-center justify-between min-h-[44px] text-sm font-medium text-ink"
            >
              Add a note
              <ChevronDown size={18} aria-hidden className="text-ink-secondary" />
            </button>
          )}
        </div>

      </div>

      {/* What happens next */}
      {dateGiven && !errors.date && (
        <div className="flex gap-3 p-4 rounded-2xl bg-info-bg border border-info-border text-info-text">
          <CalendarClock size={20} aria-hidden className="shrink-0 mt-0.5" />
          <p className="text-sm">
            {next ? (
              <>
                After saving, <strong className="font-semibold">{next.label.toLowerCase()}</strong> will
                be due on <strong className="font-semibold">{formatShortDate(next.date)}</strong> (
                {formatRelativeDays(daysBetween(today, next.date))}).
              </>
            ) : (
              <>This is the last dose — the protocol will be marked complete.</>
            )}
          </p>
        </div>
      )}

      {/* Sticky action bar — within thumb reach on phones */}
      <div className="sticky bottom-0 z-10 -mx-4 sm:mx-0 px-4 sm:px-0 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-bg/95 backdrop-blur-sm border-t border-border sm:border-0">
        {submitError && (
          <div role="alert" className="mb-3 flex items-start gap-2 p-3 rounded-xl bg-danger-bg text-danger-text text-sm">
            <AlertCircle size={16} aria-hidden className="shrink-0 mt-0.5" />
            <span className="flex-1">{submitError.message}</span>
            {submitError.stale && (
              <button
                type="button"
                onClick={onReload}
                className="inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline"
              >
                <RefreshCw size={14} aria-hidden /> Reload
              </button>
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting || waitingForLocation || vaccines.length === 0}
          className="w-full h-14 flex items-center justify-center gap-2 rounded-2xl bg-brand text-on-brand text-base font-semibold shadow-md hover:bg-brand-hover active:scale-[0.99] transition disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader size={20} className="animate-spin" aria-hidden /> Saving…
            </>
          ) : waitingForLocation ? (
            <>
              <Loader size={20} className="animate-spin" aria-hidden /> Getting location…
            </>
          ) : (
            <>
              <Check size={20} aria-hidden /> {actionLabel}
            </>
          )}
        </button>
        {selectedVaccine && batch.trim() && dateGiven && !errors.date && (
          <p className="mt-2 text-center text-xs text-ink-secondary truncate">
            {selectedVaccine.name} · Batch {batch.trim()} ·{' '}
            {dateChoice === 'other' ? formatShortDate(dateGiven) : dateChoice === 'today' ? 'Today' : 'Yesterday'}
            {location ? ` · ±${location.accuracy} m` : ''}
          </p>
        )}
      </div>
    </form>
  );
}

const LOCATION_ERRORS: Record<GeoStatus, string> = {
  locating: '',
  ready: '',
  denied: 'Location access is blocked. Allow location for this site, then tap Try again.',
  unavailable: "Couldn't get a GPS fix. Move to open sky or turn on location, then tap Try again.",
  unsupported: "This device can't share its location, so vaccinations can't be recorded on it.",
  insecure: 'Location only works over a secure (https) connection. Ask your admin to fix the app link.',
};

interface LocationFieldProps {
  fix: GeoFix | null;
  status: GeoStatus;
  onRetry: () => void;
  error?: string;
}

/** Shows the live GPS fix that will be saved with the record. */
const LocationField = forwardRef<HTMLDivElement, LocationFieldProps>(function LocationField(
  { fix, status, onRetry, error },
  ref,
) {
  const failed = !fix && status !== 'locating';
  const canRetry = status === 'denied' || status === 'unavailable';
  const weak = fix && fix.accuracy > WEAK_ACCURACY_M;

  return (
    <div
      ref={ref}
      aria-live="polite"
      className={`p-4 bg-card border rounded-2xl ${
        error ? 'border-danger-border' : failed ? 'border-warning-border' : 'border-border'
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${
            fix
              ? 'bg-success-bg text-success-text'
              : failed
                ? 'bg-warning-bg text-warning-text'
                : 'bg-muted-bg text-ink-secondary'
          }`}
        >
          {fix ? (
            <MapPin size={18} />
          ) : failed ? (
            <MapPinOff size={18} />
          ) : (
            <Loader size={18} className="animate-spin" />
          )}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink">
            {fix ? 'Location captured' : failed ? 'Location needed' : 'Getting your location…'}
          </p>
          <p className="text-xs text-ink-secondary">
            {fix
              ? `Accurate to about ${fix.accuracy} m · saved with this record`
              : failed
                ? 'Required to save — it shows where the vaccine was given'
                : 'Saved with the record to show where the vaccine was given'}
          </p>
        </div>
        {canRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 min-h-[44px] px-4 rounded-xl border border-border text-sm font-medium text-ink hover:border-brand-border"
          >
            Try again
          </button>
        )}
      </div>
      {weak && (
        <p className="mt-3 text-xs text-warning-text">
          Weak signal — the location will still be saved, but moving outside improves it.
        </p>
      )}
      {failed && (
        <p
          id="location-error"
          className={`mt-3 flex items-start gap-1.5 text-sm ${error ? 'text-danger-text' : 'text-warning-text'}`}
        >
          <AlertCircle size={14} aria-hidden className="shrink-0 mt-0.5" />
          {LOCATION_ERRORS[status]}
        </p>
      )}
    </div>
  );
});
