import { useState } from 'react';
import { useData } from '../context/DataContext';
import DataTable from '../components/DataTable';
import { Search } from 'lucide-react';
import type { AuditLogEntry } from '../types';

export default function AuditLog() {
  const { auditLog, users, zones } = useData();
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const sorted = [...auditLog].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const filtered = sorted.filter(entry => {
    if (search) {
      const q = search.toLowerCase();
      const user = users.find(u => u.id === entry.userId);
      if (!user?.name.toLowerCase().includes(q) && !entry.action.includes(q) && !entry.entity.includes(q)) return false;
    }
    if (filterAction && !entry.action.includes(filterAction)) return false;
    return true;
  });

  const getUserName = (userId: string) => users.find(u => u.id === userId)?.name ?? 'Unknown';

  const columns = [
    { header: 'Timestamp', accessor: 'timestamp', render: (row: AuditLogEntry) => <span className="text-xs tabular-nums">{new Date(row.timestamp).toLocaleString()}</span> },
    { header: 'User', accessor: 'userId', render: (row: AuditLogEntry) => <span className="font-medium">{getUserName(row.userId)}</span> },
    { header: 'Action', accessor: 'action', render: (row: AuditLogEntry) => <span className="text-xs bg-brand-bg text-brand-text px-2 py-0.5 rounded-full">{row.action}</span> },
    { header: 'Entity', accessor: 'entity', render: (row: AuditLogEntry) => <span className="text-xs text-ink-secondary">{row.entity} · {row.entityId}</span> },
    { header: 'Zone', accessor: 'zoneId', render: (row: AuditLogEntry) => <span className="text-xs text-ink-secondary">{row.zoneId ? zones.find(z => z.id === row.zoneId)?.name ?? row.zoneId : '—'}</span> },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-display font-semibold text-ink">Audit Log</h1><p className="text-sm text-ink-secondary mt-1">{filtered.length} entries</p></div>
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" /><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by user, action, or entity..." className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-ink placeholder:text-ink-secondary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" /></div>
        <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20">
          <option value="">All Actions</option><option value="zone">Zone</option><option value="animal">Animal</option><option value="vaccination">Vaccination</option><option value="user">User</option><option value="config">Config</option><option value="health_status">Health Status</option>
        </select>
      </div>
      <DataTable columns={columns} data={filtered as unknown as Record<string, unknown>[]} emptyMessage="No audit entries found" />
    </div>
  );
}
