import { useState } from 'react';
import { useData, useDispatch } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import AnimalOwnerSearch from '../components/AnimalOwnerSearch';
import CameraCapture from '../components/CameraCapture';
import Wizard from '../components/Wizard';
import { Syringe, CheckCircle } from 'lucide-react';

export default function VaccinationRecord() {
  const { currentUser, animals, owners, species, diseases, vaccines, vaccineSchedules, vaccinations } = useData();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAnimal, setSelectedAnimal] = useState<string | null>(null);
  const [selectedVaccine, setSelectedVaccine] = useState<string>('');
  const [doseNumber, setDoseNumber] = useState(1);
  const [dateAdministered, setDateAdministered] = useState(new Date().toISOString().split('T')[0]);
  const [batchNumber, setBatchNumber] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [gpsCoords, setGpsCoords] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [recorded, setRecorded] = useState(false);

  const userZoneId = currentUser?.zoneRoles?.[0]?.zoneId;

  // Get applicable vaccines for the selected animal
  const applicableVaccines = selectedAnimal
    ? vaccines.filter(v => {
        const disease = diseases.find(d => d.id === v.diseaseId);
        return disease?.applicableSpeciesIds?.includes(selectedAnimal.speciesId);
      })
    : [];

  // Compute dose number based on vaccination history
  const getComputedDose = (animalId, vaccineId) => {
    const prevVaccinations = vaccinations.filter(
      v => v.animalId === animalId && v.vaccineId === vaccineId
    );
    return prevVaccinations.length + 1;
  };

  // Calculate next due date
  const getNextDueDate = (vaccineId, doseNum, dateAdmin) => {
    const schedule = vaccineSchedules.find(
      s => s.vaccineId === vaccineId && s.doseNumber === doseNum + 1
    );
    if (!schedule) return null;
    const base = new Date(dateAdmin);
    base.setDate(base.getDate() + schedule.intervalDaysFromPrevious);
    return base.toISOString().split('T')[0];
  };

  const steps = [
    { label: 'Find Animal' },
    { label: 'Vaccine & Details' },
    { label: 'Photo & GPS' },
    { label: 'Review' },
  ];

  const handleSelectAnimal = (animal) => {
    setSelectedAnimal(animal);
    // Auto-compute dose
    if (selectedVaccine) {
      setDoseNumber(getComputedDose(animal.id, selectedVaccine));
    }
    setCurrentStep(1);
  };

  const handleSelectVaccine = (vaccineId) => {
    setSelectedVaccine(vaccineId);
    if (selectedAnimal) {
      setDoseNumber(getComputedDose(selectedAnimal.id, vaccineId));
    }
  };

  const handleCapture = (url) => {
    setPhotoUrl(url);
  };

  const tryGetGPS = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          setGpsError('GPS unavailable — you can still submit.');
        }
      );
    } else {
      setGpsError('GPS not supported — you can still submit.');
    }
  };

  const handleSubmit = () => {
    if (!selectedAnimal || !selectedVaccine || !photoUrl) return;

    const nextDue = getNextDueDate(selectedVaccine, doseNumber, dateAdministered);
    const gracePeriod = currentUser?.role === 'technician' ? 24 : null;

    dispatch({
      type: 'RECORD_VACCINATION',
      payload: {
        animalId: selectedAnimal.id,
        vaccineId: selectedVaccine,
        doseNumber,
        dateAdministered,
        batchNumber,
        administeredByUserId: currentUser?.id,
        nextDueDate: nextDue,
        photoEvidenceUrl: photoUrl,
        gpsLat: gpsCoords?.lat || null,
        gpsLng: gpsCoords?.lng || null,
        editableUntil: gracePeriod
          ? new Date(Date.now() + gracePeriod * 60 * 60 * 1000).toISOString()
          : null,
      },
    });
    setRecorded(true);
  };

  const handleNext = () => {
    if (currentStep === 1 && !selectedVaccine) return;
    if (currentStep === 2 && !photoUrl) return;
    if (currentStep === 2) {
      tryGetGPS();
    }
    setCurrentStep(Math.min(currentStep + 1, steps.length - 1));
  };

  if (recorded) {
    const vaccine = vaccines.find(v => v.id === selectedVaccine);
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-16 h-16 rounded-full bg-brand-bg flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-brand-text" />
        </div>
        <h2 className="text-xl font-display font-semibold text-ink mb-2">Vaccination Recorded</h2>
        <p className="text-sm text-ink-secondary mb-6">
          {selectedAnimal?.tagNumber} · {vaccine?.name} · Dose {doseNumber}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => {
              setRecorded(false);
              setSelectedAnimal(null);
              setSelectedVaccine('');
              setDoseNumber(1);
              setBatchNumber('');
              setPhotoUrl(null);
              setGpsCoords(null);
              setCurrentStep(0);
            }}
            className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-ink hover:bg-card"
          >
            Record Another
          </button>
          <button
            onClick={() => navigate('/vaccinations/due')}
            className="px-4 py-2 bg-brand text-on-brand text-sm font-medium rounded-lg hover:bg-brand-hover"
          >
            View Due List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-display font-semibold text-ink mb-6">Record Vaccination</h1>

      <Wizard
        steps={steps}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        onNext={handleNext}
        onBack={() => setCurrentStep(Math.max(currentStep - 1, 0))}
        onSubmit={handleSubmit}
      >
        {/* Step 0: Find Animal */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-ink">Find the Animal</h3>
            <AnimalOwnerSearch
              animals={animals}
              owners={owners}
              onSelectAnimal={handleSelectAnimal}
              onSelectOwner={(owner) => {
                const ownerAnimals = animals.filter(a => a.ownerId === owner.id);
                if (ownerAnimals.length === 1) handleSelectAnimal(ownerAnimals[0]);
                // For multiple, show selection
              }}
            />
            {selectedAnimal && (
              <div className="bg-brand-bg/50 border border-brand/20 rounded-lg p-4 mt-4">
                <p className="text-sm font-medium text-ink">Selected: {selectedAnimal.tagNumber}</p>
                <p className="text-xs text-ink-secondary">{selectedAnimal.sex} · {selectedAnimal.healthStatus}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Vaccine & Details */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="bg-brand-bg/50 border border-brand/20 rounded-lg p-3">
              <p className="text-sm font-medium text-ink">Animal: {selectedAnimal?.tagNumber}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-2">Select Vaccine</label>
                <div className="space-y-2">
                  {applicableVaccines.map(vaccine => {
                    const disease = diseases.find(d => d.id === vaccine.diseaseId);
                    const computedDose = selectedAnimal ? getComputedDose(selectedAnimal.id, vaccine.id) : 1;
                    return (
                      <button
                        key={vaccine.id}
                        onClick={() => handleSelectVaccine(vaccine.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedVaccine === vaccine.id
                            ? 'border-brand bg-brand-bg/30'
                            : 'border-border hover:bg-bg'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-ink">{vaccine.name}</p>
                            <p className="text-xs text-ink-secondary">{disease?.name} · {vaccine.manufacturer}</p>
                          </div>
                          <span className="text-xs text-ink-secondary bg-bg px-2 py-0.5 rounded">
                            Dose {computedDose}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1">Dose Number</label>
                  <input
                    type="number"
                    value={doseNumber}
                    onChange={(e) => setDoseNumber(parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1">Date Administered</label>
                  <input
                    type="date"
                    value={dateAdministered}
                    onChange={(e) => setDateAdministered(e.target.value)}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1">Batch Number</label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Photo & GPS */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-ink">Photo Evidence & Location</h3>
            <CameraCapture onCapture={handleCapture} required={true} />
            <div className="bg-bg rounded-lg p-4">
              <p className="text-xs font-medium text-ink-secondary mb-1">GPS Location</p>
              {gpsCoords ? (
                <p className="text-sm text-ink">
                  Lat: {gpsCoords.lat.toFixed(4)}, Lng: {gpsCoords.lng.toFixed(4)}
                </p>
              ) : gpsError ? (
                <p className="text-xs text-gold-text">{gpsError}</p>
              ) : (
                <p className="text-xs text-ink-secondary">
                  GPS will be captured on next step (best-effort, won't block submission)
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-ink">Confirm Details</h3>
            <div className="bg-bg rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-ink-secondary">Animal</span>
                <span className="font-medium text-ink">{selectedAnimal?.tagNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-secondary">Vaccine</span>
                <span className="font-medium text-ink">{vaccines.find(v => v.id === selectedVaccine)?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-secondary">Dose</span>
                <span className="font-medium text-ink">{doseNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-secondary">Date</span>
                <span className="font-medium text-ink">{dateAdministered}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-secondary">Batch</span>
                <span className="font-medium text-ink">{batchNumber || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-secondary">Photo</span>
                <span className="font-medium text-ink">{photoUrl ? '✓ Captured' : '✗ Missing'}</span>
              </div>
            </div>
          </div>
        )}
      </Wizard>
    </div>
  );
}
