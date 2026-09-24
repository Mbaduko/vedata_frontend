import { useData } from '../context/DataContext';
import { useParams, useNavigate } from 'react-router-dom';
import MetricCard from '../components/MetricCard';
import { ArrowLeft, FileText, Syringe, Clock, Calendar } from 'lucide-react';

export default function TechnicianDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { users, animals, vaccinations, zones } = useData();

  const tech = users.find(u => u.id === id);
  if (!tech) {
    return (
      <div className="text-center py-12">
        <p className="text-ink-secondary">Technician not found</p>
        <button onClick={() => navigate('/team')} className="text-brand mt-2 text-sm">Back to team</button>
      </div>
    );
  }

  const techAnimals = animals.filter(a => a.enteredByUserId === tech.id);
  const techVaccinations = vaccinations.filter(v => v.administeredByUserId === tech.id);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisWeekAnimals = techAnimals.filter(a => new Date(a.registeredAt) >= weekAgo).length;
  const thisWeekVaccinations = techVaccinations.filter(v => new Date(v.dateAdministered) >= weekAgo).length;

  const editableCount = techAnimals.filter(a =>
    a.editableUntil && new Date(a.editableUntil) > now
  ).length;

  const zoneRole = tech.zoneRoles[0];
  const zone = zones.find(z => z.id === zoneRole?.zoneId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/team')}
          className="p-2 hover:bg-card rounded-lg border border-border"
        >
          <ArrowLeft size={16} className="text-ink-secondary" />
        </button>
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink">{tech.name}</h1>
          <p className="text-sm text-ink-secondary">
            {zone?.name} · {zoneRole?.contractEnd ? `Until ${new Date(zoneRole.contractEnd).toLocaleDateString()}` : 'Active'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Animals Registered"
          value={techAnimals.length}
          sublabel={`${thisWeekAnimals} this week`}
          icon={FileText}
        />
        <MetricCard
          label="Vaccinations"
          value={techVaccinations.length}
          sublabel={`${thisWeekVaccinations} this week`}
          icon={Syringe}
        />
        <MetricCard
          label="Editable Records"
          value={editableCount}
          sublabel="In grace period"
          icon={Clock}
        />
        <MetricCard
          label="This Week"
          value={thisWeekAnimals + thisWeekVaccinations}
          sublabel="Total entries"
          icon={Calendar}
        />
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-display font-semibold text-ink mb-4">Recent Activity</h2>
        {[...techAnimals, ...techVaccinations]
          .sort((a, b) => new Date(b.registeredAt || b.dateAdministered) - new Date(a.registeredAt || a.dateAdministered))
          .slice(0, 10)
          .map(entry => (
            <div key={entry.id} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
              <div>
                <p className="text-sm font-medium text-ink">
                  {entry.tagNumber
                    ? `Registered ${entry.tagNumber}`
                    : `Recorded vaccination ${entry.id}`
                  }
                </p>
                <p className="text-xs text-ink-secondary">
                  {new Date(entry.registeredAt || entry.dateAdministered).toLocaleString()}
                </p>
              </div>
              {entry.editableUntil && (
                <span className="text-xs text-ink-secondary bg-bg px-2 py-0.5 rounded-full">
                  Grace: {new Date(entry.editableUntil) > now ? 'Active' : 'Expired'}
                </span>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
