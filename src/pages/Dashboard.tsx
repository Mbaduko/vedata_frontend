import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi, vaccinationApi, type DashboardData, type VaccinationMetrics } from '../services/api';
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
  Calendar,
  Target,
  Award,
  Zap,
  BarChart3,
  RefreshCw,
  ExternalLink,
  ChevronRight,
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
  const [refreshing, setRefreshing] = useState(false);

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

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const data = await dashboardApi.getDashboard();
      setDashboard(data);
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader size={40} className="text-brand animate-spin" />
        <p className="text-ink-secondary">Loading your dashboard...</p>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-danger-bg flex items-center justify-center">
          <AlertCircle size={32} className="text-danger-text" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-ink mb-1">Unable to Load Dashboard</h3>
          <p className="text-ink-secondary mb-4">{error || 'An unexpected error occurred'}</p>
          <button
            onClick={loadDashboard}
            className="px-6 py-2.5 bg-brand text-on-brand rounded-lg hover:bg-brand-hover transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Welcome & Refresh */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-ink flex items-center gap-3">
            Welcome back, {dashboard.user.name}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-bg text-brand-text rounded-full text-sm font-medium capitalize">
              <Award size={14} />
              {dashboard.user.role}
            </span>
          </h1>
          <p className="text-ink-secondary mt-2 flex items-center gap-2">
            <Calendar size={16} />
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg hover:border-brand/30 transition-all text-ink-secondary hover:text-ink disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          <span className="text-sm font-medium">Refresh</span>
        </button>
      </div>

      {/* Quick Actions Bar */}
      {dashboard.quickActions.length > 0 && (
        <div className="bg-gradient-to-br from-brand to-brand/80 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={20} className="text-on-brand" />
            <h2 className="text-lg font-semibold text-on-brand">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {dashboard.quickActions.map((action) => {
              const Icon = iconMap[action.icon] || Plus;
              return (
                <Link
                  key={action.path}
                  to={action.path}
                  className="flex items-center gap-3 px-4 py-3 bg-on-brand/10 backdrop-blur-sm rounded-lg hover:bg-on-brand/20 transition-all text-on-brand group"
                >
                  <div className="w-10 h-10 rounded-lg bg-on-brand/20 flex items-center justify-center group-hover:bg-on-brand/30 transition-colors">
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{action.label}</p>
                    <p className="text-xs text-on-brand/70">Click to start</p>
                  </div>
                  <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Metrics - Superadmin */}
        {dashboard.widgets.includes('system-metrics') && dashboard.metrics.system && (
          <SystemMetricsWidget metrics={dashboard.metrics.system} />
        )}

        {/* Zone Metrics - Vet */}
        {dashboard.widgets.includes('zone-metrics') && dashboard.metrics.zone && (
          <ZoneMetricsWidget metrics={dashboard.metrics.zone} />
        )}

        {/* Personal Metrics - All */}
        {dashboard.widgets.includes('my-metrics') && dashboard.metrics.personal && (
          <PersonalMetricsWidget metrics={dashboard.metrics.personal} />
        )}
      </div>

      {/* Content Grid - Full Width Widgets */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="xl:col-span-2 space-y-6">
          {dashboard.widgets.includes('vaccinations') && (
            <VaccinationMetricsSection />
          )}

          {dashboard.widgets.includes('due-vaccinations') && dashboard.dueVaccinations && (
            <DueVaccinationsWidget vaccinations={dashboard.dueVaccinations} />
          )}

          {dashboard.widgets.includes('recent-entries') && dashboard.recentEntries && (
            <RecentEntriesWidget entries={dashboard.recentEntries} />
          )}

          {dashboard.widgets.includes('zone-list') && dashboard.zones && (
            <ZoneListWidget zones={dashboard.zones} />
          )}
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {dashboard.widgets.includes('recent-audit') && dashboard.recentActivity && (
            <RecentAuditWidget activities={dashboard.recentActivity} />
          )}

          {dashboard.widgets.includes('team-activity') && dashboard.teamMembers && (
            <TeamActivityWidget members={dashboard.teamMembers} />
          )}
        </div>
      </div>
    </div>
  );
}

// ========== WIDGETS ==========

// System Metrics Widget (Superadmin)
function SystemMetricsWidget({ metrics }: { metrics: NonNullable<DashboardData['metrics']['system']> }) {
  const stats = [
    { icon: MapPin, label: 'Total Zones', value: metrics.totalZones, color: 'info' },
    { icon: Users, label: 'Active Users', value: metrics.totalUsers, color: 'success' },
    { icon: Dog, label: 'Registered Animals', value: metrics.totalAnimals, color: 'violet' },
    { icon: Syringe, label: 'Vaccinations', value: metrics.totalVaccinations, color: 'warning' },
  ];

  return (
    <div className="lg:col-span-3 bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-brand" />
          <h2 className="text-lg font-semibold text-ink">System Overview</h2>
        </div>
        <Link 
          to="/audit-log" 
          className="text-sm text-brand hover:underline flex items-center gap-1"
        >
          View Details <ExternalLink size={14} />
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </div>
    </div>
  );
}

// Zone Metrics Widget (Vet)
function ZoneMetricsWidget({ metrics }: { metrics: NonNullable<DashboardData['metrics']['zone']> }) {
  const stats = [
    { icon: MapPin, label: 'Zones Managed', value: metrics.zonesManaged, color: 'info' },
    { icon: Dog, label: 'Animals', value: metrics.totalAnimals, color: 'violet' },
    { icon: Syringe, label: 'Vaccinations', value: metrics.totalVaccinations, color: 'warning' },
    { icon: Users, label: 'Owners', value: metrics.totalOwners, color: 'success' },
  ];

  return (
    <div className="lg:col-span-3 bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Target size={20} className="text-brand" />
          <h2 className="text-lg font-semibold text-ink">Zone Performance</h2>
        </div>
        <Link 
          to="/zones" 
          className="text-sm text-brand hover:underline flex items-center gap-1"
        >
          Manage Zones <ArrowRight size={14} />
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </div>
    </div>
  );
}

// Personal Metrics Widget
function PersonalMetricsWidget({ metrics }: { metrics: NonNullable<DashboardData['metrics']['personal']> }) {
  return (
    <div className="lg:col-span-3 bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-brand" />
          <h2 className="text-lg font-semibold text-ink">My Contributions</h2>
        </div>
        <Link 
          to="/my-activity" 
          className="text-sm text-brand hover:underline flex items-center gap-1"
        >
          View Activity <ArrowRight size={14} />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Dog size={18} className="text-violet-text" />
            <span className="text-sm text-ink-secondary">Animals Registered</span>
          </div>
          <p className="text-3xl font-bold text-ink">{metrics.animalsRegistered}</p>
          <div className="flex items-center gap-1 text-xs text-success-text">
            <TrendingUp size={14} />
            <span>This month</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Syringe size={18} className="text-warning-text" />
            <span className="text-sm text-ink-secondary">Vaccinations Recorded</span>
          </div>
          <p className="text-3xl font-bold text-ink">{metrics.vaccinationsRecorded}</p>
          <div className="flex items-center gap-1 text-xs text-success-text">
            <TrendingUp size={14} />
            <span>This month</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: any; 
  label: string; 
  value: number; 
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    info: 'bg-info-bg text-info-text',
    success: 'bg-success-bg text-success-text',
    warning: 'bg-warning-bg text-warning-text',
    violet: 'bg-violet-bg text-violet-text',
  };

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative p-4 rounded-lg border border-transparent group-hover:border-brand/20 transition-colors">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
        <p className="text-2xl font-bold text-ink mb-1">{value.toLocaleString()}</p>
        <p className="text-xs text-ink-secondary">{label}</p>
      </div>
    </div>
  );
}

// Vaccination Coverage Widget (protocol-based metrics)
function VaccinationMetricsSection() {
  const [metrics, setMetrics] = useState<VaccinationMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    vaccinationApi
      .getVaccinationMetrics()
      .then((data) => {
        if (!cancelled) setMetrics(data);
      })
      .catch(() => {
        // widget degrades gracefully — metrics stay at zero
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = [
    { icon: AlertCircle, label: 'Overdue', value: metrics?.overdue ?? 0 },
    { icon: Clock, label: 'Due This Week', value: metrics?.dueThisWeek ?? 0 },
    { icon: Calendar, label: 'Upcoming 30d', value: metrics?.upcoming ?? 0 },
    { icon: CheckCircle, label: 'Completed', value: metrics?.completed ?? 0 },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Syringe size={20} className="text-brand" />
          <h2 className="text-lg font-semibold text-ink">Vaccination Coverage</h2>
        </div>
        <Link
          to="/vaccinations"
          className="text-sm text-brand hover:underline flex items-center gap-1"
        >
          Open <ArrowRight size={14} />
        </Link>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader size={24} className="text-brand animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="p-4 bg-bg border border-border rounded-lg">
              <div className="flex items-center gap-2 text-ink-secondary">
                <stat.icon size={14} />
                <p className="text-xs font-medium uppercase tracking-wide">{stat.label}</p>
              </div>
              <p className="text-2xl font-bold text-ink mt-1 tabular-nums">{stat.value}</p>
            </div>
          ))}
        </div>
      )}
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
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-success-bg flex items-center justify-center mb-4">
            <CheckCircle size={32} className="text-success-text" />
          </div>
          <h3 className="text-lg font-semibold text-ink mb-1">All Up to Date!</h3>
          <p className="text-ink-secondary">No vaccinations due in the next 30 days</p>
        </div>
      </div>
    );
  }

  const overdueCount = vaccinations.filter(v => v.isDue).length;

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Syringe size={20} className="text-brand" />
          <h2 className="text-lg font-semibold text-ink">Due Vaccinations</h2>
          {overdueCount > 0 && (
            <span className="px-2 py-0.5 bg-danger-bg text-danger-text text-xs font-medium rounded-full">
              {overdueCount} Overdue
            </span>
          )}
        </div>
        <Link 
          to="/vaccinations/due" 
          className="text-sm text-brand hover:underline flex items-center gap-1"
        >
          View All <ArrowRight size={14} />
        </Link>
      </div>
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-3 text-xs font-medium text-ink-secondary uppercase tracking-wide">Animal</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-ink-secondary uppercase tracking-wide">Owner</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-ink-secondary uppercase tracking-wide">Zone</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-ink-secondary uppercase tracking-wide">Vaccine</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-ink-secondary uppercase tracking-wide">Due Date</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-ink-secondary uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {vaccinations.slice(0, 5).map((vac) => (
              <tr key={vac.id} className="border-b border-border last:border-0 hover:bg-bg transition-colors">
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
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-danger-bg text-danger-text text-xs font-medium rounded-full">
                      <AlertCircle size={12} /> Overdue
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-warning-bg text-warning-text text-xs font-medium rounded-full">
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
  const getActionIcon = (action: string) => {
    if (action.includes('create')) return Plus;
    if (action.includes('update')) return RefreshCw;
    if (action.includes('delete')) return XCircle;
    return Activity;
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-brand" />
          <h2 className="text-lg font-semibold text-ink">Recent Activity</h2>
        </div>
        <Link 
          to="/audit-log" 
          className="text-sm text-brand hover:underline flex items-center gap-1"
        >
          View All <ArrowRight size={14} />
        </Link>
      </div>
      <div className="space-y-3">
        {activities.slice(0, 8).map((activity) => {
          const ActionIcon = getActionIcon(activity.action);
          return (
            <div key={activity.id} className="flex items-start gap-3 p-3 bg-bg rounded-lg hover:border-brand/20 border border-transparent transition-all">
              <div className="w-8 h-8 rounded-lg bg-brand-bg flex items-center justify-center flex-shrink-0">
                <ActionIcon size={16} className="text-brand-text" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink">
                  <span className="font-medium">{activity.user}</span>{' '}
                  <span className="text-ink-secondary">
                    {activity.action.split('.').join(' ')}
                  </span>
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-ink-secondary">
                  <span className="capitalize px-2 py-0.5 bg-bg border border-border rounded">{activity.userRole}</span>
                  {activity.zone && <span>{activity.zone}</span>}
                  <span>•</span>
                  <span>{new Date(activity.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Recent Entries Widget (Technician)
function RecentEntriesWidget({ entries }: { entries: NonNullable<DashboardData['recentEntries']> }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-brand" />
          <h2 className="text-lg font-semibold text-ink">My Recent Entries</h2>
        </div>
        <Link 
          to="/my-activity" 
          className="text-sm text-brand hover:underline flex items-center gap-1"
        >
          View All <ArrowRight size={14} />
        </Link>
      </div>
      <div className="space-y-3">
        {entries.map((entry) => {
          const isEditable = entry.editableUntil && new Date(entry.editableUntil) > new Date();
          return (
            <Link
              key={entry.id}
              to={`/animals/${entry.id}`}
              className="block p-4 bg-bg rounded-lg hover:border-brand/30 border border-transparent transition-all group"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-brand group-hover:underline">{entry.tagNumber}</p>
                  <p className="text-xs text-ink-secondary mt-0.5">{entry.species} • {entry.zone}</p>
                </div>
                {entry.editableUntil && (
                  isEditable ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-success-bg text-success-text text-xs font-medium rounded-full">
                      <Clock size={12} /> Editable
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted-bg text-muted-text text-xs font-medium rounded-full">
                      <XCircle size={12} /> Locked
                    </span>
                  )
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-ink-secondary">
                <span>Owner: {entry.owner}</span>
                <span>{new Date(entry.registeredAt).toLocaleDateString()}</span>
              </div>
            </Link>
          );
        })}
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
        <Link 
          to="/zones" 
          className="text-sm text-brand hover:underline flex items-center gap-1"
        >
          View All <ArrowRight size={14} />
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {zones.slice(0, 6).map((zone) => (
          <Link
            key={zone.id}
            to={`/zones/${zone.id}`}
            className="p-4 bg-bg rounded-lg hover:border-brand/30 border border-transparent transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-medium text-ink group-hover:text-brand transition-colors">{zone.name}</h3>
              <span className="text-xs px-2 py-1 bg-brand-bg text-brand-text rounded-full">{zone.label}</span>
            </div>
            {zone.leadVet && (
              <p className="text-sm text-ink-secondary mb-3 flex items-center gap-1.5">
                <Users size={14} />
                {zone.leadVet}
              </p>
            )}
            <div className="flex items-center gap-4 text-xs text-ink-secondary pt-3 border-t border-border">
              <span className="flex items-center gap-1">
                <Dog size={12} />
                {zone.animalCount}
              </span>
              <span className="flex items-center gap-1">
                <Users size={12} />
                {zone.ownerCount}
              </span>
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
        <Link 
          to="/team" 
          className="text-sm text-brand hover:underline flex items-center gap-1"
        >
          Manage <ArrowRight size={14} />
        </Link>
      </div>
      <div className="space-y-3">
        {members.slice(0, 6).map((member) => {
          const daysRemaining = member.contractEnd
            ? Math.ceil((new Date(member.contractEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;
          const isExpiringSoon = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 30;
          const isExpired = daysRemaining !== null && daysRemaining <= 0;

          return (
            <Link
              key={member.id}
              to={`/team/${member.id}`}
              className="flex items-center gap-3 p-3 bg-bg rounded-lg hover:border-brand/20 border border-transparent transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-brand-bg flex items-center justify-center text-brand-text font-semibold flex-shrink-0">
                {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink group-hover:text-brand transition-colors truncate">
                  {member.name}
                </p>
                <p className="text-xs text-ink-secondary truncate">{member.zone}</p>
              </div>
              {member.contractEnd && (
                <div className="flex-shrink-0">
                  {isExpired ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-danger-bg text-danger-text text-xs font-medium rounded-full">
                      <XCircle size={10} /> Expired
                    </span>
                  ) : isExpiringSoon ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-warning-bg text-warning-text text-xs font-medium rounded-full">
                      <Clock size={10} /> {daysRemaining}d
                    </span>
                  ) : (
                    <span className="text-xs text-ink-secondary">{daysRemaining}d</span>
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
