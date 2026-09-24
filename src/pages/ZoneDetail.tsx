import { useState } from 'react';
import { useData, useDispatch } from '../context/DataContext';
import { useParams, useNavigate } from 'react-router-dom';
import ImpactConfirmDialog from '../components/ImpactConfirmDialog';
import MetricCard from '../components/MetricCard';
import { ArrowLeft, MapPin, Dog, Users, Settings, Move, Archive } from 'lucide-react';

function getDescendantZoneIds(zones, zoneId) {
  const ids = [zoneId];
  const children = zones.filter(z => z.parentId === zoneId);
  children.forEach(child => {
    ids.push(...getDescendantZoneIds(zones, child.id));
  });
  return ids;
}

export default function ZoneDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { zones, users, animals, currentUser } = useData();
  const dispatch = useDispatch();

  const zone = zones.find(z => z.id === id);
  if (!zone) {
    return (
      <div className="text-center py-12">
        <p className="text-ink-secondary">Zone not found</p>
        <button onClick={() => navigate('/zones')} className="text-brand mt-2 text-sm">
          Back to zones
        </button>
      </div>
    );
  }

  const [showMove, setShowMove] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string>('');
  const [settings, setSettings] = useState<Record<string, unknown>>({
    name: zone.name,
    label: zone.label,
    technicianGracePeriodHours: zone.technicianGracePeriodHours,
    inviteExpiryHours: zone.inviteExpiryHours,
  });

  const descendantIds = getDescendantZoneIds(zones, zone.id);
  const zoneAnimals = animals.filter(a => descendantIds.includes(a.zoneId));
  const zoneUsers = users.filter(u => u.zoneRoles.some(zr => descendantIds.includes(zr.zoneId)));
  const childZones = zones.filter(z => z.parentId === zone.id && !z.archived);

  const leadVet = users.find(u =>
    u.zoneRoles.some(zr => zr.zoneId === zone.id && zr.isLead)
  );

  // Check for circular reference
  const getAncestorIds = (zoneId, zones) => {
    const parent = zones.find(z => z.id === zoneId);
    if (!parent?.parentId) return [];
    return [parent.parentId, ...getAncestorIds(parent.parentId, zones)];
  };
  const ancestorIds = getAncestorIds(zone.id, zones);
  const validTargets = zones.filter(z =>
    z.id !== zone.id && !z.archived && !ancestorIds.includes(z.id) && !descendantIds.includes(z.id)
  );

  const handleMove = () => {
    if (!moveTarget) return;
    dispatch({ type: 'MOVE_ZONE', payload: { zoneId: zone.id, newParentId: moveTarget } });
    setShowMove(false);
    setMoveTarget('');
  };

  const handleArchive = () => {
    dispatch({ type: 'ARCHIVE_ZONE', payload: { zoneId: zone.id } });
    setShowArchive(false);
    navigate('/zones');
  };

  const handleSaveSettings = () => {
    dispatch({
      type: 'UPDATE_ZONE',
      payload: { zoneId: zone.id, updates: settings },
    });
    setShowSettings(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/zones')}
          className="p-2 hover:bg-card rounded-lg border border-border"
        >
          <ArrowLeft size={16} className="text-ink-secondary" />
        </button>
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink">{zone.name}</h1>
          <p className="text-sm text-ink-secondary">{zone.label} · {zone.parentId ? `Under ${zones.find(z => z.id === zone.parentId)?.name}` : 'Top level'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Animals" value={zoneAnimals.length} icon={Dog} />
        <MetricCard label="Users" value={zoneUsers.length} icon={Users} />
        <MetricCard label="Sub-zones" value={childZones.length} icon={MapPin} />
        <MetricCard
          label="Lead Vet"
          value={leadVet ? leadVet.name.split(' ').slice(0, 2).join(' ') : 'None'}
          icon={Users}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {currentUser?.role === 'superadmin' && (
          <>
            <button
              onClick={() => setShowMove(true)}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium text-ink hover:bg-card transition-colors"
            >
              <Move size={16} /> Move Zone
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium text-ink hover:bg-card transition-colors"
            >
              <Settings size={16} /> Settings
            </button>
            <button
              onClick={() => setShowArchive(true)}
              className="flex items-center gap-2 px-4 py-2 border border-clay/30 rounded-lg text-sm font-medium text-clay-text hover:bg-clay-bg/30 transition-colors"
            >
              <Archive size={16} /> Archive
            </button>
          </>
        )}
      </div>

      {/* Assigned Users */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-display font-semibold text-ink mb-4">Assigned Users</h2>
        <div className="space-y-2">
          {zoneUsers.length === 0 ? (
            <p className="text-sm text-ink-secondary">No users assigned to this zone</p>
          ) : (
            zoneUsers.map(user => {
              const zoneRole = user.zoneRoles.find(zr => zr.zoneId === zone.id);
              return (
                <div key={user.id} className="flex items-center justify-between p-3 bg-bg rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-ink">{user.name}</p>
                    <p className="text-xs text-ink-secondary">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium bg-brand-bg text-brand-text px-2 py-0.5 rounded-full">
                      {zoneRole?.isLead ? 'Lead Vet' : user.role}
                    </span>
                    {zoneRole?.contractEnd && (
                      <p className="text-xs text-ink-secondary mt-1">
                        Until {new Date(zoneRole.contractEnd).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Move Dialog */}
      {showMove && (
        <ImpactConfirmDialog
          title="Move Zone"
          message={`Move "${zone.name}" and all its data to a new parent zone.`}
          impacts={[
            { label: 'Sub-zones', value: childZones.length },
            { label: 'Animals', value: zoneAnimals.length },
            { label: 'Users', value: zoneUsers.length },
          ]}
          onConfirm={handleMove}
          onCancel={() => { setShowMove(false); setMoveTarget(''); }}
          confirmLabel="Move Zone"
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-display font-semibold text-ink mb-4">Zone Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Name</label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Label</label>
                <input
                  type="text"
                  value={settings.label}
                  onChange={(e) => setSettings({ ...settings, label: e.target.value })}
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Technician Grace Period (hours)</label>
                <input
                  type="number"
                  value={settings.technicianGracePeriodHours}
                  onChange={(e) => setSettings({ ...settings, technicianGracePeriodHours: parseInt(e.target.value) || 24 })}
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Invite Expiry (hours)</label>
                <input
                  type="number"
                  value={settings.inviteExpiryHours}
                  onChange={(e) => setSettings({ ...settings, inviteExpiryHours: parseInt(e.target.value) || 168 })}
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-bg rounded-lg border border-border"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 text-sm font-medium bg-brand text-on-brand rounded-lg hover:bg-brand-hover"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation */}
      {showArchive && (
        <ImpactConfirmDialog
          title="Archive Zone"
          message={`Archive "${zone.name}"? This zone will be hidden from active views but historical data is retained.`}
          impacts={[
            { label: 'Sub-zones to archive', value: childZones.length },
            { label: 'Animals affected', value: zoneAnimals.length },
            { label: 'Users to suspend', value: zoneUsers.filter(u => u.role === 'technician').length },
          ]}
          onConfirm={handleArchive}
          onCancel={() => setShowArchive(false)}
          confirmLabel="Archive Zone"
        />
      )}
    </div>
  );
}
