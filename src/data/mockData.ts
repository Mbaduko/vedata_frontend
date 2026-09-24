import type { Zone, User, Species, Breed, Owner, Animal, Disease, Vaccine, VaccineSchedule, Vaccination, Invitation, AuditLogEntry, AppState } from '../types';

let nextId = 100;
export function generateId(prefix: string = 'gen'): string {
  return `${prefix}-${Date.now()}-${nextId++}`;
}

type MockData = Omit<AppState, 'currentUser' | 'theme'>;

// Empty initial state - all data will come from API
export const initialMockData: MockData = {
  zones: [],
  users: [],
  species: [],
  breeds: [],
  owners: [],
  animals: [],
  diseases: [],
  vaccines: [],
  vaccineSchedules: [],
  vaccinations: [],
  invitations: [],
  auditLog: [],
};
