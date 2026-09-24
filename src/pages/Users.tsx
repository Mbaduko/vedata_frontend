import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { userApi, type UserRecord, ApiError } from '../services/api';
import DataTable from '../components/DataTable';
import {
  AlertCircle,
  Check,
  Search,
  Shield,
  Stethoscope,
  UserPlus,
  Users as UsersIcon,
  Wrench,
  X,
} from 'lucide-react';

const roleIcons: Record<string, typeof Shield> = {
  superadmin: Shield,
  vet: Stethoscope,
  technician: Wrench,
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Dashboard quick action: /users?new=1 opens the create modal directly.
  useEffect(() => {
    if (searchParams.get('new')) {
      setShowCreate(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userApi.getUsers({ limit: 100 });
      setUsers(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (!success) return;
    const timeout = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(timeout);
  }, [success]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      if (filterRole && u.role !== filterRole) return false;
      return true;
    });
  }, [users, search, filterRole]);

  const handleCreated = (created: UserRecord) => {
    setUsers((prev) => [created, ...prev]);
    setShowCreate(false);
    setSuccess(`${created.name} was created successfully.`);
  };

  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      render: (row: UserRecord) => <span className="font-medium text-ink">{row.name}</span>,
    },
    {
      header: 'Email',
      accessor: 'email',
      render: (row: UserRecord) => <span className="text-ink-secondary">{row.email}</span>,
    },
    {
      header: 'Role',
      accessor: 'role',
      render: (row: UserRecord) => {
        const Icon = roleIcons[row.role] || UsersIcon;
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-brand-bg text-brand-text px-2 py-0.5 rounded-full capitalize">
            <Icon size={12} aria-hidden="true" /> {row.role}
          </span>
        );
      },
    },
    {
      header: 'Zones',
      accessor: 'zoneRoles',
      render: (row: UserRecord) => (
        <span className="text-xs text-ink-secondary">
          {row.zoneRoles?.length
            ? row.zoneRoles.map((zr) => zr.zone?.name ?? zr.zoneId).join(', ')
            : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink">Users</h1>
          <p className="text-sm text-ink-secondary mt-1">
            {loading ? 'Loading users…' : `${filtered.length} of ${users.length} users`}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <UserPlus size={16} aria-hidden="true" />
          Add User
        </button>
      </div>

      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-3 rounded-lg border border-brand/30 bg-brand-bg px-4 py-3 text-sm text-brand-text">
          <Check size={16} className="shrink-0" aria-hidden="true" />
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess(null)} aria-label="Dismiss" className="hover:opacity-70">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-clay-bg bg-clay-bg/50 px-4 py-3 text-sm text-clay-text">
          <AlertCircle size={16} className="shrink-0" aria-hidden="true" />
          <span className="flex-1">{error}</span>
          <button onClick={loadUsers} className="font-medium underline underline-offset-2 hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            aria-label="Search users"
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-ink placeholder:text-ink-secondary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          aria-label="Filter by role"
          className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          <option value="">All Roles</option>
          <option value="superadmin">Superadmin</option>
          <option value="vet">Veterinarian</option>
          <option value="technician">Technician</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 animate-pulse" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-border/40" />
          ))}
        </div>
      ) : (
        <DataTable columns={columns} data={filtered} emptyMessage="No users found" />
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onSuccess={handleCreated}
        />
      )}
    </div>
  );
}

function CreateUserModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (user: UserRecord) => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'technician',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const created = await userApi.createUser({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password || undefined,
        role: formData.role,
      });
      onSuccess(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add user"
        className="bg-card border border-border rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-card flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-ink">Add User</h2>
          <button onClick={onClose} aria-label="Close" className="text-ink-secondary hover:text-ink transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-clay-bg border border-clay-text/20 rounded-lg p-3 text-sm text-clay-text">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="user-name" className="block text-sm font-medium text-ink mb-1.5">
              Full name <span className="text-clay-text">*</span>
            </label>
            <input
              id="user-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Jeanine Uwase"
              required
              disabled={loading}
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-ink placeholder-ink-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="user-email" className="block text-sm font-medium text-ink mb-1.5">
              Email <span className="text-clay-text">*</span>
            </label>
            <input
              id="user-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="name@vedata.rw"
              required
              disabled={loading}
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-ink placeholder-ink-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="user-role" className="block text-sm font-medium text-ink mb-1.5">
              Role
            </label>
            <select
              id="user-role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              disabled={loading}
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent disabled:opacity-50"
            >
              <option value="technician">Technician</option>
              <option value="vet">Veterinarian</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </div>

          <div>
            <label htmlFor="user-password" className="block text-sm font-medium text-ink mb-1.5">
              Password
            </label>
            <input
              id="user-password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Leave blank for a temporary password"
              disabled={loading}
              autoComplete="new-password"
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-ink placeholder-ink-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent disabled:opacity-50"
            />
            <p className="text-xs text-ink-secondary mt-1">
              A temporary password is generated if left blank.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || !formData.name.trim() || !formData.email.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Creating…
                </>
              ) : (
                <>
                  <Check size={18} aria-hidden="true" />
                  Create User
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 bg-bg border border-border text-ink rounded-lg hover:bg-card transition-colors disabled:opacity-50 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
