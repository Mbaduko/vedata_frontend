import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  vaccinationApi,
  animalApi,
  type VaccinationProtocol,
  type AnimalVaccinationEnrollment,
  type Animal,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import DataTable from '../components/DataTable';
import ActionMenu from '../components/ActionMenu';
import ConfirmDialog from '../components/ConfirmDialog';
import { ToastViewport, useToast } from '../components/Toast';
import ScheduleTimeline from '../components/protocol/ScheduleTimeline';
import { describeSteps, stepsFromDoses } from '../utils/protocolSchedule';
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Copy,
  Edit,
  GitBranch,
  Globe,
  Loader,
  MapPin,
  Plus,
  Search,
} from 'lucide-react';

const statusChip: Record<string, string> = {
  active: 'bg-brand-bg text-brand-text',
  completed: 'bg-sky-bg text-sky-text',
  discontinued: 'bg-clay-bg text-clay-text',
};

const DISCONTINUE_REASONS = ['Owner declined', 'Animal relocated', 'Animal deceased', 'Adverse reaction'];

type EnrollmentFilter = 'all' | AnimalVaccinationEnrollment['status'];

function DetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-4 w-28 bg-muted-bg rounded" />
      <div className="h-8 w-80 bg-muted-bg rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-card border border-border rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-card border border-border rounded-xl" />
    </div>
  );
}

