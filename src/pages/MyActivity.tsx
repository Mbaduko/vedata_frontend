import { useData } from '../context/DataContext';
import MetricCard from '../components/MetricCard';
import GracePeriodCountdown from '../components/GracePeriodCountdown';
import { FileText, Syringe, Clock, Calendar } from 'lucide-react';

interface Entry { id: string; type: 'animal' | 'vaccination'; date: string; tagNumber?: string; editableUntil: string | null; }

export default function MyActivity() {
  const { currentUser, animals, vaccinations } = useData();
  const myAnimals = animals.filter(a => a.enteredByUserId === currentUser?.id);
  const myVaccinations = vaccinations.filter(v => v.administeredByUserId === currentUser?.id);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const thisWeekAnimals = myAnimals.filter(a => new Date(a.registeredAt) >= weekAgo).length;
  const thisWeekVaccinations = myVaccinations.filter(v => new Date(v.dateAdministered) >= weekAgo).length;
  const editableCount = myAnimals.filter(a => a.editableUntil && new Date(a.editableUntil) > now).length;
  const recentEntries: Entry[] = [
    ...myAnimals.map(a => ({ id: a.id, type: 'animal' as const, date: a.registeredAt, tagNumber: a.tagNumber, editableUntil: a.editableUntil })),
    ...myVaccinations.map(v => ({ id: v.id, type: 'vaccination' as const, date: v.dateAdministered, editableUntil: v.editableUntil })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-display font-semibold text-ink">My Activity</h1><p className="text-sm text-ink-secondary mt-1">Your performance metrics and recent entries</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Animals Registered" value={myAnimals.length} sublabel={`${thisWeekAnimals} this week`} icon={FileText} />
        <MetricCard label="Vaccinations" value={myVaccinations.length} sublabel={`${thisWeekVaccinations} this week`} icon={Syringe} />
        <MetricCard label="Editable Records" value={editableCount} sublabel="In grace period" icon={Clock} />
        <MetricCard label="This Week" value={thisWeekAnimals + thisWeekVaccinations} sublabel="Total entries" icon={Calendar} />
      </div>
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-display font-semibold text-ink mb-4">Recent Entries</h2>
        {recentEntries.length === 0 ? <p className="text-sm text-ink-secondary py-4 text-center">No entries yet</p> : (
          <div className="space-y-3">
            {recentEntries.map(entry => (
              <div key={entry.id} className="flex items-center justify-between p-3 bg-bg rounded-lg">
                <div className="flex items-center gap-3"><FileText size={14} className="text-ink-secondary" /><div><p className="text-sm font-medium text-ink">{entry.type === 'animal' ? `Registered ${entry.tagNumber}` : `Vaccination ${entry.id}`}</p><p className="text-xs text-ink-secondary">{new Date(entry.date).toLocaleDateString()}</p></div></div>
                {entry.editableUntil && <GracePeriodCountdown editableUntil={entry.editableUntil} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
