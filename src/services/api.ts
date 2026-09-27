const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

interface ApiResponse<T = unknown> {
  status: 'success' | 'fail' | 'error';
  data?: T;
  message?: string;
}

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Send cookies
  };

  try {
    const response = await fetch(url, config);
    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.message || 'Request failed',
        response.status,
        data
      );
    }

    return data.data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error', 0, error);
  }
}

// Auth API
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: 'technician' | 'vet' | 'superadmin';
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  zoneRoles?: Array<{
    id: string;
    zoneId: string;
    role: string;
    isLead: boolean;
    status: string;
  }>;
}

export interface AuthResponse {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  login: (credentials: LoginCredentials) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (data: RegisterData) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request<void>('/auth/logout', {
      method: 'POST',
    }),

  getMe: () =>
    request<UserResponse>('/auth/me', {
      method: 'GET',
    }),

  refreshToken: () =>
    request<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
    }),
};

// Dashboard API
export interface DashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    permissions: string[];
  };
  permissions: {
    canViewSystemDashboard: boolean;
    canViewZoneDashboard: boolean;
    canViewPersonalDashboard: boolean;
    canManageZones: boolean;
    canManageUsers: boolean;
    canViewAuditLog: boolean;
    canManageTeam: boolean;
    canConfigureSystem: boolean;
  };
  metrics: {
    system?: {
      totalZones: number;
      totalUsers: number;
      totalAnimals: number;
      totalVaccinations: number;
    };
    zone?: {
      totalAnimals: number;
      totalVaccinations: number;
      totalOwners: number;
      zonesManaged: number;
    };
    personal?: {
      animalsRegistered: number;
      vaccinationsRecorded: number;
    };
  };
  zones?: Array<{
    id: string;
    name: string;
    label: string;
    leadVet: string | null;
    animalCount: number;
    ownerCount: number;
  }>;
  dueVaccinations?: Array<{
    id: string;
    animalId: string;
    animalTag: string;
    animalSpecies: string;
    ownerName: string;
    ownerPhone: string;
    zone: string;
    disease: string;
    vaccine: string;
    doseNumber: number;
    nextDueDate: string;
    isDue: boolean;
  }>;
  teamMembers?: Array<{
    id: string;
    name: string;
    email: string;
    zone: string;
    contractStart: string | null;
    contractEnd: string | null;
  }>;
  recentActivity?: Array<{
    id: string;
    action: string;
    entity: string;
    entityId: string;
    user: string;
    userRole: string;
    zone: string | null;
    timestamp: string;
  }>;
  recentEntries?: Array<{
    id: string;
    tagNumber: string;
    species: string;
    owner: string;
    zone: string;
    healthStatus: string;
    registeredAt: string;
    editableUntil: string | null;
  }>;
  widgets: string[];
  quickActions: Array<{
    label: string;
    path: string;
    icon: string;
  }>;
}

export const dashboardApi = {
  getDashboard: () => request<DashboardData>('/dashboard'),
  getPermissions: () =>
    request<{
      permissions: string[];
      dashboard: Record<string, boolean>;
      role: string;
      zoneAccess: Array<{
        zoneId: string;
        zoneName: string;
        role: string;
        isLead: boolean;
      }>;
    }>('/dashboard/permissions'),
};

// Zone API
export interface Zone {
  id: string;
  name: string;
  label: string;
  parentZoneId: string | null;
  leadVetId: string | null;
  createdByUserId: string;
  technicianGracePeriodHours: number;
  inviteExpiryHours: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  leadVet?: { id: string; name: string; email: string };
  createdBy?: { id: string; name: string; email: string };
  parentZone?: { id: string; name: string; label: string };
  childZones?: Array<{ id: string; name: string; label: string; _count?: { animals: number } }>;
  userZoneRoles?: Array<{
    id: string;
    zoneId: string;
    role: string;
    isLead: boolean;
    status: string;
    user: { id: string; name: string; email: string; role: string };
  }>;
  _count?: { animals: number; owners: number; childZones: number };
}

