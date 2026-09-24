import { useState } from 'react';
import { ChevronRight, ChevronDown, MapPin, User } from 'lucide-react';
import type { Zone, User as UserType, Animal } from '../types';

interface ZoneNodeProps {
  zone: Zone;
  zones: Zone[];
  users: UserType[];
  animals: Animal[];
  level?: number;
  onSelect?: (zone: Zone) => void;
  selectedZoneId?: string;
}

function ZoneNode({ zone, zones, users, animals, level = 0, onSelect, selectedZoneId }: ZoneNodeProps) {
  const [expanded, setExpanded] = useState(level < 2);
  const children = zones.filter(z => z.parentId === zone.id && !z.archived);
  const hasChildren = children.length > 0;
  const leadVet = users.find(u => u.zoneRoles.some(zr => zr.zoneId === zone.id && zr.isLead));
  const animalCount = animals.filter(a => a.zoneId === zone.id).length;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors ${selectedZoneId === zone.id ? 'bg-brand-bg text-brand-text border border-brand/20' : 'hover:bg-card text-ink'}`}
        style={{ marginLeft: level * 24 }}
        onClick={() => onSelect?.(zone)}
      >
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="p-0.5 hover:bg-border/30 rounded">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : <span className="w-5" />}
        <MapPin size={16} className="text-ink-secondary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{zone.name}</span>
            <span className="text-xs text-ink-secondary bg-bg px-1.5 py-0.5 rounded">{zone.label}</span>
            {animalCount > 0 && <span className="text-xs text-ink-secondary">{animalCount} animal{animalCount !== 1 ? 's' : ''}</span>}
          </div>
          {leadVet && <div className="flex items-center gap-1 text-xs text-ink-secondary mt-0.5"><User size={10} /> Lead: {leadVet.name}</div>}
        </div>
      </div>
      {expanded && hasChildren && (
        <div className="relative">
          <div className="absolute top-0 bottom-0 w-px bg-border" style={{ left: level * 24 + 20 }} />
          {children.map(child => <ZoneNode key={child.id} zone={child} zones={zones} users={users} animals={animals} level={level + 1} onSelect={onSelect} selectedZoneId={selectedZoneId} />)}
        </div>
      )}
    </div>
  );
}

interface ZoneTreeProps {
  zones: Zone[];
  users: UserType[];
  animals: Animal[];
  onSelect?: (zone: Zone) => void;
  selectedZoneId?: string;
}

export default function ZoneTree({ zones, users, animals, onSelect, selectedZoneId }: ZoneTreeProps) {
  const rootZones = zones.filter(z => !z.parentId && !z.archived);
  return (
    <div className="space-y-1">
      {rootZones.map(zone => <ZoneNode key={zone.id} zone={zone} zones={zones} users={users} animals={animals} level={0} onSelect={onSelect} selectedZoneId={selectedZoneId} />)}
    </div>
  );
}
