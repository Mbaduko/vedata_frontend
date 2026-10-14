import type { ProtocolDose, ProtocolDoseInput, Vaccine } from '../services/api';

/**
 * Protocol schedule model shared by the builder, list cards and detail page.
 *
 * The API stores a flat list of doses with "days from previous". People think
 * in a primary series ("3 weeks apart") plus an optional repeating booster, so
 * the builder edits that shape and converts at the boundary. Only the final API
 * dose may recur — the backend advances to the next defined dose first.
 */

// ─── Intervals ──────────────────────────────────────────────────────

export type IntervalUnit = 'days' | 'weeks' | 'months' | 'years';

export interface Interval {
  value: number | '';
  unit: IntervalUnit;
}

const UNIT_DAYS: Record<IntervalUnit, number> = { days: 1, weeks: 7, months: 30, years: 365 };

export const UNIT_LABELS: Record<IntervalUnit, [singular: string, plural: string]> = {
  days: ['day', 'days'],
  weeks: ['week', 'weeks'],
  months: ['month', 'months'],
  years: ['year', 'years'],
};

export const toDays = (interval: Interval): number =>
  interval.value === '' ? 0 : Math.round(interval.value * UNIT_DAYS[interval.unit]);

/** Largest unit that represents the day count exactly, so values round-trip. */
export const fromDays = (days: number): Interval => {
  if (days > 0) {
    for (const unit of ['years', 'months', 'weeks'] as const) {
      if (days % UNIT_DAYS[unit] === 0) return { value: days / UNIT_DAYS[unit], unit };
    }
  }
  return { value: days, unit: 'days' };
};

export const formatDuration = (days: number): string => {
  if (days === 0) return 'same day';
  const { value, unit } = fromDays(days);
  const [one, many] = UNIT_LABELS[unit];
  return `${value} ${value === 1 ? one : many}`;
};

/** "every year", "every 6 months" */
export const formatEvery = (days: number): string => {
  const { value, unit } = fromDays(days);
  return value === 1 ? `every ${UNIT_LABELS[unit][0]}` : `every ${formatDuration(days)}`;
};

export const isValidInterval = (interval: Interval, min = 1): boolean =>
  interval.value !== '' && Number.isInteger(interval.value) && interval.value >= min;

// ─── Builder draft ──────────────────────────────────────────────────

export interface DoseDraft {
  /** Stable identity — array indexes shift when doses are removed. */
  key: string;
  /** Gap after the previous dose; ignored for the first dose. */
  gap: Interval;
  vaccineIds: string[];
}

export interface BoosterDraft {
  enabled: boolean;
  repeatEvery: Interval;
  /** When false the first booster uses `repeatEvery` too. */
  customFirst: boolean;
  firstAfter: Interval;
  vaccineIds: string[];
}

export interface ScheduleDraft {
  doses: DoseDraft[];
  booster: BoosterDraft;
  /** One vaccine list applied to every dose (the common case). */
  sharedVaccines: boolean;
  vaccineIds: string[];
}

let keySeq = 0;
export const newKey = () => `dose-${Date.now().toString(36)}-${(keySeq++).toString(36)}`;

export const newDose = (gap: Interval = { value: 3, unit: 'weeks' }): DoseDraft => ({
  key: newKey(),
  gap,
  vaccineIds: [],
});

const emptyBooster = (): BoosterDraft => ({
  enabled: false,
  repeatEvery: { value: 1, unit: 'years' },
  customFirst: false,
  firstAfter: { value: 1, unit: 'years' },
  vaccineIds: [],
});

export const emptySchedule = (): ScheduleDraft => ({
  doses: [newDose({ value: 0, unit: 'days' })],
  booster: emptyBooster(),
  sharedVaccines: true,
  vaccineIds: [],
});

// ─── Templates ──────────────────────────────────────────────────────

export interface ScheduleTemplate {
  id: string;
  title: string;
  hint: string;
  build: () => ScheduleDraft;
}

const series = (count: number, gap: Interval, boosterEvery?: Interval): ScheduleDraft => {
  const base = emptySchedule();
  return {
    ...base,
    doses: Array.from({ length: count }, (_, i) =>
      newDose(i === 0 ? { value: 0, unit: 'days' } : { ...gap }),
    ),
    booster: boosterEvery
      ? { ...base.booster, enabled: true, repeatEvery: { ...boosterEvery }, firstAfter: { ...boosterEvery } }
      : base.booster,
  };
};

