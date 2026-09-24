import { useState } from 'react';
import { useData, useDispatch } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import ZoneTree from '../components/ZoneTree';
import EmptyState from '../components/EmptyState';
import { MapPin, Plus, Search } from 'lucide-react';

export default function Zones() {
  const { zones, users, animals } = useData();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [newZone, setNewZone] = useState({ name: '', label: '', parentId: '' });

  const rootZones = zones.filter(z => !z.parentId && !z.archived);

  const handleCreateZone = () => {
    if (!newZone.name.trim()) return;
    dispatch({
      type: 'CREATE_ZONE',
      payload: {
        name: newZone.name.trim(),
        label: newZone.label.trim() || 'Zone',
        parentId: newZone.parentId || null,
        leadVetId: null,
        technicianGracePeriodHours: 24,
        inviteExpiryHours: 168,
      },
    });
    setNewZone({ name: '', label: '', parentId: '' });
    setShowCreate(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink">Zones</h1>
          <p className="text-sm text-ink-secondary mt-1">Manage the zone hierarchy</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand/90 transition-colors"
        >
          <Plus size={16} /> Create Zone
        </button>
      </div>

      {showCreate && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-ink mb-4">New Zone</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Name</label>
              <input
                type="text"
                value={newZone.name}
                onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                placeholder="Zone name"
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Label</label>
              <input
                type="text"
                value={newZone.label}
                onChange={(e) => setNewZone({ ...newZone, label: e.target.value })}
                placeholder="e.g. District, Sector"
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Parent Zone</label>
              <select
                value={newZone.parentId}
                onChange={(e) => setNewZone({ ...newZone, parentId: e.target.value })}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              >
                <option value="">None (Top level)</option>
                {zones.filter(z => !z.archived).map(z => (
                  <option key={z.id} value={z.id}>{z.name} ({z.label})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleCreateZone}
              disabled={!newZone.name.trim()}
              className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand/90 disabled:opacity-50 transition-colors"
            >
              Create Zone
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-bg rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {rootZones.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No zones yet"
          description="Create your first zone to start organizing your veterinary network."
          actionLabel="Create Zone"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="bg-card border border-border rounded-xl p-4">
          <ZoneTree
            zones={zones}
            users={users}
            animals={animals}
            onSelect={(zone) => navigate(`/zones/${zone.id}`)}
          />
        </div>
      )}
    </div>
  );
}
