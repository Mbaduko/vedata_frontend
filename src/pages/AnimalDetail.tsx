import { useState } from 'react';
import { useData, useDispatch } from '../context/DataContext';
import { useParams, useNavigate } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import GracePeriodCountdown from '../components/GracePeriodCountdown';
import { ArrowLeft, Edit2, Flag, Syringe, User, MapPin, Calendar, Tag } from 'lucide-react';

const deceasedReasons = ['Disease', 'Slaughter', 'Accident', 'Old age', 'Other'];

export default function AnimalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, animals, species, breeds, owners, zones, vaccinations, users, vaccines } = useData();
  const dispatch = useDispatch();
  const [showDeceased, setShowDeceased] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [deceasedForm, setDeceasedForm] = useState({ reason: '', date: '' });
  const [editForm, setEditForm] = useState<{ speciesId?: string; breedId?: string | null; sex?: string; dateOfBirth?: string; healthStatus?: string }>({});

  const animal = animals.find(a => a.id === id);
  if (!animal) return <div className="text-center py-12"><p className="text-ink-secondary">Animal not found</p><button onClick={() => navigate('/animals')} className="text-brand mt-2 text-sm">Back to animals</button></div>;

  const owner = owners.find(o => o.id === animal.ownerId);
  const zone = zones.find(z => z.id === animal.zoneId);
  const enteredBy = users.find(u => u.id === animal.enteredByUserId);
  const animalVaccinations = vaccinations.filter(v => v.animalId === animal.id).sort((a, b) => new Date(b.dateAdministered).getTime() - new Date(a.dateAdministered).getTime());
  const canEdit = currentUser?.role === 'vet' || currentUser?.role === 'superadmin' || (currentUser?.role === 'technician' && animal.enteredByUserId === currentUser.id && animal.editableUntil && new Date(animal.editableUntil) > new Date());
  const canMarkDeceased = currentUser?.role === 'vet' || currentUser?.role === 'superadmin';

  const handleMarkDeceased = () => {
    if (!deceasedForm.reason || !deceasedForm.date) return;
    dispatch({ type: 'MARK_DECEASED', payload: { animalId: animal.id, reason: deceasedForm.reason, date: deceasedForm.date } });
    setShowDeceased(false);
    setDeceasedForm({ reason: '', date: '' });
  };

  const startEdit = () => {
    setEditForm({ speciesId: animal.speciesId, breedId: animal.breedId, sex: animal.sex, dateOfBirth: animal.dateOfBirth, healthStatus: animal.healthStatus });
    setShowEdit(true);
  };

  const handleSaveEdit = () => {
    dispatch({ type: 'EDIT_ANIMAL', payload: { animalId: animal.id, updates: editForm } });
    setShowEdit(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/animals')} className="p-2 hover:bg-card rounded-lg border border-border"><ArrowLeft size={16} className="text-ink-secondary" /></button>
        <div className="flex-1"><h1 className="text-2xl font-display font-semibold text-ink">{animal.tagNumber}</h1><p className="text-sm text-ink-secondary mt-1">{species.find(s => s.id === animal.speciesId)?.name} · {breeds.find(b => b.id === animal.breedId)?.name}</p></div>
        <StatusBadge status={animal.healthStatus} size="md" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-display font-semibold text-ink mb-4">Details</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3"><Tag size={16} className="text-ink-secondary" /><div><p className="text-xs text-ink-secondary">Tag Number</p><p className="text-sm font-medium text-ink">{animal.tagNumber}</p></div></div>
            <div className="flex items-center gap-3"><User size={16} className="text-ink-secondary" /><div><p className="text-xs text-ink-secondary">Owner</p><p className="text-sm font-medium text-ink">{owner?.name ?? 'Unknown'}</p><p className="text-xs text-ink-secondary">{owner?.phone}</p></div></div>
            <div className="flex items-center gap-3"><MapPin size={16} className="text-ink-secondary" /><div><p className="text-xs text-ink-secondary">Zone</p><p className="text-sm font-medium text-ink">{zone?.name ?? 'Unknown'}</p></div></div>
            <div className="flex items-center gap-3"><Calendar size={16} className="text-ink-secondary" /><div><p className="text-xs text-ink-secondary">Date of Birth</p><p className="text-sm font-medium text-ink">{new Date(animal.dateOfBirth).toLocaleDateString()}</p></div></div>
            <div><p className="text-xs text-ink-secondary mb-1">Sex</p><p className="text-sm font-medium text-ink capitalize">{animal.sex}</p></div>
            {enteredBy && <div><p className="text-xs text-ink-secondary mb-1">Registered by</p><p className="text-sm font-medium text-ink">{enteredBy.name}</p><p className="text-xs text-ink-secondary">{new Date(animal.registeredAt).toLocaleString()}</p></div>}
            {animal.editableUntil && <div className="pt-2"><GracePeriodCountdown editableUntil={animal.editableUntil} /></div>}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold text-ink">Vaccination History</h2>
            <button onClick={() => navigate(`/vaccinations/record?animalId=${animal.id}`)} className="text-xs text-brand hover:text-brand/80 font-medium flex items-center gap-1"><Syringe size={12} /> Record vaccination</button>
          </div>
          {animalVaccinations.length === 0 ? <p className="text-sm text-ink-secondary py-4 text-center">No vaccinations recorded</p> : (
            <div className="space-y-3">
              {animalVaccinations.map(vac => {
                const vaccine = vaccines.find(v => v.id === vac.vaccineId);
                return (
                  <div key={vac.id} className="p-3 bg-bg rounded-lg">
                    <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-ink">{vaccine?.name ?? 'Unknown'}</p><p className="text-xs text-ink-secondary">Dose {vac.doseNumber}</p></div><p className="text-xs text-ink-secondary">{new Date(vac.dateAdministered).toLocaleDateString()}</p></div>
                    <div className="mt-1 text-xs text-ink-secondary">Batch: {vac.batchNumber}{vac.nextDueDate && <> · Next due: {new Date(vac.nextDueDate).toLocaleDateString()}</>}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {(canEdit || canMarkDeceased) && animal.healthStatus !== 'deceased' && (
        <div className="flex gap-3">
          {canEdit && <button onClick={startEdit} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium text-ink hover:bg-card transition-colors"><Edit2 size={16} /> Edit Record</button>}
          {canMarkDeceased && <button onClick={() => setShowDeceased(true)} className="flex items-center gap-2 px-4 py-2 border border-clay/30 rounded-lg text-sm font-medium text-clay-text hover:bg-clay-bg/30 transition-colors"><Flag size={16} /> Mark Deceased</button>}
        </div>
      )}

      {showDeceased && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30">
          <div className="bg-card border border-border rounded-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-display font-semibold text-ink mb-4">Mark as Deceased</h3>
            <p className="text-sm text-ink-secondary mb-4">This action is permanent. A reason and date of death are required.</p>
            <div className="space-y-4">
              <div><label className="block text-xs font-medium text-ink-secondary mb-1">Reason</label><select value={deceasedForm.reason} onChange={(e) => setDeceasedForm({ ...deceasedForm, reason: e.target.value })} className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"><option value="">Select a reason</option>{deceasedReasons.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
              <div><label className="block text-xs font-medium text-ink-secondary mb-1">Date of Death</label><input type="date" value={deceasedForm.date} onChange={(e) => setDeceasedForm({ ...deceasedForm, date: e.target.value })} className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20" /></div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowDeceased(false)} className="px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-bg rounded-lg border border-border">Cancel</button>
              <button onClick={handleMarkDeceased} disabled={!deceasedForm.reason || !deceasedForm.date} className="px-4 py-2 text-sm font-medium bg-clay-bg text-clay-text rounded-lg hover:opacity-90 disabled:opacity-50">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-display font-semibold text-ink mb-4">Edit Animal Record</h3>
            <div className="space-y-4">
              <div><label className="block text-xs font-medium text-ink-secondary mb-1">Species</label><select value={editForm.speciesId} onChange={(e) => setEditForm({ ...editForm, speciesId: e.target.value })} className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink">{species.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div><label className="block text-xs font-medium text-ink-secondary mb-1">Sex</label><select value={editForm.sex} onChange={(e) => setEditForm({ ...editForm, sex: e.target.value })} className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink"><option value="male">Male</option><option value="female">Female</option></select></div>
              <div><label className="block text-xs font-medium text-ink-secondary mb-1">Health Status</label><select value={editForm.healthStatus} onChange={(e) => setEditForm({ ...editForm, healthStatus: e.target.value })} className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink"><option value="healthy">Healthy</option><option value="sick">Sick</option><option value="under_treatment">Under Treatment</option></select></div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-bg rounded-lg border border-border">Cancel</button>
              <button onClick={handleSaveEdit} className="px-4 py-2 text-sm font-medium bg-brand text-on-brand rounded-lg hover:bg-brand-hover">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
