import type {
  Animal,
  AnimalVaccinationEnrollment,
  ProtocolDose,
} from '../services/api';
import { addDays, formatShortDate, resolveNextDose } from './protocolSchedule';

// ─── Dates (local, day-level) ────────────────────────────────────
// `toISOString()` is UTC, so near midnight it gives the wrong calendar day.

export const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const toDateInput = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** Parses a `YYYY-MM-DD` input value as a local date. */
export const fromDateInput = (value: string): Date => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export const daysBetween = (from: Date, to: Date): number =>
  Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);

export const formatRelativeDays = (days: number): string => {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  if (days > 0) return days < 60 ? `in ${days} days` : `in ${Math.round(days / 30)} months`;
  const ago = -days;
  return ago < 60 ? `${ago} days ago` : `${Math.round(ago / 30)} months ago`;
};

// ─── Due status ──────────────────────────────────────────────────

export type DueTone = 'overdue' | 'today' | 'soon' | 'later';

export interface DueStatus {
  tone: DueTone;
  label: string;
  days: number;
}

export const dueStatus = (dueDate: Date, today = new Date()): DueStatus => {
  const days = daysBetween(today, dueDate);
  if (days < 0) {
    return { tone: 'overdue', days, label: `${-days} day${days === -1 ? '' : 's'} overdue` };
  }
  if (days === 0) return { tone: 'today', days, label: 'Due today' };
  if (days === 1) return { tone: 'soon', days, label: 'Due tomorrow' };
  if (days <= 7) return { tone: 'soon', days, label: `Due in ${days} days` };
  return { tone: 'later', days, label: `Due ${formatShortDate(dueDate)}` };
};

// ─── Doses ───────────────────────────────────────────────────────

/** Number of doses in the primary series; everything after is a booster. */
const primaryDoseCount = (doses: ProtocolDose[]): number =>
  Math.max(1, doses.filter((d) => !d.isRecurring).length);

export const doseLabel = (doses: ProtocolDose[], doseNumber: number): string => {
  const primary = primaryDoseCount(doses);
  if (doseNumber > primary) return `Booster #${doseNumber - primary}`;
  return primary === 1 ? 'Dose 1' : `Dose ${doseNumber} of ${primary}`;
};

/** Short form for buttons: "dose 2" / "booster #1". */
export const doseNoun = (doses: ProtocolDose[], doseNumber: number): string => {
  const primary = primaryDoseCount(doses);
  return doseNumber > primary ? `booster #${doseNumber - primary}` : `dose ${doseNumber}`;
};

/**
 * When the dose after `doseNumber` falls if `doseNumber` is given on `given`.
 * Mirrors the backend's nextDueDate calculation.
 */
export const nextDueAfter = (
  doses: ProtocolDose[],
  doseNumber: number,
  given: Date,
): { date: Date; label: string } | null => {
  const current = resolveNextDose(doses, doseNumber - 1)?.definition;
  if (!current) return null;
  const following = doses.find((d) => d.doseNumber === doseNumber + 1);
  if (following) {
    return { date: addDays(given, following.daysFromPrevious), label: doseLabel(doses, doseNumber + 1) };
  }
  if (current.isRecurring && current.recurringIntervalDays) {
    return {
      date: addDays(given, current.recurringIntervalDays),
      label: doseLabel(doses, doseNumber + 1),
    };
  }
  return null;
};

export interface EnrollmentDue {
  doseNumber: number;
  definition: ProtocolDose;
  label: string;
  dueDate: Date;
  status: DueStatus;
  /** Date the previous dose was given, if any. */
  previousDate: Date | null;
}

/** What's next for an active enrollment, or null if nothing is left to give. */
export const enrollmentDue = (
  enrollment: AnimalVaccinationEnrollment,
  today = new Date(),
): EnrollmentDue | null => {
  if (enrollment.status !== 'active') return null;
  const next = resolveNextDose(enrollment.protocol.doses, enrollment.currentDose);
  if (!next) return null;

  const last = [...(enrollment.vaccinations ?? [])].sort((a, b) => b.doseNumber - a.doseNumber)[0];
  const dueDate = last?.nextDueDate
    ? new Date(last.nextDueDate)
    : last
      ? new Date(last.dateAdministered)
      : new Date(enrollment.enrolledAt);

  return {
    doseNumber: next.doseNumber,
    definition: next.definition,
    label: doseLabel(enrollment.protocol.doses, next.doseNumber),
    dueDate,
    status: dueStatus(dueDate, today),
    previousDate: last ? new Date(last.dateAdministered) : null,
  };
};