export default function VaccinationProtocolDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const canManage = user?.role === 'vet' || user?.role === 'superadmin';
  const { toasts, show: showToast, dismiss } = useToast();

  const [protocol, setProtocol] = useState<VaccinationProtocol | null>(null);
  const [enrollments, setEnrollments] = useState<AnimalVaccinationEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [enrollmentFilter, setEnrollmentFilter] = useState<EnrollmentFilter>('all');

  // Enroll box
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Animal[]>([]);
  const [searching, setSearching] = useState(false);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  // Dialogs
  const [discontinuing, setDiscontinuing] = useState<AnimalVaccinationEnrollment | null>(null);
  const [reason, setReason] = useState('');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Flash message handed over by the builder after save
  const flashShownFor = useRef<string | null>(null);
  useEffect(() => {
    const flash = (location.state as { flash?: string } | null)?.flash;
    if (flash && flashShownFor.current !== location.key) {
      flashShownFor.current = location.key;
      showToast({ message: flash });
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.key, location.pathname, navigate, showToast]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const [protocolData, enrollmentData] = await Promise.all([
          vaccinationApi.getProtocol(id),
          vaccinationApi.getEnrollments({ protocolId: id }),
        ]);
        if (cancelled) return;
        setProtocol(protocolData);
        setEnrollments(enrollmentData);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load protocol');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Debounced animal search for enrollment
  useEffect(() => {
    const term = search.trim();
    if (term.length < 3) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        setResults(await animalApi.getAnimals({ search: term, limit: 6 }));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const enrolledAnimalIds = useMemo(() => new Set(enrollments.map((e) => e.animalId)), [enrollments]);

  const enrollmentCounts = useMemo(
    () => ({
      all: enrollments.length,
      active: enrollments.filter((e) => e.status === 'active').length,
      completed: enrollments.filter((e) => e.status === 'completed').length,
      discontinued: enrollments.filter((e) => e.status === 'discontinued').length,
    }),
    [enrollments],
  );

  const visibleEnrollments = useMemo(
    () => (enrollmentFilter === 'all' ? enrollments : enrollments.filter((e) => e.status === enrollmentFilter)),
    [enrollments, enrollmentFilter],
  );

  const handleEnroll = async (animal: Animal) => {
    if (!id) return;
    try {
      setEnrollingId(animal.id);
      const enrollment = await vaccinationApi.enrollAnimal({ animalId: animal.id, protocolId: id });
      setEnrollments((prev) => [enrollment, ...prev]);
      setResults((prev) => prev.filter((a) => a.id !== animal.id));
      setSearch('');
      showToast({ message: `${animal.tagNumber} enrolled` });
    } catch (err) {
      showToast({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to enroll animal' });
    } finally {
      setEnrollingId(null);
    }
  };

  const handleDiscontinue = async () => {
    if (!discontinuing || !reason.trim()) return;
    try {
      setBusy(true);
      const updated = await vaccinationApi.discontinueEnrollment(discontinuing.id, { reason: reason.trim() });
      setEnrollments((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      setDiscontinuing(null);
      showToast({ message: `${discontinuing.animal?.tagNumber ?? 'Animal'} discontinued` });
    } catch (err) {
      showToast({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to discontinue enrollment' });
    } finally {
      setBusy(false);
    }
  };

  const setActive = async (active: boolean) => {
    if (!protocol) return;
    try {
      setBusy(true);
      const updated = active
        ? await vaccinationApi.restoreProtocol(protocol.id)
        : await vaccinationApi.archiveProtocol(protocol.id);
      setProtocol(updated);
      setArchiveOpen(false);
      showToast({
        message: active ? 'Protocol restored' : 'Protocol archived',
        action: active ? undefined : { label: 'Undo', onClick: () => setActive(true) },
      });
    } catch (err) {
      showToast({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to update protocol' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <DetailSkeleton />;

  if (!protocol) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-card border border-border rounded-xl p-8 text-center space-y-4">
        <p className="text-sm text-ink">{loadError ?? 'Protocol not found.'}</p>
        <button
          onClick={() => navigate('/vaccinations/protocols')}
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-text hover:underline"
        >
          <ArrowLeft size={16} /> Back to protocols
        </button>
      </div>
    );
  }

  const steps = stepsFromDoses(protocol.doses);
  const totalDoses = protocol.doses.filter((d) => !d.isRecurring).length;
  const hasEnrollments = enrollments.length > 0;

  const columns = [
    {
      header: 'Animal',
      accessor: 'animal',
      render: (row: AnimalVaccinationEnrollment) => (
        <div>
          <p className="font-medium text-ink">{row.animal?.tagNumber}</p>
          <p className="text-xs text-ink-secondary">{row.animal?.species.name}</p>
        </div>
      ),
    },
    {
      header: 'Owner',
      accessor: 'animal.owner',
      render: (row: AnimalVaccinationEnrollment) => (
        <div>
          <p className="text-sm text-ink">{row.animal?.owner.name}</p>
          <p className="text-xs text-ink-secondary">{row.animal?.owner.phone}</p>
        </div>
      ),
    },
    {
      header: 'Progress',
      accessor: 'currentDose',
      render: (row: AnimalVaccinationEnrollment) => {
        const dose = row.currentDose;
        if (dose === 0) return <span className="text-ink-secondary">Not started</span>;
        if (dose > totalDoses) return <span className="tabular-nums">Booster #{dose - totalDoses}</span>;
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 rounded-full bg-muted-bg overflow-hidden" aria-hidden>
              <div className="h-full bg-brand" style={{ width: `${(dose / Math.max(totalDoses, 1)) * 100}%` }} />
            </div>
            <span className="tabular-nums text-sm">
              {dose}/{totalDoses}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row: AnimalVaccinationEnrollment) => (
        <span
          title={row.discontinuedReason ?? undefined}
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs capitalize ${
            statusChip[row.status] ?? 'bg-muted-bg text-muted-text'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: 'Last dose',
      accessor: 'vaccinations',
      render: (row: AnimalVaccinationEnrollment) => {
        const last = row.vaccinations?.[0];
        return last ? (
          <span className="text-sm">{new Date(last.dateAdministered).toLocaleDateString()}</span>
        ) : (
          <span className="text-ink-secondary">—</span>
        );
      },
    },
    {
      header: 'Enrolled',
      accessor: 'enrolledAt',
      render: (row: AnimalVaccinationEnrollment) => (
        <span className="text-sm">{new Date(row.enrolledAt).toLocaleDateString()}</span>
      ),
    },
    {
      header: '',
      accessor: 'id',
      align: 'right' as const,
      render: (row: AnimalVaccinationEnrollment) =>
        canManage && row.status === 'active' ? (
          <button
            onClick={() => {
              setDiscontinuing(row);
              setReason('');
            }}
            className="px-3 py-1 border border-border text-sm rounded-lg hover:bg-bg text-ink-secondary"
          >
            Discontinue
          </button>
        ) : null,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/vaccinations/protocols')}
          className="inline-flex items-center gap-2 text-sm text-ink-secondary hover:text-ink mb-3"
        >
          <ArrowLeft size={16} /> All protocols
        </button>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-display font-semibold text-ink">{protocol.name}</h1>
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  protocol.isActive ? 'bg-brand-bg text-brand-text' : 'bg-muted-bg text-muted-text border border-border'
                }`}
              >
                {protocol.isActive ? 'Active' : 'Archived'}
              </span>
            </div>
            <p className="text-sm text-ink-secondary mt-1 flex items-center gap-1.5 flex-wrap">
              <span>{protocol.disease.name}</span>
              <span aria-hidden>·</span>
              <span>{protocol.species.name}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                {protocol.zone ? <MapPin size={13} /> : <Globe size={13} />}
                {protocol.zone?.name ?? 'All zones'}
              </span>
              <span aria-hidden>·</span>
              <span>
                Created by {protocol.createdBy.name} on {new Date(protocol.createdAt).toLocaleDateString()}
              </span>
            </p>
            {protocol.description && (
              <p className="text-sm text-ink mt-3 max-w-3xl whitespace-pre-line">{protocol.description}</p>
            )}
          </div>
          {canManage && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => navigate(`/vaccinations/protocols/${protocol.id}/edit`)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-bg"
              >
                <Edit size={16} /> Edit
              </button>
              <ActionMenu
                items={[
                  {
                    label: 'New version',
                    icon: GitBranch,
                    hidden: !hasEnrollments,
                    onSelect: () => navigate(`/vaccinations/protocols/new?from=${protocol.id}&as=version`),
                  },
                  {
                    label: 'Duplicate',
                    icon: Copy,
                    onSelect: () => navigate(`/vaccinations/protocols/new?from=${protocol.id}&as=copy`),
                  },
                  {
                    label: 'Archive',
                    icon: Archive,
                    tone: 'danger',
                    hidden: !protocol.isActive,
                    onSelect: () => setArchiveOpen(true),
                  },
                  {
                    label: 'Restore',
                    icon: ArchiveRestore,
                    hidden: protocol.isActive,
                    onSelect: () => setActive(true),
                  },
                ]}
              />
            </div>
          )}
        </div>
      </div>

      {!protocol.isActive && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-muted-bg border border-border">
          <p className="text-sm text-ink">
            <span className="font-medium">This protocol is archived.</span>{' '}
            <span className="text-ink-secondary">
              New animals can’t be enrolled; animals already on it continue their schedule.
            </span>
          </p>
          {canManage && (
            <button
              onClick={() => setActive(true)}
              disabled={busy}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-border bg-card rounded-lg hover:bg-bg disabled:opacity-50 shrink-0"
            >
              <ArchiveRestore size={14} /> Restore
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Schedule', value: describeSteps(steps), wide: true },
          { label: 'Active', value: enrollmentCounts.active },
          { label: 'Completed', value: enrollmentCounts.completed },
          { label: 'Discontinued', value: enrollmentCounts.discontinued },
        ].map((stat) => (
          <div key={stat.label} className="p-4 bg-card border border-border rounded-xl">
            <dt className="text-xs text-ink-secondary">{stat.label}</dt>
            <dd
              className={`mt-1 text-ink font-semibold ${
                stat.wide ? 'text-sm leading-snug' : 'text-2xl font-display tabular-nums'
              }`}
            >
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start">
        {/* Schedule */}
        <section className="bg-card border border-border rounded-xl p-6" aria-labelledby="schedule-title">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h2 id="schedule-title" className="text-lg font-semibold text-ink">
                Dose schedule
              </h2>
              <p className="text-xs text-ink-secondary mt-0.5">Dates assume enrollment today.</p>
            </div>
            {canManage && hasEnrollments && (
              <button
                onClick={() => navigate(`/vaccinations/protocols/new?from=${protocol.id}&as=version`)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-text hover:underline"
              >
                <GitBranch size={14} /> New version
              </button>
            )}
          </div>
          <ScheduleTimeline steps={steps} startDate={new Date()} />
        </section>

        {/* Enroll */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-4" aria-labelledby="enroll-title">
          <div>
            <h2 id="enroll-title" className="text-lg font-semibold text-ink">
              Enroll an animal
            </h2>
            <p className="text-sm text-ink-secondary">
              Search by tag number, owner name or NID. Only {protocol.species.name.toLowerCase()} can join.
            </p>
          </div>
          {protocol.isActive ? (
            <>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Type at least 3 characters…"
                  aria-label="Search animals to enroll"
                  className="w-full pl-10 pr-10 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
                />
                {searching && (
                  <Loader size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-ink-secondary" />
                )}
              </div>

              {search.trim().length >= 3 && !searching && results.length === 0 && (
                <p className="text-sm text-ink-secondary">No animals match “{search.trim()}”.</p>
              )}

              {results.length > 0 && (
                <ul className="divide-y divide-border border border-border rounded-lg">
                  {results.map((animal) => {
                    const speciesMatches = animal.speciesId === protocol.speciesId;
                    const alreadyEnrolled = enrolledAnimalIds.has(animal.id);
                    const blocked = !speciesMatches || alreadyEnrolled;
                    return (
                      <li key={animal.id} className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink">{animal.tagNumber}</p>
                          <p className="text-xs text-ink-secondary truncate">
                            {animal.species?.name} · {animal.owner?.name}
                          </p>
                          {blocked && (
                            <p className="text-xs text-warning-text mt-0.5">
                              {alreadyEnrolled ? 'Already enrolled' : `Not a ${protocol.species.name.toLowerCase()}`}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleEnroll(animal)}
                          disabled={blocked || enrollingId === animal.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand text-on-brand text-sm font-medium rounded-lg hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                        >
                          {enrollingId === animal.id ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />}
                          Enroll
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          ) : (
            <p className="text-sm text-ink-secondary px-4 py-3 rounded-lg border border-dashed border-border">
              Restore this protocol to enroll new animals.
            </p>
          )}
        </section>
      </div>

      {/* Enrolled animals */}
      <section className="space-y-3" aria-labelledby="enrolled-title">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 id="enrolled-title" className="text-lg font-semibold text-ink">
            Enrolled animals
          </h2>
          {hasEnrollments && (
            <div role="tablist" aria-label="Enrollment status" className="inline-flex p-1 rounded-lg bg-muted-bg border border-border self-start">
              {(['all', 'active', 'completed', 'discontinued'] as const).map((value) => (
                <button
                  key={value}
                  role="tab"
                  aria-selected={enrollmentFilter === value}
                  onClick={() => setEnrollmentFilter(value)}
                  className={`px-3 py-1 rounded-md text-sm capitalize ${
                    enrollmentFilter === value ? 'bg-card text-ink font-medium shadow-xs' : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  {value}
                  <span className="ml-1.5 text-xs text-ink-secondary tabular-nums">{enrollmentCounts[value]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <DataTable
          columns={columns}
          data={visibleEnrollments}
          emptyMessage={
            hasEnrollments ? `No ${enrollmentFilter} enrollments` : 'No animals enrolled yet — use the search above to add one.'
          }
        />
      </section>

      <ConfirmDialog
        open={discontinuing !== null}
        tone="danger"
        title={`Discontinue ${discontinuing?.animal?.tagNumber ?? 'enrollment'}?`}
        description="Recorded doses stay in the history, but the animal leaves the due list for this protocol."
        confirmLabel="Discontinue"
        busy={busy}
        confirmDisabled={!reason.trim()}
        onCancel={() => setDiscontinuing(null)}
        onConfirm={handleDiscontinue}
      >
        <label htmlFor="discontinue-reason" className="block text-sm font-medium text-ink mb-2">
          Reason
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {DISCONTINUE_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              aria-pressed={reason === r}
              className={`px-2.5 py-1 rounded-full text-xs border ${
                reason === r ? 'bg-brand-bg border-brand-border text-brand-text' : 'border-border text-ink-secondary hover:text-ink'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <textarea
          id="discontinue-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="Pick one above or describe the reason"
          className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={archiveOpen}
        tone="danger"
        title={`Archive “${protocol.name}”?`}
        description="It will no longer be offered when enrolling animals. You can restore it at any time."
        confirmLabel="Archive protocol"
        busy={busy}
        onCancel={() => setArchiveOpen(false)}
        onConfirm={() => setActive(false)}
      >
        {enrollmentCounts.active > 0 && (
          <p className="text-sm p-3 rounded-lg bg-bg border border-border text-ink">
            <span className="font-semibold tabular-nums">{enrollmentCounts.active}</span> active animal
            {enrollmentCounts.active === 1 ? '' : 's'} will keep following this schedule and stay on the due list.
          </p>
        )}
      </ConfirmDialog>

      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
