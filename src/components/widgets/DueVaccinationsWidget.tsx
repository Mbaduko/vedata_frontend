import { useData } from '../../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight } from 'lucide-react';

export default function DueVaccinationsWidget() {
  const { currentUser, zones, animals, vaccinations, owners } = useData();
  const navigate = useNavigate();
  const vetZones = currentUser?.zoneRoles?.filter(zr => zr.role === 'vet') ?? [];
  const zoneIds = vetZones.map(zr => zr.zoneId);
  const today = new Date();

  const dueItems = vaccinations
    .filter(vac => {
      if (!vac.nextDueDate) return false;
      const animal = animals.find(a => a.id === vac.animalId);
      return animal && animal.healthStatus !== 'deceased' && zoneIds.includes(animal.zoneId);
    })
    .map(vac => {
      const animal = animals.find(a => a.id === vac.animalId)!;
      const dueDate = new Date(vac.nextDueDate!);
      const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);
      return { ...vac, animal, owner: owners.find(o => o.id === animal.ownerId), isOverdue: diffDays > 0, daysOverdue: Math.abs(diffDays) };
    })
    .filter(item => item.isOverdue || (new Date(item.nextDueDate!).getTime() - today.getTime()) / 86400000 <= 14)
    .sort((a, b) => new Date(a.nextDueDate!).getTime() - new Date(b.nextDueDate!).getTime());

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display font-semibold text-ink">Due Vaccinations</h2>
        <button onClick={() => navigate('/vaccinations/due')} className="text-xs text-brand hover:text-brand/80 font-medium flex items-center gap-1">View all <ArrowRight size={12} /></button>
      </div>
      {dueItems.length === 0 ? (
        <p className="text-sm text-ink-secondary py-4 text-center">No due or overdue vaccinations</p>
      ) : (
        <div className="space-y-2">
          {dueItems.slice(0, 5).map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-bg">
              <div className="flex items-center gap-3">
                {item.isOverdue && <AlertCircle size={14} className="text-gold-text shrink-0" />}
                <div><p className="text-sm font-medium text-ink">{item.animal.tagNumber}</p><p className="text-xs text-ink-secondary">{item.owner?.name} · Due {new Date(item.nextDueDate!).toLocaleDateString()}</p></div>
              </div>
              {item.isOverdue && <span className="text-xs font-medium text-gold-text bg-gold-bg px-2 py-0.5 rounded-full">{item.daysOverdue}d overdue</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
