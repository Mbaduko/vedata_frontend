import { useState, type FormEvent } from 'react';
import { Check, Loader, Plus, Search } from 'lucide-react';
import type { Vaccine } from '../../services/api';

interface VaccinePickerProps {
  id: string;
  vaccines: Vaccine[];
  selected: string[];
  onChange: (ids: string[]) => void;
  /** Creates a vaccine for the current disease and returns it (selected automatically). */
  onCreate?: (name: string, manufacturer?: string) => Promise<Vaccine>;
  disabled?: boolean;
  disabledHint?: string;
  error?: string;
}

const FILTER_THRESHOLD = 10;

/**
 * Multi-select of the disease's vaccines as toggle chips, with an inline
 * "add vaccine" form. Chips beat an autocomplete here: lists are short and
 * seeing every option at once is faster than recalling names.
 */
export default function VaccinePicker({
  id,
  vaccines,
  selected,
  onChange,
  onCreate,
  disabled,
  disabledHint,
  error,
}: VaccinePickerProps) {
  const [filter, setFilter] = useState('');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  if (disabled) {
    return (
      <p className="text-sm text-ink-secondary px-4 py-3 rounded-lg border border-dashed border-border">
        {disabledHint}
      </p>
    );
  }

  const term = filter.trim().toLowerCase();
  const visible = term
    ? vaccines.filter((v) => `${v.name} ${v.manufacturer ?? ''}`.toLowerCase().includes(term))
    : vaccines;

  const toggle = (vaccineId: string) =>
    onChange(selected.includes(vaccineId) ? selected.filter((v) => v !== vaccineId) : [...selected, vaccineId]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onCreate || !name.trim()) return;
    try {
      setSaving(true);
      setCreateError(null);
      const vaccine = await onCreate(name.trim(), manufacturer.trim() || undefined);
      onChange([...selected, vaccine.id]);
      setName('');
      setManufacturer('');
      setAdding(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not add vaccine');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {vaccines.length > FILTER_THRESHOLD && (
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter vaccines…"
            aria-label="Filter vaccines"
            className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
          />
        </div>
      )}

      {vaccines.length === 0 ? (
        <p className="text-sm text-ink-secondary">
          No vaccines registered for this disease yet — add the first one below.
        </p>
      ) : (
        <div
          id={id}
          role="group"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="flex flex-wrap gap-2"
        >
          {visible.map((vaccine) => {
            const on = selected.includes(vaccine.id);
            return (
              <button
                key={vaccine.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(vaccine.id)}
                className={`inline-flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-lg border text-sm transition-colors ${
                  on
                    ? 'bg-brand-bg border-brand text-brand-text'
                    : 'bg-card border-border text-ink hover:border-ink-secondary'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center border ${
                    on ? 'bg-brand border-brand text-on-brand' : 'border-border'
                  }`}
                  aria-hidden
                >
                  {on && <Check size={12} strokeWidth={3} />}
                </span>
                <span className="font-medium">{vaccine.name}</span>
                {vaccine.manufacturer && (
                  <span className="text-xs text-ink-secondary">{vaccine.manufacturer}</span>
                )}
              </button>
            );
          })}
          {term && visible.length === 0 && (
            <p className="text-sm text-ink-secondary">No vaccines match “{filter}”.</p>
          )}
        </div>
      )}

      {error && (
        <p id={`${id}-error`} className="text-xs text-danger-text">
          {error}
        </p>
      )}

      {onCreate &&
        (adding ? (
          <form
            onSubmit={handleCreate}
            className="p-3 rounded-lg border border-border bg-bg space-y-2"
            aria-label="Add a vaccine"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Vaccine name *"
                aria-label="Vaccine name"
                className="px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
              />
              <input
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="Manufacturer (optional)"
                aria-label="Manufacturer"
                className="px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
              />
            </div>
            {createError && <p className="text-xs text-danger-text">{createError}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setCreateError(null);
                }}
                className="px-3 py-1.5 text-sm text-ink-secondary hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-brand text-on-brand rounded-lg hover:bg-brand-hover disabled:opacity-50"
              >
                {saving && <Loader size={14} className="animate-spin" />}
                Add & select
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-text hover:underline"
          >
            <Plus size={14} /> Add a vaccine that isn’t listed
          </button>
        ))}
    </div>
  );
}
