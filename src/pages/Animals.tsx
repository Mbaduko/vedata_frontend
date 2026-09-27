import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { animalApi, speciesApi, zoneApi, type Animal, type Species, type Zone } from '../services/api';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { Dog, Plus, Search, Loader, AlertCircle } from 'lucide-react';

export default function Animals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [species, setSpecies] = useState<Species[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('');
  const [filterHealth, setFilterHealth] = useState('');
  const [filterZone, setFilterZone] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load all data in parallel
      const [animalsData, speciesData, zonesData] = await Promise.all([
        animalApi.getAnimals({ limit: 1000 }),
        speciesApi.getSpecies(),
        zoneApi.getZones({ limit: 100 }),
      ]);
      
      setAnimals(animalsData);
      setSpecies(speciesData);
      setZones(zonesData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load animals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering
  const filtered = animals.filter(a => {
    if (search) {
      const q = search.toLowerCase();
      const matchesTag = a.tagNumber.toLowerCase().includes(q);
      const matchesOwner = a.owner?.name.toLowerCase().includes(q) || a.owner?.nid.includes(q);
      if (!matchesTag && !matchesOwner) return false;
    }
    if (filterSpecies && a.speciesId !== filterSpecies) return false;
    if (filterHealth && a.healthStatus !== filterHealth) return false;
    if (filterZone && a.zoneId !== filterZone) return false;
    return true;
  });

  const columns = [
    { 
      header: 'Tag Number', 
      accessor: 'tagNumber', 
      render: (row: Animal) => <span className="font-medium text-brand">{row.tagNumber}</span> 
    },
    { 
      header: 'Species', 
      accessor: 'speciesId', 
      render: (row: Animal) => row.species?.name ?? 'Unknown' 
    },
    { 
      header: 'Breed', 
      accessor: 'breedId', 
      render: (row: Animal) => row.breed?.name ?? '—' 
    },
    { 
      header: 'Sex', 
      accessor: 'sex', 
      render: (row: Animal) => <span className="capitalize">{row.sex}</span> 
    },
    { 
      header: 'Owner', 
      accessor: 'ownerId', 
      render: (row: Animal) => row.owner?.name ?? 'Unknown' 
    },
    { 
      header: 'Zone', 
      accessor: 'zoneId', 
      render: (row: Animal) => row.zone?.name ?? 'Unknown' 
    },
    { 
      header: 'Status', 
      accessor: 'healthStatus', 
      render: (row: Animal) => <StatusBadge status={row.healthStatus} /> 
    },
    { 
      header: 'DOB', 
      accessor: 'dateOfBirth', 
      render: (row: Animal) => new Date(row.dateOfBirth).toLocaleDateString() 
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader size={32} className="text-brand animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-semibold text-ink">Animals</h1>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
                Failed to Load Animals
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">{error}</p>
              <button
                onClick={loadData}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink">Animals</h1>
          <p className="text-sm text-ink-secondary mt-1">{filtered.length} of {animals.length} animals</p>
        </div>
        <button 
          onClick={() => navigate('/animals/register')} 
          className="flex items-center gap-2 px-4 py-2 bg-brand text-on-brand text-sm font-medium rounded-lg hover:bg-brand-hover transition-colors"
        >
          <Plus size={16} /> Register Animal
        </button>
      </div>
      
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
          <input 
            type="text" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Search by tag, owner name, or NID..." 
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-ink placeholder:text-ink-secondary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" 
          />
        </div>
        <select 
          value={filterSpecies} 
          onChange={(e) => setFilterSpecies(e.target.value)} 
          className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          <option value="">All Species</option>
          {species.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select 
          value={filterHealth} 
          onChange={(e) => setFilterHealth(e.target.value)} 
          className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          <option value="">All Status</option>
          <option value="healthy">Healthy</option>
          <option value="sick">Sick</option>
          <option value="under_treatment">Under Treatment</option>
          <option value="deceased">Deceased</option>
        </select>
        <select 
          value={filterZone} 
          onChange={(e) => setFilterZone(e.target.value)} 
          className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          <option value="">All Zones</option>
          {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
      </div>
      
      {animals.length === 0 ? (
        <EmptyState 
          icon={Dog} 
          title="No animals registered" 
          description="Register your first animal to start building your registry." 
          actionLabel="Register Animal" 
          onAction={() => navigate('/animals/register')} 
        />
      ) : (
        <DataTable 
          columns={columns} 
          data={filtered as unknown as Record<string, unknown>[]} 
          onRowClick={(row) => navigate(`/animals/${(row as unknown as Animal).id}`)} 
          emptyMessage="No animals match your filters" 
        />
      )}
    </div>
  );
}
