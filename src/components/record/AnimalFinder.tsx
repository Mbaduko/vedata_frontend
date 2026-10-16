import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Clock, Loader, RefreshCw, Search, X } from 'lucide-react';
import { animalApi, vaccinationApi, type Animal, type DueVaccination } from '../../services/api';
import { DueBadge } from './AnimalHeader';
import { canWorkInZone, dueStatus, recentAnimals, type ZoneAccess } from '../../utils/vaccinationRecord';

interface AnimalFinderProps {
  zoneAccess: ZoneAccess;
  onPickAnimal: (animalId: string) => void;
  onPickDue: (row: DueVaccination) => void;
}

const MIN_QUERY = 2;

/** Step 1 — find the animal: who's due now, recent animals, or search. */
export default function AnimalFinder({ zoneAccess, onPickAnimal, onPickDue }: AnimalFinderProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Animal[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchSeq = useRef(0);

  const [due, setDue] = useState<DueVaccination[] | null>(null);
  const [dueError, setDueError] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const recent = useMemo(() => recentAnimals(), []);

  const term = query.trim();
  const isSearching = term.length >= MIN_QUERY;

  // Keyboard first on desktop; on phones, let people see the due list first.
  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus();
  }, []);

  const loadDue = () => {
    setDueError(false);
    vaccinationApi
      .getDueVaccinations()
      .then((data) => setDue(data.vaccinations))
      .catch(() => {
        setDue([]);
        setDueError(true);
      });
  };

  useEffect(loadDue, []);

  // Debounced search; stale responses are dropped by sequence number.
  useEffect(() => {
    if (!isSearching) {
      setResults([]);
      setSearching(false);
      return;
    }
    const seq = ++searchSeq.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await animalApi.getAnimals({ search: term, limit: 8 });
        if (seq !== searchSeq.current) return;
        setResults(data);
        setSearchError(false);
      } catch {
        if (seq !== searchSeq.current) return;
        setResults([]);
        setSearchError(true);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [term, isSearching]);

  const { dueNow, upcoming } = useMemo(() => {
    const rows = (due ?? []).map((row) => ({ row, status: dueStatus(new Date(row.nextDueDate)) }));
    return {
      dueNow: rows.filter((r) => r.status.tone === 'overdue' || r.status.tone === 'today'),
      upcoming: rows.filter((r) => r.status.tone !== 'overdue' && r.status.tone !== 'today'),
    };
  }, [due]);

  const visibleUpcoming = showAllUpcoming ? upcoming : upcoming.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <label htmlFor="animal-search" className="sr-only">
          Search animals
        </label>
        <div className="relative">
          <Search
            size={20}
            aria-hidden
            className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-secondary pointer-events-none"
          />
          <input
            ref={inputRef}
            id="animal-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tag number, owner name or NID"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="search"
            className="w-full h-14 pl-12 pr-12 bg-card border border-border rounded-2xl text-base text-ink placeholder:text-ink-secondary shadow-xs focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl text-ink-secondary hover:text-ink hover:bg-bg"
            >
              {searching ? <Loader size={18} className="animate-spin" /> : <X size={18} />}
            </button>
          )}
        </div>
        {query && !isSearching && (
          <p className="mt-2 text-xs text-ink-secondary px-1">Type at least {MIN_QUERY} characters</p>
        )}
      </div>

      {isSearching ? (
        <section aria-label="Search results" aria-busy={searching}>
          {searchError ? (
            <p className="p-4 text-sm text-danger-text bg-danger-bg rounded-xl">
              Couldn't search right now. Check your connection and try again.
            </p>
          ) : results.length === 0 && !searching ? (
            <div className="py-10 text-center">
              <p className="text-ink font-medium">No animal matches “{term}”</p>
              <p className="text-sm text-ink-secondary mt-1">
                Check the tag number, or search by the owner's name or NID.
              </p>
            </div>
          ) : (
            <ul className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
              {results.map((animal) => {
                const deceased = animal.healthStatus === 'deceased';
                const outOfZone = !canWorkInZone(zoneAccess, animal.zoneId);
                return (
                  <li key={animal.id}>
                    <button
                      type="button"
                      disabled={deceased}
                      onClick={() => onPickAnimal(animal.id)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 min-h-[64px] text-left hover:bg-bg active:bg-bg disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ink tracking-wide">
                          <Highlight text={animal.tagNumber} term={term} />
                        </p>
                        <p className="text-sm text-ink-secondary truncate">
                          {[animal.species?.name, animal.sex].filter(Boolean).join(' · ')}
                          {' · '}
                          <Highlight text={animal.owner?.name ?? ''} term={term} />
                        </p>
                      </div>
                      {deceased ? (
                        <span className="text-xs font-medium text-danger-text">Deceased</span>
                      ) : outOfZone ? (
                        <span className="text-right text-xs leading-tight text-warning-text shrink-0">
                          Not your zone
                          {animal.zone?.name && (
                            <span className="block text-ink-secondary">{animal.zone.name}</span>
                          )}
                        </span>
                      ) : (
                        <ChevronRight size={20} className="text-ink-secondary shrink-0" aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : (
        <>
          {/* Due now */}
          <section aria-labelledby="due-now-heading" className="space-y-3">
            <div className="flex items-baseline justify-between px-1">
              <h2 id="due-now-heading" className="text-sm font-semibold text-ink">
                Due now
                {due && dueNow.length > 0 && (
                  <span className="ml-2 text-ink-secondary font-normal tabular-nums">
                    {dueNow.length}
                  </span>
                )}
              </h2>
              {dueError && (
                <button
                  type="button"
                  onClick={loadDue}
                  className="inline-flex items-center gap-1 text-sm text-brand-text font-medium"
                >
                  <RefreshCw size={14} aria-hidden /> Retry
                </button>
              )}
            </div>
            {due === null ? (
              <div className="space-y-2" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-[72px] rounded-2xl bg-card border border-border animate-pulse" />
                ))}
              </div>
            ) : dueError ? (
              <p className="px-1 text-sm text-ink-secondary">
                Couldn't load who's due. You can still search above.
              </p>
            ) : dueNow.length === 0 ? (
              <p className="px-4 py-5 text-sm text-ink-secondary bg-card border border-border rounded-2xl text-center">
                Nothing overdue or due today. Search above to record any animal.
              </p>
            ) : (
              <DueList rows={dueNow} onPick={onPickDue} />
            )}
          </section>

          {upcoming.length > 0 && (
            <section aria-labelledby="upcoming-heading" className="space-y-3">
              <h2 id="upcoming-heading" className="px-1 text-sm font-semibold text-ink">
                Coming up this week
                <span className="ml-2 text-ink-secondary font-normal tabular-nums">
                  {upcoming.length}
                </span>
              </h2>
              <DueList rows={visibleUpcoming} onPick={onPickDue} />
              {upcoming.length > visibleUpcoming.length && (
                <button
                  type="button"
                  onClick={() => setShowAllUpcoming(true)}
                  className="w-full py-3 text-sm font-medium text-brand-text"
                >
                  Show {upcoming.length - visibleUpcoming.length} more
                </button>
              )}
            </section>
          )}

          {recent.length > 0 && (
            <section aria-labelledby="recent-heading" className="space-y-3">
              <h2
                id="recent-heading"
                className="px-1 text-sm font-semibold text-ink flex items-center gap-1.5"
              >
                <Clock size={14} aria-hidden className="text-ink-secondary" /> Recently vaccinated
              </h2>
              <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 snap-x">
                {recent.map((animal) => (
                  <button
                    key={animal.id}
                    type="button"
                    onClick={() => onPickAnimal(animal.id)}
                    className="snap-start shrink-0 max-w-[12rem] px-4 py-2.5 bg-card border border-border rounded-xl text-left hover:border-brand-border active:bg-bg"
                  >
                    <p className="text-sm font-semibold text-ink truncate tracking-wide">
                      {animal.tagNumber}
                    </p>
                    <p className="text-xs text-ink-secondary truncate">
                      {animal.speciesName} · {animal.ownerName}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function DueList({
  rows,
  onPick,
}: {
  rows: Array<{ row: DueVaccination; status: ReturnType<typeof dueStatus> }>;
  onPick: (row: DueVaccination) => void;
}) {
  return (
    <ul className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
      {rows.map(({ row, status }) => (
        <li key={row.id}>
          <button
            type="button"
            onClick={() => onPick(row)}
            className="w-full flex items-center gap-3 px-4 py-3 min-h-[72px] text-left hover:bg-bg active:bg-bg"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-ink tracking-wide truncate">{row.animal.tagNumber}</p>
                <DueBadge status={status} />
              </div>
              <p className="text-sm text-ink-secondary truncate">
                {row.protocol.disease} · {dueDoseLabel(row)}
                {' · '}
                {row.animal.owner.name}
              </p>
            </div>
            <ChevronRight size={20} className="text-ink-secondary shrink-0" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

function dueDoseLabel(row: DueVaccination): string {
  const primary = Math.max(1, row.totalDoses);
  return row.nextDoseNumber > primary
    ? `Booster #${row.nextDoseNumber - primary}`
    : `Dose ${row.nextDoseNumber}`;
}

/** Bolds the first case-insensitive match of `term` in `text`. */
function Highlight({ text, term }: { text: string; term: string }) {
  const i = text.toLowerCase().indexOf(term.toLowerCase());
  if (i < 0 || !term) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent text-ink font-semibold underline decoration-brand/50 underline-offset-2">
        {text.slice(i, i + term.length)}
      </mark>
      {text.slice(i + term.length)}
    </>
  );
}
