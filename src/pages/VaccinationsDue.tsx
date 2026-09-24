import { useState } from 'react';
import { useData } from '../context/DataContext';
import DataTable from '../components/DataTable';
import { AlertCircle, Clock, CheckCircle } from 'lucide-react';

export default function VaccinationsDue() {
  const { currentUser, zones, animals, vaccinations, owners, diseases, vaccines } = useData();
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'due' | 'overdue'

  // Scope to user's zones
  let zoneIds = [];
  if (currentUser?.role === 'superadmin') {
    zoneIds = zones.filter(z => !z.archived).map(z => z.id);
  } else {
    zoneIds = currentUser?.zoneRoles?.map(zr => zr.zoneId) || [];
  }

  const today = new Date();

  const dueItems = [];
  vaccinations.forEach(vac => {
    if (!vac.nextDueDate) return;
    const animal = animals.find(a => a.id === vac.animalId);
    if (!animal || animal.healthStatus === 'deceased') return;
    if (!zoneIds.includes(animal.zoneId)) return;

    const dueDate = new Date(vac.nextDueDate);
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    const isOverdue = diffDays < 0;
    const isDueSoon = diffDays >= 0 && diffDays <= 14;

    if (filterStatus === 'overdue' && !isOverdue) return;
    if (filterStatus === 'due' && !isDueSoon) return;

    const owner = owners.find(o => o.id === animal.ownerId);
    const vaccine = vaccines.find(v => v.id === vac.vaccineId);
    const disease = vaccine ? diseases.find(d => d.id === vaccine.diseaseId) : null;

    dueItems.push({
      id: vac.id,
      animal,
      owner,
      vaccine,
      disease,
      nextDueDate: vac.nextDueDate,
      isOverdue,
      diffDays,
      status: isOverdue ? 'overdue' : isDueSoon ? 'due' : 'ok',
    });
  });

  dueItems.sort((a, b) => a.diffDays - b.diffDays);

  const columns = [
    {
      header: 'Tag Number',
      accessor: 'animal.tagNumber',
      render: (row) => <span className="font-medium text-brand">{row.animal.tagNumber}</span>,
    },
    {
      header: 'Owner',
      accessor: 'owner.name',
      render: (row) => row.owner?.name || 'Unknown',
    },
    {
      header: 'Vaccine',
      accessor: 'vaccine.name',
      render: (row) => (
        <div>
          <p className="text-sm font-medium">{row.vaccine?.name || 'Unknown'}</p>
          <p className="text-xs text-ink-secondary">{row.disease?.name}</p>
        </div>
      ),
    },
    {
      header: 'Due Date',
      accessor: 'nextDueDate',
      render: (row) => (
        <span className={`tabular-nums ${
          row.isOverdue ? 'text-clay-text font-medium' :
          row.status === 'due' ? 'text-gold-text font-medium' : 'text-ink'
        }`}>
          {new Date(row.nextDueDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => {
        if (row.isOverdue) {
          return (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-clay-text bg-clay-bg px-2 py-0.5 rounded-full">
              <AlertCircle size={12} /> {Math.abs(row.diffDays)}d overdue
            </span>
          );
        }
        if (row.status === 'due') {
          return (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-gold-text bg-gold-bg px-2 py-0.5 rounded-full">
              <Clock size={12} /> Due in {row.diffDays}d
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-text bg-brand-bg px-2 py-0.5 rounded-full">
            <CheckCircle size={12} /> Upcoming
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink">Vaccinations Due</h1>
          <p className="text-sm text-ink-secondary mt-1">
            {dueItems.filter(i => i.isOverdue).length} overdue · {dueItems.filter(i => i.status === 'due').length} due soon
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {[
          { value: 'all', label: 'All' },
          { value: 'overdue', label: 'Overdue' },
          { value: 'due', label: 'Due Soon' },
        ].map(option => (
          <button
            key={option.value}
            onClick={() => setFilterStatus(option.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              filterStatus === option.value
                ? 'bg-brand text-on-brand'
                : 'bg-card border border-border text-ink-secondary hover:bg-bg'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={dueItems}
        emptyMessage="No due or overdue vaccinations"
      />
    </div>
  );
}
