import { useData } from '../../context/DataContext';
import MetricCard from '../MetricCard';
import { FileText, Syringe, Clock, Calendar } from 'lucide-react';

export default function MyMetricsWidget() {
  const { currentUser, animals, vaccinations } = useData();
  const myAnimals = animals.filter(a => a.enteredByUserId === currentUser?.id);
  const myVaccinations = vaccinations.filter(v => v.administeredByUserId === currentUser?.id);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const thisWeekAnimals = myAnimals.filter(a => new Date(a.registeredAt) >= weekAgo).length;
  const thisWeekVaccinations = myVaccinations.filter(v => new Date(v.dateAdministered) >= weekAgo).length;
  const editableCount = myAnimals.filter(a => a.editableUntil && new Date(a.editableUntil) > now).length;

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="text-lg font-display font-semibold text-ink mb-4">My Activity</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Animals Registered" value={myAnimals.length} sublabel={`${thisWeekAnimals} this week`} icon={FileText} />
        <MetricCard label="Vaccinations" value={myVaccinations.length} sublabel={`${thisWeekVaccinations} this week`} icon={Syringe} />
        <MetricCard label="Editable Records" value={editableCount} sublabel="In grace period" icon={Clock} />
        <MetricCard label="This Week" value={thisWeekAnimals + thisWeekVaccinations} sublabel="Total entries" icon={Calendar} />
      </div>
    </div>
  );
}
