import { useState } from 'react';
import { useData, useDispatch } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import Wizard from '../components/Wizard';
import { UserPlus, PawPrint, CheckCircle, Search, Plus } from 'lucide-react';

export default function AnimalRegister() {
  const { currentUser, owners, species, breeds, zones } = useData();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);
  const [ownerStep, setOwnerStep] = useState('search'); // 'search' | 'create'
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null);
  const [ownerForm, setOwnerForm] = useState<Record<string, unknown>>({ name: '', nid: '', phone: '', email: '', address: '' });
  const [animals, setAnimals] = useState([]);
  const [currentAnimal, setCurrentAnimal] = useState<Record<string, unknown>>({
    speciesId: '', breedId: '', sex: 'female', dateOfBirth: '', tagNumber: '', healthStatus: 'healthy',
  });

  const userZoneId = currentUser?.zoneRoles?.[0]?.zoneId;

  const steps = [
    { label: 'Owner' },
    { label: 'Animal' },
    { label: 'Review' },
  ];

  // Owner search
  const [ownerQuery, setOwnerQuery] = useState<string>('');
  const searchResults = ownerQuery.length >= 2
    ? owners.filter(o =>
        o.nid.includes(ownerQuery) ||
        o.name.toLowerCase().includes(ownerQuery.toLowerCase()) ||
        o.phone.includes(ownerQuery)
      )
    : [];

  const selectOwner = (owner) => {
    setSelectedOwner(owner);
    setCurrentStep(1);
  };

  const createOwner = () => {
    if (!ownerForm.name || !ownerForm.nid || !ownerForm.phone) return;
    // Check for duplicate NID
    if (owners.some(o => o.nid === ownerForm.nid)) {
      alert('An owner with this NID already exists.');
      return;
    }
    setSelectedOwner({
      ...ownerForm,
      id: 'new',
      zoneId: userZoneId,
    });
    setCurrentStep(1);
  };

  const addAnimalToList = () => {
    if (!currentAnimal.tagNumber || !currentAnimal.speciesId || !currentAnimal.dateOfBirth) return;
    // Check duplicate tag
    if (animals.some(a => a.tagNumber === currentAnimal.tagNumber)) {
      alert('This tag number is already in the batch.');
      return;
    }
    setAnimals([...animals, { ...currentAnimal, _key: Date.now() }]);
    setCurrentAnimal({
      speciesId: '', breedId: '', sex: 'female', dateOfBirth: '', tagNumber: '', healthStatus: 'healthy',
    });
  };

  const removeAnimal = (key) => {
    setAnimals(animals.filter(a => a._key !== key));
  };

  const handleNext = () => {
    if (currentStep === 1 && animals.length === 0) {
      // Must add at least one animal
      return;
    }
    setCurrentStep(Math.min(currentStep + 1, steps.length - 1));
  };

  const handleBack = () => {
    setCurrentStep(Math.max(currentStep - 1, 0));
  };

  const handleSubmit = () => {
    // Create owner if new
    let ownerId = selectedOwner.id;
    if (ownerId === 'new') {
      const newOwner = { ...selectedOwner };
      delete newOwner._key;
      dispatch({ type: 'CREATE_OWNER', payload: newOwner });
      // Get the latest owner (just created)
      const created = [...owners, newOwner];
      ownerId = created[created.length - 1]?.id;
    }

    // Create animals
    animals.forEach(animal => {
      const gracePeriod = currentUser?.role === 'technician' ? 24 : null;
      dispatch({
        type: 'CREATE_ANIMAL',
        payload: {
          tagNumber: animal.tagNumber,
          speciesId: animal.speciesId,
          breedId: animal.breedId || null,
          sex: animal.sex,
          dateOfBirth: animal.dateOfBirth,
          ownerId: ownerId,
          zoneId: userZoneId,
          healthStatus: animal.healthStatus,
          deceasedReason: null,
          deceasedDate: null,
          enteredByUserId: currentUser?.id,
          editableUntil: gracePeriod
            ? new Date(Date.now() + gracePeriod * 60 * 60 * 1000).toISOString()
            : null,
        },
      });
    });

    navigate('/animals');
  };

  const getSpeciesName = (id) => species.find(s => s.id === id)?.name || '';
  const getBreedName = (id) => breeds.find(b => b.id === id)?.name || '';

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-display font-semibold text-ink mb-6">Register Animal</h1>

      <Wizard
        steps={steps}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        onNext={handleNext}
        onBack={handleBack}
        onSubmit={handleSubmit}
      >
        {/* Step 0: Owner */}
        {currentStep === 0 && (
          <div className="space-y-6">
            {ownerStep === 'search' ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink">Find Owner</h3>
                  <button
                    onClick={() => setOwnerStep('create')}
                    className="text-xs text-brand hover:text-brand/80 font-medium flex items-center gap-1"
                  >
                    <Plus size={12} /> New Owner
                  </button>
                </div>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
                  <input
                    type="text"
                    value={ownerQuery}
                    onChange={(e) => setOwnerQuery(e.target.value)}
                    placeholder="Search by NID, name, or phone..."
                    className="w-full pl-10 pr-4 py-2.5 bg-bg border border-border rounded-lg text-sm text-ink placeholder:text-ink-secondary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  />
                </div>
                {ownerQuery.length >= 2 && (
                  <div className="bg-bg border border-border rounded-lg max-h-48 overflow-y-auto">
                    {searchResults.length === 0 ? (
                      <p className="p-3 text-sm text-ink-secondary text-center">No owners found — create a new one?</p>
                    ) : (
                      <div className="divide-y divide-border">
                        {searchResults.map(owner => (
                          <button
                            key={owner.id}
                            onClick={() => selectOwner(owner)}
                            className="w-full text-left p-3 hover:bg-card transition-colors"
                          >
                            <p className="text-sm font-medium text-ink">{owner.name}</p>
                            <p className="text-xs text-ink-secondary">NID: {owner.nid} · {owner.phone}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink">Create New Owner</h3>
                  <button
                    onClick={() => setOwnerStep('search')}
                    className="text-xs text-brand hover:text-brand/80 font-medium"
                  >
                    Search existing
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={ownerForm.name}
                      onChange={(e) => setOwnerForm({ ...ownerForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1">National ID *</label>
                    <input
                      type="text"
                      value={ownerForm.nid}
                      onChange={(e) => setOwnerForm({ ...ownerForm, nid: e.target.value })}
                      className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1">Phone *</label>
                    <input
                      type="tel"
                      value={ownerForm.phone}
                      onChange={(e) => setOwnerForm({ ...ownerForm, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1">Email (optional)</label>
                    <input
                      type="email"
                      value={ownerForm.email}
                      onChange={(e) => setOwnerForm({ ...ownerForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-ink-secondary mb-1">Address</label>
                    <input
                      type="text"
                      value={ownerForm.address}
                      onChange={(e) => setOwnerForm({ ...ownerForm, address: e.target.value })}
                      className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                </div>
                <button
                  onClick={createOwner}
                  disabled={!ownerForm.name || !ownerForm.nid || !ownerForm.phone}
                  className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand/90 disabled:opacity-50"
                >
                  Continue with this owner
                </button>
              </>
            )}

            {selectedOwner && (
              <div className="bg-brand-bg/50 border border-brand/20 rounded-lg p-4">
                <p className="text-sm font-medium text-ink">Selected: {selectedOwner.name}</p>
                <p className="text-xs text-ink-secondary">NID: {selectedOwner.nid}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Animal(s) */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-ink">Animal Details</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Tag Number *</label>
                <input
                  type="text"
                  value={currentAnimal.tagNumber}
                  onChange={(e) => setCurrentAnimal({ ...currentAnimal, tagNumber: e.target.value })}
                  placeholder="CK-2025-XXX"
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Species *</label>
                <select
                  value={currentAnimal.speciesId}
                  onChange={(e) => setCurrentAnimal({ ...currentAnimal, speciesId: e.target.value, breedId: '' })}
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
                >
                  <option value="">Select species</option>
                  {species.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Breed</label>
                <select
                  value={currentAnimal.breedId}
                  onChange={(e) => setCurrentAnimal({ ...currentAnimal, breedId: e.target.value })}
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
                >
                  <option value="">Select breed</option>
                  {breeds
                    .filter(b => !currentAnimal.speciesId || b.speciesId === currentAnimal.speciesId)
                    .map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Sex *</label>
                <select
                  value={currentAnimal.sex}
                  onChange={(e) => setCurrentAnimal({ ...currentAnimal, sex: e.target.value })}
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Date of Birth *</label>
                <input
                  type="date"
                  value={currentAnimal.dateOfBirth}
                  onChange={(e) => setCurrentAnimal({ ...currentAnimal, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Health Status</label>
                <select
                  value={currentAnimal.healthStatus}
                  onChange={(e) => setCurrentAnimal({ ...currentAnimal, healthStatus: e.target.value })}
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
                >
                  <option value="healthy">Healthy</option>
                  <option value="sick">Sick</option>
                  <option value="under_treatment">Under Treatment</option>
                </select>
              </div>
            </div>

            <button
              onClick={addAnimalToList}
              disabled={!currentAnimal.tagNumber || !currentAnimal.speciesId || !currentAnimal.dateOfBirth}
              className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand/90 disabled:opacity-50"
            >
              <PawPrint size={14} /> Add Animal
            </button>

            {/* Animals added so far */}
            {animals.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-ink-secondary uppercase tracking-wide">
                  Animals added ({animals.length})
                </p>
                {animals.map(animal => (
                  <div key={animal._key} className="flex items-center justify-between p-3 bg-bg rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-ink">{animal.tagNumber}</p>
                      <p className="text-xs text-ink-secondary">
                        {getSpeciesName(animal.speciesId)} · {animal.sex} · {animal.dateOfBirth}
                      </p>
                    </div>
                    <button
                      onClick={() => removeAnimal(animal._key)}
                      className="text-xs text-clay-text hover:text-clay-text/80"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setCurrentStep(2)}
                  className="w-full mt-2 text-sm text-brand hover:text-brand/80 font-medium"
                >
                  Continue to review →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Review */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-ink">Review & Confirm</h3>

            <div className="bg-bg rounded-lg p-4">
              <p className="text-xs font-medium text-ink-secondary uppercase tracking-wide mb-2">Owner</p>
              <p className="text-sm font-medium text-ink">{selectedOwner?.name}</p>
              <p className="text-xs text-ink-secondary">NID: {selectedOwner?.nid} · {selectedOwner?.phone}</p>
              {selectedOwner?.id === 'new' && (
                <span className="inline-block mt-1 text-xs bg-gold-bg text-gold-text px-2 py-0.5 rounded-full">New owner</span>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium text-ink-secondary uppercase tracking-wide">
                Animals ({animals.length})
              </p>
              {animals.map(animal => (
                <div key={animal._key} className="bg-bg rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-ink">{animal.tagNumber}</p>
                      <p className="text-xs text-ink-secondary">
                        {getSpeciesName(animal.speciesId)}
                        {animal.breedId && ` · ${getBreedName(animal.breedId)}`}
                        {' · '}{animal.sex} · DOB: {animal.dateOfBirth}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      animal.healthStatus === 'healthy' ? 'bg-brand-bg text-brand-text' :
                      animal.healthStatus === 'sick' ? 'bg-gold-bg text-gold-text' :
                      'bg-sky-bg text-sky-text'
                    }`}>
                      {animal.healthStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Wizard>
    </div>
  );
}
