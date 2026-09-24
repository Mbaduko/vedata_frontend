import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { zoneApi, type Zone, ApiError } from '../services/api';
import {
  Plus,
  MapPin,
  Search,
  Loader,
  AlertCircle,
  Users,
  Dog,
  Edit,
  Archive,
  X,
  Check,
  ChevronRight,
} from 'lucide-react';

export default function Zones() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Dashboard quick action: /zones?new=1 opens the create modal directly.
  useEffect(() => {
    if (searchParams.get('new')) {
      setShowCreateModal(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    loadZones();
  }, [searchQuery]);

  const loadZones = async () => {
    try {
      setLoading(true);
      const response = await zoneApi.getZones({ search: searchQuery || undefined });
      setZones(response.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load zones');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink">Zone Management</h1>
          <p className="text-ink-secondary mt-1">Manage geographic and administrative zones</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors font-medium"
        >
          <Plus size={18} />
          Create Zone
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
          placeholder="Search zones..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-ink placeholder-ink-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        />
      </div>

      {/* Zones Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader size={32} className="text-brand animate-spin" />
        </div>
      ) : zones.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <MapPin size={48} className="text-ink-secondary/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-ink mb-2">
            {searchQuery ? 'No zones found' : 'No zones yet'}
          </h3>
          <p className="text-ink-secondary mb-4">
            {searchQuery ? 'Try a different search term' : 'Create your first zone to get started'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors font-medium"
            >
              <Plus size={18} />
              Create Zone
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((zone) => (
            <ZoneCard key={zone.id} zone={zone} onUpdate={loadZones} />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateZoneModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadZones();
          }}
        />
      )}
    </div>
  );
}

function ZoneCard({ zone, onUpdate }: { zone: Zone; onUpdate: () => void }) {
  return (
    <Link
      to={`/zones/${zone.id}`}
      className="block bg-card border border-border rounded-xl p-6 hover:border-brand/50 hover:shadow-lg transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-bg flex items-center justify-center group-hover:scale-110 transition-transform">
            <MapPin size={24} className="text-brand" />
          </div>
          <div>
            <h3 className="font-semibold text-ink group-hover:text-brand transition-colors">{zone.name}</h3>
            <span className="inline-block px-2 py-0.5 bg-bg text-ink-secondary text-xs rounded-full mt-1">
              {zone.label}
            </span>
          </div>
        </div>
        <ChevronRight size={20} className="text-ink-secondary group-hover:text-brand group-hover:translate-x-1 transition-all" />
      </div>

      {zone.leadVet && (
        <div className="mb-4 pb-4 border-b border-border">
          <p className="text-xs text-ink-secondary mb-1">Lead Veterinarian</p>
          <p className="text-sm font-medium text-ink">{zone.leadVet.name}</p>
        </div>
      )}

      {zone.parentZone && (
        <div className="mb-4 pb-4 border-b border-border">
          <p className="text-xs text-ink-secondary mb-1">Parent Zone</p>
          <p className="text-sm text-ink">{zone.parentZone.name}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-2 text-ink-secondary mb-1">
            <Dog size={14} />
            <span className="text-xs">Animals</span>
          </div>
          <p className="text-xl font-bold text-ink">{zone._count?.animals || 0}</p>
        </div>
        <div>
          <div className="flex items-center gap-2 text-ink-secondary mb-1">
            <Users size={14} />
            <span className="text-xs">Owners</span>
          </div>
          <p className="text-xl font-bold text-ink">{zone._count?.owners || 0}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-xs text-ink-secondary">
          <span>Grace Period: {zone.technicianGracePeriodHours}h</span>
          {zone._count?.childZones ? (
            <span>{zone._count.childZones} sub-zone{zone._count.childZones !== 1 ? 's' : ''}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function CreateZoneModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    label: 'Zone',
    technicianGracePeriodHours: 24,
    inviteExpiryHours: 168,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await zoneApi.createZone(formData);
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create zone');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-ink">Create New Zone</h2>
          <button onClick={onClose} className="text-ink-secondary hover:text-ink transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-ink mb-1.5">
              Zone Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Northern Province, Musanze District"
              required
              disabled={loading}
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-ink placeholder-ink-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="label" className="block text-sm font-medium text-ink mb-1.5">
              Zone Type
            </label>
            <select
              id="label"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              disabled={loading}
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent disabled:opacity-50"
            >
              <option value="Zone">Zone</option>
              <option value="Region">Region</option>
              <option value="Province">Province</option>
              <option value="District">District</option>
              <option value="Sector">Sector</option>
              <option value="Cell">Cell</option>
              <option value="Village">Village</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="gracePeriod" className="block text-sm font-medium text-ink mb-1.5">
                Grace Period (hours)
              </label>
              <input
                id="gracePeriod"
                type="number"
                min="1"
                value={formData.technicianGracePeriodHours}
                onChange={(e) =>
                  setFormData({ ...formData, technicianGracePeriodHours: parseInt(e.target.value) })
                }
                disabled={loading}
                className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent disabled:opacity-50"
              />
              <p className="text-xs text-ink-secondary mt-1">Time techs can edit entries</p>
            </div>

            <div>
              <label htmlFor="inviteExpiry" className="block text-sm font-medium text-ink mb-1.5">
                Invite Expiry (hours)
              </label>
              <input
                id="inviteExpiry"
                type="number"
                min="1"
                value={formData.inviteExpiryHours}
                onChange={(e) => setFormData({ ...formData, inviteExpiryHours: parseInt(e.target.value) })}
                disabled={loading}
                className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent disabled:opacity-50"
              />
              <p className="text-xs text-ink-secondary mt-1">Team invite validity</p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Create Zone
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 bg-bg border border-border text-ink rounded-lg hover:bg-card transition-colors disabled:opacity-50 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
