import { useState } from 'react';
import { useData } from '../context/DataContext';
import DataTable from '../components/DataTable';
import { Users as UsersIcon, Search, Shield, Stethoscope, Wrench } from 'lucide-react';

const roleIcons = { superadmin: Shield, vet: Stethoscope, technician: Wrench };

export default function UsersPage() {
  const { users, zones } = useData();
  const [search, setSearch] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('');

  const filtered = users.filter(u => {
    if (search) {
      const q = search.toLowerCase();
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    if (filterRole && u.role !== filterRole) return false;
    return true;
  });

  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      header: 'Email',
      accessor: 'email',
    },
    {
      header: 'Role',
      accessor: 'role',
      render: (row) => {
        const Icon = roleIcons[row.role] || UsersIcon;
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-brand-bg text-brand-text px-2 py-0.5 rounded-full capitalize">
            <Icon size={12} /> {row.role}
          </span>
        );
      },
    },
    {
      header: 'Zones',
      accessor: 'zoneRoles',
      render: (row) => (
        <span className="text-xs text-ink-secondary">
          {row.zoneRoles.map(zr => zones.find(z => z.id === zr.zoneId)?.name || zr.zoneId).join(', ')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold text-ink">Users</h1>
        <p className="text-sm text-ink-secondary mt-1">{filtered.length} users</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-ink placeholder:text-ink-secondary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          <option value="">All Roles</option>
          <option value="superadmin">Superadmin</option>
          <option value="vet">Veterinarian</option>
          <option value="technician">Technician</option>
        </select>
      </div>

      <DataTable columns={columns} data={filtered} emptyMessage="No users found" />
    </div>
  );
}
