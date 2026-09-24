// Vedata — TypeScript type definitions

// ─── Zone ─────────────────────────────────────────────────────────

export interface Zone {
  id: string;
  name: string;
  label: string;
  parentId: string | null;
  leadVetId: string | null;
  technicianGracePeriodHours: number;
  inviteExpiryHours: number;
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Users & RBAC ─────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'vet' | 'technician';
  zoneRoles: ZoneRole[];
}

export interface ZoneRole {
  zoneId: string;
  role: string;
  isLead?: boolean;
  contractStart?: string;
  contractEnd?: string;
}

// ─── Species & Breeds ─────────────────────────────────────────────

export interface Species {
  id: string;
  name: string;
}

export interface Breed {
  id: string;
  name: string;
  speciesId: string;
}

// ─── Owner ────────────────────────────────────────────────────────

export interface Owner {
  id: string;
  nid: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  zoneId: string;
}

// ─── Animal ───────────────────────────────────────────────────────

export interface Animal {
  id: string;
  tagNumber: string;
  speciesId: string;
  breedId: string | null;
  sex: 'male' | 'female';
  dateOfBirth: string;
  ownerId: string;
  zoneId: string;
  healthStatus: 'healthy' | 'sick' | 'under_treatment' | 'deceased';
  deceasedReason: string | null;
  deceasedDate: string | null;
  registeredAt: string;
  enteredByUserId: string;
  editableUntil: string | null;
}

// ─── Vaccination System ───────────────────────────────────────────

export interface Disease {
  id: string;
  name: string;
  applicableSpeciesIds: string[];
}

export interface Vaccine {
  id: string;
  name: string;
  diseaseId: string;
  manufacturer: string;
}

export interface VaccineSchedule {
  id: string;
  vaccineId: string;
  doseNumber: number;
  intervalDaysFromPrevious: number;
  isRecurring: boolean;
  recurrenceIntervalDays: number | null;
}

export interface Vaccination {
  id: string;
  animalId: string;
  vaccineId: string;
  doseNumber: number;
  dateAdministered: string;
  batchNumber: string;
  administeredByUserId: string;
  nextDueDate: string | null;
  photoEvidenceUrl: string;
  gpsLat: number | null;
  gpsLng: number | null;
  editableUntil: string | null;
}

// ─── Invitations ──────────────────────────────────────────────────

export interface Invitation {
  id: string;
  email: string;
  invitedByUserId: string;
  zoneId: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: string;
}

// ─── Audit Log ────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  timestamp: string;
  zoneId: string | null;
}

// ─── App State ────────────────────────────────────────────────────

export type Theme = 'light' | 'dark';

export interface AppState {
  currentUser: User | null;
  theme: Theme;
  zones: Zone[];
  users: User[];
  species: Species[];
  breeds: Breed[];
  owners: Owner[];
  animals: Animal[];
  diseases: Disease[];
  vaccines: Vaccine[];
  vaccineSchedules: VaccineSchedule[];
  vaccinations: Vaccination[];
  invitations: Invitation[];
  auditLog: AuditLogEntry[];
}

// ─── Reducer Actions ──────────────────────────────────────────────

export type DataAction =
  | { type: 'SET_CURRENT_USER'; payload: User | null }
  | { type: 'SET_THEME'; payload: Theme }
  | { type: 'CREATE_ZONE'; payload: Omit<Zone, 'id'> }
  | { type: 'MOVE_ZONE'; payload: { zoneId: string; newParentId: string | null } }
  | { type: 'ARCHIVE_ZONE'; payload: { zoneId: string } }
  | { type: 'UPDATE_ZONE'; payload: { zoneId: string; updates: Partial<Zone> } }
  | { type: 'CREATE_ANIMAL'; payload: Omit<Animal, 'id' | 'registeredAt'> }
  | { type: 'EDIT_ANIMAL'; payload: { animalId: string; updates: Partial<Animal> } }
  | { type: 'MARK_DECEASED'; payload: { animalId: string; reason: string; date: string } }
  | { type: 'DELETE_ANIMAL'; payload: { animalId: string } }
  | { type: 'CREATE_OWNER'; payload: Omit<Owner, 'id'> }
  | { type: 'EDIT_OWNER'; payload: { ownerId: string; updates: Partial<Owner> } }
  | { type: 'RECORD_VACCINATION'; payload: Omit<Vaccination, 'id'> }
  | { type: 'EDIT_VACCINATION'; payload: { vaccinationId: string; updates: Partial<Vaccination> } }
  | { type: 'CREATE_DISEASE'; payload: Omit<Disease, 'id'> }
  | { type: 'UPDATE_DISEASE'; payload: { diseaseId: string; updates: Partial<Disease> } }
  | { type: 'CREATE_VACCINE'; payload: Omit<Vaccine, 'id'> }
  | { type: 'UPDATE_VACCINE'; payload: { vaccineId: string; updates: Partial<Vaccine> } }
  | { type: 'CREATE_VACCINE_SCHEDULE'; payload: Omit<VaccineSchedule, 'id'> }
  | { type: 'UPDATE_VACCINE_SCHEDULE'; payload: { scheduleId: string; updates: Partial<VaccineSchedule> } }
  | { type: 'DELETE_VACCINE_SCHEDULE'; payload: { scheduleId: string } }
  | { type: 'CREATE_SPECIES'; payload: Omit<Species, 'id'> }
  | { type: 'UPDATE_SPECIES'; payload: { speciesId: string; updates: Partial<Species> } }
  | { type: 'CREATE_BREED'; payload: Omit<Breed, 'id'> }
  | { type: 'UPDATE_BREED'; payload: { breedId: string; updates: Partial<Breed> } }
  | { type: 'INVITE_TECHNICIAN'; payload: Omit<Invitation, 'id' | 'invitedByUserId' | 'status'> }
  | { type: 'UPDATE_INVITATION'; payload: { invitationId: string; updates: Partial<Invitation> } }
  | { type: 'ADD_AUDIT_ENTRY'; payload: Omit<AuditLogEntry, 'id'> };
