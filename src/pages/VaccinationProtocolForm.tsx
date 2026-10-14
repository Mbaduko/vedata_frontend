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
import { ArrowLeft, Loader, Plus, Trash2, AlertCircle, CheckCircle, X, Calendar } from 'lucide-react';
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
            diseaseName: protocol.disease.name,
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

      {/* Dose Schedule */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">Dose Schedule</h2>
            <p className="text-sm text-ink-secondary mt-1">
              {isEdit 
                ? 'Dose schedules are locked after creation to protect active enrollments'
                : 'Define when each dose should be given and which vaccines are allowed'}
            </p>
          </div>
          {!isEdit && (
            <button
              onClick={() => setDoses((prev) => [...prev, { ...emptyDose, daysFromPrevious: prev.length > 0 ? 21 : 0 }])}
              className="flex items-center gap-2 px-4 py-2 bg-brand text-on-brand rounded-lg hover:bg-brand-hover text-sm font-medium"
              disabled={!form.diseaseId}
              title={!form.diseaseId ? "Select a disease first" : "Add another dose"}
            >
              <Plus size={16} /> Add Dose
            </button>
          )}
        </div>

        {!isEdit && !form.diseaseId && (
          <div className="p-4 bg-gold-bg border border-gold-border rounded-lg">
            <p className="text-sm text-gold-text">
              💡 Select a disease above to start building the dose schedule
            </p>
          </div>
        )}

        {!isEdit && vaccines.length === 0 && form.diseaseId && (
          <div className="p-4 bg-gold-bg border border-gold-border rounded-lg">
            <p className="text-sm text-gold-text">
              💡 No vaccines configured for this disease yet. You can create them as you configure each dose below.
            </p>
          </div>
        )}

        {isEdit ? (
          <div className="p-4 bg-muted-bg border border-border rounded-lg">
            <p className="text-sm text-ink-secondary">
              Dose schedules cannot be edited after creation. If you need to modify the schedule, 
              archive this protocol and create a new one with the updated schedule.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {doses.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted-bg mb-3">
                  <Calendar size={24} className="text-ink-secondary" />
                </div>
                <p className="text-sm text-ink-secondary mb-4">No doses configured yet</p>
                <button
                  onClick={() => setDoses([{ ...emptyDose }])}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-on-brand rounded-lg hover:bg-brand-hover text-sm font-medium"
                  disabled={!form.diseaseId}
                >
                  <Plus size={16} /> Add First Dose
                </button>
              </div>
            ) : (
              <>
                {/* Timeline visualization */}
                <div className="relative">
                  <div className="flex items-start gap-4 overflow-x-auto pb-4">
                    {doses.map((dose, index) => {
                      const isLast = index === doses.length - 1;
                      const cumulativeDays = doses.slice(0, index + 1).reduce((sum, d) => sum + (d.daysFromPrevious || 0), 0);
                      
                      return (
                        <div key={index} className="flex items-start gap-4 shrink-0">
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-brand text-on-brand flex items-center justify-center text-sm font-bold shadow-sm">
                              {index + 1}
                            </div>
                            <div className="mt-2 text-center">
                              <p className="text-xs font-medium text-ink">
                                {index === 0 ? 'Day 0' : `Day ${cumulativeDays}`}
                              </p>
                              {index > 0 && (
                                <p className="text-xs text-ink-secondary">
                                  +{dose.daysFromPrevious}d
                                </p>
                              )}
                              {dose.isRecurring && (
                                <p className="text-xs text-brand-text mt-1 font-medium">
                                  🔄 Every {dose.recurringIntervalDays}d
                                </p>
                              )}
                            </div>
                          </div>
                          {!isLast && (
                            <div className="flex items-center pt-5">
                              <div className="h-px w-16 bg-border"></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Dose configurations */}
                <div className="space-y-4">
                  {doses.map((dose, index) => (
                    <div key={index} className="relative bg-bg border-2 border-border rounded-xl p-6 space-y-5 hover:border-brand/30 transition-colors">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand text-on-brand flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-ink">
                              Dose {index + 1}
                              {dose.isRecurring && (
                                <span className="ml-2 text-xs text-brand-text font-normal px-2 py-0.5 bg-brand-bg rounded-full">
                                  🔄 Recurring Booster
                                </span>
                              )}
                            </h3>
                            <p className="text-xs text-ink-secondary mt-0.5">
                              {index === 0 
                                ? 'Initial dose (Day 0)' 
                                : `Given ${dose.daysFromPrevious || 0} days after dose ${index}`}
                            </p>
                          </div>
                        </div>
                        {doses.length > 1 && (
                          <button
                            onClick={() => setDoses((prev) => prev.filter((_, i) => i !== index))}
                            className="p-2 text-ink-secondary hover:text-clay-text rounded-lg hover:bg-card transition-colors"
                            title="Remove this dose"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>

                      {/* Timing Configuration */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Days from previous */}
                          <div>
                            <label className="block text-sm font-medium text-ink mb-2">
                              {index === 0 ? 'Initial Dose' : 'Days After Previous Dose'} *
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min={0}
                                value={dose.daysFromPrevious}
                                onChange={(e) =>
                                  updateDose(index, { daysFromPrevious: Math.max(0, Number(e.target.value)) })
                                }
                                disabled={index === 0}
                                className="w-full px-4 py-2.5 bg-card border border-border rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                placeholder={index === 0 ? "0" : "e.g., 21"}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-secondary">
                                days
                              </span>
                            </div>
                            {index === 0 && (
                              <p className="text-xs text-ink-secondary mt-1">
                                First dose is always on day 0
                              </p>
                            )}
                          </div>

                          {/* Recurring configuration */}
                          <div>
                            <label className="block text-sm font-medium text-ink mb-2">
                              Recurring Schedule
                            </label>
                            <div className="flex items-center gap-3 h-[42px] px-4 py-2.5 bg-card border border-border rounded-lg">
                              <input
                                type="checkbox"
                                id={`recurring-${index}`}
                                checked={dose.isRecurring}
                                onChange={(e) => updateDose(index, { 
                                  isRecurring: e.target.checked,
                                  recurringIntervalDays: e.target.checked && !dose.recurringIntervalDays ? 365 : dose.recurringIntervalDays
                                })}
                                className="w-4 h-4 accent-brand cursor-pointer"
                              />
                              <label htmlFor={`recurring-${index}`} className="text-sm text-ink cursor-pointer select-none">
                                This is a recurring booster
                              </label>
                            </div>
                            <p className="text-xs text-ink-secondary mt-1">
                              Check if this dose repeats periodically (e.g., annual booster)
                            </p>
                          </div>
                        </div>

                        {/* Recurring interval (shown only when recurring is enabled) */}
                        {dose.isRecurring && (
                          <div className="p-4 bg-brand-bg border border-brand/20 rounded-lg">
                            <label className="block text-sm font-medium text-brand-text mb-2">
                              Repeat Every (Days) *
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min={1}
                                value={dose.recurringIntervalDays}
                                onChange={(e) =>
                                  updateDose(index, {
                                    recurringIntervalDays:
                                      e.target.value === '' ? '' : Math.max(1, Number(e.target.value)),
                                  })
                                }
                                placeholder="e.g., 365 for annual"
                                className="w-full px-4 py-2.5 bg-card border border-brand/30 rounded-lg focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-secondary">
                                days
                              </span>
                            </div>
                            <p className="text-xs text-brand-text/80 mt-2">
                              💡 Common intervals: 365 days (annual), 180 days (bi-annual), 90 days (quarterly)
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Vaccine Selection */}
                      <div className="space-y-3 pt-2 border-t border-border">
                        <label className="block text-sm font-medium text-ink">
                          Allowed Vaccines for Dose {index + 1} *
                        </label>
                        
                        {/* Selected vaccines */}
                        {dose.vaccineIds.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {dose.vaccineIds.map(vaccineId => {
                              const vaccine = vaccines.find(v => v.id === vaccineId);
                              if (!vaccine) return null;
                              return (
                                <div
                                  key={vaccineId}
                                  className="group flex items-center gap-2 px-3 py-2 bg-brand-bg border border-brand/30 rounded-lg text-sm hover:border-brand transition-colors"
                                >
                                  <CheckCircle size={14} className="text-brand shrink-0" />
                                  <span className="font-medium text-brand-text">{vaccine.name}</span>
                                  {vaccine.manufacturer && (
                                    <span className="text-xs text-ink-secondary">({vaccine.manufacturer})</span>
                                  )}
                                  <button
                                    onClick={() => toggleVaccine(index, vaccineId)}
                                    className="ml-1 p-1 text-brand-text/60 hover:text-clay-text hover:bg-brand/20 rounded transition-colors"
                                    title="Remove vaccine"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-3 bg-gold-bg border border-gold-border rounded-lg">
                            <p className="text-xs text-gold-text">
                              ⚠️ No vaccines selected yet. Add at least one vaccine for this dose.
                            </p>
                          </div>
                        )}

                        {/* Add vaccine autocomplete */}
                        <SmartAutocomplete<Vaccine>
                          label=""
                          value={vaccineInputs[index] || ''}
                          onChange={(value, selected) => handleVaccineChange(index, value, selected)}
                          options={vaccines.filter(v => !dose.vaccineIds.includes(v.id))}
                          getLabel={(v) => v.name + (v.manufacturer ? ` (${v.manufacturer})` : '')}
                          placeholder="Type to search existing vaccines or create new..."
                          disabled={!form.diseaseId || creatingVaccine[index]}
                          onCreateNew={(name) => handleCreateVaccine(index, name)}
                          createNewLabel="Create new vaccine"
                          helpText={
                            !form.diseaseId 
                              ? "Select disease first" 
                              : vaccines.length === 0
                              ? "No vaccines configured. Type a name to create the first one."
                              : "Search existing vaccines or type a new name to create one"
                          }
                          typoThreshold={75}
                          minSearchLength={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
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
