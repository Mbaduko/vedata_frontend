import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { zoneApi, userApi, type Zone, ApiError } from '../services/api';
import {
  Plus,
  MapPin,
  Search,
  Loader,
  AlertCircle,
  Users,
  Dog,
  X,
  Check,
  ChevronRight,
  Building2,
  Crown,
  ShieldCheck,
  TrendingUp,
  Calendar,
  Network,
} from 'lucide-react';

export default function Zones() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
      setError(null);
      const params: { search?: string } = {};
      if (searchQuery && searchQuery.trim()) {
        params.search = searchQuery;
      }
      const zonesData = await zoneApi.getZones(params);
      setZones(zonesData || []); // Ensure we always set an array
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load zones');
      setZones([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary statistics
  const stats = zones.reduce(
    (acc, zone) => ({
      totalAnimals: acc.totalAnimals + (zone._count?.animals || 0),
      totalOwners: acc.totalOwners + (zone._count?.owners || 0),
      totalSubZones: acc.totalSubZones + (zone._count?.childZones || 0),
    }),
    { totalAnimals: 0, totalOwners: 0, totalSubZones: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-ink">Zone Management</h1>
            <p className="text-ink-secondary mt-2">
              Manage geographic and administrative zones across your organization
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-on-brand rounded-lg hover:bg-brand-hover transition-all font-medium shadow-sm hover:shadow-md"
          >
            <Plus size={20} />
            Create Zone
          </button>
        </div>

        {/* Stats Overview */}
        {!loading && zones.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-brand/10 to-brand/5 border border-brand/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand/20 flex items-center justify-center">
                  <MapPin size={20} className="text-brand" />
                </div>
                <div>
                  <p className="text-sm text-ink-secondary">Total Zones</p>
                  <p className="text-2xl font-bold text-ink">{zones.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Dog size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-ink-secondary">Total Animals</p>
                  <p className="text-2xl font-bold text-ink">{stats.totalAnimals}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Users size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-ink-secondary">Total Owners</p>
                  <p className="text-2xl font-bold text-ink">{stats.totalOwners}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Network size={20} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-ink-secondary">Sub-zones</p>
                  <p className="text-2xl font-bold text-ink">{stats.totalSubZones}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-danger-bg border border-danger-border rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <AlertCircle size={20} className="text-danger-text flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-danger-text font-medium">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-ink-secondary hover:text-danger-text transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
          <input
            type="text"
            placeholder="Search zones by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-ink placeholder-ink-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent shadow-sm"
          />
        </div>
      </div>

      {/* Zones Display */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-card border border-border rounded-xl">
          <Loader size={40} className="text-brand animate-spin mb-4" />
          <p className="text-ink-secondary">Loading zones...</p>
        </div>
      ) : zones?.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <div className="w-20 h-20 rounded-full bg-brand-bg flex items-center justify-center mx-auto mb-4">
            <MapPin size={36} className="text-brand" />
          </div>
          <h3 className="text-xl font-semibold text-ink mb-2">
            {searchQuery ? 'No zones found' : 'No zones yet'}
          </h3>
          <p className="text-ink-secondary mb-6 max-w-md mx-auto">
            {searchQuery
              ? 'Try adjusting your search terms or clearing the search to see all zones'
              : 'Get started by creating your first zone to organize animals and owners geographically'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-on-brand rounded-lg hover:bg-brand-hover transition-all font-medium shadow-sm"
            >
              <Plus size={20} />
              Create Your First Zone
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {zones?.map((zone) => (
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
  const hasChildren = (zone._count?.childZones || 0) > 0;
  const hasParent = !!zone.parentZone;

  return (
    <Link
      to={`/zones/${zone.id}`}
      className="group block bg-card border border-border rounded-xl overflow-hidden hover:border-brand/50 hover:shadow-xl transition-all duration-200"
    >
      {/* Header with hierarchy indicator */}
      <div className="bg-gradient-to-r from-brand-bg to-brand-bg/50 px-5 py-4 border-b border-border/50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-11 h-11 rounded-lg bg-brand/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <MapPin size={22} className="text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-ink group-hover:text-brand transition-colors text-lg truncate">
                {zone.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center px-2 py-0.5 bg-white/50 text-brand text-xs font-medium rounded-full border border-brand/20">
                  {zone.label}
                </span>
                {hasParent && (
                  <span className="inline-flex items-center gap-1 text-xs text-ink-secondary">
                    <Building2 size={12} />
                    Sub-zone
                  </span>
                )}
              </div>
            </div>
          </div>
          <ChevronRight
            size={20}
            className="text-ink-secondary group-hover:text-brand group-hover:translate-x-1 transition-all flex-shrink-0"
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Management Info */}
        <div className="space-y-2.5">
          {zone.createdBy && (
            <div className="flex items-start gap-2.5">
              <Crown size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-ink-secondary">Zone Owner</p>
                <p className="text-sm font-medium text-ink truncate">{zone.createdBy.name}</p>
              </div>
            </div>
          )}

          {zone.leadVet && (
            <div className="flex items-start gap-2.5">
              <ShieldCheck size={16} className="text-brand flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-ink-secondary">Lead Vet</p>
                <p className="text-sm font-medium text-ink truncate">{zone.leadVet.name}</p>
              </div>
            </div>
          )}

          {hasParent && zone.parentZone && (
            <div className="flex items-start gap-2.5">
              <Building2 size={16} className="text-ink-secondary flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-ink-secondary">Parent Zone</p>
                <p className="text-sm font-medium text-ink truncate">{zone.parentZone.name}</p>
              </div>
            </div>
          )}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-ink-secondary mb-1">
              <Dog size={14} />
            </div>
            <p className="text-lg font-bold text-ink">{zone._count?.animals || 0}</p>
            <p className="text-xs text-ink-secondary">Animals</p>
          </div>
          <div className="text-center border-l border-r border-border">
            <div className="flex items-center justify-center gap-1.5 text-ink-secondary mb-1">
              <Users size={14} />
            </div>
            <p className="text-lg font-bold text-ink">{zone._count?.owners || 0}</p>
            <p className="text-xs text-ink-secondary">Owners</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-ink-secondary mb-1">
              <Network size={14} />
            </div>
            <p className="text-lg font-bold text-ink">{zone._count?.childZones || 0}</p>
            <p className="text-xs text-ink-secondary">Sub-zones</p>
          </div>
        </div>

        {/* Footer with grace period */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
            <Calendar size={12} />
            <span>Grace: {zone.technicianGracePeriodHours}h</span>
          </div>
          {hasChildren && (
            <div className="flex items-center gap-1.5 text-xs text-brand font-medium">
              <TrendingUp size={12} />
              <span>Has hierarchy</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function CreateZoneModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    label: 'Zone',
    parentZoneId: '',
    leadVetId: '',
    technicianGracePeriodHours: 24,
  });
  const [zones, setZones] = useState<Zone[]>([]);
  const [vets, setVets] = useState<any[]>([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [loadingVets, setLoadingVets] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadZones();
    loadVets();
  }, []);

  const loadZones = async () => {
    try {
      setLoadingZones(true);
      const response = await zoneApi.getZones({ limit: 100 });
      setZones(response.data || []);
    } catch (err) {
      console.error('Failed to load zones:', err);
    } finally {
      setLoadingZones(false);
    }
  };

  const loadVets = async () => {
    try {
      setLoadingVets(true);
      const users = await userApi.getUsers({ limit: 100 });
      setVets(users.filter((u: any) => u.role === 'vet'));
    } catch (err) {
      console.error('Failed to load vets:', err);
    } finally {
      setLoadingVets(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await zoneApi.createZone({
        name: formData.name,
        label: formData.label,
        parentZoneId: formData.parentZoneId || undefined,
        leadVetId: formData.leadVetId || undefined,
        technicianGracePeriodHours: formData.technicianGracePeriodHours,
      });
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
            <div className="bg-danger-bg border border-danger-border rounded-lg p-3 text-sm text-danger-text">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-ink mb-1.5">
              Zone Name <span className="text-danger-text">*</span>
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

          <div>
            <label htmlFor="parentZone" className="block text-sm font-medium text-ink mb-1.5">
              Parent Zone (Optional)
            </label>
            <select
              id="parentZone"
              value={formData.parentZoneId}
              onChange={(e) => setFormData({ ...formData, parentZoneId: e.target.value })}
              disabled={loading || loadingZones}
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent disabled:opacity-50"
            >
              <option value="">No parent zone (top level)</option>
              {zones?.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name} ({zone.label})
                </option>
              ))}
            </select>
            <p className="text-xs text-ink-secondary mt-1">Create as a sub-zone of another zone</p>
          </div>

          <div>
            <label htmlFor="leadVet" className="block text-sm font-medium text-ink mb-1.5">
              Lead Veterinarian (Optional)
            </label>
            <select
              id="leadVet"
              value={formData.leadVetId}
              onChange={(e) => setFormData({ ...formData, leadVetId: e.target.value })}
              disabled={loading || loadingVets}
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent disabled:opacity-50"
            >
              <option value="">No lead vet</option>
              {vets.map((vet) => (
                <option key={vet.id} value={vet.id}>
                  {vet.name} ({vet.email})
                </option>
              ))}
            </select>
            <p className="text-xs text-ink-secondary mt-1">Assign a vet to lead this zone</p>
          </div>

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

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand text-on-brand rounded-lg hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
