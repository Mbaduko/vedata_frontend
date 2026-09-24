import { useEffect, useState } from 'react';
import { speciesApi, type Species, type Breed, ApiError } from '../services/api';
import {
  Plus,
  Pencil,
  Trash2,
  Loader,
  AlertCircle,
  X,
  Check,
  Search,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

export default function ConfigSpecies() {
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSpecies, setExpandedSpecies] = useState<Set<string>>(new Set());

  // Modals
  const [showSpeciesModal, setShowSpeciesModal] = useState(false);
  const [showBreedModal, setShowBreedModal] = useState(false);
  const [editingSpecies, setEditingSpecies] = useState<Species | null>(null);
  const [editingBreed, setEditingBreed] = useState<{ breed: Breed; speciesId: string } | null>(null);
  const [selectedSpeciesForBreed, setSelectedSpeciesForBreed] = useState<string | null>(null);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'species' | 'breed'; id: string; name: string } | null>(
    null
  );

  useEffect(() => {
    loadSpecies();
  }, []);

  const loadSpecies = async () => {
    try {
      setLoading(true);
      const data = await speciesApi.getSpecies();
      setSpecies(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load species');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (speciesId: string) => {
    const newExpanded = new Set(expandedSpecies);
    if (newExpanded.has(speciesId)) {
      newExpanded.delete(speciesId);
    } else {
      newExpanded.add(speciesId);
    }
    setExpandedSpecies(newExpanded);
  };

  const filteredSpecies = species.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader size={32} className="text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink">Species & Breeds Configuration</h1>
          <p className="text-ink-secondary mt-1">Manage animal species and their breeds</p>
        </div>
        <button
          onClick={() => {
            setEditingSpecies(null);
            setShowSpeciesModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors font-medium"
        >
          <Plus size={18} />
          Add Species
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
        <input
          type="text"
          placeholder="Search species..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-ink placeholder-ink-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        />
      </div>

      {/* Species List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {filteredSpecies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle size={48} className="text-ink-secondary/50 mb-3" />
            <p className="text-ink-secondary">
              {searchQuery ? 'No species found matching your search' : 'No species configured yet'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowSpeciesModal(true)}
                className="mt-4 text-brand hover:underline text-sm"
              >
                Add your first species
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredSpecies.map((sp) => (
              <SpeciesRow
                key={sp.id}
                species={sp}
                expanded={expandedSpecies.has(sp.id)}
                onToggleExpand={() => toggleExpanded(sp.id)}
                onEdit={() => {
                  setEditingSpecies(sp);
                  setShowSpeciesModal(true);
                }}
                onDelete={() => setDeleteConfirm({ type: 'species', id: sp.id, name: sp.name })}
                onAddBreed={() => {
                  setSelectedSpeciesForBreed(sp.id);
                  setEditingBreed(null);
                  setShowBreedModal(true);
                }}
                onEditBreed={(breed) => {
                  setEditingBreed({ breed, speciesId: sp.id });
                  setSelectedSpeciesForBreed(sp.id);
                  setShowBreedModal(true);
                }}
                onDeleteBreed={(breed) => setDeleteConfirm({ type: 'breed', id: breed.id, name: breed.name })}
                onRefresh={loadSpecies}
              />
            ))}
          </div>
        )}
      </div>

      {/* Species Modal */}
      {showSpeciesModal && (
        <SpeciesModal
          species={editingSpecies}
          onClose={() => {
            setShowSpeciesModal(false);
            setEditingSpecies(null);
          }}
          onSuccess={() => {
            setShowSpeciesModal(false);
            setEditingSpecies(null);
            loadSpecies();
          }}
        />
      )}

      {/* Breed Modal */}
      {showBreedModal && selectedSpeciesForBreed && (
        <BreedModal
          speciesId={selectedSpeciesForBreed}
          breed={editingBreed?.breed || null}
          onClose={() => {
            setShowBreedModal(false);
            setEditingBreed(null);
            setSelectedSpeciesForBreed(null);
          }}
          onSuccess={() => {
            setShowBreedModal(false);
            setEditingBreed(null);
            setSelectedSpeciesForBreed(null);
            loadSpecies();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <DeleteConfirmModal
          type={deleteConfirm.type}
          name={deleteConfirm.name}
          onConfirm={async () => {
            try {
              if (deleteConfirm.type === 'species') {
                await speciesApi.deleteSpecies(deleteConfirm.id);
              } else {
                await speciesApi.deleteBreed(deleteConfirm.id);
              }
              loadSpecies();
              setDeleteConfirm(null);
            } catch (err) {
              setError(err instanceof ApiError ? err.message : 'Delete failed');
              setDeleteConfirm(null);
            }
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

// Species Row Component
function SpeciesRow({
  species,
  expanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddBreed,
  onEditBreed,
  onDeleteBreed,
  onRefresh,
}: {
  species: Species;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddBreed: () => void;
  onEditBreed: (breed: Breed) => void;
  onDeleteBreed: (breed: Breed) => void;
  onRefresh: () => void;
}) {
  const [loadingBreeds, setLoadingBreeds] = useState(false);
  const [fullSpecies, setFullSpecies] = useState<Species | null>(null);

  useEffect(() => {
    if (expanded && !fullSpecies) {
      loadBreeds();
    }
  }, [expanded]);

  const loadBreeds = async () => {
    try {
      setLoadingBreeds(true);
      const data = await speciesApi.getSpeciesById(species.id);
      setFullSpecies(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBreeds(false);
    }
  };

  const breeds = fullSpecies?.breeds || [];

  return (
    <div>
      {/* Species Header */}
      <div className="p-4 hover:bg-bg/50 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <button onClick={onToggleExpand} className="text-ink-secondary hover:text-ink transition-colors">
              {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            <div className="flex-1">
              <h3 className="font-semibold text-ink">{species.name}</h3>
              <p className="text-sm text-ink-secondary mt-0.5">
                {species._count?.breeds || 0} breed{species._count?.breeds !== 1 ? 's' : ''} •{' '}
                {species._count?.animals || 0} animal{species._count?.animals !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="p-2 text-ink-secondary hover:text-brand hover:bg-brand-bg rounded-lg transition-colors"
              title="Edit species"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-ink-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete species"
              disabled={(species._count?.animals || 0) > 0}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Breeds Section */}
      {expanded && (
        <div className="px-4 pb-4 pl-12 bg-bg/30">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-ink-secondary">Breeds</p>
            <button
              onClick={onAddBreed}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors"
            >
              <Plus size={14} />
              Add Breed
            </button>
          </div>

          {loadingBreeds ? (
            <div className="flex items-center justify-center py-8">
              <Loader size={20} className="text-brand animate-spin" />
            </div>
          ) : breeds.length === 0 ? (
            <div className="text-center py-6 text-ink-secondary text-sm">No breeds configured for this species</div>
          ) : (
            <div className="space-y-2">
              {breeds.map((breed) => (
                <div
                  key={breed.id}
                  className="flex items-center justify-between p-3 bg-card border border-border rounded-lg hover:border-brand/30 transition-colors"
                >
                  <span className="text-sm text-ink">{breed.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditBreed(breed)}
                      className="p-1.5 text-ink-secondary hover:text-brand hover:bg-brand-bg rounded transition-colors"
                      title="Edit breed"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => onDeleteBreed(breed)}
                      className="p-1.5 text-ink-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Delete breed"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Species Modal
function SpeciesModal({
  species,
  onClose,
  onSuccess,
}: {
  species: Species | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(species?.name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      setError(null);
      if (species) {
        await speciesApi.updateSpecies(species.id, { name: name.trim() });
      } else {
        await speciesApi.createSpecies({ name: name.trim() });
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-ink">{species ? 'Edit Species' : 'Add Species'}</h2>
          <button onClick={onClose} className="text-ink-secondary hover:text-ink transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-ink mb-1.5">
              Species Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Cattle, Goat, Dog"
              required
              disabled={loading}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-ink placeholder-ink-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent disabled:opacity-50"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={16} />
                  {species ? 'Update' : 'Create'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-bg border border-border text-ink rounded-lg hover:bg-card transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Breed Modal
function BreedModal({
  speciesId,
  breed,
  onClose,
  onSuccess,
}: {
  speciesId: string;
  breed: Breed | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(breed?.name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      setError(null);
      if (breed) {
        await speciesApi.updateBreed(breed.id, { name: name.trim() });
      } else {
        await speciesApi.createBreed({ speciesId, name: name.trim() });
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-ink">{breed ? 'Edit Breed' : 'Add Breed'}</h2>
          <button onClick={onClose} className="text-ink-secondary hover:text-ink transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="breed-name" className="block text-sm font-medium text-ink mb-1.5">
              Breed Name
            </label>
            <input
              id="breed-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Ankole, Friesian, German Shepherd"
              required
              disabled={loading}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-ink placeholder-ink-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent disabled:opacity-50"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={16} />
                  {breed ? 'Update' : 'Create'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-bg border border-border text-ink rounded-lg hover:bg-card transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Confirmation Modal
function DeleteConfirmModal({
  type,
  name,
  onConfirm,
  onCancel,
}: {
  type: 'species' | 'breed';
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-ink mb-1">Delete {type === 'species' ? 'Species' : 'Breed'}?</h3>
              <p className="text-sm text-ink-secondary">
                Are you sure you want to delete <span className="font-medium text-ink">{name}</span>? This action cannot
                be undone.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete
                </>
              )}
            </button>
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 bg-bg border border-border text-ink rounded-lg hover:bg-card transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
