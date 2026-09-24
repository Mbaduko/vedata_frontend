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

// Export the base request function for other API modules
export { request, ApiError };
export default {
  auth: authApi,
  dashboard: dashboardApi,
};
