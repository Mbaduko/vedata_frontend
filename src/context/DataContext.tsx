import { createContext, useContext, useReducer, type ReactNode } from 'react';
import { initialMockData, generateId } from '../data/mockData';
import type { AppState, DataAction, User, Zone, Animal, Owner, Vaccination, Disease, Vaccine, VaccineSchedule, Species, Breed, Invitation, AuditLogEntry } from '../types';

const DataContext = createContext<AppState | null>(null);
const DispatchContext = createContext<React.Dispatch<DataAction> | null>(null);

function dataReducer(state: AppState, action: DataAction): AppState {
  const now = new Date().toISOString();
  let newAuditEntry: AuditLogEntry | null = null;

  const logAudit = (userId: string, entityAction: string, entity: string, entityId: string, zoneId: string | null) => {
    newAuditEntry = {
      id: generateId('al'),
      userId,
      action: entityAction,
      entity,
      entityId,
      timestamp: now,
      zoneId,
    };
  };

  let newState = { ...state };

  switch (action.type) {
    case 'SET_CURRENT_USER': {
      newState = { ...state, currentUser: action.payload };
      break;
    }

    case 'SET_THEME': {
      newState = { ...state, theme: action.payload };
      break;
    }

    case 'CREATE_ZONE': {
      const zone: Zone = { ...action.payload, id: generateId('z') };
      newState = { ...state, zones: [...state.zones, zone] };
      logAudit(state.currentUser?.id ?? '', 'zone.create', 'zone', zone.id, zone.id);
      break;
    }

    case 'MOVE_ZONE': {
      const { zoneId, newParentId } = action.payload;
      newState = {
        ...state,
        zones: state.zones.map(z => z.id === zoneId ? { ...z, parentId: newParentId } : z),
      };
      logAudit(state.currentUser?.id ?? '', 'zone.move', 'zone', zoneId, zoneId);
      break;
    }

    case 'ARCHIVE_ZONE': {
      const { zoneId } = action.payload;
      newState = {
        ...state,
        zones: state.zones.map(z => z.id === zoneId ? { ...z, archived: true } : z),
      };
      logAudit(state.currentUser?.id ?? '', 'zone.archive', 'zone', zoneId, zoneId);
      break;
    }

    case 'UPDATE_ZONE': {
      const { zoneId, updates } = action.payload;
      newState = {
        ...state,
        zones: state.zones.map(z => z.id === zoneId ? { ...z, ...updates } : z),
      };
      logAudit(state.currentUser?.id ?? '', 'zone.update', 'zone', zoneId, zoneId);
      break;
    }

    case 'CREATE_ANIMAL': {
      const animal: Animal = { ...action.payload, id: generateId('a'), registeredAt: now };
      newState = { ...state, animals: [...state.animals, animal] };
      logAudit(state.currentUser?.id ?? '', 'animal.create', 'animal', animal.id, animal.zoneId);
      break;
    }

    case 'EDIT_ANIMAL': {
      const { animalId, updates } = action.payload;
      const animal = state.animals.find(a => a.id === animalId);
      newState = {
        ...state,
        animals: state.animals.map(a => a.id === animalId ? { ...a, ...updates } : a),
      };
      logAudit(state.currentUser?.id ?? '', 'animal.update', 'animal', animalId, animal?.zoneId ?? null);
      break;
    }

    case 'MARK_DECEASED': {
      const { animalId, reason, date } = action.payload;
      const animal = state.animals.find(a => a.id === animalId);
      newState = {
        ...state,
        animals: state.animals.map(a =>
          a.id === animalId ? { ...a, healthStatus: 'deceased', deceasedReason: reason, deceasedDate: date } : a
        ),
      };
      logAudit(state.currentUser?.id ?? '', 'animal.deceased', 'animal', animalId, animal?.zoneId ?? null);
      break;
    }

    case 'DELETE_ANIMAL': {
      const { animalId } = action.payload;
      const animal = state.animals.find(a => a.id === animalId);
      newState = { ...state, animals: state.animals.filter(a => a.id !== animalId) };
      logAudit(state.currentUser?.id ?? '', 'animal.delete', 'animal', animalId, animal?.zoneId ?? null);
      break;
    }

    case 'CREATE_OWNER': {
      const owner: Owner = { ...action.payload, id: generateId('o') };
      newState = { ...state, owners: [...state.owners, owner] };
      logAudit(state.currentUser?.id ?? '', 'owner.create', 'owner', owner.id, owner.zoneId);
      break;
    }

    case 'EDIT_OWNER': {
      const { ownerId, updates } = action.payload;
      newState = {
        ...state,
        owners: state.owners.map(o => o.id === ownerId ? { ...o, ...updates } : o),
      };
      logAudit(state.currentUser?.id ?? '', 'owner.update', 'owner', ownerId, null);
      break;
    }

    case 'RECORD_VACCINATION': {
      const vaccination: Vaccination = { ...action.payload, id: generateId('vac') };
      newState = { ...state, vaccinations: [...state.vaccinations, vaccination] };
      const animal = state.animals.find(a => a.id === vaccination.animalId);
      logAudit(state.currentUser?.id ?? '', 'vaccination.record', 'vaccination', vaccination.id, animal?.zoneId ?? null);
      break;
    }

    case 'EDIT_VACCINATION': {
      const { vaccinationId, updates } = action.payload;
      newState = {
        ...state,
        vaccinations: state.vaccinations.map(v => v.id === vaccinationId ? { ...v, ...updates } : v),
      };
      logAudit(state.currentUser?.id ?? '', 'vaccination.update', 'vaccination', vaccinationId, null);
      break;
    }

    case 'CREATE_DISEASE': {
      const disease: Disease = { ...action.payload, id: generateId('d') };
      newState = { ...state, diseases: [...state.diseases, disease] };
      logAudit(state.currentUser?.id ?? '', 'config.disease_create', 'disease', disease.id, null);
      break;
    }

    case 'UPDATE_DISEASE': {
      const { diseaseId, updates } = action.payload;
      newState = { ...state, diseases: state.diseases.map(d => d.id === diseaseId ? { ...d, ...updates } : d) };
      break;
    }

    case 'CREATE_VACCINE': {
      const vaccine: Vaccine = { ...action.payload, id: generateId('v') };
      newState = { ...state, vaccines: [...state.vaccines, vaccine] };
      logAudit(state.currentUser?.id ?? '', 'config.vaccine_create', 'vaccine', vaccine.id, null);
      break;
    }

    case 'UPDATE_VACCINE': {
      const { vaccineId, updates } = action.payload;
      newState = { ...state, vaccines: state.vaccines.map(v => v.id === vaccineId ? { ...v, ...updates } : v) };
      break;
    }

    case 'CREATE_VACCINE_SCHEDULE': {
      const schedule: VaccineSchedule = { ...action.payload, id: generateId('vs') };
      newState = { ...state, vaccineSchedules: [...state.vaccineSchedules, schedule] };
      break;
    }

    case 'UPDATE_VACCINE_SCHEDULE': {
      const { scheduleId, updates } = action.payload;
      newState = { ...state, vaccineSchedules: state.vaccineSchedules.map(s => s.id === scheduleId ? { ...s, ...updates } : s) };
      break;
    }

    case 'DELETE_VACCINE_SCHEDULE': {
      const { scheduleId } = action.payload;
      newState = { ...state, vaccineSchedules: state.vaccineSchedules.filter(s => s.id !== scheduleId) };
      break;
    }

    case 'CREATE_SPECIES': {
      const sp: Species = { ...action.payload, id: generateId('sp') };
      newState = { ...state, species: [...state.species, sp] };
      break;
    }

    case 'UPDATE_SPECIES': {
      const { speciesId, updates } = action.payload;
      newState = { ...state, species: state.species.map(s => s.id === speciesId ? { ...s, ...updates } : s) };
      break;
    }

    case 'CREATE_BREED': {
      const breed: Breed = { ...action.payload, id: generateId('b') };
      newState = { ...state, breeds: [...state.breeds, breed] };
      break;
    }

    case 'UPDATE_BREED': {
      const { breedId, updates } = action.payload;
      newState = { ...state, breeds: state.breeds.map(b => b.id === breedId ? { ...b, ...updates } : b) };
      break;
    }

    case 'INVITE_TECHNICIAN': {
      const invitation: Invitation = {
        ...action.payload,
        id: generateId('inv'),
        invitedByUserId: state.currentUser?.id ?? '',
        status: 'pending',
      };
      newState = { ...state, invitations: [...state.invitations, invitation] };
      logAudit(state.currentUser?.id ?? '', 'technician.invite', 'invitation', invitation.id, invitation.zoneId);
      break;
    }

    case 'UPDATE_INVITATION': {
      const { invitationId, updates } = action.payload;
      newState = { ...state, invitations: state.invitations.map(i => i.id === invitationId ? { ...i, ...updates } : i) };
      break;
    }

    case 'ADD_AUDIT_ENTRY': {
      const entry: AuditLogEntry = { ...action.payload, id: generateId('al') };
      newState = { ...state, auditLog: [...state.auditLog, entry] };
      break;
    }

    default:
      return state;
  }

  if (newAuditEntry) {
    newState = { ...newState, auditLog: [...newState.auditLog, newAuditEntry] };
  }

  return newState;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dataReducer, {
    ...initialMockData,
    currentUser: null,
    theme: 'light' as const,
  });

  return (
    <DataContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </DataContext.Provider>
  );
}

export function useData(): AppState {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
}

export function useDispatch(): React.Dispatch<DataAction> {
  const context = useContext(DispatchContext);
  if (!context) throw new Error('useDispatch must be used within a DataProvider');
  return context;
}

// Convenience selectors
export function useZones(): Zone[] { return useData().zones; }
export function useUsers(): User[] { return useData().users; }
export function useAnimals(): Animal[] { return useData().animals; }
export function useOwners(): Owner[] { return useData().owners; }
export function useSpecies(): Species[] { return useData().species; }
export function useBreeds(): Breed[] { return useData().breeds; }
export function useDiseases(): Disease[] { return useData().diseases; }
export function useVaccines(): Vaccine[] { return useData().vaccines; }
export function useVaccineSchedules(): VaccineSchedule[] { return useData().vaccineSchedules; }
export function useVaccinations(): Vaccination[] { return useData().vaccinations; }
export function useInvitations(): Invitation[] { return useData().invitations; }
export function useAuditLog(): AuditLogEntry[] { return useData().auditLog; }
export function useCurrentUser(): User | null { return useData().currentUser; }
