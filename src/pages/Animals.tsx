import { useState } from 'react';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { Dog, Plus, Search } from 'lucide-react';
import type { Animal } from '../types';

export default function Animals() {
  const { currentUser, animals, species, breeds, owners, zones } = useData();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('');
  const [filterHealth, setFilterHealth] = useState('');
  const [filterZone, setFilterZone] = useState('');

  let scopedAnimals = animals;
  if (currentUser?.role === 'technician') {
    const myZoneIds = currentUser.zoneRoles?.map(zr => zr.zoneId) ?? [];
    scopedAnimals = animals.filter(a => myZoneIds.includes(a.zoneId));
  }

  const filtered = scopedAnimals.filter(a => {
    if (search) {
      const q = search.toLowerCase();
      const owner = owners.find(o => o.id === a.ownerId);
      if (!a.tagNumber.toLowerCase().includes(q) && !owner?.name.toLowerCase().includes(q) && !owner?.nid.includes(q)) return false;
    }
    if (filterSpecies && a.speciesId !== filterSpecies) return false;
    if (filterHealth && a.healthStatus !== filterHealth) return false;
    if (filterZone && a.zoneId !== filterZone) return false;
    return true;
  });

  const getSpeciesName = (id: string) => species.find(s => s.id === id)?.name ?? 'Unknown';
  const getBreedName = (id: string) => breeds.find(b => b.id === id)?.name ?? 'Unknown';
  const getOwnerName = (id: string) => owners.find(o => o.id === id)?.name ?? 'Unknown';
  const getZoneName = (id: string) => zones.find(z => z.id === id)?.name ?? 'Unknown';

  const columns = [
    { header: 'Tag Number', accessor: 'tagNumber', render: (row: Animal) => <span className="font-medium text-brand">{row.tagNumber}</span> },
    { header: 'Species', accessor: 'speciesId', render: (row: Animal) => getSpeciesName(row.speciesId) },
    { header: 'Breed', accessor: 'breedId', render: (row: Animal) => row.breedId ? getBreedName(row.breedId) : '—' },
    { header: 'Sex', accessor: 'sex', render: (row: Animal) => <span className="capitalize">{row.sex}</span> },
    { header: 'Owner', accessor: 'ownerId', render: (row: Animal) => getOwnerName(row.ownerId) },
    { header: 'Zone', accessor: 'zoneId', render: (row: Animal) => getZoneName(row.zoneId) },
    { header: 'Status', accessor: 'healthStatus', render: (row: Animal) => <StatusBadge status={row.healthStatus} /> },
    { header: 'DOB', accessor: 'dateOfBirth', render: (row: Animal) => new Date(row.dateOfBirth).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-display font-semibold text-ink">Animals</h1><p className="text-sm text-ink-secondary mt-1">{filtered.length} of {scopedAnimals.length} animals</p></div>
        <button onClick={() => navigate('/animals/register')} className="flex items-center gap-2 px-4 py-2 bg-brand text-on-brand text-sm font-medium rounded-lg hover:bg-brand-hover transition-colors"><Plus size={16} /> Register Animal</button>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by tag, owner name, or NID..." className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-ink placeholder:text-ink-secondary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
        </div>
        <select value={filterSpecies} onChange={(e) => setFilterSpecies(e.target.value)} className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20">
          <option value="">All Species</option>
          {species.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterHealth} onChange={(e) => setFilterHealth(e.target.value)} className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20">
          <option value="">All Status</option>
          <option value="healthy">Healthy</option>
          <option value="sick">Sick</option>
          <option value="under_treatment">Under Treatment</option>
          <option value="deceased">Deceased</option>
        </select>
        <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)} className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20">
          <option value="">All Zones</option>
          {zones.filter(z => !z.archived).map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
      </div>
      {scopedAnimals.length === 0 ? (
        <EmptyState icon={Dog} title="No animals registered" description="Register your first animal to start building your registry." actionLabel="Register Animal" onAction={() => navigate('/animals/register')} />
      ) : (
        <DataTable columns={columns} data={filtered as unknown as Record<string, unknown>[]} onRowClick={(row) => navigate(`/animals/${(row as unknown as Animal).id}`)} emptyMessage="No animals match your filters" />
      )}
    </div>
  );
}
