import { useState } from 'react';
import { useData, useDispatch } from '../context/DataContext';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';

export default function ConfigSpecies() {
  const { species, breeds } = useData();
  const dispatch = useDispatch();
  const [expandedSpecies, setExpandedSpecies] = useState<string | null>(null);
  const [showNewSpecies, setShowNewSpecies] = useState(false);
  const [newSpeciesName, setNewSpeciesName] = useState<string>('');
  const [showNewBreed, setShowNewBreed] = useState<string | null>(null);
  const [newBreedName, setNewBreedName] = useState<string>('');

  const handleCreateSpecies = () => {
    if (!newSpeciesName.trim()) return;
    dispatch({ type: 'CREATE_SPECIES', payload: { name: newSpeciesName.trim() } });
    setNewSpeciesName('');
    setShowNewSpecies(false);
  };

  const handleCreateBreed = () => {
    if (!newBreedName.trim()) return;
    dispatch({ type: 'CREATE_BREED', payload: { name: newBreedName.trim(), speciesId: showNewBreed } });
    setNewBreedName('');
    setShowNewBreed(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink">Species & Breeds</h1>
          <p className="text-sm text-ink-secondary mt-1">Configure animal species and their breeds</p>
        </div>
        <button
          onClick={() => setShowNewSpecies(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand/90"
        >
          <Plus size={16} /> New Species
        </button>
      </div>

      {showNewSpecies && (
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <input
            type="text"
            value={newSpeciesName}
            onChange={(e) => setNewSpeciesName(e.target.value)}
            placeholder="Species name"
            className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <button onClick={handleCreateSpecies} disabled={!newSpeciesName.trim()} className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand/90 disabled:opacity-50">Create</button>
          <button onClick={() => setShowNewSpecies(false)} className="px-4 py-2 text-sm text-ink-secondary hover:bg-bg rounded-lg border border-border">Cancel</button>
        </div>
      )}

      <div className="space-y-3">
        {species.map(s => {
          const speciesBreeds = breeds.filter(b => b.speciesId === s.id);
          const isExpanded = expandedSpecies === s.id;

          return (
            <div key={s.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedSpecies(isExpanded ? null : s.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-bg/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown size={16} className="text-ink-secondary" /> : <ChevronRight size={16} className="text-ink-secondary" />}
                  <p className="text-sm font-medium text-ink">{s.name}</p>
                  <span className="text-xs text-ink-secondary bg-bg px-1.5 py-0.5 rounded">
                    {speciesBreeds.length} breed{speciesBreeds.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-border pt-3">
                  <div className="space-y-2">
                    {speciesBreeds.map(breed => (
                      <div key={breed.id} className="flex items-center justify-between p-2 bg-bg rounded-lg">
                        <span className="text-sm text-ink">{breed.name}</span>
                      </div>
                    ))}
                  </div>
                  {showNewBreed === s.id ? (
                    <div className="flex items-center gap-2 mt-3">
                      <input
                        type="text"
                        value={newBreedName}
                        onChange={(e) => setNewBreedName(e.target.value)}
                        placeholder="Breed name"
                        className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
                        autoFocus
                      />
                      <button onClick={handleCreateBreed} disabled={!newBreedName.trim()} className="px-3 py-2 bg-brand text-white text-sm rounded-lg hover:bg-brand/90 disabled:opacity-50">Add</button>
                      <button onClick={() => { setShowNewBreed(null); setNewBreedName(''); }} className="px-3 py-2 text-sm text-ink-secondary hover:bg-bg rounded-lg border border-border">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNewBreed(s.id)}
                      className="mt-3 text-xs text-brand hover:text-brand/80 font-medium flex items-center gap-1"
                    >
                      <Plus size={12} /> Add Breed
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
