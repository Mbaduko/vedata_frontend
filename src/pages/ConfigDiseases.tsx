import { useState } from 'react';
import { useData, useDispatch } from '../context/DataContext';
import { Plus, Edit2, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';

export default function ConfigDiseases() {
  const { diseases, vaccines, vaccineSchedules, species } = useData();
  const dispatch = useDispatch();
  const [expandedDisease, setExpandedDisease] = useState<string | null>(null);
  const [showNewDisease, setShowNewDisease] = useState(false);
  const [newDisease, setNewDisease] = useState<Record<string, unknown>>({ name: '', applicableSpeciesIds: [] });
  const [showNewVaccine, setShowNewVaccine] = useState<string | null>(null);
  const [newVaccine, setNewVaccine] = useState<Record<string, unknown>>({ name: '', manufacturer: '' });
  const [showNewSchedule, setShowNewSchedule] = useState<string | null>(null);
  const [newSchedule, setNewSchedule] = useState<Record<string, unknown>>({ doseNumber: 1, intervalDaysFromPrevious: 0, isRecurring: false, recurrenceIntervalDays: 0 });

  const handleCreateDisease = () => {
    if (!newDisease.name.trim()) return;
    dispatch({ type: 'CREATE_DISEASE', payload: { name: newDisease.name.trim(), applicableSpeciesIds: newDisease.applicableSpeciesIds } });
    setNewDisease({ name: '', applicableSpeciesIds: [] });
    setShowNewDisease(false);
  };

  const handleCreateVaccine = () => {
    if (!newVaccine.name.trim()) return;
    dispatch({ type: 'CREATE_VACCINE', payload: { name: newVaccine.name.trim(), diseaseId: showNewVaccine, manufacturer: newVaccine.manufacturer } });
    setNewVaccine({ name: '', manufacturer: '' });
    setShowNewVaccine(null);
  };

  const handleCreateSchedule = () => {
    dispatch({ type: 'CREATE_VACCINE_SCHEDULE', payload: { vaccineId: showNewSchedule, ...newSchedule } });
    setNewSchedule({ doseNumber: 1, intervalDaysFromPrevious: 0, isRecurring: false, recurrenceIntervalDays: 0 });
    setShowNewSchedule(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink">Disease & Vaccine Config</h1>
          <p className="text-sm text-ink-secondary mt-1">Manage diseases, vaccines, and dosing schedules</p>
        </div>
        <button
          onClick={() => setShowNewDisease(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand/90"
        >
          <Plus size={16} /> New Disease
        </button>
      </div>

      {showNewDisease && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-ink mb-4">New Disease</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Disease Name</label>
              <input
                type="text"
                value={newDisease.name}
                onChange={(e) => setNewDisease({ ...newDisease, name: e.target.value })}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Applicable Species</label>
              <div className="flex flex-wrap gap-2">
                {species.map(s => (
                  <label key={s.id} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={newDisease.applicableSpeciesIds.includes(s.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewDisease({ ...newDisease, applicableSpeciesIds: [...newDisease.applicableSpeciesIds, s.id] });
                        } else {
                          setNewDisease({ ...newDisease, applicableSpeciesIds: newDisease.applicableSpeciesIds.filter(id => id !== s.id) });
                        }
                      }}
                      className="rounded border-border text-brand focus:ring-brand/20"
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleCreateDisease} disabled={!newDisease.name.trim()} className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand/90 disabled:opacity-50">Create</button>
            <button onClick={() => setShowNewDisease(false)} className="px-4 py-2 text-sm text-ink-secondary hover:bg-bg rounded-lg border border-border">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {diseases.map(disease => {
          const diseaseVaccines = vaccines.filter(v => v.diseaseId === disease.id);
          const isExpanded = expandedDisease === disease.id;

          return (
            <div key={disease.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedDisease(isExpanded ? null : disease.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-bg/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown size={16} className="text-ink-secondary" /> : <ChevronRight size={16} className="text-ink-secondary" />}
                  <div className="text-left">
                    <p className="text-sm font-medium text-ink">{disease.name}</p>
                    <p className="text-xs text-ink-secondary">
                      {diseaseVaccines.length} vaccine{diseaseVaccines.length !== 1 ? 's' : ''} · {disease.applicableSpeciesIds.length} species
                    </p>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                  {diseaseVaccines.map(vaccine => {
                    const schedules = vaccineSchedules.filter(s => s.vaccineId === vaccine.id);
                    return (
                      <div key={vaccine.id} className="bg-bg rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-ink">{vaccine.name}</p>
                            <p className="text-xs text-ink-secondary">{vaccine.manufacturer || 'No manufacturer'}</p>
                          </div>
                          <button
                            onClick={() => setShowNewSchedule(vaccine.id)}
                            className="text-xs text-brand hover:text-brand/80 font-medium"
                          >
                            + Add dose
                          </button>
                        </div>
                        {schedules.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {schedules.sort((a, b) => a.doseNumber - b.doseNumber).map(s => (
                              <div key={s.id} className="flex items-center justify-between text-xs">
                                <span className="text-ink-secondary">Dose {s.doseNumber}</span>
                                <span className="text-ink">
                                  {s.intervalDaysFromPrevious === 0 ? 'Day 0' : `${s.intervalDaysFromPrevious}d after prev`}
                                  {s.isRecurring && ` · Repeats every ${s.recurrenceIntervalDays}d`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <button
                    onClick={() => setShowNewVaccine(disease.id)}
                    className="text-xs text-brand hover:text-brand/80 font-medium flex items-center gap-1"
                  >
                    <Plus size={12} /> Add Vaccine
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New Vaccine Modal */}
      {showNewVaccine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30">
          <div className="bg-card border border-border rounded-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-display font-semibold text-ink mb-4">New Vaccine</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Vaccine Name</label>
                <input type="text" value={newVaccine.name} onChange={(e) => setNewVaccine({ ...newVaccine, name: e.target.value })} className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Manufacturer</label>
                <input type="text" value={newVaccine.manufacturer} onChange={(e) => setNewVaccine({ ...newVaccine, manufacturer: e.target.value })} className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleCreateVaccine} disabled={!newVaccine.name.trim()} className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand/90 disabled:opacity-50">Create</button>
              <button onClick={() => setShowNewVaccine(null)} className="px-4 py-2 text-sm text-ink-secondary hover:bg-bg rounded-lg border border-border">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* New Schedule Modal */}
      {showNewSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30">
          <div className="bg-card border border-border rounded-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-display font-semibold text-ink mb-4">Add Dose Schedule</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Dose Number</label>
                <input type="number" value={newSchedule.doseNumber} onChange={(e) => setNewSchedule({ ...newSchedule, doseNumber: parseInt(e.target.value) || 1 })} min="1" className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Interval from Previous (days)</label>
                <input type="number" value={newSchedule.intervalDaysFromPrevious} onChange={(e) => setNewSchedule({ ...newSchedule, intervalDaysFromPrevious: parseInt(e.target.value) || 0 })} min="0" className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={newSchedule.isRecurring} onChange={(e) => setNewSchedule({ ...newSchedule, isRecurring: e.target.checked })} className="rounded border-border text-brand" />
                <label className="text-sm text-ink">Recurring</label>
              </div>
              {newSchedule.isRecurring && (
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1">Recurrence Interval (days)</label>
                  <input type="number" value={newSchedule.recurrenceIntervalDays} onChange={(e) => setNewSchedule({ ...newSchedule, recurrenceIntervalDays: parseInt(e.target.value) || 0 })} min="1" className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink" />
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleCreateSchedule} className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand/90">Add Schedule</button>
              <button onClick={() => setShowNewSchedule(null)} className="px-4 py-2 text-sm text-ink-secondary hover:bg-bg rounded-lg border border-border">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
