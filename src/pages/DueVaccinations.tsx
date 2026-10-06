import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { vaccinationApi, type DueVaccination } from '../services/api';
import DataTable from '../components/DataTable';
import { AlertCircle, Calendar, Clock, Loader, Search, Syringe } from 'lucide-react';

type Filter = 'overdue' | 'today' | 'week' | 'all';

// Static token classes — Tailwind can't pick up dynamically built class names.
const urgencyDot: Record<'overdue' | 'today' | 'upcoming', string> = {
  overdue: 'bg-clay-text',
  today: 'bg-gold-text',
  upcoming: 'bg-brand-text',
};

const urgencyText: Record<'overdue' | 'today' | 'upcoming', string> = {
  overdue: 'text-clay-text',
  today: 'text-gold-text',
  upcoming: 'text-brand-text',
};

const tabs: Array<{ value: Filter; label: string; icon: typeof AlertCircle | null; chip: string }> = [
  { value: 'overdue', label: 'Overdue', icon: AlertCircle, chip: 'bg-clay-bg text-clay-text' },
  { value: 'today', label: 'Due Today', icon: Clock, chip: 'bg-gold-bg text-gold-text' },
  { value: 'week', label: 'This Week', icon: Calendar, chip: 'bg-sky-bg text-sky-text' },
  { value: 'all', label: 'All', icon: null, chip: 'bg-muted-bg text-muted-text' },
];

function urgencyOf(dueDate: string): 'overdue' | 'today' | 'upcoming' {
  const due = new Date(dueDate);
  const now = new Date();
  if (due.getTime() < now.getTime()) return 'overdue';
  if (due.toDateString() === now.toDateString()) return 'today';
  return 'upcoming';
}

function relativeDate(dueDate: string): string {
  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  return `Due in ${diffDays} days`;
}

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
        const urgency = urgencyOf(row.nextDueDate);
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
        <span className="tabular-nums">
          {row.nextDoseNumber}/{row.totalDoses}
        </span>
      ),
    },
    {
      header: 'Due Date',
      accessor: 'nextDueDate',
      render: (row: DueVaccination) => {
        const urgency = urgencyOf(row.nextDueDate);
        return (
          <div>
            <p className="text-sm text-ink">{new Date(row.nextDueDate).toLocaleDateString()}</p>
            <p className={`text-xs ${urgencyText[urgency]}`}>{relativeDate(row.nextDueDate)}</p>
          </div>
        );
      },
    },
    {
      header: '',
      accessor: 'id',
      align: 'right' as const,
      render: (row: DueVaccination) => (
        <button
          onClick={() =>
            navigate(
              `/vaccinations/record?enrollmentId=${row.id}&animalId=${row.animal.id}`,
            )
          }
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand text-on-brand text-sm rounded-lg hover:bg-brand-hover"
        >
          <Syringe size={14} /> Record
        </button>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink">Due Vaccinations</h1>
          <p className="text-sm text-ink-secondary mt-1">
            {loading ? 'Loading…' : `${rows.length} enrollment${rows.length === 1 ? '' : 's'} need attention`}
          </p>
        </div>
        <button
          onClick={() => navigate('/vaccinations')}
          className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-bg"
        >
          Back to Vaccinations
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
        <DataTable
          columns={columns}
          data={filteredRows}
          emptyMessage={
            search
              ? 'No due vaccinations match your search'
              : 'No due vaccinations in this window'
          }
        />
      )}
    </div>
  );
}
