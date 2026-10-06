import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  vaccinationApi,
  speciesApi,
  diseaseApi,
  zoneApi,
  ApiError,
  type Species,
  type Disease,
  type Zone,
  type Vaccine,
} from '../services/api';
import { ArrowLeft, Loader, Plus, Trash2, AlertCircle } from 'lucide-react';
import SmartAutocomplete from '../components/SmartAutocomplete';

interface DoseDraft {
  daysFromPrevious: number;
  isRecurring: boolean;
  recurringIntervalDays: number | '';
  vaccineIds: string[];
}

const emptyDose: DoseDraft = {
  daysFromPrevious: 0,
  isRecurring: false,
  recurringIntervalDays: '',
  vaccineIds: [],
};

export default function VaccinationProtocolForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);

  const [form, setForm] = useState({
    name: '',
    description: '',
    speciesId: '',
    diseaseId: '',
    diseaseName: '', // For autocomplete display
    zoneId: '',
  });
  const [isActive, setIsActive] = useState(true);
  const [doses, setDoses] = useState<DoseDraft[]>([{ ...emptyDose }]);
  
  // Disease creation
  const [creatingDisease, setCreatingDisease] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState<Disease | null>(null);
  
  // Vaccine creation per dose
  const [vaccineInputs, setVaccineInputs] = useState<{ [doseIndex: number]: string }>({});
  const [creatingVaccine, setCreatingVaccine] = useState<{ [doseIndex: number]: boolean }>({});

  // Initial data (lists + protocol when editing)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [species, diseaseList, zoneList] = await Promise.all([
          speciesApi.getSpecies(),
          diseaseApi.getDiseases(),
          zoneApi.getZones({ limit: 100 }),
        ]);
        if (cancelled) return;
        setSpeciesList(species);
        setDiseases(diseaseList);
        setZones(zoneList);

        if (id) {
          const protocol = await vaccinationApi.getProtocol(id);
          if (cancelled) return;
          setForm({
            name: protocol.name,
            description: protocol.description ?? '',
            speciesId: protocol.speciesId,
            diseaseId: protocol.diseaseId,
            zoneId: protocol.zoneId ?? '',
          });
          setIsActive(protocol.isActive);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load form data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Vaccines follow the selected disease; changing disease resets selections
  useEffect(() => {
    if (!form.diseaseId) {
      setVaccines([]);
      return;
    }
    let cancelled = false;
    diseaseApi
      .getVaccines(form.diseaseId)
      .then((data) => {
        if (!cancelled) setVaccines(data);
      })
      .catch(() => {
        if (!cancelled) setVaccines([]);
      });
    return () => {
      cancelled = true;
    };
  }, [form.diseaseId]);

  // Diseases applicable to the selected species (empty association = applies to all)
  const diseaseOptions = useMemo(() => {
    if (!form.speciesId) return diseases;
    return diseases.filter(
      (d) =>
        !d.species?.length || d.species.some((s) => s.speciesId === form.speciesId),
    );
  }, [diseases, form.speciesId]);

  const updateDose = (index: number, patch: Partial<DoseDraft>) => {
    setDoses((prev) => prev.map((dose, i) => (i === index ? { ...dose, ...patch } : dose)));
  };

  const toggleVaccine = (index: number, vaccineId: string) => {
    setDoses((prev) =>
      prev.map((dose, i) => {
        if (i !== index) return dose;
        const has = dose.vaccineIds.includes(vaccineId);
        return {
          ...dose,
          vaccineIds: has
            ? dose.vaccineIds.filter((v) => v !== vaccineId)
            : [...dose.vaccineIds, vaccineId],
        };
      }),
    );
  };

  const handleDiseaseChange = (value: string, selected: Disease | null) => {
    setForm(prev => ({
      ...prev,
      diseaseName: value,
      diseaseId: selected?.id || ''
    }));
    setSelectedDisease(selected);
  };

  const handleCreateDisease = async (diseaseName: string) => {
    if (!diseaseName.trim() || !form.speciesId) {
      setError('Species must be selected before creating disease');
      return;
    }

    try {
      setCreatingDisease(true);
      setError(null);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'}/diseases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: diseaseName.trim(),
          applicableSpeciesIds: [form.speciesId]
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create disease');
      }
      
      const result = await response.json();
      const newDisease = result.data;
      
      // Add to diseases list
      setDiseases(prev => [...prev, newDisease]);
      setForm(prev => ({ ...prev, diseaseId: newDisease.id, diseaseName: newDisease.name }));
      setSelectedDisease(newDisease);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create disease');
    } finally {
      setCreatingDisease(false);
    }
  };

  const handleVaccineChange = (doseIndex: number, value: string, selected: Vaccine | null) => {
    setVaccineInputs(prev => ({ ...prev, [doseIndex]: value }));
    if (selected) {
      toggleVaccine(doseIndex, selected.id);
      // Clear input after selection
      setVaccineInputs(prev => {
        const updated = { ...prev };
        delete updated[doseIndex];
        return updated;
      });
    }
  };

  const handleCreateVaccine = async (doseIndex: number, vaccineName: string) => {
    if (!vaccineName.trim() || !form.diseaseId) {
      setError('Disease must be selected before creating vaccine');
      return;
    }

    try {
      setCreatingVaccine(prev => ({ ...prev, [doseIndex]: true }));
      setError(null);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'}/diseases/${form.diseaseId}/vaccines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: vaccineName.trim(),
          manufacturer: undefined
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create vaccine');
      }
      
      const result = await response.json();
      const newVaccine = result.data;
      
      // Add to vaccines list
      setVaccines(prev => [...prev, newVaccine]);
      // Auto-select the new vaccine for this dose
      toggleVaccine(doseIndex, newVaccine.id);
      
      // Clear input
      setVaccineInputs(prev => {
        const updated = { ...prev };
        delete updated[doseIndex];
        return updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vaccine');
    } finally {
      setCreatingVaccine(prev => ({ ...prev, [doseIndex]: false }));
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (!form.name.trim() || !form.speciesId || !form.diseaseId) {
      setError('Name, species and disease are required.');
      return;
    }

    if (!isEdit) {
      for (let i = 0; i < doses.length; i++) {
        const dose = doses[i];
        if (dose.vaccineIds.length === 0) {
          setError(`Dose ${i + 1} needs at least one allowed vaccine.`);
          return;
        }
        if (dose.isRecurring && (!dose.recurringIntervalDays || Number(dose.recurringIntervalDays) < 1)) {
          setError(`Dose ${i + 1} is recurring — set an interval in days.`);
          return;
        }
      }
      if (vaccines.length === 0) {
        setError(
          'This disease has no vaccines configured yet. Add one under Disease configuration first.',
        );
        return;
      }
    }

    try {
      setSaving(true);
      if (isEdit && id) {
        await vaccinationApi.updateProtocol(id, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          isActive,
        });
        navigate(`/vaccinations/protocols/${id}`);
      } else {
        const created = await vaccinationApi.createProtocol({
          name: form.name.trim(),
          speciesId: form.speciesId,
          diseaseId: form.diseaseId,
          description: form.description.trim() || undefined,
          zoneId: form.zoneId || undefined,
          doses: doses.map((dose, index) => ({
            doseNumber: index + 1,
            daysFromPrevious: Number(dose.daysFromPrevious) || 0,
            isRecurring: dose.isRecurring,
            recurringIntervalDays: dose.isRecurring
              ? Number(dose.recurringIntervalDays)
              : undefined,
            vaccineIds: dose.vaccineIds,
          })),
        });
        navigate(`/vaccinations/protocols/${created.id}`);
      }
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error ? err.message : 'Failed to save protocol',
      );
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader size={32} className="text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <button
          onClick={() => navigate('/vaccinations/protocols')}
          className="flex items-center gap-2 text-sm text-ink-secondary hover:text-ink mb-2"
        >
          <ArrowLeft size={16} /> All protocols
        </button>
        <h1 className="text-2xl font-display font-semibold text-ink">
          {isEdit ? 'Edit Protocol' : 'Create Vaccination Protocol'}
        </h1>
        <p className="text-sm text-ink-secondary mt-1">
          {isEdit
            ? 'Name, description and status can be changed. Doses are locked to protect in-flight enrollments.'
            : 'Define the dose schedule animals will follow for this disease.'}
        </p>
      </div>

      {error && (
        <div className="p-3 bg-clay-bg border border-clay-border rounded-lg">
          <p className="text-sm text-clay-text">{error}</p>
        </div>
      )}

      {/* Basics */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-ink">Basics</h2>

        <div>
          <label className="block text-sm font-medium text-ink-secondary mb-1">Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Rwanda Dog Rabies Standard Protocol 2026"
            className="w-full px-3 py-2 bg-bg border border-border rounded-lg"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1">Species *</label>
            <select
              value={form.speciesId}
              onChange={(e) => setForm({ ...form, speciesId: e.target.value })}
              disabled={isEdit}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg disabled:opacity-60"
            >
              <option value="">Select species</option>
              {speciesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <SmartAutocomplete<Disease>
              label="Disease *"
              value={form.diseaseName}
              onChange={handleDiseaseChange}
              options={diseaseOptions}
              getLabel={(d) => d.name}
              placeholder="Type disease name (e.g., Rabies)"
              disabled={isEdit || creatingDisease}
              onCreateNew={handleCreateDisease}
              helpText={!form.speciesId ? "Select species first to filter diseases" : undefined}
              typoThreshold={75}
              minSearchLength={2}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1">
              Zone scope (optional)
            </label>
            <select
              value={form.zoneId}
              onChange={(e) => setForm({ ...form, zoneId: e.target.value })}
              disabled={isEdit}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg disabled:opacity-60"
            >
              <option value="">Global — all zones</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>

          {isEdit && (
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="accent-[var(--brand)]"
                />
                Protocol is active
              </label>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-secondary mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            placeholder="What is this protocol for?"
            className="w-full px-3 py-2 bg-bg border border-border rounded-lg"
          />
        </div>
      </div>

      {/* Doses */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Dose Schedule</h2>
          {!isEdit && (
            <button
              onClick={() => setDoses((prev) => [...prev, { ...emptyDose }])}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-bg"
            >
              <Plus size={14} /> Add Dose
            </button>
          )}
        </div>

        {!isEdit && vaccines.length === 0 && form.diseaseId && (
          <p className="text-sm text-gold-text">
            No vaccines configured for this disease yet — add one under Disease configuration.
          </p>
        )}

        {isEdit ? (
          <p className="text-sm text-ink-secondary">
            Dose schedules are locked after creation. Archive this protocol and create a new one
            to change the schedule.
          </p>
        ) : (
          <div className="space-y-4">
            {doses.map((dose, index) => (
              <div key={index} className="p-4 bg-bg border border-border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-full bg-brand text-on-brand flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  {doses.length > 1 && (
                    <button
                      onClick={() => setDoses((prev) => prev.filter((_, i) => i !== index))}
                      className="p-1.5 text-ink-secondary hover:text-clay-text rounded-lg hover:bg-bg"
                      title="Remove dose"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1">
                      Days after previous dose
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={dose.daysFromPrevious}
                      onChange={(e) =>
                        updateDose(index, { daysFromPrevious: Number(e.target.value) })
                      }
                      disabled={index === 0}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1">
                      Recurring booster
                    </label>
                    <label className="flex items-center gap-2 py-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={dose.isRecurring}
                        onChange={(e) => updateDose(index, { isRecurring: e.target.checked })}
                        className="accent-[var(--brand)]"
                      />
                      Repeat this dose
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1">
                      Repeat every (days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={dose.recurringIntervalDays}
                      onChange={(e) =>
                        updateDose(index, {
                          recurringIntervalDays:
                            e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      disabled={!dose.isRecurring}
                      placeholder="e.g., 365"
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-2">
                    Vaccines for Dose {index + 1} *
                  </label>
                  
                  {/* Selected vaccines */}
                  {dose.vaccineIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {dose.vaccineIds.map(vaccineId => {
                        const vaccine = vaccines.find(v => v.id === vaccineId);
                        if (!vaccine) return null;
                        return (
                          <div
                            key={vaccineId}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-bg border border-brand/20 rounded-lg text-sm"
                          >
                            <span className="font-medium text-brand-text">{vaccine.name}</span>
                            {vaccine.manufacturer && (
                              <span className="text-xs text-ink-secondary">({vaccine.manufacturer})</span>
                            )}
                            <button
                              onClick={() => toggleVaccine(index, vaccineId)}
                              className="ml-1 text-brand-text hover:text-brand"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add vaccine autocomplete */}
                  <SmartAutocomplete<Vaccine>
                    label=""
                    value={vaccineInputs[index] || ''}
                    onChange={(value, selected) => handleVaccineChange(index, value, selected)}
                    options={vaccines}
                    getLabel={(v) => v.name + (v.manufacturer ? ` (${v.manufacturer})` : '')}
                    placeholder="Type to search or create vaccine..."
                    disabled={!form.diseaseId || creatingVaccine[index]}
                    onCreateNew={(name) => handleCreateVaccine(index, name)}
                    createNewLabel="Create new vaccine"
                    helpText={!form.diseaseId ? "Select disease first" : "Type to search existing vaccines or create new"}
                    typoThreshold={75}
                    minSearchLength={2}
                  />
                  
                  {vaccines.length === 0 && form.diseaseId && (
                    <p className="mt-2 text-xs text-ink-secondary">
                      No vaccines yet for this disease. Type a name above to create the first one.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button
          onClick={() => navigate('/vaccinations/protocols')}
          className="px-4 py-2 text-sm text-ink-secondary hover:text-ink"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-on-brand rounded-lg hover:bg-brand-hover disabled:opacity-50"
        >
          {saving && <Loader size={16} className="animate-spin" />}
          {isEdit ? 'Save Changes' : 'Create Protocol'}
        </button>
      </div>
    </div>
  );
}
