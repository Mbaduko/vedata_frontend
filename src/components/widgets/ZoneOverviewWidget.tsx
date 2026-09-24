import { useData } from '../../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { MapPin, Users, Dog } from 'lucide-react';

export default function ZoneOverviewWidget() {
  const { zones, users, animals } = useData();
  const navigate = useNavigate();
  const rootZones = zones.filter(z => !z.parentId && !z.archived);

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display font-semibold text-ink">Zone Overview</h2>
        <button onClick={() => navigate('/zones')} className="text-xs text-brand hover:text-brand/80 font-medium">View all zones →</button>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-bg rounded-lg p-3 text-center"><MapPin size={16} className="text-brand mx-auto mb-1" /><p className="text-lg font-bold text-ink tabular-nums">{zones.filter(z => !z.archived).length}</p><p className="text-xs text-ink-secondary">Zones</p></div>
        <div className="bg-bg rounded-lg p-3 text-center"><Users size={16} className="text-brand mx-auto mb-1" /><p className="text-lg font-bold text-ink tabular-nums">{users.length}</p><p className="text-xs text-ink-secondary">Users</p></div>
        <div className="bg-bg rounded-lg p-3 text-center"><Dog size={16} className="text-brand mx-auto mb-1" /><p className="text-lg font-bold text-ink tabular-nums">{animals.length}</p><p className="text-xs text-ink-secondary">Animals</p></div>
      </div>
      <div className="space-y-2">
        {rootZones.map(zone => {
          const zoneAnimals = animals.filter(a => a.zoneId === zone.id).length;
          const subZones = zones.filter(z => z.parentId === zone.id && !z.archived);
          return (
            <button key={zone.id} onClick={() => navigate(`/zones/${zone.id}`)} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-bg transition-colors text-left">
              <div className="flex items-center gap-2"><MapPin size={14} className="text-ink-secondary" /><span className="text-sm font-medium text-ink">{zone.name}</span><span className="text-xs text-ink-secondary bg-bg px-1.5 py-0.5 rounded">{zone.label}</span></div>
              <div className="flex items-center gap-4 text-xs text-ink-secondary">{subZones.length > 0 && <span>{subZones.length} sub-zones</span>}<span className="tabular-nums">{zoneAnimals} animals</span></div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
