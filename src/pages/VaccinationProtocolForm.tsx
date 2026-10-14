import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  vaccinationApi,
  speciesApi,
  diseaseApi,
  zoneApi,
  ApiError,
  type Species,
  type Disease,
  type Zone,
  type Vaccine,
  type VaccinationProtocol,
} from '../services/api';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CircleAlert,
  Copy,
  GitBranch,
  Globe,
  Loader,
  Lock,
  MapPin,
  Plus,
  Repeat,
  Trash2,
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import { ToastViewport, useToast } from '../components/Toast';
import ScheduleTimeline from '../components/protocol/ScheduleTimeline';
import IntervalInput from '../components/protocol/IntervalInput';
import VaccinePicker from '../components/protocol/VaccinePicker';
import DiseasePicker from '../components/protocol/DiseasePicker';
import {
  SCHEDULE_TEMPLATES,
  describeSteps,
  draftToDoses,
  dosesToDraft,
  emptySchedule,
  formatDuration,
  newDose,
  stepsFromDoses,
  stepsFromDraft,
  toDays,
  validateSchedule,
  type DoseDraft,
  type Interval,
  type ScheduleDraft,
} from '../utils/protocolSchedule';

/**
 * create  — blank builder
 * version — prefilled from ?from=<id>; can archive the source on save
 * copy    — prefilled from ?from=<id>; independent duplicate
 * edit    — metadata always; schedule only while nobody is enrolled
 */
type Mode = 'create' | 'version' | 'copy' | 'edit';

type SectionId = 'target' | 'schedule' | 'vaccines' | 'details';

interface Issue {
  key: string;
  section: SectionId;
  message: string;
}

const GAP_PRESETS: Interval[] = [
  { value: 2, unit: 'weeks' },
  { value: 3, unit: 'weeks' },
  { value: 4, unit: 'weeks' },
  { value: 6, unit: 'months' },
];

const BOOSTER_PRESETS: Interval[] = [
  { value: 6, unit: 'months' },
  { value: 1, unit: 'years' },
  { value: 3, unit: 'years' },
];

const fieldId = (key: string) => `field-${key.replace(/:/g, '-')}`;

const nextVersionName = (name: string) => {
  const match = name.match(/^(.*)\s\(v(\d+)\)$/);
  return match ? `${match[1]} (v${Number(match[2]) + 1})` : `${name} (v2)`;
};

// ─── Layout pieces ──────────────────────────────────────────────────

