import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { vaccinationApi, type VaccinationMetrics } from '../services/api';
import MetricCard from '../components/MetricCard';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Loader,
  ListChecks,
  Settings,
  Syringe,
} from 'lucide-react';

export default function VaccinationDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<VaccinationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await vaccinationApi.getVaccinationMetrics();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vaccination metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader size={32} className="text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-semibold text-ink">Vaccinations</h1>
        <button
          onClick={() => navigate('/vaccinations/record')}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-on-brand rounded-lg hover:bg-brand-hover"
        >
          <Syringe size={16} /> Record Vaccination
        </button>
      </div>

      {error && (
        <div className="p-3 bg-clay-bg border border-clay-border rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-clay-text mt-0.5" />
            <p className="text-sm text-clay-text">{error}</p>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => navigate('/vaccinations/due?filter=overdue')} className="text-left">
          <MetricCard
            label="Overdue"
            value={metrics?.overdue ?? 0}
            icon={AlertCircle}
            sublabel="Past their due date"
          />
        </button>
        <button onClick={() => navigate('/vaccinations/due?filter=week')} className="text-left">
          <MetricCard
            label="Due This Week"
            value={metrics?.dueThisWeek ?? 0}
            icon={Clock}
            sublabel="Next 7 days"
          />
        </button>
        <MetricCard
          label="Upcoming (30 days)"
          value={metrics?.upcoming ?? 0}
          icon={Calendar}
          sublabel="Scheduled later"
        />
        <MetricCard
          label="Completed"
          value={metrics?.completed ?? 0}
          icon={CheckCircle}
          sublabel="Protocols finished"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-ink mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/vaccinations/due')}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-bg"
          >
            <ListChecks size={16} /> View Due List
          </button>
          <button
            onClick={() => navigate('/vaccinations/protocols')}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-bg"
          >
            <Settings size={16} /> Manage Protocols
          </button>
          <button
            onClick={() => navigate('/vaccinations/record')}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-bg"
          >
            <Syringe size={16} /> Record Vaccination
          </button>
        </div>
      </div>

      <p className="text-sm text-ink-secondary">
        Need the full picture?{' '}
        <Link to="/vaccinations/due" className="text-brand hover:text-brand-hover font-medium">
          Open the due list
        </Link>{' '}
        to see every animal waiting on a dose.
      </p>
    </div>
  );
}
