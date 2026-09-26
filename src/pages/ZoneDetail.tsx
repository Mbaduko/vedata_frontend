import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { zoneApi, userApi, invitationApi, type Zone, type UserRecord, ApiError } from '../services/api';
import {
  ArrowLeft,
  MapPin,
  Edit,
  Archive,
  Loader,
  AlertCircle,
  Users,
  Dog,
  UserPlus,
  Calendar,
  ShieldCheck,
  Crown,
  Building2,
  X,
  Check,
  Network,
  Clock,
  TrendingUp,
  Activity,
  Settings,
  MoreVertical,
  Eye,
  Plus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ZoneDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [zone, setZone] = useState<Zone | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showCreateSubZoneModal, setShowCreateSubZoneModal] = useState(false);
  const [showChangeLeadVetModal, setShowChangeLeadVetModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'subzones'>('overview');

  useEffect(() => {
    if (id) {
      loadZone();
    }
  }, [id]);

  const loadZone = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await zoneApi.getZone(id!);
      setZone(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load zone');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    try {
      await zoneApi.archiveZone(id!);
      navigate('/zones');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to archive zone');
      setShowArchiveModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <Loader size={48} className="text-brand animate-spin mb-4" />
        <p className="text-ink-secondary">Loading zone details...</p>
      </div>
    );
  }

  if (error || !zone) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/zones')}
          className="inline-flex items-center gap-2 text-ink-secondary hover:text-ink transition-colors font-medium"
        >
          <ArrowLeft size={18} />
          Back to Zones
        </button>
        <div className="bg-danger-bg border border-danger-border rounded-xl p-6 flex items-start gap-3">
          <AlertCircle size={24} className="text-danger-text flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-danger-text mb-1">Error Loading Zone</h3>
            <p className="text-sm text-danger-text">{error || 'Zone not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const canEdit = user?.role === 'superadmin' || user?.role === 'vet';
  const isOwner = zone.createdByUserId === user?.id;
  const isLeadVet = zone.leadVetId === user?.id;
  const hasAuthority = user?.role === 'superadmin' || isOwner || isLeadVet;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => navigate('/zones')}
          className="text-ink-secondary hover:text-brand transition-colors"
        >
          Zones
        </button>
        <span className="text-ink-secondary">/</span>
        {zone.parentZone && (
          <>
            <Link
              to={`/zones/${zone.parentZone.id}`}
              className="text-ink-secondary hover:text-brand transition-colors"
            >
              {zone.parentZone.name}
            </Link>
            <span className="text-ink-secondary">/</span>
          </>
        )}
        <span className="text-ink font-medium">{zone.name}</span>
      </div>

      {/* Header Section */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-brand-bg via-brand-bg/50 to-transparent px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Zone Icon and Title */}
            <div className="flex items-start gap-4 flex-1">
              <div className="w-16 h-16 rounded-xl bg-brand/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-lg">
                <MapPin size={32} className="text-brand" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-display font-bold text-ink">{zone.name}</h1>
                  <span className="inline-flex items-center px-3 py-1 bg-brand text-on-brand text-sm font-medium rounded-full shadow-sm">
                    {zone.label}
                  </span>
                </div>
                {zone.parentZone && (
                  <Link
                    to={`/zones/${zone.parentZone.id}`}
                    className="inline-flex items-center gap-2 text-sm text-ink-secondary hover:text-brand transition-colors group"
                  >
                    <Building2 size={16} />
                    <span>
                      Part of <span className="font-medium group-hover:underline">{zone.parentZone.name}</span>
                    </span>
                  </Link>
                )}
                <div className="flex items-center gap-4 mt-3 text-sm text-ink-secondary">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    <span>Created {new Date(zone.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Activity size={14} />
                    <span className="text-green-600 font-medium">Active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {hasAuthority && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-border text-ink rounded-lg hover:bg-bg transition-all font-medium shadow-sm"
                >
                  <Edit size={18} />
                  Edit Zone
                </button>
              )}
              {hasAuthority && (
                <button
                  onClick={() => setShowArchiveModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-danger-border text-danger-text rounded-lg hover:bg-danger-bg transition-all font-medium shadow-sm"
                >
                  <Archive size={18} />
                  Archive
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-t border-border">
          <div className="px-6 py-4 border-r border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Dog size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-ink">{zone._count?.animals || 0}</p>
                <p className="text-xs text-ink-secondary">Animals</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-r border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Users size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-ink">{zone._count?.owners || 0}</p>
                <p className="text-xs text-ink-secondary">Owners</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-r border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Network size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-ink">{zone._count?.childZones || 0}</p>
                <p className="text-xs text-ink-secondary">Sub-zones</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-ink">{zone.technicianGracePeriodHours}h</p>
                <p className="text-xs text-ink-secondary">Grace Period</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-1 border-b-2 transition-colors font-medium ${
              activeTab === 'overview'
                ? 'border-brand text-brand'
                : 'border-transparent text-ink-secondary hover:text-ink'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`pb-3 px-1 border-b-2 transition-colors font-medium ${
              activeTab === 'team'
                ? 'border-brand text-brand'
                : 'border-transparent text-ink-secondary hover:text-ink'
            }`}
          >
            Team Members
            {zone.userZoneRoles && zone.userZoneRoles.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-brand-bg text-brand text-xs rounded-full">
                {zone.userZoneRoles.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('subzones')}
            className={`pb-3 px-1 border-b-2 transition-colors font-medium ${
              activeTab === 'subzones'
                ? 'border-brand text-brand'
                : 'border-transparent text-ink-secondary hover:text-ink'
            }`}
          >
            Sub-zones
            {zone.childZones && zone.childZones.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-brand-bg text-brand text-xs rounded-full">
                {zone.childZones.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Management Card */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-ink mb-5 flex items-center gap-2">
              <Settings size={20} className="text-brand" />
              Management
            </h2>
            <div className="space-y-5">
              {zone.createdBy && (
                <div className="flex items-start gap-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Crown size={20} className="text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">Zone Owner</p>
                    <p className="text-base font-semibold text-ink">{zone.createdBy.name}</p>
                    <p className="text-sm text-ink-secondary mt-0.5">{zone.createdBy.email}</p>
                  </div>
                </div>
              )}

              {zone.leadVet && (
                <div className="flex items-start gap-4 p-4 bg-brand-bg border border-brand/20 rounded-lg">
                  <div className="w-10 h-10 rounded-lg bg-brand/20 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck size={20} className="text-brand" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-brand uppercase tracking-wide mb-1">Lead Veterinarian</p>
                    <p className="text-base font-semibold text-ink">{zone.leadVet.name}</p>
                    <p className="text-sm text-ink-secondary mt-0.5">{zone.leadVet.email}</p>
                  </div>
                  {hasAuthority && (
                    <button
                      onClick={() => setShowChangeLeadVetModal(true)}
                      className="text-brand hover:text-brand-hover transition-colors"
                      title="Change Lead Vet"
                    >
                      <Edit size={18} />
                    </button>
                  )}
                </div>
              )}

              {!zone.leadVet && (
                <div className="flex items-start gap-4 p-4 bg-bg border border-border rounded-lg">
                  <div className="w-10 h-10 rounded-lg bg-ink-secondary/10 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck size={20} className="text-ink-secondary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-ink-secondary uppercase tracking-wide mb-1">Lead Veterinarian</p>
                    <p className="text-sm text-ink-secondary">No lead vet assigned</p>
                  </div>
                  {hasAuthority && (
                    <button
                      onClick={() => setShowChangeLeadVetModal(true)}
                      className="text-brand hover:text-brand-hover transition-colors"
                      title="Assign Lead Vet"
                    >
                      <UserPlus size={18} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Configuration Card */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-ink mb-5 flex items-center gap-2">
              <Settings size={20} className="text-brand" />
              Configuration
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-bg rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock size={18} className="text-ink-secondary" />
                  <div>
                    <p className="text-sm font-medium text-ink">Technician Grace Period</p>
                    <p className="text-xs text-ink-secondary">Time allowed for data entry edits</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-brand">{zone.technicianGracePeriodHours}h</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-bg rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity size={18} className="text-ink-secondary" />
                  <div>
                    <p className="text-sm font-medium text-ink">Status</p>
                    <p className="text-xs text-ink-secondary">Current operational state</p>
                  </div>
                </div>
                <span className="inline-flex items-center px-3 py-1 bg-green-500/10 text-green-600 text-sm font-medium rounded-full">
                  Active
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-bg rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-ink-secondary" />
                  <div>
                    <p className="text-sm font-medium text-ink">Created Date</p>
                    <p className="text-xs text-ink-secondary">Zone establishment date</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-ink">
                  {new Date(zone.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Team Members</h2>
            {hasAuthority && (
              <Link
                to={`/team/invite?zoneId=${zone.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-on-brand rounded-lg hover:bg-brand-hover transition-all text-sm font-medium shadow-sm"
              >
                <UserPlus size={16} />
                Invite Member
              </Link>
            )}
          </div>
          <div className="p-6">
            {zone.userZoneRoles && zone.userZoneRoles.length > 0 ? (
              <div className="space-y-3">
                {zone.userZoneRoles.map((uzr: any) => (
                  <div
                    key={uzr.id}
                    className="flex items-center justify-between p-4 bg-bg hover:bg-brand-bg/30 border border-border hover:border-brand/30 rounded-lg transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-brand-bg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <span className="text-brand font-semibold text-lg">
                          {uzr.user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-base font-semibold text-ink">{uzr.user.name}</p>
                        <p className="text-sm text-ink-secondary">{uzr.user.email}</p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1.5 text-sm font-medium rounded-full ${
                        uzr.role === 'vet'
                          ? 'bg-brand-bg text-brand border border-brand/20'
                          : 'bg-bg text-ink-secondary border border-border'
                      }`}
                    >
                      {uzr.role === 'vet' ? 'Veterinarian' : 'Technician'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-ink-secondary/10 flex items-center justify-center mx-auto mb-4">
                  <Users size={28} className="text-ink-secondary" />
                </div>
                <h3 className="text-lg font-semibold text-ink mb-2">No team members yet</h3>
                <p className="text-ink-secondary mb-4 max-w-md mx-auto">
                  Invite veterinarians and technicians to work in this zone
                </p>
                {hasAuthority && (
                  <Link
                    to={`/team/invite?zoneId=${zone.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-on-brand rounded-lg hover:bg-brand-hover transition-all font-medium"
                  >
                    <UserPlus size={18} />
                    Invite First Member
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'subzones' && (
        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Sub-zones</h2>
            {hasAuthority && (
              <button
                onClick={() => setShowCreateSubZoneModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-on-brand rounded-lg hover:bg-brand-hover transition-all text-sm font-medium shadow-sm"
              >
                <Plus size={16} />
                Create Sub-zone
              </button>
            )}
          </div>
          <div className="p-6">
            {zone.childZones && zone.childZones.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {zone.childZones.map((child: any) => (
                  <Link
                    key={child.id}
                    to={`/zones/${child.id}`}
                    className="group flex items-center gap-4 p-5 bg-bg hover:bg-brand-bg/30 border border-border hover:border-brand/50 rounded-xl transition-all"
                  >
                    <div className="w-12 h-12 rounded-lg bg-brand-bg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <MapPin size={22} className="text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-ink group-hover:text-brand transition-colors truncate">
                        {child.name}
                      </p>
                      <p className="text-sm text-ink-secondary">{child.label}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <p className="font-semibold text-ink">{child._count?.animals || 0}</p>
                        <p className="text-xs text-ink-secondary">Animals</p>
                      </div>
                      <ArrowLeft size={16} className="text-ink-secondary group-hover:text-brand group-hover:rotate-180 transition-all" style={{ transform: 'rotate(180deg)' }} />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-ink-secondary/10 flex items-center justify-center mx-auto mb-4">
                  <Network size={28} className="text-ink-secondary" />
                </div>
                <h3 className="text-lg font-semibold text-ink mb-2">No sub-zones yet</h3>
                <p className="text-ink-secondary max-w-md mx-auto">
                  This zone doesn't have any sub-zones. Create child zones to build a hierarchical structure.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showEditModal && (
        <EditZoneModal
          zone={zone}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            loadZone();
          }}
        />
      )}

      {showArchiveModal && (
        <ConfirmArchiveModal
          zone={zone}
          onClose={() => setShowArchiveModal(false)}
          onConfirm={handleArchive}
        />
      )}

      {showCreateSubZoneModal && (
        <CreateSubZoneModal
          parentZone={zone}
          onClose={() => setShowCreateSubZoneModal(false)}
          onSuccess={() => {
            setShowCreateSubZoneModal(false);
            loadZone();
          }}
        />
      )}

      {showChangeLeadVetModal && (
        <ChangeLeadVetModal
          zone={zone}
          currentUserId={user?.id}
          onClose={() => setShowChangeLeadVetModal(false)}
          onSuccess={() => {
            setShowChangeLeadVetModal(false);
            loadZone();
          }}
        />
      )}
    </div>
  );
}

function EditZoneModal({
  zone,
  onClose,
  onSuccess,
}: {
  zone: Zone;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: zone.name,
    label: zone.label,
    leadVetId: zone.leadVetId || '',
    technicianGracePeriodHours: zone.technicianGracePeriodHours,
  });
  const [vets, setVets] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingVets, setLoadingVets] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVets();
  }, []);

  const loadVets = async () => {
    try {
      setLoadingVets(true);
      const vets = await userApi.getVets({ limit: 100 });
      setVets(vets);
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
      await zoneApi.updateZone(zone.id, {
        ...formData,
        leadVetId: formData.leadVetId || null,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update zone');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-ink">Edit Zone</h2>
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
              required
              disabled={loading}
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent disabled:opacity-50"
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
            <label htmlFor="leadVet" className="block text-sm font-medium text-ink mb-1.5">
              Lead Veterinarian
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
            <p className="text-xs text-ink-secondary mt-1">Time techs can edit their entries</p>
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
                  Saving...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Save Changes
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

function ConfirmArchiveModal({
  zone,
  onClose,
  onConfirm,
}: {
  zone: Zone;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  const hasData = (zone._count?.animals || 0) > 0 || (zone._count?.owners || 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="w-12 h-12 rounded-xl bg-danger-bg flex items-center justify-center mb-4">
            <Archive size={24} className="text-danger-text" />
          </div>
          <h2 className="text-xl font-semibold text-ink mb-2">Archive Zone?</h2>
          <p className="text-sm text-ink-secondary mb-4">
            {hasData
              ? 'This zone cannot be archived because it has active animals or owners. Please reassign them first.'
              : `Are you sure you want to archive "${zone.name}"? This action cannot be undone easily.`}
          </p>

          {!hasData && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-danger-text text-white rounded-lg hover:bg-danger-text/90 transition-colors disabled:opacity-50 font-medium"
              >
                {loading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Archiving...
                  </>
                ) : (
                  <>
                    <Archive size={18} />
                    Archive Zone
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 bg-bg border border-border text-ink rounded-lg hover:bg-card transition-colors disabled:opacity-50 font-medium"
              >
                Cancel
              </button>
            </div>
          )}

          {hasData && (
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-brand text-on-brand rounded-lg hover:bg-brand-hover transition-colors font-medium"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateSubZoneModal({
  parentZone,
  onClose,
  onSuccess,
}: {
  parentZone: Zone;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    label: 'Zone',
    leadVetId: '',
    technicianGracePeriodHours: parentZone.technicianGracePeriodHours, // Inherit from parent
  });
  const [vets, setVets] = useState<any[]>([]);
  const [loadingVets, setLoadingVets] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVets();
  }, []);

  const loadVets = async () => {
    try {
      setLoadingVets(true);
      const vets = await userApi.getVets({ limit: 100 });
      setVets(vets);
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
        parentZoneId: parentZone.id, // Set parent to current zone
        leadVetId: formData.leadVetId || undefined,
        technicianGracePeriodHours: formData.technicianGracePeriodHours,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create sub-zone');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-ink">Create Sub-zone</h2>
            <p className="text-sm text-ink-secondary mt-1">
              Creating under <span className="font-medium text-brand">{parentZone.name}</span>
            </p>
          </div>
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

          <div className="bg-brand-bg border border-brand/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Building2 size={20} className="text-brand flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-ink">Parent Zone</p>
                <p className="text-sm text-ink-secondary">
                  {parentZone.name} <span className="text-xs">({parentZone.label})</span>
                </p>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-ink mb-1.5">
              Sub-zone Name <span className="text-danger-text">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., North District, Urban Sector"
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
            <p className="text-xs text-ink-secondary mt-1">Assign a vet to lead this sub-zone</p>
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
            <p className="text-xs text-ink-secondary mt-1">
              Inherited from parent zone ({parentZone.technicianGracePeriodHours}h), can be customized
            </p>
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
                  Create Sub-zone
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

function ChangeLeadVetModal({
  zone,
  currentUserId,
  onClose,
  onSuccess,
}: {
  zone: Zone;
  currentUserId?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedVetId, setSelectedVetId] = useState<string>(zone.leadVetId || '');
  const [vets, setVets] = useState<any[]>([]);
  const [loadingVets, setLoadingVets] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    loadVets();
  }, []);

  const loadVets = async () => {
    try {
      setLoadingVets(true);
      const vets = await userApi.getVets({ limit: 100 });
      setVets(vets);
    } catch (err) {
      console.error('Failed to load vets:', err);
      setError('Failed to load veterinarians');
    } finally {
      setLoadingVets(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await zoneApi.updateZone(zone.id, {
        leadVetId: selectedVetId || null,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update lead vet');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setInviting(true);
      setError(null);
      await invitationApi.inviteUser({
        email: inviteEmail,
        role: 'vet',
        zoneId: zone.id,
      });
      setInviteSuccess(true);
      setInviteEmail('');
      setTimeout(() => {
        setInviteSuccess(false);
        setShowInviteForm(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  // Separate vets into team members (in this zone) and others
  // Exclude current user from selection (prevent self-appointment)
  const teamVets = vets.filter((vet) =>
    vet.id !== currentUserId &&
    zone.userZoneRoles?.some((uzr: any) => uzr.user.id === vet.id && uzr.user.role === 'vet')
  );
  const otherVets = vets.filter((vet) =>
    vet.id !== currentUserId &&
    !zone.userZoneRoles?.some((uzr: any) => uzr.user.id === vet.id)
  );

  const currentLeadVet = vets.find((v) => v.id === zone.leadVetId);
  const selectedVet = vets.find((v) => v.id === selectedVetId);
  const hasChanges = selectedVetId !== (zone.leadVetId || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-ink">
              {zone.leadVet ? 'Change Lead Veterinarian' : 'Assign Lead Veterinarian'}
            </h2>
            <p className="text-sm text-ink-secondary mt-1">
              For zone: <span className="font-medium text-brand">{zone.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-ink-secondary hover:text-ink transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-danger-bg border border-danger-border rounded-lg p-3 text-sm text-danger-text flex items-start gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {inviteSuccess && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-sm text-green-600 flex items-start gap-2">
              <Check size={16} className="flex-shrink-0 mt-0.5" />
              <span>Invitation sent successfully!</span>
            </div>
          )}

          {/* Current Lead Vet */}
          {currentLeadVet && (
            <div className="bg-brand-bg border border-brand/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck size={20} className="text-brand flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-brand uppercase tracking-wide mb-1">
                    Current Lead Vet
                  </p>
                  <p className="text-sm font-semibold text-ink">{currentLeadVet.name}</p>
                  <p className="text-xs text-ink-secondary">{currentLeadVet.email}</p>
                </div>
              </div>
            </div>
          )}

          {!currentLeadVet && (
            <div className="bg-bg border border-border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck size={20} className="text-ink-secondary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-ink-secondary uppercase tracking-wide mb-1">
                    Current Lead Vet
                  </p>
                  <p className="text-sm text-ink-secondary">No lead vet assigned</p>
                </div>
              </div>
            </div>
          )}

          {/* Selection Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="leadVet" className="block text-sm font-medium text-ink">
                  Select Lead Veterinarian
                </label>
                <button
                  type="button"
                  onClick={() => setShowInviteForm(!showInviteForm)}
                  className="inline-flex items-center gap-1.5 text-xs text-brand hover:text-brand-hover transition-colors font-medium"
                >
                  <UserPlus size={14} />
                  {showInviteForm ? 'Cancel Invite' : 'Invite New Vet'}
                </button>
              </div>

              <select
                id="leadVet"
                value={selectedVetId}
                onChange={(e) => setSelectedVetId(e.target.value)}
                disabled={loading || loadingVets}
                className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent disabled:opacity-50"
              >
                <option value="">No lead vet (Remove current)</option>
                
                {teamVets.length > 0 && (
                  <optgroup label="─── Team Members in This Zone ───">
                    {teamVets.map((vet) => (
                      <option key={vet.id} value={vet.id}>
                        👥 {vet.name} ({vet.email})
                      </option>
                    ))}
                  </optgroup>
                )}

                {otherVets.length > 0 && (
                  <optgroup label="─── Other Veterinarians ───">
                    {otherVets.map((vet) => (
                      <option key={vet.id} value={vet.id}>
                        {vet.name} ({vet.email})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <p className="text-xs text-ink-secondary mt-1">
                Lead vet has full authority over this specific zone
              </p>
            </div>

            {/* Invite Form */}
            {showInviteForm && (
              <div className="bg-brand-bg/30 border border-brand/30 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2 mb-2">
                  <UserPlus size={18} className="text-brand flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-ink">Invite New Veterinarian</p>
                    <p className="text-xs text-ink-secondary">
                      Send an invitation to join as a vet in this zone
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Enter email address"
                    disabled={inviting}
                    className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-ink placeholder-ink-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent disabled:opacity-50 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleInvite}
                    disabled={inviting || !inviteEmail.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-on-brand rounded-lg hover:bg-brand-hover transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    {inviting ? (
                      <>
                        <Loader size={14} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <UserPlus size={14} />
                        Send Invite
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Preview of New Selection */}
            {hasChanges && selectedVet && (
              <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Check size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">
                      New Lead Vet
                    </p>
                    <p className="text-sm font-semibold text-ink">{selectedVet.name}</p>
                    <p className="text-xs text-ink-secondary">{selectedVet.email}</p>
                  </div>
                </div>
              </div>
            )}

            {hasChanges && !selectedVetId && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">
                      Removing Lead Vet
                    </p>
                    <p className="text-sm text-ink-secondary">
                      Zone will have no lead veterinarian. Only the owner and superadmins will have
                      authority.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-4">
              <button
                type="submit"
                disabled={loading || !hasChanges || loadingVets}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand text-on-brand rounded-lg hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    {selectedVetId ? 'Assign Lead Vet' : 'Remove Lead Vet'}
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
    </div>
  );
}
