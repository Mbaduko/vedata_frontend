import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi, type DashboardData } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp,
  Users,
  Dog,
  Syringe,
  MapPin,
  AlertCircle,
  Activity,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  ArrowRight,
  Plus,
  UserPlus,
} from 'lucide-react';

const iconMap: Record<string, any> = {
  'plus': Plus,
  'syringe': Syringe,
  'map-pin': MapPin,
  'user-plus': UserPlus,
};

export default function Dashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardApi.getDashboard();
      setDashboard(data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader size={32} className="text-brand animate-spin" />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle size={48} className="text-red-500" />
        <p className="text-ink-secondary">{error || 'Failed to load dashboard'}</p>
        <button
          onClick={loadDashboard}
          className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-ink">
          Welcome back, {dashboard.user.name}
        </h1>
        <p className="text-ink-secondary mt-1 capitalize">{dashboard.user.role}</p>
      </div>

      {/* Quick Actions */}
      {dashboard.quickActions.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-ink mb-3">Quick Actions</h2>
          <div className="flex flex-wrap gap-2">
            {dashboard.quickActions.map((action) => {
              const Icon = iconMap[action.icon] || Plus;
              return (
                <Link
                  key={action.path}
                  to={action.path}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors text-sm font-medium"
                >
                  <Icon size={16} />
                  {action.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Dynamic Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {dashboard.widgets.includes('system-metrics') && dashboard.metrics.system && (
          <SystemMetricsWidget metrics={dashboard.metrics.system} />
        )}

        {dashboard.widgets.includes('zone-metrics') && dashboard.metrics.zone && (
          <ZoneMetricsWidget metrics={dashboard.metrics.zone} />
        )}

        {dashboard.widgets.includes('my-metrics') && dashboard.metrics.personal && (
          <PersonalMetricsWidget metrics={dashboard.metrics.personal} />
        )}
      </div>

      {/* Full Width Widgets */}
      <div className="space-y-6">
        {dashboard.widgets.includes('due-vaccinations') && dashboard.dueVaccinations && (
          <DueVaccinationsWidget vaccinations={dashboard.dueVaccinations} />
        )}

        {dashboard.widgets.includes('recent-audit') && dashboard.recentActivity && (
          <RecentAuditWidget activities={dashboard.recentActivity} />
        )}

        {dashboard.widgets.includes('recent-entries') && dashboard.recentEntries && (
          <RecentEntriesWidget entries={dashboard.recentEntries} />
        )}

        {dashboard.widgets.includes('zone-list') && dashboard.zones && (
          <ZoneListWidget zones={dashboard.zones} />
        )}

        {dashboard.widgets.includes('team-activity') && dashboard.teamMembers && (
          <TeamActivityWidget members={dashboard.teamMembers} />
        )}
      </div>
    </div>
  );
}

// System Metrics Widget (Superadmin)
function SystemMetricsWidget({ metrics }: { metrics: NonNullable<DashboardData['metrics']['system']> }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 col-span-full">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={20} className="text-brand" />
        <h2 className="text-lg font-semibold text-ink">System Overview</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={MapPin} label="Zones" value={metrics.totalZones} color="blue" />
        <MetricCard icon={Users} label="Users" value={metrics.totalUsers} color="green" />
        <MetricCard icon={Dog} label="Animals" value={metrics.totalAnimals} color="purple" />
        <MetricCard icon={Syringe} label="Vaccinations" value={metrics.totalVaccinations} color="orange" />
      </div>
    </div>
  );
}

// Zone Metrics Widget (Vet)
function ZoneMetricsWidget({ metrics }: { metrics: NonNullable<DashboardData['metrics']['zone']> }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 col-span-full lg:col-span-2">
      <div className="flex items-center gap-2 mb-4">
        <MapPin size={20} className="text-brand" />
        <h2 className="text-lg font-semibold text-ink">Your Zones</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={MapPin} label="Zones Managed" value={metrics.zonesManaged} color="blue" />
        <MetricCard icon={Dog} label="Animals" value={metrics.totalAnimals} color="purple" />
        <MetricCard icon={Syringe} label="Vaccinations" value={metrics.totalVaccinations} color="orange" />
        <MetricCard icon={Users} label="Owners" value={metrics.totalOwners} color="green" />
      </div>
    </div>
  );
}

// Personal Metrics Widget (All users)
function PersonalMetricsWidget({ metrics }: { metrics: NonNullable<DashboardData['metrics']['personal']> }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 col-span-full lg:col-span-1">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={20} className="text-brand" />
        <h2 className="text-lg font-semibold text-ink">My Activity</h2>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-secondary">Animals Registered</span>
          <span className="text-2xl font-bold text-ink">{metrics.animalsRegistered}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-secondary">Vaccinations Recorded</span>
          <span className="text-2xl font-bold text-ink">{metrics.vaccinationsRecorded}</span>
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
  };

  return (
    <div className="flex flex-col gap-2">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-ink">{value.toLocaleString()}</p>
        <p className="text-xs text-ink-secondary">{label}</p>
      </div>
    </div>
  );
}

// Due Vaccinations Widget
function DueVaccinationsWidget({ vaccinations }: { vaccinations: NonNullable<DashboardData['dueVaccinations']> }) {
  if (vaccinations.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Syringe size={20} className="text-brand" />
          <h2 className="text-lg font-semibold text-ink">Due Vaccinations</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle size={48} className="text-green-500 mb-3" />
          <p className="text-ink-secondary">All vaccinations up to date!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Syringe size={20} className="text-brand" />
          <h2 className="text-lg font-semibold text-ink">Due Vaccinations</h2>
        </div>
        <Link to="/vaccinations/due" className="text-sm text-brand hover:underline flex items-center gap-1">
          View All <ArrowRight size={14} />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 text-xs font-medium text-ink-secondary">Animal</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-ink-secondary">Owner</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-ink-secondary">Zone</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-ink-secondary">Vaccine</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-ink-secondary">Due Date</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-ink-secondary">Status</th>
            </tr>
          </thead>
          <tbody>
            {vaccinations.slice(0, 10).map((vac) => (
              <tr key={vac.id} className="border-b border-border hover:bg-bg">
                <td className="py-3 px-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{vac.animalTag}</p>
                    <p className="text-xs text-ink-secondary">{vac.animalSpecies}</p>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div>
                    <p className="text-sm text-ink">{vac.ownerName}</p>
                    <p className="text-xs text-ink-secondary">{vac.ownerPhone}</p>
                  </div>
                </td>
                <td className="py-3 px-3 text-sm text-ink">{vac.zone}</td>
                <td className="py-3 px-3">
                  <div>
                    <p className="text-sm text-ink">{vac.vaccine}</p>
                    <p className="text-xs text-ink-secondary">{vac.disease} - Dose {vac.doseNumber}</p>
                  </div>
                </td>
                <td className="py-3 px-3 text-sm text-ink">
                  {new Date(vac.nextDueDate).toLocaleDateString()}
                </td>
                <td className="py-3 px-3">
                  {vac.isDue ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-xs rounded-full">
                      <AlertCircle size={12} /> Overdue
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 text-xs rounded-full">
                      <Clock size={12} /> Upcoming
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Recent Audit Widget
function RecentAuditWidget({ activities }: { activities: NonNullable<DashboardData['recentActivity']> }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-brand" />
          <h2 className="text-lg font-semibold text-ink">Recent Activity</h2>
        </div>
        <Link to="/audit-log" className="text-sm text-brand hover:underline flex items-center gap-1">
          View All <ArrowRight size={14} />
        </Link>
      </div>
      <div className="space-y-3">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3 p-3 bg-bg rounded-lg">
            <div className="w-2 h-2 rounded-full bg-brand mt-2" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink">
                <span className="font-medium">{activity.user}</span>{' '}
                <span className="text-ink-secondary">{activity.action.replace('.', ' ')}</span>
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-ink-secondary">
                <span className="capitalize">{activity.userRole}</span>
                {activity.zone && (
                  <>
                    <span>•</span>
                    <span>{activity.zone}</span>
                  </>
                )}
                <span>•</span>
                <span>{new Date(activity.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Recent Entries Widget (Technician)
function RecentEntriesWidget({ entries }: { entries: NonNullable<DashboardData['recentEntries']> }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={20} className="text-brand" />
        <h2 className="text-lg font-semibold text-ink">My Recent Entries</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 text-xs font-medium text-ink-secondary">Tag</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-ink-secondary">Species</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-ink-secondary">Owner</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-ink-secondary">Zone</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-ink-secondary">Registered</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-ink-secondary">Editable Until</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const isEditable = entry.editableUntil && new Date(entry.editableUntil) > new Date();
              return (
                <tr key={entry.id} className="border-b border-border hover:bg-bg">
                  <td className="py-3 px-3">
                    <Link to={`/animals/${entry.id}`} className="text-sm font-medium text-brand hover:underline">
                      {entry.tagNumber}
                    </Link>
                  </td>
                  <td className="py-3 px-3 text-sm text-ink">{entry.species}</td>
                  <td className="py-3 px-3 text-sm text-ink">{entry.owner}</td>
                  <td className="py-3 px-3 text-sm text-ink">{entry.zone}</td>
                  <td className="py-3 px-3 text-sm text-ink-secondary">
                    {new Date(entry.registeredAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-3">
                    {entry.editableUntil ? (
                      isEditable ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-xs rounded-full">
                          <Clock size={12} /> {new Date(entry.editableUntil).toLocaleString()}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-xs rounded-full">
                          <XCircle size={12} /> Expired
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-ink-secondary">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Zone List Widget
function ZoneListWidget({ zones }: { zones: NonNullable<DashboardData['zones']> }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin size={20} className="text-brand" />
          <h2 className="text-lg font-semibold text-ink">Your Zones</h2>
        </div>
        <Link to="/zones" className="text-sm text-brand hover:underline flex items-center gap-1">
          View All <ArrowRight size={14} />
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {zones.map((zone) => (
          <Link
            key={zone.id}
            to={`/zones/${zone.id}`}
            className="p-4 bg-bg rounded-lg hover:border-brand/30 border border-transparent transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-ink">{zone.name}</h3>
              <span className="text-xs px-2 py-1 bg-brand-bg text-brand-text rounded-full">{zone.label}</span>
            </div>
            {zone.leadVet && <p className="text-sm text-ink-secondary mb-3">Lead: {zone.leadVet}</p>}
            <div className="flex items-center gap-4 text-xs text-ink-secondary">
              <span>{zone.animalCount} animals</span>
              <span>{zone.ownerCount} owners</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Team Activity Widget
function TeamActivityWidget({ members }: { members: NonNullable<DashboardData['teamMembers']> }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-brand" />
          <h2 className="text-lg font-semibold text-ink">Team Members</h2>
        </div>
        <Link to="/team" className="text-sm text-brand hover:underline flex items-center gap-1">
          View All <ArrowRight size={14} />
        </Link>
      </div>
      <div className="space-y-3">
        {members.map((member) => {
          const daysRemaining = member.contractEnd
            ? Math.ceil((new Date(member.contractEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;
          const isExpiringSoon = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 30;

          return (
            <Link
              key={member.id}
              to={`/team/${member.id}`}
              className="flex items-center justify-between p-3 bg-bg rounded-lg hover:border-brand/30 border border-transparent transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-ink">{member.name}</p>
                <p className="text-xs text-ink-secondary">{member.email}</p>
                <p className="text-xs text-ink-secondary mt-1">{member.zone}</p>
              </div>
              {member.contractEnd && (
                <div className="text-right">
                  {isExpiringSoon ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 text-xs rounded-full">
                      <AlertCircle size={12} /> {daysRemaining} days left
                    </span>
                  ) : daysRemaining && daysRemaining > 0 ? (
                    <span className="text-xs text-ink-secondary">{daysRemaining} days remaining</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-xs rounded-full">
                      <XCircle size={12} /> Expired
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
