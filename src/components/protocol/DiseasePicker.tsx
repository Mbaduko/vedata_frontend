import { useState, type FormEvent } from 'react';
import { Loader, Plus, Search } from 'lucide-react';
import type { Disease } from '../../services/api';

interface DiseasePickerProps {
  id: string;
  diseases: Disease[];
  value: string;
  onChange: (diseaseId: string) => void;
  onCreate?: (name: string) => Promise<Disease>;
  disabled?: boolean;
  disabledHint?: string;
  error?: string;
}

const FILTER_THRESHOLD = 10;

/** Single-select of diseases as radio chips, with inline creation. */
export default function DiseasePicker({
  id,
  diseases,
  value,
  onChange,
  onCreate,
  disabled,
  disabledHint,
  error,
}: DiseasePickerProps) {
  const [filter, setFilter] = useState('');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
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
  const visible = term ? diseases.filter((d) => d.name.toLowerCase().includes(term)) : diseases;
  const exactMatch = diseases.find((d) => d.name.toLowerCase() === name.trim().toLowerCase());

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!onCreate || !name.trim()) return;
    if (exactMatch) {
      onChange(exactMatch.id);
      setAdding(false);
      setName('');
      return;
    }
    try {
      setSaving(true);
      setCreateError(null);
      const disease = await onCreate(name.trim());
      onChange(disease.id);
      setName('');
      setAdding(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not add disease');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {diseases.length > FILTER_THRESHOLD && (
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter diseases…"
            aria-label="Filter diseases"
            className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
          />
        </div>
      )}

      {diseases.length === 0 ? (
        <p className="text-sm text-ink-secondary">No diseases registered for this species yet.</p>
      ) : (
        <div
          id={id}
          role="radiogroup"
          aria-label="Disease"
          aria-invalid={Boolean(error)}
          className="flex flex-wrap gap-2"
        >
          {visible.map((disease) => {
            const on = disease.id === value;
            return (
              <button
                key={disease.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange(disease.id)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  on
                    ? 'bg-brand text-on-brand border-brand'
                    : 'bg-card border-border text-ink hover:border-ink-secondary'
                }`}
              >
                {disease.name}
              </button>
            );
          })}
          {term && visible.length === 0 && (
            <p className="text-sm text-ink-secondary">No diseases match “{filter}”.</p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-danger-text">{error}</p>}

      {onCreate &&
        (adding ? (
          <form onSubmit={handleCreate} className="flex flex-wrap items-start gap-2" aria-label="Add a disease">
            <div className="flex-1 min-w-[12rem]">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Disease name"
                aria-label="Disease name"
                className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
              />
              {exactMatch && (
                <p className="text-xs text-warning-text mt-1">
                  “{exactMatch.name}” already exists — saving will select it.
                </p>
              )}
              {createError && <p className="text-xs text-danger-text mt-1">{createError}</p>}
            </div>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-brand text-on-brand rounded-lg hover:bg-brand-hover disabled:opacity-50"
            >
              {saving && <Loader size={14} className="animate-spin" />}
              {exactMatch ? 'Select' : 'Add & select'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setCreateError(null);
              }}
              className="px-3 py-2 text-sm text-ink-secondary hover:text-ink"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-text hover:underline"
          >
            <Plus size={14} /> Add a disease that isn’t listed
          </button>
        ))}
    </div>
  );
}
