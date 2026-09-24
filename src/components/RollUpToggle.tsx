export default function RollUpToggle({ includeSubZones, onToggle }: { includeSubZones: boolean; onToggle: (val: boolean) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-ink-secondary">Zone only</span>
      <button
        onClick={() => onToggle(!includeSubZones)}
        className={`relative w-11 h-6 rounded-full transition-colors ${includeSubZones ? 'bg-brand' : 'bg-border'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${includeSubZones ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
      <span className="text-sm text-ink-secondary">Include sub-zones</span>
    </div>
  );
}