export const zoneApi = {
  getZones: (params?: { page?: number; limit?: number; search?: string }) =>
    request<Zone[]>('/zones?' + new URLSearchParams(params as any).toString()),
  getZone: (id: string) => request<Zone>(`/zones/${id}`),
  createZone: (data: Partial<Zone>) => request<Zone>('/zones', { method: 'POST', body: JSON.stringify(data) }),
  updateZone: (id: string, data: Partial<Zone>) =>
    request<Zone>(`/zones/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  moveZone: (id: string, newParentId: string | null) =>
    request<Zone>(`/zones/${id}/move`, { method: 'POST', body: JSON.stringify({ newParentId }) }),
  archiveZone: (id: string) => request<Zone>(`/zones/${id}/archive`, { method: 'POST' }),
};

// Species API
export interface Species {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  _count?: { breeds: number; animals: number };
  breeds?: Breed[];
}

export interface Breed {
  id: string;
  name: string;
  speciesId: string;
  createdAt: string;
  updatedAt: string;
  species?: { name: string };
}

export const speciesApi = {
  getSpecies: () => request<Species[]>('/species'),
  getSpeciesById: (id: string) => request<Species>(`/species/${id}`),
  createSpecies: (data: { name: string }) =>
    request<Species>('/species', { method: 'POST', body: JSON.stringify(data) }),
  updateSpecies: (id: string, data: { name: string }) =>
    request<Species>(`/species/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSpecies: (id: string) => request<void>(`/species/${id}`, { method: 'DELETE' }),
  createBreed: (data: { speciesId: string; name: string }) =>
    request<Breed>('/species/breeds', { method: 'POST', body: JSON.stringify(data) }),
  updateBreed: (id: string, data: { name: string }) =>
    request<Breed>(`/species/breeds/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBreed: (id: string) => request<void>(`/species/breeds/${id}`, { method: 'DELETE' }),
};

// Owner API
export interface Owner {
  id: string;
  nid: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  zoneId: string;
  createdAt: string;
  updatedAt: string;
  zone?: { id: string; name: string };
  _count?: { animals: number };
  animals?: Animal[];
}

export interface CreateOwnerPayload {
  nid: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  zoneId: string;
}

export interface UpdateOwnerPayload {
  name?: string;
  phone?: string;
  email?: string | null;
  address?: string | null;
}

export const ownerApi = {
  getOwners: (params?: { page?: number; limit?: number; search?: string; zoneId?: string }) =>
    request<Owner[]>('/owners?' + new URLSearchParams(params as any).toString()),
  getOwner: (id: string) => request<Owner>(`/owners/${id}`),
  searchOwnerByNid: (nid: string) =>
    request<Owner[]>(`/owners?search=${encodeURIComponent(nid)}`),
  createOwner: (data: CreateOwnerPayload) =>
    request<Owner>('/owners', { method: 'POST', body: JSON.stringify(data) }),
  updateOwner: (id: string, data: UpdateOwnerPayload) =>
    request<Owner>(`/owners/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// Animal API
export interface Animal {
  id: string;
  tagNumber: string;
  speciesId: string;
  breedId?: string | null;
  sex: 'male' | 'female';
  dateOfBirth: string;
  ownerId: string;
  zoneId: string;
  healthStatus: 'healthy' | 'sick' | 'under_treatment' | 'deceased';
  deceasedReason?: string | null;
  deceasedDate?: string | null;
  registeredAt: string;
  enteredByUserId: string;
  editableUntil?: string | null;
  createdAt: string;
  updatedAt: string;
  species?: { id: string; name: string };
  breed?: { id: string; name: string } | null;
  owner?: { id: string; name: string; nid: string; phone?: string; email?: string };
  zone?: { id: string; name: string };
  enteredBy?: { id: string; name: string };
  vaccinations?: Vaccination[];
}

export interface CreateAnimalPayload {
  tagNumber: string;
  speciesId: string;
  breedId?: string;
  sex: 'male' | 'female';
  dateOfBirth: string;
  ownerId: string;
  zoneId: string;
  healthStatus?: 'healthy' | 'sick' | 'under_treatment';
}

export interface UpdateAnimalPayload {
  speciesId?: string;
  breedId?: string | null;
  sex?: 'male' | 'female';
  dateOfBirth?: string;
  healthStatus?: 'healthy' | 'sick' | 'under_treatment';
}

export interface MarkDeceasedPayload {
  reason: string;
  date: string;
}

export interface Vaccination {
  id: string;
  animalId: string;
  vaccineId: string;
  doseNumber: number;
  dateAdministered: string;
  batchNumber: string;
  administeredByUserId: string;
  nextDueDate?: string | null;
  photoEvidenceUrl?: string | null;
  gpsLat?: number | null;
  gpsLng?: number | null;
  editableUntil?: string | null;
  createdAt: string;
  updatedAt: string;
  vaccine?: {
    id: string;
    name: string;
    disease: { name: string };
  };
}

export const animalApi = {
  getAnimals: (params?: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    speciesId?: string;
    healthStatus?: string;
    zoneId?: string;
    ownerId?: string;
  }) =>
    request<Animal[]>('/animals?' + new URLSearchParams(params as any).toString()),
  getAnimal: (id: string) => request<Animal>(`/animals/${id}`),
  createAnimal: (data: CreateAnimalPayload) =>
    request<Animal>('/animals', { method: 'POST', body: JSON.stringify(data) }),
  updateAnimal: (id: string, data: UpdateAnimalPayload) =>
    request<Animal>(`/animals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  markDeceased: (id: string, data: MarkDeceasedPayload) =>
    request<Animal>(`/animals/${id}/deceased`, { method: 'POST', body: JSON.stringify(data) }),
  deleteAnimal: (id: string) =>
    request<void>(`/animals/${id}`, { method: 'DELETE' }),
};

// User API (admin)
export type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt?: string;
  zoneRoles?: Array<{
    id: string;
    zoneId: string;
    role: string;
    isLead: boolean;
    status: string;
    zone?: { id: string; name: string };
  }>;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password?: string;
  role: string;
}

export const userApi = {
  getUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    request<UserRecord[]>('/users?' + new URLSearchParams((params ?? { limit: 100 }) as Record<string, string>).toString()),
  getVets: (params?: { page?: number; limit?: number; search?: string }) =>
    request<UserRecord[]>('/users/vets?' + new URLSearchParams((params ?? { limit: 100 }) as Record<string, string>).toString()),
  createUser: (data: CreateUserPayload) =>
    request<UserRecord>('/users', { method: 'POST', body: JSON.stringify(data) }),
};

// Invitation API
export interface Invitation {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  invitedByName?: string;
  zoneName?: string | null;
  zoneId?: string | null;
  expiresAt: string;
  acceptedAt?: string | null;
  createdAt: string;
}

export interface InvitationPreview {
  email: string;
  role: string;
  invitedByName: string;
  zoneName: string | null;
  expiresAt: string;
}

export interface CreateInvitationRequest {
  email: string;
  role?: 'superadmin' | 'vet' | 'technician';
  zoneId?: string;
  inviteExpiryHours?: number;
}

export interface AcceptInvitationRequest {
  token: string;
  name: string;
  password: string;
}

export const invitationApi = {
  // Superadmin endpoints
  inviteUser: (data: CreateInvitationRequest) =>
    request<{ id: string; email: string; role: string; expiresAt: string; inviteUrl?: string }>(
      '/users/invite',
      { method: 'POST', body: JSON.stringify(data) }
    ),
  
  getInvitations: () =>
    request<Invitation[]>('/users/invitations'),
  
  resendInvitation: (id: string, inviteExpiryHours?: number) =>
    request<{ id: string; email: string; expiresAt: string }>(
      `/users/invitations/${id}/resend`,
      { method: 'POST', body: JSON.stringify({ inviteExpiryHours }) }
    ),
  
  revokeInvitation: (id: string) =>
    request<void>(`/users/invitations/${id}`, { method: 'DELETE' }),

  // Vet endpoints
  inviteTechnician: (data: { email: string; zoneId?: string; inviteExpiryHours?: number }) =>
    request<{ id: string; email: string; role: string; expiresAt: string; inviteUrl?: string }>(
      '/team/invite',
      { method: 'POST', body: JSON.stringify(data) }
    ),
  
  getTeamInvitations: () =>
    request<Invitation[]>('/team/invitations'),

  // Public endpoints (no auth required)
  getInvitationPreview: (token: string) =>
    request<InvitationPreview>(`/auth/invite/preview?token=${encodeURIComponent(token)}`),
  
  acceptInvitation: (data: AcceptInvitationRequest) =>
    request<UserResponse>('/auth/invite/accept', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const featureApi = {
  getFeatureFlags: () =>
    request<{ vetToVetInvitation: boolean }>('/users/features'),
};

// Export the base request function for other API modules
export { request, ApiError };
export default {
  auth: authApi,
  dashboard: dashboardApi,
  zones: zoneApi,
  species: speciesApi,
  owners: ownerApi,
  animals: animalApi,
  invitations: invitationApi,
  features: featureApi,
};
