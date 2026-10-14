import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { vaccinationApi, type VaccinationProtocol } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ClipboardList,
  Copy,
  Edit,
  Globe,
  MapPin,
  Plus,
  RotateCw,
  Search,
  Syringe,
  X,
} from 'lucide-react';
import ActionMenu from '../components/ActionMenu';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { ToastViewport, useToast } from '../components/Toast';
import ScheduleTimeline from '../components/protocol/ScheduleTimeline';
import { describeSteps, stepsFromDoses } from '../utils/protocolSchedule';

type StatusFilter = 'active' | 'archived' | 'all';

function CardSkeleton() {
  return (
    <div className="p-5 bg-card border border-border rounded-xl animate-pulse space-y-3">
      <div className="h-5 w-2/3 bg-muted-bg rounded" />
      <div className="h-3 w-1/3 bg-muted-bg rounded" />
      <div className="h-8 w-3/4 bg-muted-bg rounded" />
      <div className="h-3 w-1/4 bg-muted-bg rounded" />
    </div>
  );
}

export default function VaccinationProtocols() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user?.role === 'vet' || user?.role === 'superadmin';
  const { toasts, show: showToast, dismiss } = useToast();

  // Filters live in the URL so views are shareable and survive back/forward
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const status = (params.get('status') as StatusFilter) || 'active';
  const speciesFilter = params.get('species') ?? '';
  const diseaseFilter = params.get('disease') ?? '';

  const setParam = (key: string, value: string, fallback = '') =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value && value !== fallback) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );

  const [protocols, setProtocols] = useState<VaccinationProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<VaccinationProtocol | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      setProtocols(await vaccinationApi.getProtocols());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load protocols');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const replace = (updated: VaccinationProtocol) =>
    setProtocols((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

  const restore = async (protocol: VaccinationProtocol) => {
    try {
      replace(await vaccinationApi.restoreProtocol(protocol.id));
      showToast({ message: `“${protocol.name}” restored` });
    } catch (err) {
      showToast({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to restore protocol' });
    }
  };

  const confirmArchive = async () => {
    if (!archiving) return;
    const protocol = archiving;
    try {
      setBusy(true);
      replace(await vaccinationApi.archiveProtocol(protocol.id));
      setArchiving(null);
      showToast({
        message: `“${protocol.name}” archived`,
        action: { label: 'Undo', onClick: () => restore(protocol) },
      });
    } catch (err) {
      showToast({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to archive protocol' });
    } finally {
      setBusy(false);
    }
  };

  // Filter options come from the data, so empty choices never appear
  const speciesOptions = useMemo(
    () => [...new Map(protocols.map((p) => [p.species.id, p.species.name])).entries()].sort((a, b) => a[1].localeCompare(b[1])),
    [protocols],
  );
  const diseaseOptions = useMemo(
    () => [...new Map(protocols.map((p) => [p.disease.id, p.disease.name])).entries()].sort((a, b) => a[1].localeCompare(b[1])),
    [protocols],
  );

  const counts = useMemo(
    () => ({
      active: protocols.filter((p) => p.isActive).length,
      archived: protocols.filter((p) => !p.isActive).length,
      all: protocols.length,
    }),
    [protocols],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return protocols.filter((p) => {
      if (status === 'active' && !p.isActive) return false;
      if (status === 'archived' && p.isActive) return false;
      if (speciesFilter && p.speciesId !== speciesFilter) return false;
      if (diseaseFilter && p.diseaseId !== diseaseFilter) return false;
      if (!term) return true;
      return [p.name, p.disease.name, p.species.name, p.zone?.name, p.description]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(term));
    });
  }, [protocols, status, speciesFilter, diseaseFilter, query]);

  const hasFilters = Boolean(query || speciesFilter || diseaseFilter);
  const clearFilters = () =>
    setParams(
      (prev) => {
        const next = new URLSearchParams();
        const s = prev.get('status');
        if (s) next.set('status', s);
        return next;
      },
      { replace: true },
    );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/vaccinations')}
          className="inline-flex items-center gap-2 text-sm text-ink-secondary hover:text-ink mb-3"
        >
          <ArrowLeft size={16} /> Vaccinations
        </button>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-semibold text-ink">Vaccination protocols</h1>
            <p className="text-sm text-ink-secondary mt-1 max-w-2xl">
              Each protocol defines which vaccines an animal receives and when. Enroll animals to put them on
              the due list automatically.
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => navigate('/vaccinations/protocols/new')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-brand text-on-brand rounded-lg hover:bg-brand-hover shrink-0"
            >
              <Plus size={16} /> New protocol
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      {!loading && protocols.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div role="tablist" aria-label="Status" className="inline-flex p-1 rounded-lg bg-muted-bg border border-border self-start">
            {(['active', 'archived', 'all'] as const).map((value) => {
              const on = status === value;
              return (
                <button
                  key={value}
                  role="tab"
                  aria-selected={on}
                  onClick={() => setParam('status', value, 'active')}
                  className={`px-3 py-1.5 rounded-md text-sm capitalize transition-colors ${
                    on ? 'bg-card text-ink font-medium shadow-xs' : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  {value}
                  <span className="ml-1.5 text-xs text-ink-secondary tabular-nums">{counts[value]}</span>
                </button>
              );
            })}
          </div>

          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
            <input
              type="search"
              value={query}
              onChange={(e) => setParam('q', e.target.value)}
              placeholder="Search by name, disease, species or zone…"
              aria-label="Search protocols"
              className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={speciesFilter}
              onChange={(e) => setParam('species', e.target.value)}
              aria-label="Filter by species"
              className="flex-1 lg:flex-none px-3 py-2 text-sm bg-card border border-border rounded-lg"
            >
              <option value="">All species</option>
              {speciesOptions.map(([sid, sname]) => (
                <option key={sid} value={sid}>
                  {sname}
                </option>
              ))}
            </select>
            <select
              value={diseaseFilter}
              onChange={(e) => setParam('disease', e.target.value)}
              aria-label="Filter by disease"
              className="flex-1 lg:flex-none px-3 py-2 text-sm bg-card border border-border rounded-lg"
            >
              <option value="">All diseases</option>
              {diseaseOptions.map(([did, dname]) => (
                <option key={did} value={did}>
                  {dname}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Content */}
      {error ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center space-y-3">
          <p className="text-sm text-danger-text">{error}</p>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg hover:bg-bg"
          >
            <RotateCw size={14} /> Try again
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : protocols.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No protocols yet"
          description={
            canManage
              ? 'Start with a common pattern like “single dose + yearly booster” — it takes about a minute.'
              : 'A vet needs to set up a protocol before animals can be enrolled.'
          }
          actionLabel={canManage ? 'Create the first protocol' : undefined}
          onAction={canManage ? () => navigate('/vaccinations/protocols/new') : undefined}
        />
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center space-y-3">
          <p className="text-sm text-ink">
            No {status === 'all' ? '' : `${status} `}protocols match these filters.
          </p>
          <div className="flex justify-center gap-2">
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-bg"
              >
                <X size={14} /> Clear filters
              </button>
            )}
            {status !== 'all' && (
              <button
                onClick={() => setParam('status', 'all', 'active')}
                className="px-3 py-1.5 text-sm text-brand-text hover:underline"
              >
                Show all statuses
              </button>
            )}
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((protocol) => {
            const steps = stepsFromDoses(protocol.doses);
            const enrolled = protocol._count?.animalEnrollments ?? 0;
            const open = () => navigate(`/vaccinations/protocols/${protocol.id}`);
            return (
              <li key={protocol.id}>
                <article
                  onClick={open}
                  className={`group h-full flex flex-col p-5 bg-card border border-border rounded-xl cursor-pointer transition-all hover:border-brand/50 hover:shadow-sm ${
                    protocol.isActive ? '' : 'opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-semibold text-ink">
                          <a
                            href={`/vaccinations/protocols/${protocol.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              open();
                            }}
                            className="hover:underline focus:outline-none focus-visible:underline"
                          >
                            {protocol.name}
                          </a>
                        </h2>
                        {!protocol.isActive && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-muted-bg text-muted-text border border-border">
                            Archived
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-ink-secondary mt-1 flex items-center gap-1.5 flex-wrap">
                        <span>{protocol.disease.name}</span>
                        <span aria-hidden>·</span>
                        <span>{protocol.species.name}</span>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-1">
                          {protocol.zone ? <MapPin size={12} /> : <Globe size={12} />}
                          {protocol.zone?.name ?? 'All zones'}
                        </span>
                      </p>
                    </div>
                    {canManage && (
                      <ActionMenu
                        label={`Actions for ${protocol.name}`}
                        items={[
                          {
                            label: 'Edit',
                            icon: Edit,
                            onSelect: () => navigate(`/vaccinations/protocols/${protocol.id}/edit`),
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
                            onSelect: () => setArchiving(protocol),
                          },
                          {
                            label: 'Restore',
                            icon: ArchiveRestore,
                            hidden: protocol.isActive,
                            onSelect: () => restore(protocol),
                          },
                        ]}
                      />
                    )}
                  </div>

                  <p className="text-sm font-medium text-ink mt-4">{describeSteps(steps)}</p>
                  <div className="mt-2">
                    <ScheduleTimeline steps={steps} variant="compact" />
                  </div>

                  <div className="mt-auto pt-4 flex items-center gap-4 text-xs text-ink-secondary">
                    <span className="inline-flex items-center gap-1.5">
                      <Syringe size={13} />
                      <span className="tabular-nums">{enrolled}</span> enrolled
                    </span>
                    <span>Updated {new Date(protocol.updatedAt).toLocaleDateString()}</span>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={archiving !== null}
        tone="danger"
        title={`Archive “${archiving?.name}”?`}
        description="It will no longer be offered when enrolling animals. You can restore it at any time."
        confirmLabel="Archive protocol"
        busy={busy}
        onCancel={() => setArchiving(null)}
        onConfirm={confirmArchive}
      >
        {(archiving?._count?.animalEnrollments ?? 0) > 0 && (
          <p className="text-sm p-3 rounded-lg bg-bg border border-border text-ink">
            <span className="font-semibold tabular-nums">{archiving?._count?.animalEnrollments}</span> enrolled
            animal{archiving?._count?.animalEnrollments === 1 ? '' : 's'} will keep following this schedule and
            stay on the due list.
          </p>
        )}
      </ConfirmDialog>

      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
