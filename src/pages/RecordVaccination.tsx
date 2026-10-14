import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  vaccinationApi,
  animalApi,
  ApiError,
  type Animal,
  type AnimalVaccinationEnrollment,
} from '../services/api';
import { AlertCircle, CheckCircle, Loader, Search, X } from 'lucide-react';
import { resolveNextDose } from '../utils/protocolSchedule';

export default function RecordVaccination() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedEnrollmentId = searchParams.get('enrollmentId');
  const preselectedAnimalId = searchParams.get('animalId');

  const [step, setStep] = useState<1 | 2>(preselectedEnrollmentId && preselectedAnimalId ? 2 : 1);
  const [animalSearch, setAnimalSearch] = useState('');
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [enrollments, setEnrollments] = useState<AnimalVaccinationEnrollment[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<AnimalVaccinationEnrollment | null>(
    null,
  );
  const [formData, setFormData] = useState({
    vaccineId: '',
    batchNumber: '',
    dateAdministered: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced animal search
  useEffect(() => {
    const term = animalSearch.trim();
    if (term.length < 3) {
      setAnimals([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const data = await animalApi.getAnimals({ search: term, limit: 5 });
        setAnimals(data);
      } catch {
        setAnimals([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [animalSearch]);

  // Load enrollments for a picked animal (step 1)
  useEffect(() => {
    if (!selectedAnimal) return;
    let cancelled = false;
    setEnrollmentsLoading(true);
    vaccinationApi
      .getAnimalEnrollments(selectedAnimal.id)
      .then((data) => {
        if (!cancelled) setEnrollments(data);
      })
      .catch(() => {
        if (!cancelled) setEnrollments([]);
      })
      .finally(() => {
        if (!cancelled) setEnrollmentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAnimal]);

  // Deep link from the due list: ?enrollmentId=...&animalId=...
  useEffect(() => {
    if (!preselectedEnrollmentId || !preselectedAnimalId) return;
    let cancelled = false;
    vaccinationApi
      .getAnimalEnrollments(preselectedAnimalId)
      .then((list) => {
        if (cancelled) return;
        const match = list.find((e) => e.id === preselectedEnrollmentId);
        if (match) {
          setSelectedEnrollment(match);
          setSelectedAnimal(null);
          setStep(2);
        } else {
          setStep(1);
          setError('Enrollment not found for this animal.');
        }
      })
      .catch(() => {
        setStep(1);
        setError('Could not load the enrollment. Find the animal instead.');
      });
    return () => {
      cancelled = true;
    };
  }, [preselectedEnrollmentId, preselectedAnimalId]);

  const activeEnrollments = useMemo(
    () => enrollments.filter((e) => e.status === 'active'),
    [enrollments],
  );

  // Past the primary series, boosters keep counting up and follow the recurring final dose
  const resolvedNextDose = selectedEnrollment
    ? resolveNextDose(selectedEnrollment.protocol.doses, selectedEnrollment.currentDose)
    : null;
  const nextDose = resolvedNextDose?.definition;

  const handleSubmit = async () => {
    if (!selectedEnrollment || !nextDose) return;
    if (!formData.vaccineId || !formData.batchNumber) return;

    try {
      setSubmitting(true);
      setError(null);
      await vaccinationApi.recordVaccination({
        animalVaccinationId: selectedEnrollment.id,
        vaccineId: formData.vaccineId,
        doseNumber: resolvedNextDose!.doseNumber,
        batchNumber: formData.batchNumber,
        dateAdministered: formData.dateAdministered,
        notes: formData.notes || undefined,
      });
      navigate('/vaccinations/due');
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Failed to record vaccination');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-semibold text-ink">Record Vaccination</h1>
        <button
          onClick={() => navigate('/vaccinations')}
          className="p-2 text-ink-secondary hover:text-ink rounded-lg hover:bg-bg"
          title="Close"
        >
          <X size={20} />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-clay-bg border border-clay-border rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-clay-text mt-0.5 shrink-0" />
            <p className="text-sm text-clay-text">{error}</p>
          </div>
        </div>
      )}

      {/* Step 1: Find Animal */}
      {step === 1 && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-ink">Find Animal</h2>

          <div className="relative">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary"
            />
            <input
              type="text"
              value={animalSearch}
              onChange={(e) => setAnimalSearch(e.target.value)}
              placeholder="Enter tag number, owner name or NID (min. 3 characters)"
              className="w-full pl-10 pr-4 py-2 bg-bg border border-border rounded-lg"
            />
          </div>

          {searching && (
            <div className="flex items-center gap-2 text-sm text-ink-secondary">
              <Loader size={16} className="animate-spin" />
              Searching...
            </div>
          )}

          {animalSearch.trim().length >= 3 && !searching && animals.length === 0 && (
            <p className="text-sm text-ink-secondary">No animals found.</p>
          )}

          {animals.length > 0 && (
            <div className="space-y-3">
              {animals.map((animal) => (
                <div key={animal.id} className="p-4 border border-border rounded-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">{animal.tagNumber}</p>
                      <p className="text-sm text-ink-secondary">
                        {animal.species?.name} • {animal.sex} • {animal.owner?.name}
                        {animal.healthStatus === 'deceased' && ' • deceased'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedAnimal(animal);
                        setSelectedEnrollment(null);
                      }}
                      className={`px-3 py-1 text-sm rounded-lg ${
                        selectedAnimal?.id === animal.id
                          ? 'bg-brand-bg text-brand-text'
                          : 'text-brand hover:text-brand-hover'
                      }`}
                    >
                      {selectedAnimal?.id === animal.id ? 'Selected' : 'Select'}
                    </button>
                  </div>

                  {selectedAnimal?.id === animal.id && (
                    <div className="mt-4 space-y-2">
                      {enrollmentsLoading ? (
                        <div className="flex items-center gap-2 text-sm text-ink-secondary">
                          <Loader size={14} className="animate-spin" />
                          Loading protocols...
                        </div>
                      ) : activeEnrollments.length > 0 ? (
                        <>
                          <p className="text-xs font-medium text-ink-secondary">
                            Active protocols:
                          </p>
                          {activeEnrollments.map((enrollment) => (
                            <div
                              key={enrollment.id}
                              className="flex items-center justify-between p-3 bg-bg rounded-lg"
                            >
                              <div>
                                <p className="text-sm font-medium text-ink">
                                  {enrollment.protocol.name}
                                </p>
                                <p className="text-xs text-ink-secondary">
                                  {nextDoseLabel(enrollment)}
                                  {' • '}
                                  {enrollment.protocol.disease.name}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedEnrollment(enrollment);
                                  setStep(2);
                                }}
                                className="px-3 py-1 bg-brand text-on-brand text-sm rounded-lg hover:bg-brand-hover"
                              >
                                Select
                              </button>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="p-3 bg-bg rounded-lg">
                          <p className="text-sm text-ink-secondary">
                            This animal is not enrolled in any active protocol.
                          </p>
                          <button
                            onClick={() => navigate('/vaccinations/protocols')}
                            className="mt-2 text-sm text-brand hover:text-brand-hover font-medium"
                          >
                            Choose a protocol to enroll →
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Record Details */}
      {step === 2 && selectedEnrollment && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Vaccination Details</h2>
            <button
              onClick={() => {
                setStep(1);
                setSelectedEnrollment(null);
                setSelectedAnimal(null);
                setError(null);
              }}
              className="text-sm text-ink-secondary hover:text-ink"
            >
              ← Change Animal
            </button>
          </div>

          {/* Animal + protocol context */}
          <div className="p-4 bg-bg rounded-lg space-y-1">
            <p className="text-sm text-ink-secondary">Animal</p>
            <p className="font-medium text-ink">
              {selectedEnrollment.animal?.tagNumber ?? 'Unknown tag'}{' '}
              <span className="text-sm font-normal text-ink-secondary">
                {selectedEnrollment.animal?.species.name} •{' '}
                {selectedEnrollment.animal?.owner.name} (
                {selectedEnrollment.animal?.owner.phone})
              </span>
            </p>
            <p className="text-sm text-ink-secondary mt-2">Protocol</p>
            <p className="font-medium text-ink">{selectedEnrollment.protocol.name}</p>
            <p className="text-sm text-ink-secondary">
              {nextDoseLabel(selectedEnrollment)}
              {' • '}
              {selectedEnrollment.protocol.disease.name}
            </p>
          </div>

          {!nextDose ? (
            <div className="p-3 bg-gold-bg border border-gold-border rounded-lg">
              <p className="text-sm text-gold-text">
                No dose is due on this enrollment — it has finished its protocol.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">
                  Vaccine *
                </label>
                <select
                  value={formData.vaccineId}
                  onChange={(e) => setFormData({ ...formData, vaccineId: e.target.value })}
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg"
                >
                  <option value="">Select vaccine</option>
                  {nextDose.allowedVaccines.map((av) => (
                    <option key={av.vaccine.id} value={av.vaccine.id}>
                      {av.vaccine.name}
                      {av.vaccine.manufacturer ? ` (${av.vaccine.manufacturer})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">
                  Batch Number *
                </label>
                <input
                  type="text"
                  value={formData.batchNumber}
                  onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                  placeholder="BATCH-2026-001"
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">
                  Date Administered *
                </label>
                <input
                  type="date"
                  value={formData.dateAdministered}
                  onChange={(e) => setFormData({ ...formData, dateAdministered: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Any observations, reactions, follow-ups..."
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              onClick={() => navigate('/vaccinations/due')}
              className="px-4 py-2 text-sm text-ink-secondary hover:text-ink"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                !nextDose ||
                !formData.vaccineId ||
                !formData.batchNumber ||
                submitting
              }
              className="flex items-center gap-2 px-4 py-2 bg-brand text-on-brand rounded-lg hover:bg-brand-hover disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Record Vaccination
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function totalDosesFor(enrollment: AnimalVaccinationEnrollment): number {
  return enrollment.protocol.doses.filter((d) => !d.isRecurring).length;
}

function nextDoseLabel(enrollment: AnimalVaccinationEnrollment): string {
  const next = enrollment.currentDose + 1;
  const total = totalDosesFor(enrollment);
  return next > total ? `Booster #${next - total}` : `Dose ${next} of ${total}`;
}
