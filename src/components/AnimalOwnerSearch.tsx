import { useState } from 'react';
import { Search, User, Tag } from 'lucide-react';
import type { Animal, Owner } from '../types';

interface AnimalOwnerSearchProps {
  animals: Animal[];
  owners: Owner[];
  onSelectAnimal?: (animal: Animal) => void;
  onSelectOwner?: (owner: Owner) => void;
}

export default function AnimalOwnerSearch({ animals, owners, onSelectAnimal, onSelectOwner }: AnimalOwnerSearchProps) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'tag' | 'nid'>('tag');

  const results = query.trim().length >= 2
    ? searchType === 'tag'
      ? animals.filter(a => a.tagNumber.toLowerCase().includes(query.toLowerCase()))
      : owners.filter(o => o.nid.includes(query) || o.name.toLowerCase().includes(query.toLowerCase()) || o.phone.includes(query))
    : [];

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => { setSearchType('tag'); setQuery(''); }} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${searchType === 'tag' ? 'bg-brand text-white' : 'bg-card border border-border text-ink-secondary hover:bg-bg'}`}>
          <Tag size={14} /> Tag Number
        </button>
        <button onClick={() => { setSearchType('nid'); setQuery(''); }} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${searchType === 'nid' ? 'bg-brand text-white' : 'bg-card border border-border text-ink-secondary hover:bg-bg'}`}>
          <User size={14} /> Owner NID / Name
        </button>
      </div>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchType === 'tag' ? 'Search by tag number...' : 'Search by NID, name, or phone...'} className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm text-ink placeholder:text-ink-secondary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
      </div>
      {query.trim().length >= 2 && (
        <div className="bg-card border border-border rounded-lg max-h-64 overflow-y-auto">
          {results.length === 0 ? (
            <p className="p-4 text-sm text-ink-secondary text-center">No results found</p>
          ) : (
            <div className="divide-y divide-border">
              {results.map(item => (
                <button key={item.id} onClick={() => searchType === 'tag' ? onSelectAnimal?.(item as Animal) : onSelectOwner?.(item as Owner)} className="w-full text-left p-3 hover:bg-bg transition-colors">
                  {searchType === 'tag' ? (
                    <div><p className="text-sm font-medium text-ink">{(item as Animal).tagNumber}</p><p className="text-xs text-ink-secondary">{(item as Animal).sex} · {(item as Animal).healthStatus}</p></div>
                  ) : (
                    <div><p className="text-sm font-medium text-ink">{(item as Owner).name}</p><p className="text-xs text-ink-secondary">NID: {(item as Owner).nid} · {(item as Owner).phone}</p></div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
