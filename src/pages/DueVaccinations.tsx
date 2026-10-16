import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { vaccinationApi, type DueVaccination } from '../services/api';
import DataTable from '../components/DataTable';
import { DueBadge } from '../components/record/AnimalHeader';
import { dueStatus, type DueTone } from '../utils/vaccinationRecord';
import { AlertCircle, Calendar, Clock, Loader, Search, Syringe } from 'lucide-react';

type Filter = 'overdue' | 'today' | 'week' | 'all';

// Static token classes — Tailwind can't pick up dynamically built class names.
const urgencyDot: Record<DueTone, string> = {
  overdue: 'bg-clay-text',
  today: 'bg-gold-text',
  soon: 'bg-brand-text',
  later: 'bg-brand-text',
};

const tabs: Array<{ value: Filter; label: string; icon: typeof AlertCircle | null; chip: string }> = [
  { value: 'overdue', label: 'Overdue', icon: AlertCircle, chip: 'bg-clay-bg text-clay-text' },
  { value: 'today', label: 'Due Today', icon: Clock, chip: 'bg-gold-bg text-gold-text' },
  { value: 'week', label: 'This Week', icon: Calendar, chip: 'bg-sky-bg text-sky-text' },
  { value: 'all', label: 'All', icon: null, chip: 'bg-muted-bg text-muted-text' },
];

const recordPath = (row: DueVaccination) =>
  `/vaccinations/record?animalId=${row.animal.id}&enrollmentId=${row.id}&from=due`;

const doseText = (row: DueVaccination) => {
  const primary = Math.max(1, row.totalDoses);
  return row.nextDoseNumber > primary
    ? `Booster #${row.nextDoseNumber - primary}`
    : `${row.nextDoseNumber}/${primary}`;
};

export default function DueVaccinations() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = (searchParams.get('filter') || 'all') as Filter;
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<DueVaccination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await vaccinationApi.getDueVaccinations({
        filter: filter === 'all' ? undefined : filter,
      });
      setRows(data.vaccinations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load due vaccinations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.animal.tagNumber.toLowerCase().includes(q) ||
        row.animal.owner.name.toLowerCase().includes(q) ||
        row.protocol.name.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const columns = [
    {
      header: 'Animal',
      accessor: 'animal',
      render: (row: DueVaccination) => {
        const urgency = dueStatus(new Date(row.nextDueDate)).tone;
        return (
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full shrink-0 ${urgencyDot[urgency]}`} />
            <div>
              <p className="font-medium text-ink">{row.animal.tagNumber}</p>
              <p className="text-xs text-ink-secondary">{row.animal.species}</p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Owner',
      accessor: 'animal.owner.name',
      render: (row: DueVaccination) => (
        <div>
          <p className="text-sm text-ink">{row.animal.owner.name}</p>
          <p className="text-xs text-ink-secondary">{row.animal.owner.phone}</p>
        </div>
      ),
    },
    {
      header: 'Protocol',
      accessor: 'protocol.name',
      render: (row: DueVaccination) => (
        <div>
          <p className="text-sm text-ink">{row.protocol.name}</p>
          <p className="text-xs text-ink-secondary">{row.protocol.disease}</p>
        </div>
      ),
    },
    {
      header: 'Dose',
      accessor: 'nextDoseNumber',
      render: (row: DueVaccination) => (
        <span className="tabular-nums">{doseText(row)}</span>
      ),
    },
    {
      header: 'Due Date',
      accessor: 'nextDueDate',
      render: (row: DueVaccination) => (
        <div className="space-y-1">
          <p className="text-sm text-ink">{new Date(row.nextDueDate).toLocaleDateString()}</p>
          <DueBadge status={dueStatus(new Date(row.nextDueDate))} />
        </div>
      ),
    },
    {
      header: '',
      accessor: 'id',
      align: 'right' as const,
      render: (row: DueVaccination) => (
        <button
          onClick={() => navigate(recordPath(row))}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand text-on-brand text-sm rounded-lg hover:bg-brand-hover"
        >
          <Syringe size={14} /> Record
        </button>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-start sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-display font-semibold text-ink">Due Vaccinations</h1>
          <p className="text-sm text-ink-secondary mt-1">
            {loading
              ? 'Loading…'
              : `${rows.length} enrollment${rows.length === 1 ? ' needs' : 's need'} attention`}
          </p>
        </div>
        <button
          onClick={() => navigate('/vaccinations/record')}
          className="shrink-0 inline-flex items-center gap-1.5 h-10 px-4 bg-brand text-on-brand rounded-lg text-sm font-medium hover:bg-brand-hover"
        >
          <Syringe size={16} aria-hidden /> Record
        </button>
      </div>

      {error && (
        <div className="p-3 bg-clay-bg border border-clay-border rounded-lg">
          <p className="text-sm text-clay-text">{error}</p>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search
          size={20}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by tag, owner or protocol..."
          className="w-full pl-10 pr-4 py-2 bg-bg border border-border rounded-lg text-sm"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = filter === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setSearchParams({ filter: tab.value })}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
                active ? 'border-brand text-brand' : 'border-transparent text-ink-secondary hover:text-ink'
              }`}
            >
              {Icon && <Icon size={16} />}
              {tab.label}
              {active && !loading && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${tab.chip}`}>
                  {rows.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader size={28} className="text-brand animate-spin" />
        </div>
      ) : (
        <>
          {/* Phones: tappable cards instead of a wide table */}
          <ul className="md:hidden space-y-2">
            {filteredRows.length === 0 ? (
              <li className="p-6 text-center text-sm text-ink-secondary bg-card border border-border rounded-2xl">
                {search ? 'No due vaccinations match your search' : 'No due vaccinations in this window'}
              </li>
            ) : (
              filteredRows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => navigate(recordPath(row))}
                    className="w-full flex items-center gap-3 p-4 min-h-[76px] bg-card border border-border rounded-2xl text-left active:bg-bg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-ink tracking-wide truncate">
                          {row.animal.tagNumber}
                        </p>
                        <DueBadge status={dueStatus(new Date(row.nextDueDate))} />
                      </div>
                      <p className="text-sm text-ink truncate">
                        {row.protocol.disease} · Dose {doseText(row)}
                      </p>
                      <p className="text-xs text-ink-secondary truncate">
                        {row.animal.species} · {row.animal.owner.name}
                      </p>
                    </div>
                    <span className="shrink-0 w-11 h-11 rounded-xl bg-brand text-on-brand flex items-center justify-center">
                      <Syringe size={18} aria-hidden />
                      <span className="sr-only">Record</span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
          <div className="hidden md:block">
            <DataTable
              columns={columns}
              data={filteredRows}
              emptyMessage={
                search
                  ? 'No due vaccinations match your search'
                  : 'No due vaccinations in this window'
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
