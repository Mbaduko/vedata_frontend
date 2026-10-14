import { UNIT_LABELS, toDays, type Interval, type IntervalUnit } from '../../utils/protocolSchedule';

interface IntervalInputProps {
  id: string;
  value: Interval;
  onChange: (value: Interval) => void;
  /** One-click common values, e.g. 3 weeks / 1 year. */
  presets?: Interval[];
  error?: string;
  ariaLabel: string;
  units?: IntervalUnit[];
}

const presetLabel = ({ value, unit }: Interval) => {
  const [one, many] = UNIT_LABELS[unit];
  return `${value} ${value === 1 ? one : many}`;
};

export default function IntervalInput({
  id,
  value,
  onChange,
  presets = [],
  error,
  ariaLabel,
  units = ['days', 'weeks', 'months', 'years'],
}: IntervalInputProps) {
  const errorId = `${id}-error`;
  const plural = value.value !== 1;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div
          className={`inline-flex rounded-lg border bg-card focus-within:ring-2 focus-within:ring-brand/25 ${
            error ? 'border-danger-text' : 'border-border focus-within:border-brand'
          }`}
        >
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={value.value}
            aria-label={`${ariaLabel} (amount)`}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) =>
              onChange({ ...value, value: e.target.value === '' ? '' : Math.max(0, Math.floor(Number(e.target.value))) })
            }
            className="w-16 px-3 py-2 bg-transparent text-sm text-ink tabular-nums rounded-l-lg focus:outline-none"
          />
          <select
            value={value.unit}
            aria-label={`${ariaLabel} (unit)`}
            onChange={(e) => onChange({ ...value, unit: e.target.value as IntervalUnit })}
            className="pl-2 pr-1 py-2 bg-transparent text-sm text-ink border-l border-border rounded-r-lg focus:outline-none cursor-pointer"
          >
            {units.map((u) => (
              <option key={u} value={u}>
                {UNIT_LABELS[u][plural ? 1 : 0]}
              </option>
            ))}
          </select>
        </div>

        {presets.length > 0 && (
          <div className="flex flex-wrap gap-1" role="group" aria-label={`${ariaLabel} presets`}>
            {presets.map((preset) => {
              const active = toDays(preset) === toDays(value) && preset.unit === value.unit;
              return (
                <button
                  key={`${preset.value}-${preset.unit}`}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange(preset)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    active
                      ? 'bg-brand-bg border-brand-border text-brand-text font-medium'
                      : 'border-border text-ink-secondary hover:text-ink hover:border-ink-secondary'
                  }`}
                >
                  {presetLabel(preset)}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-xs text-danger-text mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
