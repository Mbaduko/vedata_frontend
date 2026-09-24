import { useState } from 'react';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable';
import EmptyState from '../components/EmptyState';
import { Users, Search } from 'lucide-react';
import type { Owner } from '../types';

export default function Owners() {
  const { owners, animals, zones } = useData();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = owners.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.name.toLowerCase().includes(q) || o.nid.includes(search) || o.phone.includes(search);
  });

  const columns = [
    { header: 'Name', accessor: 'name', render: (row: Owner) => <span className="font-medium">{row.name}</span> },
    { header: 'NID', accessor: 'nid' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Email', accessor: 'email', render: (row: Owner) => row.email || <span className="text-ink-secondary">—</span> },
    { header: 'Animals', accessor: 'id', align: 'right' as const, render: (row: Owner) => <span className="tabular-nums">{animals.filter(a => a.ownerId === row.id).length}</span> },
    { header: 'Zone', accessor: 'zoneId', render: (row: Owner) => zones.find(z => z.id === row.zoneId)?.name ?? 'Unknown' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-display font-semibold text-ink">Owners</h1><p className="text-sm text-ink-secondary mt-1">{filtered.length} owners</p></div></div>
      <div className="relative max-w-md"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" /><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, NID, or phone..." className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-ink placeholder:text-ink-secondary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" /></div>
      {owners.length === 0 ? <EmptyState icon={Users} title="No owners yet" description="Owners are created when you register animals." /> : <DataTable columns={columns} data={filtered as unknown as Record<string, unknown>[]} onRowClick={(row) => navigate(`/owners/${(row as unknown as Owner).id}`)} emptyMessage="No owners match your search" />}
    </div>
  );
}
