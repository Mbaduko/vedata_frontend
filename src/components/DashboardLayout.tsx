import { useData } from '../context/DataContext';
import ZoneOverviewWidget from './widgets/ZoneOverviewWidget';
import SystemMetricsWidget from './widgets/SystemMetricsWidget';
import RecentAuditWidget from './widgets/RecentAuditWidget';
import ZoneMetricCards from './widgets/ZoneMetricCards';
import TeamActivityWidget from './widgets/TeamActivityWidget';
import DueVaccinationsWidget from './widgets/DueVaccinationsWidget';
import MyMetricsWidget from './widgets/MyMetricsWidget';
import RecentEntriesWidget from './widgets/RecentEntriesWidget';
import type { FC } from 'react';

const dashboardWidgetsByRole: Record<string, { key: string; Component: FC }[]> = {
  superadmin: [
    { key: 'zone-overview', Component: ZoneOverviewWidget },
    { key: 'system-metrics', Component: SystemMetricsWidget },
    { key: 'recent-audit', Component: RecentAuditWidget },
  ],
  vet: [
    { key: 'zone-metrics', Component: ZoneMetricCards },
    { key: 'team-activity', Component: TeamActivityWidget },
    { key: 'due-vaccinations', Component: DueVaccinationsWidget },
  ],
  technician: [
    { key: 'my-metrics', Component: MyMetricsWidget },
    { key: 'recent-entries', Component: RecentEntriesWidget },
  ],
};

export default function DashboardLayout() {
  const { currentUser } = useData();
  const role = currentUser?.role ?? 'technician';
  const widgets = dashboardWidgetsByRole[role] ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold text-ink">Dashboard</h1>
        <p className="text-sm text-ink-secondary mt-1">Welcome back, {currentUser?.name}</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {widgets.map(({ key, Component }) => (
          <div key={key} className={key === 'zone-overview' || key === 'zone-metrics' || key === 'my-metrics' ? 'lg:col-span-2' : ''}>
            <Component />
          </div>
        ))}
      </div>
    </div>
  );
}
