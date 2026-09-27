import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { speciesApi, ownerApi, animalApi, zoneApi, type Species, type Breed, type Owner, type Zone, ApiError } from '../services/api';
import Wizard from '../components/Wizard';
import { PawPrint, Plus, Loader, AlertCircle } from 'lucide-react';

export default function AnimalRegister() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);
  const [ownerStep, setOwnerStep] = useState<'nid' | 'details'>('nid'); // 'nid' = enter NID first, 'details' = fill remaining info
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [ownerForm, setOwnerForm] = useState({ name: '', nid: '', phone: '', email: '', address: '' });
  const [animals, setAnimals] = useState<any[]>([]);
  const [currentAnimal, setCurrentAnimal] = useState<any>({
    speciesId: '', breedId: '', sex: 'female', dateOfBirth: '', tagNumber: '', healthStatus: 'healthy',
  });
  const [showAnimalForm, setShowAnimalForm] = useState(true); // Control form visibility

  // Zone selection for vets
  const [availableZones, setAvailableZones] = useState<Zone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [loadingZones, setLoadingZones] = useState(false);

  // Determine the zone to use based on user role
  const isVet = user?.role === 'vet' || user?.role === 'superadmin';
  const isTechnician = user?.role === 'technician';
  const technicianZoneId = user?.zoneRoles?.[0]?.zoneId;
  const activeZoneId = isVet ? selectedZoneId : technicianZoneId;

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<{
    nid?: string;
    name?: string;
    phone?: string;
    email?: string;
    tagNumber?: string;
    dateOfBirth?: string;
    speciesId?: string;
  }>({});

  // Data loading states
  const [species, setSpecies] = useState<Species[]>([]);
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [loadingSpecies, setLoadingSpecies] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingNid, setCheckingNid] = useState(false);

  const steps = [
    { label: 'Owner' },
    { label: 'Animal' },
    { label: 'Review' },
  ];

  // Load species and zones on mount
  useEffect(() => {
    loadSpecies();
    if (isVet) {
      loadZonesForVet();
    }
  }, []);

  const loadSpecies = async () => {
    try {
      setLoadingSpecies(true);
      setError(null);
      const data = await speciesApi.getSpecies();
      setSpecies(data);
      
      // Extract all breeds from species
      const allBreeds: Breed[] = [];
      data.forEach(s => {
        if (s.breeds) {
          allBreeds.push(...s.breeds);
        }
      });
      setBreeds(allBreeds);
    } catch (err) {
      console.error('Failed to load species:', err);
      setError('Failed to load species data. Please try again.');
    } finally {
      setLoadingSpecies(false);
    }
  };

  const loadZonesForVet = async () => {
    try {
      setLoadingZones(true);
      const zones = await zoneApi.getZones({ limit: 100 });
      setAvailableZones(zones);
      // Auto-select if only one zone
      if (zones.length === 1) {
        setSelectedZoneId(zones[0].id);
      }
    } catch (err) {
      console.error('Failed to load zones:', err);
      setError('Failed to load zones. Please try again.');
    } finally {
      setLoadingZones(false);
    }
  };

  // Validation functions
  const validateNid = (nid: string): string | undefined => {
    if (!nid.trim()) return 'National ID is required';
    if (nid.trim().length !== 16) return 'National ID must be exactly 16 digits';
    if (!/^[0-9]+$/.test(nid.trim())) return 'National ID must contain only numbers';
    if (!nid.trim().startsWith('1')) return 'National ID must start with 1';
    return undefined;
  };

  const validateName = (name: string): string | undefined => {
    if (!name.trim()) return 'Full name is required';
    if (name.trim().length < 2) return 'Name must be at least 2 characters';
    if (name.trim().length > 100) return 'Name must be less than 100 characters';
    if (!/^[a-zA-Z\s]+$/.test(name.trim())) return 'Name must contain only letters';
    return undefined;
  };

  const validatePhone = (phone: string): string | undefined => {
    if (!phone.trim()) return 'Phone number is required';
    // Phone should be exactly 9 digits (without the +250)
    const cleanPhone = phone.replace(/[\s\-]/g, '');
    if (!/^[0-9]{9}$/.test(cleanPhone)) return 'Phone number must be exactly 9 digits';
    if (!cleanPhone.startsWith('7')) return 'Phone number must start with 7';
    return undefined;
  };

  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) return undefined; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return 'Invalid email format';
    return undefined;
  };

  const validateTagNumber = (tagNumber: string): string | undefined => {
    if (!tagNumber.trim()) return 'Tag number is required';
    if (tagNumber.trim().length < 3) return 'Tag number must be at least 3 characters';
    if (tagNumber.trim().length > 50) return 'Tag number must be less than 50 characters';
    return undefined;
  };

  const validateDateOfBirth = (date: string): string | undefined => {
    if (!date) return 'Date of birth is required';
    const selectedDate = new Date(date);
    const today = new Date();
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - 50); // Max 50 years old
    
    if (selectedDate > today) return 'Date cannot be in the future';
    if (selectedDate < maxDate) return 'Date seems too old (max 50 years)';
    return undefined;
  };

  const validateSpecies = (speciesId: string): string | undefined => {
    if (!speciesId) return 'Species selection is required';
    return undefined;
  };

  // Field change handlers with validation
  const handleNidChange = (value: string) => {
    // Only allow digits and limit to 16 characters
    const digitsOnly = value.replace(/\D/g, '').slice(0, 16);
    setOwnerForm({ ...ownerForm, nid: digitsOnly });
    const error = validateNid(digitsOnly);
    setValidationErrors(prev => ({ ...prev, nid: error }));
  };

  const handleNameChange = (value: string) => {
    // Limit to 100 characters
    const limitedValue = value.slice(0, 100);
    setOwnerForm({ ...ownerForm, name: limitedValue });
    const error = validateName(limitedValue);
    setValidationErrors(prev => ({ ...prev, name: error }));
  };

  const handlePhoneChange = (value: string) => {
    // Only allow digits and limit to 9 characters
    const digitsOnly = value.replace(/\D/g, '').slice(0, 9);
    setOwnerForm({ ...ownerForm, phone: digitsOnly });
    const error = validatePhone(digitsOnly);
    setValidationErrors(prev => ({ ...prev, phone: error }));
  };

  const handleEmailChange = (value: string) => {
    setOwnerForm({ ...ownerForm, email: value });
    const error = validateEmail(value);
    setValidationErrors(prev => ({ ...prev, email: error }));
  };

  const handleTagNumberChange = (value: string) => {
    // Limit to 50 characters
    const limitedValue = value.slice(0, 50);
    setCurrentAnimal({ ...currentAnimal, tagNumber: limitedValue });
    const error = validateTagNumber(limitedValue);
    setValidationErrors(prev => ({ ...prev, tagNumber: error }));
  };

  const handleDateOfBirthChange = (value: string) => {
    setCurrentAnimal({ ...currentAnimal, dateOfBirth: value });
    const error = validateDateOfBirth(value);
    setValidationErrors(prev => ({ ...prev, dateOfBirth: error }));
  };

  const handleSpeciesChange = (value: string) => {
    setCurrentAnimal({ ...currentAnimal, speciesId: value, breedId: '' });
    const error = validateSpecies(value);
    setValidationErrors(prev => ({ ...prev, speciesId: error }));
  };

  // NID check - search for existing owner by NID
  const checkNidAndProceed = async () => {
    const nidError = validateNid(ownerForm.nid);
    if (nidError) {
      setValidationErrors(prev => ({ ...prev, nid: nidError }));
      return;
    }
    
    try {
      setCheckingNid(true);
      setError(null);
      
      // Search for owner by NID
      const results = await ownerApi.getOwners({ search: ownerForm.nid, limit: 10 });
      const existingOwner = results.find(owner => owner.nid === ownerForm.nid);
      
      if (existingOwner) {
        // Owner exists - select them and move to animal step
        setSelectedOwner(existingOwner);
        setCurrentStep(1);
        setOwnerStep('nid'); // Reset for next time
      } else {
        // Owner doesn't exist - show form to collect details
        setOwnerStep('details');
      }
    } catch (err) {
      console.error('Failed to check NID:', err);
      setError('Failed to verify NID. Please try again.');
    } finally {
      setCheckingNid(false);
    }
  };

  const createOwner = async () => {
    // Validate all required fields
    const nameError = validateName(ownerForm.name);
    const phoneError = validatePhone(ownerForm.phone);
    const emailError = validateEmail(ownerForm.email);
    
    if (nameError || phoneError || emailError) {
      setValidationErrors({
        name: nameError,
        phone: phoneError,
        email: emailError,
      });
      setError('Please fix the validation errors before continuing.');
      return;
    }

    if (!activeZoneId) {
      setError('Please select a zone before continuing.');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Build the owner data object, only include email if it has a value
      const ownerData: any = {
        name: ownerForm.name,
        nid: ownerForm.nid,
        phone: `+250${ownerForm.phone}`, // Prepend country code
        zoneId: activeZoneId,
      };
      
      // Only include email if it's not empty
      if (ownerForm.email.trim()) {
        ownerData.email = ownerForm.email;
      }
      
      // Only include address if it's not empty
      if (ownerForm.address.trim()) {
        ownerData.address = ownerForm.address;
      }
      
      const newOwner = await ownerApi.createOwner(ownerData);
      setSelectedOwner(newOwner);
      setOwnerForm({ name: '', nid: '', phone: '', email: '', address: '' }); // Clear form
      setValidationErrors({}); // Clear validation errors
      
      // Automatically advance to next step after successful owner creation
      setCurrentStep(1);
      setOwnerStep('nid'); // Reset for potential future use
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create owner. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetOwnerStep = () => {
    setOwnerStep('nid');
    setSelectedOwner(null);
    setOwnerForm({ name: '', nid: '', phone: '', email: '', address: '' });
    setValidationErrors({});
    setError(null);
  };

  const addAnimalToList = () => {
    // Validate animal fields
    const tagError = validateTagNumber(currentAnimal.tagNumber);
    const speciesError = validateSpecies(currentAnimal.speciesId);
    const dobError = validateDateOfBirth(currentAnimal.dateOfBirth);
    
    if (tagError || speciesError || dobError) {
      setValidationErrors({
        tagNumber: tagError,
        speciesId: speciesError,
        dateOfBirth: dobError,
      });
      return;
    }

    // Check duplicate tag in current batch
    if (animals.some(a => a.tagNumber === currentAnimal.tagNumber)) {
      setValidationErrors(prev => ({ ...prev, tagNumber: 'This tag number is already in the batch' }));
      return;
    }

    setAnimals([...animals, { ...currentAnimal, _key: Date.now() }]);
    setCurrentAnimal({
      speciesId: '', breedId: '', sex: 'female', dateOfBirth: '', tagNumber: '', healthStatus: 'healthy',
    });
    setValidationErrors({}); // Clear validation errors
    setShowAnimalForm(false); // Hide form after adding animal
  };

  const removeAnimal = (key: number) => {
    setAnimals(animals.filter(a => a._key !== key));
  };

  const handleNext = () => {
    // Step 0: Validation depends on the owner step
    if (currentStep === 0) {
      // Check zone selection for vets
      if (isVet && !activeZoneId) {
        setError('Please select a zone before continuing.');
        return;
      }
      
      if (ownerStep === 'nid') {
        // User is on NID entry - validate and check NID
        const nidError = validateNid(ownerForm.nid);
        if (nidError) {
          setValidationErrors(prev => ({ ...prev, nid: nidError }));
          setError('Please enter a valid National ID.');
          return;
        }
        // Check NID in system
        checkNidAndProceed();
        return; // Don't advance step yet, checkNidAndProceed will handle it
      }
      if (ownerStep === 'details') {
        // User is filling owner details - validate and create owner
        createOwner();
        return; // Don't advance step yet, createOwner will handle it
      }
      if (!selectedOwner) {
        setError('Please verify the NID and select an owner to continue.');
        return;
      }
      // Owner is selected, proceed to next step
    }
    
    // Step 1: Must add at least one animal
    if (currentStep === 1 && animals.length === 0) {
      setError('Please add at least one animal to continue.');
      return;
    }
    
    setError(null); // Clear any errors
    setCurrentStep(Math.min(currentStep + 1, steps.length - 1));
  };

  const handleBack = () => {
    // If on owner details form, go back to NID entry
    if (currentStep === 0 && ownerStep === 'details') {
      setOwnerStep('nid');
      setOwnerForm({ ...ownerForm, name: '', phone: '', email: '', address: '' }); // Keep NID
      setValidationErrors({});
      setError(null);
      return;
    }
    setCurrentStep(Math.max(currentStep - 1, 0));
  };

  const handleSubmit = async () => {
    if (!selectedOwner || !activeZoneId) return;
    
    try {
      setSubmitting(true);
      setError(null);

      // Create animals
      for (const animal of animals) {
        await animalApi.createAnimal({
          tagNumber: animal.tagNumber,
          speciesId: animal.speciesId,
          breedId: animal.breedId || undefined,
          sex: animal.sex,
          dateOfBirth: animal.dateOfBirth,
          ownerId: selectedOwner.id,
          zoneId: activeZoneId,
          healthStatus: animal.healthStatus,
        });
      }

      // Success - navigate to animals list
      navigate('/animals');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to register animals. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getSpeciesName = (id: string) => species.find(s => s.id === id)?.name || '';
  const getBreedName = (id: string) => breeds.find(b => b.id === id)?.name || '';

  // Show loading state while fetching species
  if (loadingSpecies) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-display font-semibold text-ink mb-6">Register Animal</h1>
        <div className="flex items-center justify-center py-12">
          <Loader size={32} className="text-brand animate-spin" />
        </div>
      </div>
    );
  }

  // Show error state if species failed to load (but not validation errors)
  if (error && loadingSpecies === false && !species.length) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-display font-semibold text-ink mb-6">Register Animal</h1>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
                Failed to Load Data
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                {error}
              </p>
              <button
                onClick={loadSpecies}
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
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-display font-semibold text-ink mb-6">Register Animal</h1>

      {/* Zone Selection for Vets */}
      {isVet && (
        <div className="mb-6 bg-card border border-border rounded-xl p-4">
          <label className="block text-sm font-medium text-ink mb-2">Select Zone *</label>
          {loadingZones ? (
            <div className="flex items-center gap-2 text-sm text-ink-secondary">
              <Loader size={16} className="animate-spin" />
              Loading zones...
            </div>
          ) : (
            <select
              value={selectedZoneId}
              onChange={(e) => setSelectedZoneId(e.target.value)}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            >
              <option value="">Select a zone</option>
              {availableZones.map(zone => (
                <option key={zone.id} value={zone.id}>
                  {zone.name} {zone.label && `(${zone.label})`}
                </option>
              ))}
            </select>
          )}
          {!selectedZoneId && !loadingZones && (
            <p className="mt-1 text-xs text-ink-secondary">
              Please select a zone to register animals
            </p>
          )}
        </div>
      )}

      {/* Submission Error - only show if not in owner details step */}
      {error && ownerStep !== 'details' && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      <Wizard
        steps={steps}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        onNext={handleNext}
        onBack={handleBack}
        onSubmit={handleSubmit}
        isSubmitting={submitting || checkingNid}
        nextButtonText={
          currentStep === 0 && ownerStep === 'nid' && checkingNid 
            ? 'Verifying NID...' 
            : currentStep === 0 && ownerStep === 'nid' 
            ? 'Check NID & Continue'
            : currentStep === 0 && ownerStep === 'details' && submitting
            ? 'Creating Owner...'
            : currentStep === 0 && ownerStep === 'details'
            ? 'Create Owner & Continue'
            : undefined
        }
      >
        {/* Step 0: Owner */}
        {currentStep === 0 && (
          <div className="space-y-6">
            {ownerStep === 'nid' ? (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-ink mb-1">Owner National ID</h3>
                  <p className="text-xs text-ink-secondary mb-4">
                    Enter the owner's National ID to check if they're already registered
                  </p>
                </div>
                
                <div>
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1">National ID (NID) *</label>
                    <input
                      type="text"
                      value={ownerForm.nid}
                      onChange={(e) => handleNidChange(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && ownerForm.nid.trim() && !checkingNid && !validationErrors.nid) {
                          handleNext(); // Use wizard's Next logic
                        }
                      }}
                      disabled={checkingNid}
                      placeholder="1XXXXXXXXXXXXXXX (16 digits)"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className={`w-full px-3 py-2.5 bg-bg border rounded-lg text-sm text-ink placeholder:text-ink-secondary focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                        validationErrors.nid 
                          ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' 
                          : 'border-border focus:ring-brand/20 focus:border-brand'
                      }`}
                      autoFocus
                    />
                    {validationErrors.nid && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors.nid}</p>
                    )}
                    <p className="mt-2 text-xs text-ink-secondary">
                      Enter the National ID and click Next to continue
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">New Owner Registration</h3>
                    <p className="text-xs text-ink-secondary mt-1">
                      NID: {ownerForm.nid} (not found in system)
                    </p>
                  </div>
                  <button
                    onClick={resetOwnerStep}
                    className="text-xs text-brand hover:text-brand/80 font-medium"
                  >
                    Change NID
                  </button>
                </div>
                
                {/* Error message for owner creation */}
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={14} className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-ink-secondary mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={ownerForm.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Enter full name"
                      disabled={submitting}
                      className={`w-full px-3 py-2 bg-bg border rounded-lg text-sm text-ink placeholder:text-ink-secondary focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                        validationErrors.name
                          ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                          : 'border-border focus:ring-brand/20 focus:border-brand'
                      }`}
                      autoFocus
                    />
                    {validationErrors.name && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1">Phone Number *</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink font-medium pointer-events-none">
                        +250
                      </div>
                      <input
                        type="tel"
                        value={ownerForm.phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="7XXXXXXXX (9 digits)"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        disabled={submitting}
                        className={`w-full pl-14 pr-3 py-2 bg-bg border rounded-lg text-sm text-ink placeholder:text-ink-secondary focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                          validationErrors.phone
                            ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                            : 'border-border focus:ring-brand/20 focus:border-brand'
                        }`}
                      />
                    </div>
                    {validationErrors.phone && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors.phone}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1">Email (optional)</label>
                    <input
                      type="email"
                      value={ownerForm.email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      placeholder="email@example.com"
                      disabled={submitting}
                      className={`w-full px-3 py-2 bg-bg border rounded-lg text-sm text-ink placeholder:text-ink-secondary focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                        validationErrors.email
                          ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                          : 'border-border focus:ring-brand/20 focus:border-brand'
                      }`}
                    />
                    {validationErrors.email && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors.email}</p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-ink-secondary mb-1">Address (optional)</label>
                    <input
                      type="text"
                      value={ownerForm.address}
                      onChange={(e) => setOwnerForm({ ...ownerForm, address: e.target.value.slice(0, 200) })}
                      placeholder="Enter address"
                      maxLength={200}
                      disabled={submitting}
                      className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink placeholder:text-ink-secondary focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
                
                <p className="text-xs text-ink-secondary">
                  Fill in the owner details and click "Create Owner & Continue" below to proceed
                </p>
              </>
            )}

            {selectedOwner && currentStep === 0 && (
              <div className="bg-brand-bg/50 border border-brand/20 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink">{selectedOwner.name}</p>
                    <p className="text-xs text-ink-secondary">NID: {selectedOwner.nid}</p>
                    <p className="text-xs text-ink-secondary">{selectedOwner.phone}</p>
                  </div>
                  <button
                    onClick={resetOwnerStep}
                    className="text-xs text-ink-secondary hover:text-ink"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Animal(s) */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-ink">Animal Details</h3>

            {showAnimalForm ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1">Tag Number *</label>
                    <input
                      type="text"
                      value={currentAnimal.tagNumber}
                      onChange={(e) => handleTagNumberChange(e.target.value)}
                      placeholder="CK-2025-XXX"
                      className={`w-full px-3 py-2 bg-bg border rounded-lg text-sm text-ink placeholder:text-ink-secondary focus:outline-none focus:ring-2 ${
                        validationErrors.tagNumber
                          ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                          : 'border-border focus:ring-brand/20 focus:border-brand'
                      }`}
                    />
                    {validationErrors.tagNumber && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors.tagNumber}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1">Species *</label>
                    <select
                      value={currentAnimal.speciesId}
                      onChange={(e) => handleSpeciesChange(e.target.value)}
                      className={`w-full px-3 py-2 bg-bg border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 ${
                        validationErrors.speciesId
                          ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                          : 'border-border focus:ring-brand/20 focus:border-brand'
                      }`}
                    >
                      <option value="">Select species</option>
                      {species.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    {validationErrors.speciesId && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors.speciesId}</p>
                    )}
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
                      onChange={(e) => handleDateOfBirthChange(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className={`w-full px-3 py-2 bg-bg border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 ${
                        validationErrors.dateOfBirth
                          ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                          : 'border-border focus:ring-brand/20 focus:border-brand'
                      }`}
                    />
                    {validationErrors.dateOfBirth && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors.dateOfBirth}</p>
                    )}
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
                  disabled={!currentAnimal.tagNumber || !currentAnimal.speciesId || !currentAnimal.dateOfBirth || !!validationErrors.tagNumber || !!validationErrors.speciesId || !!validationErrors.dateOfBirth}
                  className="flex items-center gap-2 px-4 py-2 bg-brand text-on-brand text-sm font-medium rounded-lg hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <PawPrint size={14} /> Add Animal
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAnimalForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand text-on-brand text-sm font-medium rounded-lg hover:bg-brand-hover transition-colors"
              >
                <Plus size={16} /> Add Another Animal
              </button>
            )}

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