export const SCHEDULE_TEMPLATES: ScheduleTemplate[] = [
  {
    id: 'single-annual',
    title: 'Single dose + yearly booster',
    hint: 'Typical for rabies',
    build: () => series(1, { value: 0, unit: 'days' }, { value: 1, unit: 'years' }),
  },
  {
    id: 'two-annual',
    title: '2 doses + yearly booster',
    hint: '3 weeks apart',
    build: () => series(2, { value: 3, unit: 'weeks' }, { value: 1, unit: 'years' }),
  },
  {
    id: 'three-series',
    title: '3-dose series + yearly booster',
    hint: '4 weeks apart',
    build: () => series(3, { value: 4, unit: 'weeks' }, { value: 1, unit: 'years' }),
  },
  {
    id: 'single',
    title: 'One-off dose',
    hint: 'No booster',
    build: () => series(1, { value: 0, unit: 'days' }),
  },
];

// ─── Conversions ────────────────────────────────────────────────────

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

/** Vaccines that apply to a given dose, honouring the shared toggle. */
export const doseVaccines = (draft: ScheduleDraft, dose: DoseDraft | BoosterDraft): string[] =>
  draft.sharedVaccines ? draft.vaccineIds : dose.vaccineIds;

export const draftToDoses = (draft: ScheduleDraft): ProtocolDoseInput[] => {
  const primary: ProtocolDoseInput[] = draft.doses.map((dose, i) => ({
    doseNumber: i + 1,
    daysFromPrevious: i === 0 ? 0 : toDays(dose.gap),
    isRecurring: false,
    vaccineIds: doseVaccines(draft, dose),
  }));
  if (!draft.booster.enabled) return primary;

  const { booster } = draft;
  return [
    ...primary,
    {
      doseNumber: primary.length + 1,
      daysFromPrevious: toDays(booster.customFirst ? booster.firstAfter : booster.repeatEvery),
      isRecurring: true,
      recurringIntervalDays: toDays(booster.repeatEvery),
      vaccineIds: doseVaccines(draft, booster),
    },
  ];
};

/**
 * Build an editable draft from stored doses. Legacy protocols may flag a
 * single dose as recurring; that is read as "dose, then booster every N",
 * which produces the same due dates.
 */
export const dosesToDraft = (doses: ProtocolDose[]): ScheduleDraft => {
  const sorted = [...doses].sort((a, b) => a.doseNumber - b.doseNumber);
  const last = sorted[sorted.length - 1];
  const hasBooster = Boolean(last?.isRecurring && last.recurringIntervalDays);
  const primary = hasBooster && sorted.length > 1 ? sorted.slice(0, -1) : sorted;
  const ids = (d: ProtocolDose) => d.allowedVaccines.map((av) => av.vaccineId);

  const doseDrafts = primary.map((d, i) => ({
    key: newKey(),
    gap: i === 0 ? { value: 0, unit: 'days' as const } : fromDays(d.daysFromPrevious),
    vaccineIds: ids(d),
  }));

  const booster = emptyBooster();
  if (hasBooster && last) {
    const repeat = fromDays(last.recurringIntervalDays!);
    const first = sorted.length > 1 ? fromDays(last.daysFromPrevious) : repeat;
    Object.assign(booster, {
      enabled: true,
      repeatEvery: repeat,
      firstAfter: first,
      customFirst: toDays(first) !== toDays(repeat),
      vaccineIds: ids(last),
    });
  }

  const allSets = [...doseDrafts.map((d) => d.vaccineIds), ...(booster.enabled ? [booster.vaccineIds] : [])];
  const shared = allSets.every((set) => sameSet(set, allSets[0] ?? []));

  return {
    doses: doseDrafts,
    booster,
    sharedVaccines: shared,
    vaccineIds: shared ? [...(allSets[0] ?? [])] : [],
  };
};

// ─── Validation ─────────────────────────────────────────────────────

export type ScheduleErrors = Record<string, string>;

