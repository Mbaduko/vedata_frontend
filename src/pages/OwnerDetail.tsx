import { useData } from '../context/DataContext';
import { useParams, useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { ArrowLeft, User, Phone, Mail, MapPin } from 'lucide-react';
import type { Animal } from '../types';

export default function OwnerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { owners, animals, species, zones } = useData();

  const owner = owners.find(o => o.id === id);
  if (!owner) return <div className="text-center py-12"><p className="text-ink-secondary">Owner not found</p><button onClick={() => navigate('/owners')} className="text-brand mt-2 text-sm">Back to owners</button></div>;

  const ownerAnimals = animals.filter(a => a.ownerId === owner.id);
  const zone = zones.find(z => z.id === owner.zoneId);

  const columns = [
    { header: 'Tag Number', accessor: 'tagNumber', render: (row: Animal) => <span className="font-medium text-brand">{row.tagNumber}</span> },
    { header: 'Species', accessor: 'speciesId', render: (row: Animal) => species.find(s => s.id === row.speciesId)?.name ?? 'Unknown' },
    { header: 'Sex', accessor: 'sex', render: (row: Animal) => <span className="capitalize">{row.sex}</span> },
    { header: 'Status', accessor: 'healthStatus', render: (row: Animal) => <StatusBadge status={row.healthStatus} /> },
    { header: 'DOB', accessor: 'dateOfBirth', render: (row: Animal) => new Date(row.dateOfBirth).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><button onClick={() => navigate('/owners')} className="p-2 hover:bg-card rounded-lg border border-border"><ArrowLeft size={16} className="text-ink-secondary" /></button><div><h1 className="text-2xl font-display font-semibold text-ink">{owner.name}</h1><p className="text-sm text-ink-secondary">{zone?.name}</p></div></div>
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-display font-semibold text-ink mb-4">Contact Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3"><User size={16} className="text-ink-secondary" /><div><p className="text-xs text-ink-secondary">National ID</p><p className="text-sm font-medium text-ink">{owner.nid}</p></div></div>
          <div className="flex items-center gap-3"><Phone size={16} className="text-ink-secondary" /><div><p className="text-xs text-ink-secondary">Phone</p><p className="text-sm font-medium text-ink">{owner.phone}</p></div></div>
          <div className="flex items-center gap-3"><Mail size={16} className="text-ink-secondary" /><div><p className="text-xs text-ink-secondary">Email</p><p className="text-sm font-medium text-ink">{owner.email ?? '—'}</p></div></div>
        </div>
        {owner.address && <div className="flex items-center gap-3 mt-3"><MapPin size={16} className="text-ink-secondary" /><div><p className="text-xs text-ink-secondary">Address</p><p className="text-sm font-medium text-ink">{owner.address}</p></div></div>}
      </div>
      <div><h2 className="text-lg font-display font-semibold text-ink mb-4">Animals ({ownerAnimals.length})</h2><DataTable columns={columns} data={ownerAnimals as unknown as Record<string, unknown>[]} onRowClick={(row) => navigate(`/animals/${(row as unknown as Animal).id}`)} emptyMessage="No animals registered for this owner" /></div>
    </div>
  );
}
