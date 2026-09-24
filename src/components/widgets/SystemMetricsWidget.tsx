import { useData } from '../../context/DataContext';
import MetricCard from '../MetricCard';
import { Users, Dog, Syringe, MapPin } from 'lucide-react';

export default function SystemMetricsWidget() {
  const { zones, users, animals, vaccinations } = useData();
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="text-lg font-display font-semibold text-ink mb-4">System Metrics</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Zones" value={zones.filter(z => !z.archived).length} icon={MapPin} />
        <MetricCard label="Total Users" value={users.length} icon={Users} />
        <MetricCard label="Total Animals" value={animals.length} icon={Dog} />
        <MetricCard label="Vaccinations" value={vaccinations.length} icon={Syringe} />
      </div>
    </div>
  );
}