function Section({
  id,
  step,
  title,
  description,
  complete,
  children,
  aside,
}: {
  id: SectionId;
  step: number;
  title: string;
  description?: string;
  complete?: boolean;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section
      id={`section-${id}`}
      aria-labelledby={`section-${id}-title`}
      className="bg-card border border-border rounded-xl scroll-mt-6"
    >
      <header className="flex items-start gap-3 px-5 sm:px-6 pt-5 sm:pt-6">
        <span
          aria-hidden
          className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
            complete ? 'bg-brand text-on-brand' : 'bg-muted-bg text-ink-secondary border border-border'
          }`}
        >
          {complete ? <Check size={14} strokeWidth={3} /> : step}
        </span>
        <div className="flex-1 min-w-0">
          <h2 id={`section-${id}-title`} className="text-base font-semibold text-ink">
            {title}
            {complete && <span className="sr-only"> (complete)</span>}
          </h2>
          {description && <p className="text-sm text-ink-secondary mt-0.5">{description}</p>}
        </div>
        {aside}
      </header>
      <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-4 pl-5 sm:pl-16 space-y-5">{children}</div>
    </section>
  );
}

function FieldLabel({ htmlFor, children, hint }: { htmlFor?: string; children: ReactNode; hint?: string }) {
  return (
    <div className="mb-2">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {children}
      </label>
      {hint && <p className="text-xs text-ink-secondary mt-0.5">{hint}</p>}
    </div>
  );
}

function Switch({
  checked,
  onChange,
  label,
  description,
  id,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  id: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
          checked ? 'bg-brand' : 'bg-border'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-card shadow-sm transition-transform ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </button>
      <label htmlFor={id} className="cursor-pointer select-none">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="block text-xs text-ink-secondary mt-0.5">{description}</span>}
      </label>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-4 w-32 bg-muted-bg rounded" />
      <div className="h-8 w-72 bg-muted-bg rounded" />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem] gap-6">
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 bg-card border border-border rounded-xl" />
          ))}
        </div>
        <div className="h-80 bg-card border border-border rounded-xl" />
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────

export default function VaccinationProtocolForm() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toasts, show: showToast, dismiss } = useToast();

  const sourceId = id ?? searchParams.get('from') ?? undefined;
  const mode: Mode = id
    ? 'edit'
    : sourceId
      ? searchParams.get('as') === 'copy'
        ? 'copy'
        : 'version'
      : 'create';

  // Catalogs
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [vaccinesLoading, setVaccinesLoading] = useState(false);
  const [activeProtocols, setActiveProtocols] = useState<VaccinationProtocol[]>([]);
  const [source, setSource] = useState<VaccinationProtocol | null>(null);

  // Draft
  const [speciesId, setSpeciesId] = useState('');
  const [diseaseId, setDiseaseId] = useState('');
  const [customName, setCustomName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<'all' | 'zone'>('all');
  const [zoneId, setZoneId] = useState('');
  const [schedule, setSchedule] = useState<ScheduleDraft>(emptySchedule);
  const [archiveSource, setArchiveSource] = useState(true);

  // UI
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<{ all: string; schedule: string } | null>(null);

  const enrolledCount = source?._count?.animalEnrollments ?? 0;
  const targetLocked = mode === 'edit';
  const scheduleLocked = mode === 'edit' && enrolledCount > 0;

  // ── Load ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [species, diseaseList, zoneList, protocols, sourceProtocol] = await Promise.all([
          speciesApi.getSpecies(),
          diseaseApi.getDiseases(),
          zoneApi.getZones({ limit: 100 }),
          vaccinationApi.getProtocols({ isActive: true }).catch(() => []),
          sourceId ? vaccinationApi.getProtocol(sourceId) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setSpeciesList(species);
        setDiseases(diseaseList);
        setZones(zoneList);
        setActiveProtocols(protocols);

        if (sourceProtocol) {
          setSource(sourceProtocol);
          setSpeciesId(sourceProtocol.speciesId);
          setDiseaseId(sourceProtocol.diseaseId);
          setDescription(sourceProtocol.description ?? '');
          setScope(sourceProtocol.zoneId ? 'zone' : 'all');
          setZoneId(sourceProtocol.zoneId ?? '');
          setSchedule(dosesToDraft(sourceProtocol.doses));
          setNameTouched(true);
          setCustomName(
            mode === 'version'
              ? nextVersionName(sourceProtocol.name)
              : mode === 'copy'
                ? `Copy of ${sourceProtocol.name}`
                : sourceProtocol.name,
          );
        }
        if (species.length === 1 && !sourceProtocol) setSpeciesId(species[0].id);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load the form');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceId, mode]);

  // Vaccines belong to the disease
  useEffect(() => {
    if (!diseaseId) {
      setVaccines([]);
      return;
    }
    let cancelled = false;
    setVaccinesLoading(true);
    diseaseApi
      .getVaccines(diseaseId)
      .then((data) => !cancelled && setVaccines(data))
      .catch(() => !cancelled && setVaccines([]))
      .finally(() => !cancelled && setVaccinesLoading(false));
    return () => {
      cancelled = true;
    };
  }, [diseaseId]);

  // ── Derived ───────────────────────────────────────────────────────
  const species = speciesList.find((s) => s.id === speciesId);
  const disease = diseases.find((d) => d.id === diseaseId);
  const zone = zones.find((z) => z.id === zoneId);
  const effectiveZoneId = scope === 'zone' ? zoneId : '';

  const diseaseOptions = useMemo(
    () =>
      speciesId
        ? diseases.filter((d) => !d.species?.length || d.species.some((s) => s.speciesId === speciesId))
        : [],
    [diseases, speciesId],
  );

  const suggestedName = useMemo(() => {
    if (!disease || !species) return '';
    return [disease.name, species.name, scope === 'zone' && zone ? zone.name : null]
      .filter(Boolean)
      .join(' · ');
  }, [disease, species, scope, zone]);

  // Name follows the suggestion until the user types their own
  const name = nameTouched ? customName : suggestedName;

  const steps = useMemo(
    () => (scheduleLocked && source ? stepsFromDoses(source.doses) : stepsFromDraft(schedule, vaccines)),
    [scheduleLocked, source, schedule, vaccines],
  );

  const scheduleErrors = useMemo(() => (scheduleLocked ? {} : validateSchedule(schedule)), [schedule, scheduleLocked]);

  const issues = useMemo<Issue[]>(() => {
    const list: Issue[] = [];
    if (!speciesId) list.push({ key: 'species', section: 'target', message: 'Choose a species' });
    if (!diseaseId) list.push({ key: 'disease', section: 'target', message: 'Choose a disease' });
    for (const [key, message] of Object.entries(scheduleErrors)) {
      list.push({ key, section: key.startsWith('vaccines') ? 'vaccines' : 'schedule', message });
    }
    if (!name.trim()) list.push({ key: 'name', section: 'details', message: 'Give the protocol a name' });
    if (scope === 'zone' && !zoneId) list.push({ key: 'zone', section: 'details', message: 'Choose a zone' });
    return list;
  }, [speciesId, diseaseId, scheduleErrors, name, scope, zoneId]);

  const errorFor = (key: string) => (attempted ? issues.find((i) => i.key === key)?.message : undefined);
  const sectionComplete = (section: SectionId) => !issues.some((i) => i.section === section);

  const duplicates = useMemo(
    () =>
      activeProtocols.filter(
        (p) =>
          p.speciesId === speciesId &&
          p.diseaseId === diseaseId &&
          (p.zoneId ?? '') === effectiveZoneId &&
          p.id !== id &&
          !(mode === 'version' && p.id === source?.id && archiveSource),
      ),
    [activeProtocols, speciesId, diseaseId, effectiveZoneId, id, mode, source, archiveSource],
  );

  // ── Dirty tracking ────────────────────────────────────────────────
  const snapshot = JSON.stringify({
    speciesId,
    diseaseId,
    name: name.trim(),
    description: description.trim(),
    effectiveZoneId,
    doses: draftToDoses(schedule),
  });
  const scheduleSnapshot = JSON.stringify(draftToDoses(schedule));

  // Capture the loaded state once, so "dirty" means "differs from what was loaded"
  if (!loading && baseline === null) setBaseline({ all: snapshot, schedule: scheduleSnapshot });

  const dirty = baseline !== null && baseline.all !== snapshot && !saving;

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const leave = (to: string) => (dirty ? setLeaveTarget(to) : navigate(to));
  const backTo = mode === 'edit' && id ? `/vaccinations/protocols/${id}` : '/vaccinations/protocols';

  // ── Mutators ──────────────────────────────────────────────────────
  const handleSpeciesChange = (nextId: string) => {
    setSpeciesId(nextId);
    const stillApplies =
      disease && (!disease.species?.length || disease.species.some((s) => s.speciesId === nextId));
    if (diseaseId && !stillApplies) handleDiseaseChange('');
  };

  const handleDiseaseChange = (nextId: string) => {
    if (nextId === diseaseId) return;
    setDiseaseId(nextId);
    // Vaccine choices belong to the old disease
    setSchedule((prev) => ({
      ...prev,
      vaccineIds: [],
      doses: prev.doses.map((d) => ({ ...d, vaccineIds: [] })),
      booster: { ...prev.booster, vaccineIds: [] },
    }));
  };

  const handleCreateDisease = async (diseaseName: string) => {
    const existing = diseases.find((d) => d.name.toLowerCase() === diseaseName.toLowerCase());
    if (existing) {
      throw new Error(
        `“${existing.name}” exists but isn’t linked to ${species?.name ?? 'this species'}. Link it under Disease Config.`,
      );
    }
    const created = await diseaseApi.createDisease({ name: diseaseName, applicableSpeciesIds: [speciesId] });
    const withSpecies: Disease = {
      ...created,
      species: created.species ?? [{ diseaseId: created.id, speciesId }],
    };
    setDiseases((prev) => [...prev, withSpecies]);
    showToast({ message: `Added “${created.name}” to the disease catalog` });
    return withSpecies;
  };

  const handleCreateVaccine = async (vaccineName: string, manufacturer?: string) => {
    const created = await diseaseApi.createVaccine(diseaseId, { name: vaccineName, manufacturer });
    setVaccines((prev) => [...prev, created]);
    return created;
  };

  const patchDose = (key: string, patch: Partial<DoseDraft>) =>
    setSchedule((prev) => ({
      ...prev,
      doses: prev.doses.map((d) => (d.key === key ? { ...d, ...patch } : d)),
    }));

  const addDose = () =>
    setSchedule((prev) => {
      const lastGap = prev.doses.length > 1 ? prev.doses[prev.doses.length - 1].gap : undefined;
      const dose = newDose(lastGap && toDays(lastGap) > 0 ? { ...lastGap } : undefined);
      if (!prev.sharedVaccines) dose.vaccineIds = [...(prev.doses[prev.doses.length - 1]?.vaccineIds ?? [])];
      return { ...prev, doses: [...prev.doses, dose] };
    });

  const removeDose = (key: string) => {
    const index = schedule.doses.findIndex((d) => d.key === key);
    const removed = schedule.doses[index];
    if (!removed) return;
    setSchedule((prev) => {
      const doses = prev.doses.filter((d) => d.key !== key);
      // A new first dose always starts the schedule
      if (index === 0 && doses[0]) doses[0] = { ...doses[0], gap: { value: 0, unit: 'days' } };
      return { ...prev, doses };
    });
    showToast({
      message: `Dose ${index + 1} removed`,
      action: {
        label: 'Undo',
        onClick: () =>
          setSchedule((prev) => {
            const doses = [...prev.doses];
            if (index === 0 && doses[0]) doses[0] = { ...doses[0], gap: removed.gap.value ? removed.gap : { value: 3, unit: 'weeks' } };
            doses.splice(index, 0, removed);
            return { ...prev, doses };
          }),
      },
    });
  };

  const applyTemplate = (templateId: string) => {
    const template = SCHEDULE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const previous = schedule;
    const built = template.build();
    // Keep vaccine choices; only the timing changes
    setSchedule({ ...built, sharedVaccines: true, vaccineIds: previous.sharedVaccines ? previous.vaccineIds : [] });
    showToast({
      message: `Applied “${template.title}”`,
      action: { label: 'Undo', onClick: () => setSchedule(previous) },
    });
  };

  const setSharedVaccines = (shared: boolean) =>
    setSchedule((prev) => {
      if (shared) {
        const union = [
          ...new Set([...prev.doses.flatMap((d) => d.vaccineIds), ...(prev.booster.enabled ? prev.booster.vaccineIds : [])]),
        ];
        return { ...prev, sharedVaccines: true, vaccineIds: union };
      }
      // Seed each dose with the shared choice so nothing is lost
      return {
        ...prev,
        sharedVaccines: false,
        doses: prev.doses.map((d) => ({ ...d, vaccineIds: [...prev.vaccineIds] })),
        booster: { ...prev.booster, vaccineIds: [...prev.vaccineIds] },
      };
    });

  // ── Submit ────────────────────────────────────────────────────────
  const focusIssue = (issue: Issue) => {
    const el =
      document.getElementById(fieldId(issue.key)) ?? document.getElementById(`section-${issue.section}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const focusable = el?.matches('input, select, textarea, button')
      ? el
      : el?.querySelector<HTMLElement>('input, select, textarea, button');
    (focusable as HTMLElement | null | undefined)?.focus({ preventScroll: true });
  };

  const handleSubmit = async () => {
    if (saving) return;
    setAttempted(true);
    if (issues.length > 0) {
      focusIssue(issues[0]);
      showToast({
        tone: 'error',
        message: issues.length === 1 ? issues[0].message : `${issues.length} things need your attention`,
      });
      return;
    }

    const doses = draftToDoses(schedule);
    try {
      setSaving(true);
      if (mode === 'edit' && id) {
        const scheduleChanged = !scheduleLocked && baseline?.schedule !== JSON.stringify(doses);
        await vaccinationApi.updateProtocol(id, {
          name: name.trim(),
          description: description.trim() || null,
          ...(scheduleChanged && { doses }),
        });
        navigate(`/vaccinations/protocols/${id}`, { state: { flash: 'Changes saved' } });
        return;
      }

      const created = await vaccinationApi.createProtocol({
        name: name.trim(),
        speciesId,
        diseaseId,
        description: description.trim() || undefined,
        zoneId: effectiveZoneId || undefined,
        doses,
      });

      let flash = 'Protocol created';
      if (mode === 'version' && source && archiveSource && source.isActive) {
        try {
          await vaccinationApi.archiveProtocol(source.id);
          flash = `New version created · “${source.name}” archived`;
        } catch {
          flash = `New version created, but “${source.name}” could not be archived`;
        }
      }
      navigate(`/vaccinations/protocols/${created.id}`, { state: { flash } });
    } catch (err) {
      setSaving(false);
      showToast({
        tone: 'error',
        message: err instanceof ApiError || err instanceof Error ? err.message : 'Failed to save protocol',
      });
    }
  };

  // Cmd/Ctrl+S saves
  const submitRef = useRef(handleSubmit);
  useEffect(() => {
    submitRef.current = handleSubmit;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        submitRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const cancelLeave = useCallback(() => setLeaveTarget(null), []);

  // ── Render ────────────────────────────────────────────────────────
  if (loading) return <FormSkeleton />;

  if (loadError) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-card border border-border rounded-xl p-8 text-center space-y-4">
        <CircleAlert size={28} className="mx-auto text-danger-text" />
        <p className="text-sm text-ink">{loadError}</p>
        <button
          onClick={() => navigate('/vaccinations/protocols')}
          className="text-sm font-medium text-brand-text hover:underline"
        >
          Back to protocols
        </button>
      </div>
    );
  }

  const title = {
    create: 'New vaccination protocol',
    version: 'New protocol version',
    copy: 'Duplicate protocol',
    edit: 'Edit protocol',
  }[mode];

  const subtitle = {
    create: 'Define which vaccines an animal gets, and when. You can enroll animals once it’s saved.',
    version: `Based on “${source?.name}”. Animals already enrolled stay on the old schedule; new enrollments use this one.`,
    copy: `Starting from a copy of “${source?.name}”. Adjust anything before saving.`,
    edit: scheduleLocked
      ? `${enrolledCount} animal${enrolledCount === 1 ? ' is' : 's are'} enrolled, so only the name and description can change.`
      : 'No animals are enrolled yet, so everything except species, disease and scope can still change.',
  }[mode];

  const primaryLabel = mode === 'edit' ? 'Save changes' : mode === 'version' ? 'Create version' : 'Create protocol';
  const lastPrimaryIndex = schedule.doses.length - 1;

  const submitButton = (fullWidth: boolean) => (
    <button
      type="button"
      onClick={handleSubmit}
      disabled={saving}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-brand text-on-brand hover:bg-brand-hover disabled:opacity-60 ${
        fullWidth ? 'w-full' : ''
      }`}
    >
      {saving && <Loader size={16} className="animate-spin" />}
      {saving ? 'Saving…' : primaryLabel}
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto pb-24 lg:pb-8">
      {/* Header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => leave(backTo)}
          className="inline-flex items-center gap-2 text-sm text-ink-secondary hover:text-ink mb-3"
        >
          <ArrowLeft size={16} /> {mode === 'edit' ? 'Back to protocol' : 'All protocols'}
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-display font-semibold text-ink">{title}</h1>
          {mode === 'version' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-info-bg text-info-text">
              <GitBranch size={12} /> New version
            </span>
          )}
          {mode === 'copy' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-info-bg text-info-text">
              <Copy size={12} /> Copy
            </span>
          )}
        </div>
        <p className="text-sm text-ink-secondary mt-1 max-w-2xl">{subtitle}</p>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem] gap-6 items-start">
        {/* ── Main column ── */}
        <div className="space-y-4 min-w-0">
          {/* 1 — Target */}
          <Section
            id="target"
            step={1}
            title="What does it protect against?"
            description={targetLocked ? 'Fixed once a protocol exists. Duplicate it to target something else.' : undefined}
            complete={sectionComplete('target')}
          >
            {targetLocked ? (
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-ink-secondary">Species</dt>
                  <dd className="font-medium text-ink mt-0.5">{species?.name ?? source?.species.name}</dd>
                </div>
                <div>
                  <dt className="text-ink-secondary">Disease</dt>
                  <dd className="font-medium text-ink mt-0.5">{disease?.name ?? source?.disease.name}</dd>
                </div>
              </dl>
            ) : (
              <>
                <div>
                  <FieldLabel htmlFor={fieldId('species')}>Species</FieldLabel>
                  {speciesList.length <= 8 ? (
                    <div id={fieldId('species')} role="radiogroup" aria-label="Species" className="flex flex-wrap gap-2">
                      {speciesList.map((s) => {
                        const on = s.id === speciesId;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => handleSpeciesChange(s.id)}
                            className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                              on
                                ? 'bg-brand text-on-brand border-brand'
                                : 'bg-card border-border text-ink hover:border-ink-secondary'
                            }`}
                          >
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <select
                      id={fieldId('species')}
                      value={speciesId}
                      onChange={(e) => handleSpeciesChange(e.target.value)}
                      className="w-full sm:w-72 px-3 py-2 text-sm bg-card border border-border rounded-lg"
                    >
                      <option value="">Select species…</option>
                      {speciesList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {errorFor('species') && <p className="text-xs text-danger-text mt-1">{errorFor('species')}</p>}
                </div>

                <div>
                  <FieldLabel htmlFor={fieldId('disease')}>Disease</FieldLabel>
                  <DiseasePicker
                    id={fieldId('disease')}
                    diseases={diseaseOptions}
                    value={diseaseId}
                    onChange={handleDiseaseChange}
                    onCreate={handleCreateDisease}
                    disabled={!speciesId}
                    disabledHint="Choose a species first — diseases are filtered to the ones it can catch."
                    error={errorFor('disease')}
                  />
                </div>
              </>
            )}

            {duplicates.length > 0 && (
              <div className="flex gap-3 p-3 rounded-lg bg-warning-bg border border-warning-border">
                <AlertTriangle size={16} className="text-warning-text shrink-0 mt-0.5" />
                <div className="text-sm text-warning-text">
                  <p className="font-medium">
                    An active protocol already covers {disease?.name} for {species?.name}
                    {effectiveZoneId ? ` in ${zone?.name}` : ' in all zones'}.
                  </p>
                  <p className="mt-0.5">
                    {duplicates.map((p, i) => (
                      <span key={p.id}>
                        {i > 0 && ', '}
                        <Link to={`/vaccinations/protocols/${p.id}`} target="_blank" className="underline">
                          {p.name}
                        </Link>
                      </span>
                    ))}
                    {' — '}consider creating a new version of it instead, so staff aren’t unsure which to use.
                  </p>
                </div>
              </div>
            )}
          </Section>

          {/* 2 — Schedule */}
          <Section
            id="schedule"
            step={2}
            title="Dose schedule"
            description={
              scheduleLocked
                ? undefined
                : 'The primary series every animal completes, plus an optional booster that repeats for life.'
            }
            complete={sectionComplete('schedule')}
          >
            {scheduleLocked ? (
              <div className="space-y-4">
                <div className="flex gap-3 p-3 rounded-lg bg-muted-bg border border-border">
                  <Lock size={16} className="text-ink-secondary shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-ink font-medium">Schedule locked</p>
                    <p className="text-ink-secondary mt-0.5">
                      {enrolledCount} enrolled animal{enrolledCount === 1 ? ' depends' : 's depend'} on this schedule.
                      Create a new version to change doses or vaccines — current animals keep their schedule.
                    </p>
                    <button
                      type="button"
                      onClick={() => leave(`/vaccinations/protocols/new?from=${id}&as=version`)}
                      className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-brand-text hover:underline"
                    >
                      <GitBranch size={14} /> Create new version
                    </button>
                  </div>
                </div>
                <ScheduleTimeline steps={steps} />
              </div>
            ) : (
              <>
                {mode === 'create' && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-secondary mb-2">
                      Start from a common pattern
                    </p>
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
                      {SCHEDULE_TEMPLATES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => applyTemplate(t.id)}
                          className="text-left p-3 rounded-lg border border-border bg-bg hover:border-brand hover:bg-brand-bg/40 transition-colors"
                        >
                          <span className="block text-sm font-medium text-ink leading-snug">{t.title}</span>
                          <span className="block text-xs text-ink-secondary mt-0.5">{t.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Primary series */}
                <ol className="space-y-2" aria-label="Primary series">
                  {schedule.doses.map((dose, index) => (
                    <li
                      key={dose.key}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 rounded-lg border border-border bg-bg"
                    >
                      <span className="w-8 h-8 shrink-0 rounded-full bg-brand text-on-brand text-sm font-semibold flex items-center justify-center tabular-nums">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-[14rem]">
                        {index === 0 ? (
                          <>
                            <p className="text-sm font-medium text-ink">Dose 1</p>
                            <p className="text-xs text-ink-secondary">Given at enrollment (day 0)</p>
                          </>
                        ) : (
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-sm font-medium text-ink">Dose {index + 1}</span>
                            <IntervalInput
                              id={fieldId(`gap:${dose.key}`)}
                              ariaLabel={`Gap before dose ${index + 1}`}
                              value={dose.gap}
                              onChange={(gap) => patchDose(dose.key, { gap })}
                              presets={GAP_PRESETS}
                              error={errorFor(`gap:${dose.key}`)}
                            />
                            <span className="text-sm text-ink-secondary">after dose {index}</span>
                          </div>
                        )}
                      </div>
                      {schedule.doses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDose(dose.key)}
                          aria-label={`Remove dose ${index + 1}`}
                          className="p-2 rounded-lg text-ink-secondary hover:text-danger-text hover:bg-card"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
                <button
                  type="button"
                  onClick={addDose}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-dashed border-border text-ink hover:border-brand hover:text-brand-text"
                >
                  <Plus size={16} /> Add dose
                </button>

                {/* Booster */}
                <div
                  className={`rounded-lg border p-4 space-y-4 transition-colors ${
                    schedule.booster.enabled ? 'border-brand-border bg-brand-bg/40' : 'border-border'
                  }`}
                >
                  <Switch
                    id="booster-toggle"
                    checked={schedule.booster.enabled}
                    onChange={(enabled) =>
                      setSchedule((prev) => ({
                        ...prev,
                        booster: {
                          ...prev.booster,
                          enabled,
                          vaccineIds: prev.booster.vaccineIds.length
                            ? prev.booster.vaccineIds
                            : [...(prev.doses[lastPrimaryIndex]?.vaccineIds ?? [])],
                        },
                      }))
                    }
                    label="Repeat with a booster"
                    description="Keeps the animal on the due list for life, e.g. a yearly rabies shot."
                  />
                  {schedule.booster.enabled && (
                    <div className="space-y-3 sm:pl-12">
                      <div>
                        <FieldLabel htmlFor={fieldId('booster:repeat')}>
                          <span className="inline-flex items-center gap-1.5">
                            <Repeat size={14} /> Booster every
                          </span>
                        </FieldLabel>
                        <IntervalInput
                          id={fieldId('booster:repeat')}
                          ariaLabel="Booster interval"
                          value={schedule.booster.repeatEvery}
                          onChange={(repeatEvery) =>
                            setSchedule((prev) => ({ ...prev, booster: { ...prev.booster, repeatEvery } }))
                          }
                          presets={BOOSTER_PRESETS}
                          error={errorFor('booster:repeat')}
                        />
                      </div>

                      {schedule.booster.customFirst ? (
                        <div>
                          <FieldLabel
                            htmlFor={fieldId('booster:first')}
                            hint={`Counted from dose ${schedule.doses.length}.`}
                          >
                            First booster after
                          </FieldLabel>
                          <IntervalInput
                            id={fieldId('booster:first')}
                            ariaLabel="First booster delay"
                            value={schedule.booster.firstAfter}
                            onChange={(firstAfter) =>
                              setSchedule((prev) => ({ ...prev, booster: { ...prev.booster, firstAfter } }))
                            }
                            error={errorFor('booster:first')}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setSchedule((prev) => ({ ...prev, booster: { ...prev.booster, customFirst: false } }))
                            }
                            className="mt-2 text-xs font-medium text-brand-text hover:underline"
                          >
                            Use the same interval for the first booster
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-ink-secondary">
                          First booster is due{' '}
                          {toDays(schedule.booster.repeatEvery) > 0
                            ? formatDuration(toDays(schedule.booster.repeatEvery))
                            : '—'}{' '}
                          after dose {schedule.doses.length}.{' '}
                          <button
                            type="button"
                            onClick={() =>
                              setSchedule((prev) => ({
                                ...prev,
                                booster: { ...prev.booster, customFirst: true, firstAfter: { ...prev.booster.repeatEvery } },
                              }))
                            }
                            className="font-medium text-brand-text hover:underline"
                          >
                            Set a different first interval
                          </button>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </Section>

          {/* 3 — Vaccines */}
          {!scheduleLocked && (
            <Section
              id="vaccines"
              step={3}
              title="Allowed vaccines"
              description="Staff can only record these products for the protocol, which keeps records consistent."
              complete={sectionComplete('vaccines')}
            >
              {!diseaseId ? (
                <p className="text-sm text-ink-secondary px-4 py-3 rounded-lg border border-dashed border-border">
                  Choose a disease first — vaccines are listed per disease.
                </p>
              ) : vaccinesLoading ? (
                <div className="flex items-center gap-2 text-sm text-ink-secondary">
                  <Loader size={16} className="animate-spin" /> Loading vaccines…
                </div>
              ) : (
                <>
                  {(schedule.doses.length > 1 || schedule.booster.enabled) && (
                    <Switch
                      id="shared-vaccines"
                      checked={schedule.sharedVaccines}
                      onChange={setSharedVaccines}
                      label="Same vaccines for every dose"
                      description="Turn off if, for example, the booster uses a different product."
                    />
                  )}

                  {schedule.sharedVaccines ? (
                    <VaccinePicker
                      id={fieldId('vaccines:shared')}
                      vaccines={vaccines}
                      selected={schedule.vaccineIds}
                      onChange={(vaccineIds) => setSchedule((prev) => ({ ...prev, vaccineIds }))}
                      onCreate={handleCreateVaccine}
                      error={errorFor('vaccines:shared')}
                    />
                  ) : (
                    <div className="space-y-4">
                      {schedule.doses.map((dose, index) => (
                        <div key={dose.key} className="space-y-2">
                          <p className="text-sm font-medium text-ink">Dose {index + 1}</p>
                          <VaccinePicker
                            id={fieldId(`vaccines:${dose.key}`)}
                            vaccines={vaccines}
                            selected={dose.vaccineIds}
                            onChange={(vaccineIds) => patchDose(dose.key, { vaccineIds })}
                            onCreate={handleCreateVaccine}
                            error={errorFor(`vaccines:${dose.key}`)}
                          />
                        </div>
                      ))}
                      {schedule.booster.enabled && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-ink inline-flex items-center gap-1.5">
                            <Repeat size={14} /> Booster
                          </p>
                          <VaccinePicker
                            id={fieldId('vaccines:booster')}
                            vaccines={vaccines}
                            selected={schedule.booster.vaccineIds}
                            onChange={(vaccineIds) =>
                              setSchedule((prev) => ({ ...prev, booster: { ...prev.booster, vaccineIds } }))
                            }
                            onCreate={handleCreateVaccine}
                            error={errorFor('vaccines:booster')}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </Section>
          )}

          {/* 4 — Details */}
          <Section
            id="details"
            step={scheduleLocked ? 3 : 4}
            title="Name & availability"
            complete={sectionComplete('details')}
          >
            <div>
              <FieldLabel
                htmlFor={fieldId('name')}
                hint={!nameTouched && suggestedName ? 'Suggested from your choices — edit freely.' : undefined}
              >
                Protocol name
              </FieldLabel>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id={fieldId('name')}
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setCustomName(e.target.value);
                    setNameTouched(true);
                  }}
                  placeholder="e.g. Rabies · Dog"
                  aria-invalid={Boolean(errorFor('name'))}
                  className={`flex-1 min-w-[14rem] px-3 py-2 text-sm bg-card border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/25 ${
                    errorFor('name') ? 'border-danger-text' : 'border-border focus:border-brand'
                  }`}
                />
                {nameTouched && suggestedName && name !== suggestedName && mode === 'create' && (
                  <button
                    type="button"
                    onClick={() => setNameTouched(false)}
                    className="text-xs font-medium text-brand-text hover:underline"
                  >
                    Use “{suggestedName}”
                  </button>
                )}
              </div>
              {errorFor('name') && <p className="text-xs text-danger-text mt-1">{errorFor('name')}</p>}
            </div>

            <div>
              <FieldLabel>Available in</FieldLabel>
              {targetLocked ? (
                <p className="text-sm text-ink inline-flex items-center gap-1.5">
                  {source?.zone ? <MapPin size={14} /> : <Globe size={14} />}
                  {source?.zone ? source.zone.name : 'All zones'}
                </p>
              ) : (
                <div className="space-y-3">
                  <div role="radiogroup" aria-label="Availability" className="grid sm:grid-cols-2 gap-2">
                    {(
                      [
                        { value: 'all', icon: Globe, title: 'All zones', hint: 'Every vet and technician can use it' },
                        { value: 'zone', icon: MapPin, title: 'One zone only', hint: 'For a local campaign or rule' },
                      ] as const
                    ).map((option) => {
                      const on = scope === option.value;
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => setScope(option.value)}
                          className={`flex items-start gap-3 p-3 text-left rounded-lg border transition-colors ${
                            on ? 'border-brand bg-brand-bg/50' : 'border-border hover:border-ink-secondary'
                          }`}
                        >
                          <Icon size={18} className={on ? 'text-brand-text mt-0.5' : 'text-ink-secondary mt-0.5'} />
                          <span>
                            <span className="block text-sm font-medium text-ink">{option.title}</span>
                            <span className="block text-xs text-ink-secondary">{option.hint}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {scope === 'zone' && (
                    <div>
                      <select
                        id={fieldId('zone')}
                        value={zoneId}
                        onChange={(e) => setZoneId(e.target.value)}
                        aria-label="Zone"
                        aria-invalid={Boolean(errorFor('zone'))}
                        className={`w-full sm:w-80 px-3 py-2 text-sm bg-card border rounded-lg ${
                          errorFor('zone') ? 'border-danger-text' : 'border-border'
                        }`}
                      >
                        <option value="">Select a zone…</option>
                        {zones.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.name}
                          </option>
                        ))}
                      </select>
                      {errorFor('zone') && <p className="text-xs text-danger-text mt-1">{errorFor('zone')}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="protocol-description" hint="Optional — shown to staff on the protocol page.">
                Notes for staff
              </FieldLabel>
              <textarea
                id="protocol-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="e.g. Follows the 2026 national rabies guideline. Do not vaccinate animals under 3 months."
                className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
              />
            </div>
          </Section>
        </div>

        {/* ── Summary rail ── */}
        <aside className="lg:sticky lg:top-6 space-y-4" aria-label="Protocol summary">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-secondary">Summary</p>
              <p className={`mt-1 font-display text-lg leading-snug ${name.trim() ? 'text-ink' : 'text-ink-secondary italic'}`}>
                {name.trim() || 'Untitled protocol'}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[species?.name ?? source?.species.name, disease?.name ?? source?.disease.name]
                  .filter(Boolean)
                  .map((label) => (
                    <span key={label} className="px-2 py-0.5 rounded-full text-xs bg-muted-bg text-ink-secondary border border-border">
                      {label}
                    </span>
                  ))}
                <span className="px-2 py-0.5 rounded-full text-xs bg-muted-bg text-ink-secondary border border-border">
                  {effectiveZoneId ? zone?.name ?? 'One zone' : 'All zones'}
                </span>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-baseline justify-between gap-2 mb-3">
                <p className="text-sm font-medium text-ink">{describeSteps(steps)}</p>
              </div>
              <p className="text-xs text-ink-secondary mb-3">If an animal is enrolled today:</p>
              <ScheduleTimeline steps={steps} startDate={new Date()} />
            </div>

            {mode === 'version' && source?.isActive && (
              <label className="flex items-start gap-2 p-3 rounded-lg bg-bg border border-border cursor-pointer">
                <input
                  type="checkbox"
                  checked={archiveSource}
                  onChange={(e) => setArchiveSource(e.target.checked)}
                  className="mt-0.5 accent-[var(--brand)]"
                />
                <span className="text-sm">
                  <span className="block text-ink font-medium">Archive “{source.name}”</span>
                  <span className="block text-xs text-ink-secondary mt-0.5">
                    New enrollments will use this version. The {enrolledCount} animal
                    {enrolledCount === 1 ? '' : 's'} already enrolled keep their schedule.
                  </span>
                </span>
              </label>
            )}

            {issues.length > 0 && (
              <div className="border-t border-border pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-secondary mb-2">
                  {issues.length} to go
                </p>
                <ul className="space-y-1">
                  {issues.slice(0, 6).map((issue) => (
                    <li key={issue.key}>
                      <button
                        type="button"
                        onClick={() => focusIssue(issue)}
                        className={`w-full flex items-center gap-2 text-left text-sm rounded px-1 -mx-1 py-0.5 hover:bg-bg ${
                          attempted ? 'text-danger-text' : 'text-ink-secondary'
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${attempted ? 'bg-danger-text' : 'bg-border'}`}
                        />
                        {issue.message}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="hidden lg:flex flex-col gap-2 border-t border-border pt-4">
              {submitButton(true)}
              <button
                type="button"
                onClick={() => leave(backTo)}
                className="px-4 py-2 text-sm text-ink-secondary hover:text-ink rounded-lg"
              >
                Cancel
              </button>
              <p className="text-center text-[11px] text-ink-secondary">
                Tip: <kbd className="px-1 rounded border border-border">Ctrl</kbd> +{' '}
                <kbd className="px-1 rounded border border-border">S</kbd> saves
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile action bar */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => leave(backTo)}
          className="px-3 py-2.5 text-sm text-ink-secondary hover:text-ink"
        >
          Cancel
        </button>
        <div className="flex-1">{submitButton(true)}</div>
      </div>

      <ConfirmDialog
        open={leaveTarget !== null}
        title="Discard unsaved changes?"
        description="You’ve made changes to this protocol that haven’t been saved."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        tone="danger"
        onCancel={cancelLeave}
        onConfirm={() => {
          const to = leaveTarget;
          setLeaveTarget(null);
          if (to) navigate(to);
        }}
      />

      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

