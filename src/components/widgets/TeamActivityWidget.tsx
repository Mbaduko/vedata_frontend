import { useData } from '../../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { Users, ArrowRight } from 'lucide-react';

export default function TeamActivityWidget() {
  const { currentUser, users, animals, vaccinations } = useData();
  const navigate = useNavigate();
  const vetZones = currentUser?.zoneRoles?.filter(zr => zr.role === 'vet') ?? [];
  const zoneIds = vetZones.map(zr => zr.zoneId);
  const technicians = users.filter(u => u.role === 'technician' && u.zoneRoles.some(zr => zoneIds.includes(zr.zoneId)));

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display font-semibold text-ink">Team Activity</h2>
        <button onClick={() => navigate('/team')} className="text-xs text-brand hover:text-brand/80 font-medium flex items-center gap-1">Manage team <ArrowRight size={12} /></button>
      </div>
      {technicians.length === 0 ? (
        <p className="text-sm text-ink-secondary py-4 text-center">No technicians assigned</p>
      ) : (
        <div className="space-y-3">
          {technicians.map(tech => {
            const techAnimals = animals.filter(a => a.enteredByUserId === tech.id);
            const techVaccinations = vaccinations.filter(v => v.administeredByUserId === tech.id);
            const zoneRole = tech.zoneRoles.find(zr => zoneIds.includes(zr.zoneId));
            const isExpired = zoneRole?.contractEnd && new Date(zoneRole.contractEnd) < new Date();
            return (
              <button key={tech.id} onClick={() => navigate(`/team/${tech.id}`)} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-bg transition-colors text-left">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-bg flex items-center justify-center"><Users size={14} className="text-brand-text" /></div>
                  <div><p className="text-sm font-medium text-ink">{tech.name}</p><p className="text-xs text-ink-secondary">{isExpired ? <span className="text-clay-text">Contract expired</span> : zoneRole?.contractEnd ? `Until ${new Date(zoneRole.contractEnd).toLocaleDateString()}` : 'Active'}</p></div>
                </div>
                <div className="text-right"><p className="text-sm font-medium text-ink tabular-nums">{techAnimals.length} entries</p><p className="text-xs text-ink-secondary tabular-nums">{techVaccinations.length} vaccinations</p></div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