export const validateSchedule = (draft: ScheduleDraft): ScheduleErrors => {
  const errors: ScheduleErrors = {};

  draft.doses.forEach((dose, i) => {
    if (i > 0 && !isValidInterval(dose.gap)) {
      errors[`gap:${dose.key}`] = 'Enter a whole number of at least 1';
    }
    if (!draft.sharedVaccines && dose.vaccineIds.length === 0) {
      errors[`vaccines:${dose.key}`] = `Pick at least one vaccine for dose ${i + 1}`;
    }
  });

  if (draft.booster.enabled) {
    if (!isValidInterval(draft.booster.repeatEvery)) {
      errors['booster:repeat'] = 'Enter how often the booster repeats';
    }
    if (draft.booster.customFirst && !isValidInterval(draft.booster.firstAfter)) {
      errors['booster:first'] = 'Enter when the first booster is due';
    }
    if (!draft.sharedVaccines && draft.booster.vaccineIds.length === 0) {
      errors['vaccines:booster'] = 'Pick at least one vaccine for the booster';
    }
  }

  if (draft.sharedVaccines && draft.vaccineIds.length === 0) {
    errors['vaccines:shared'] = 'Pick at least one vaccine';
  }

  return errors;
};

// ─── Read-side helpers (timeline + summaries) ───────────────────────

export interface TimelineStep {
  id: string;
  label: string;
  /** Days since the first dose. */
  dayOffset: number;
  gapDays: number;
  isBooster: boolean;
  repeatDays?: number;
  vaccines: string[];
}

export const stepsFromDoses = (doses: ProtocolDose[]): TimelineStep[] => {
  const sorted = [...doses].sort((a, b) => a.doseNumber - b.doseNumber);
  let offset = 0;
  let primaryCount = 0;
  return sorted.map((dose, i) => {
    offset += i === 0 ? 0 : dose.daysFromPrevious;
    const isBooster = Boolean(dose.isRecurring && dose.recurringIntervalDays);
    if (!isBooster) primaryCount++;
    return {
      id: dose.id,
      label: isBooster ? 'Booster' : `Dose ${primaryCount}`,
      dayOffset: offset,
      gapDays: i === 0 ? 0 : dose.daysFromPrevious,
      isBooster,
      repeatDays: dose.recurringIntervalDays ?? undefined,
      vaccines: dose.allowedVaccines.map((av) => av.vaccine.name),
    };
  });
};

export const stepsFromDraft = (draft: ScheduleDraft, vaccines: Vaccine[]): TimelineStep[] => {
  const names = (ids: string[]) =>
    ids.map((id) => vaccines.find((v) => v.id === id)?.name).filter((n): n is string => Boolean(n));
  let offset = 0;
  return draftToDoses(draft).map((dose, i) => {
    offset += dose.daysFromPrevious;
    return {
      id: dose.isRecurring ? 'booster' : draft.doses[i].key,
      label: dose.isRecurring ? 'Booster' : `Dose ${i + 1}`,
      dayOffset: offset,
      gapDays: dose.daysFromPrevious,
      isBooster: Boolean(dose.isRecurring),
      repeatDays: dose.recurringIntervalDays,
      vaccines: names(dose.vaccineIds),
    };
  });
};

/** "2 doses over 3 weeks · booster every year" */
export const describeSteps = (steps: TimelineStep[]): string => {
  const primary = steps.filter((s) => !s.isBooster);
  const booster = steps.find((s) => s.isBooster);
  const span = primary.length ? primary[primary.length - 1].dayOffset : 0;

  const parts = [
    primary.length === 1
      ? 'Single dose'
      : `${primary.length} doses${span > 0 ? ` over ${formatDuration(span)}` : ''}`,
  ];
  if (booster?.repeatDays) parts.push(`booster ${formatEvery(booster.repeatDays)}`);
  return parts.join(' · ');
};

export const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const formatShortDate = (date: Date): string =>
  date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * The protocol dose that governs the next dose for an enrollment: the next
 * defined dose, or — after the series — the final dose when it recurs.
 */
export const resolveNextDose = (doses: ProtocolDose[], currentDose: number) => {
  const sorted = [...doses].sort((a, b) => a.doseNumber - b.doseNumber);
  const doseNumber = currentDose + 1;
  const exact = sorted.find((d) => d.doseNumber === doseNumber);
  if (exact) return { doseNumber, definition: exact };
  const last = sorted[sorted.length - 1];
  if (last?.isRecurring && doseNumber > last.doseNumber) return { doseNumber, definition: last };
  return null;
};