// ─── Animal summary ──────────────────────────────────────────────

/** The bits of an animal the record flow shows, from either API shape. */
export interface AnimalSummary {
  id: string;
  tagNumber: string;
  speciesId: string;
  speciesName: string;
  sex?: string;
  dateOfBirth?: string;
  healthStatus: string;
  ownerName: string;
  ownerPhone?: string;
  zoneId: string;
  zoneName?: string;
}

/** Zones the user may vaccinate in; `null` while unknown (the server still checks). */
export type ZoneAccess = { all: boolean; zoneIds: string[] } | null;

export const canWorkInZone = (access: ZoneAccess, zoneId: string): boolean =>
  !access || access.all || access.zoneIds.includes(zoneId);

export const summarizeAnimal = (
  animal: Animal | null,
  enrollment?: AnimalVaccinationEnrollment,
): AnimalSummary | null => {
  if (animal) {
    return {
      id: animal.id,
      tagNumber: animal.tagNumber,
      speciesId: animal.speciesId,
      speciesName: animal.species?.name ?? '',
      sex: animal.sex,
      dateOfBirth: animal.dateOfBirth,
      healthStatus: animal.healthStatus,
      ownerName: animal.owner?.name ?? '',
      ownerPhone: animal.owner?.phone,
      zoneId: animal.zoneId,
      zoneName: animal.zone?.name,
    };
  }
  const a = enrollment?.animal;
  if (!a) return null;
  return {
    id: a.id,
    tagNumber: a.tagNumber,
    speciesId: a.species.id,
    speciesName: a.species.name,
    healthStatus: a.healthStatus,
    ownerName: a.owner.name,
    ownerPhone: a.owner.phone,
    zoneId: a.zone.id,
    zoneName: a.zone.name,
  };
};

export const formatAge = (dateOfBirth: string, today = new Date()): string => {
  const months = Math.floor(daysBetween(new Date(dateOfBirth), today) / 30.44);
  if (months < 1) return 'under 1 month';
  if (months < 24) return `${months} mo`;
  return `${Math.floor(months / 12)} yrs`;
};

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

// ─── Device memory (per browser, best effort) ────────────────────
// Field staff record many animals in a row with the same vial, so we
// remember recent batches and animals. Never required for correctness.

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — ignore */
  }
};

const BATCH_KEY = 'vedata-record-batches';
const RECENT_KEY = 'vedata-record-recent-animals';

export interface BatchMemory {
  batch: string;
  at: number;
}

/** Most recent first, at most 3 per vaccine. */
export const recentBatches = (vaccineId: string): BatchMemory[] =>
  read<Record<string, BatchMemory[]>>(BATCH_KEY, {})[vaccineId] ?? [];

export const rememberBatch = (vaccineId: string, batch: string) => {
  const all = read<Record<string, BatchMemory[]>>(BATCH_KEY, {});
  const list = (all[vaccineId] ?? []).filter((b) => b.batch !== batch);
  all[vaccineId] = [{ batch, at: Date.now() }, ...list].slice(0, 3);
  write(BATCH_KEY, all);
};

export interface RecentAnimal {
  id: string;
  tagNumber: string;
  speciesName: string;
  ownerName: string;
  at: number;
}

export const recentAnimals = (): RecentAnimal[] => read<RecentAnimal[]>(RECENT_KEY, []);

export const rememberAnimal = (animal: AnimalSummary) => {
  const list = recentAnimals().filter((a) => a.id !== animal.id);
  write(
    RECENT_KEY,
    [
      {
        id: animal.id,
        tagNumber: animal.tagNumber,
        speciesName: animal.speciesName,
        ownerName: animal.ownerName,
        at: Date.now(),
      },
      ...list,
    ].slice(0, 6),
  );
};

