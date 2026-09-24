import { useState } from 'react';
import { useData } from '../../context/DataContext';
import MetricCard from '../MetricCard';
import RollUpToggle from '../RollUpToggle';
import { Dog, Syringe, Users, CheckCircle } from 'lucide-react';

function getDescendantZoneIds(zones: { parentId: string | null; id: string }[], zoneId: string): string[] {
  const ids = [zoneId];
  zones.filter(z => z.parentId === zoneId).forEach(child => ids.push(...getDescendantZoneIds(zones, child.id)));
  return ids;
}

export default function ZoneMetricCards() {
  const { currentUser, zones, animals, vaccinations, users } = useData();
  const [includeSubZones, setIncludeSubZones] = useState(false);
  const vetZones = currentUser?.zoneRoles?.filter(zr => zr.role === 'vet') ?? [];
  const primaryZoneId = vetZones[0]?.zoneId;
  const primaryZone = zones.find(z => z.id === primaryZoneId);
  const zoneIds = includeSubZones && primaryZoneId ? getDescendantZoneIds(zones, primaryZoneId) : primaryZoneId ? [primaryZoneId] : [];
  const zoneAnimals = animals.filter(a => zoneIds.includes(a.zoneId));
  const vaccinatedAnimalIds = new Set(vaccinations.filter(v => zoneAnimals.some(a => a.id === v.animalId)).map(v => v.animalId));
  const totalAnimals = zoneAnimals.length;
  const vaccinationRate = totalAnimals > 0 ? Math.round((vaccinatedAnimalIds.size / totalAnimals) * 100) : 0;
  const healthyCount = zoneAnimals.filter(a => a.healthStatus === 'healthy').length;
  const sickCount = zoneAnimals.filter(a => a.healthStatus === 'sick').length;
  const technicians = users.filter(u => u.role === 'technician' && u.zoneRoles.some(zr => zoneIds.includes(zr.zoneId)));

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-display font-semibold text-ink">{primaryZone?.name ?? 'Zone'} Metrics</h2>
          {includeSubZones && <p className="text-xs text-ink-secondary mt-0.5">Including all sub-zones</p>}
        </div>
        <RollUpToggle includeSubZones={includeSubZones} onToggle={setIncludeSubZones} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Animals" value={totalAnimals} icon={Dog} />
        <MetricCard label="Vaccination Rate" value={`${vaccinationRate}%`} sublabel={`${vaccinatedAnimalIds.size} of ${totalAnimals}`} icon={Syringe} />
        <MetricCard label="Healthy" value={healthyCount} sublabel={sickCount > 0 ? `${sickCount} sick` : undefined} icon={CheckCircle} />
        <MetricCard label="Technicians" value={technicians.length} icon={Users} />
      </div>
    </div>
  );
}
