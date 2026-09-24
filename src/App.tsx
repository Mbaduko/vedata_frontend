import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  LayoutDashboard, MapPin, Dog, Users, Syringe, Settings, FileText,
  Shield, Stethoscope, Wrench, LogOut, Sun, Moon, Menu, X,
  AlertCircle, Activity, Loader, type LucideIcon
} from 'lucide-react';
import { useState, useEffect, type ReactNode } from 'react';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Zones from './pages/Zones';
import ZoneDetail from './pages/ZoneDetail';
import Animals from './pages/Animals';
import AnimalDetail from './pages/AnimalDetail';
import AnimalRegister from './pages/AnimalRegister';
import Owners from './pages/Owners';
import OwnerDetail from './pages/OwnerDetail';
import VaccinationRecord from './pages/VaccinationRecord';
import VaccinationsDue from './pages/VaccinationsDue';
import ConfigDiseases from './pages/ConfigDiseases';
import ConfigSpecies from './pages/ConfigSpecies';
import Team from './pages/Team';
import TechnicianDetail from './pages/TechnicianDetail';
import MyActivity from './pages/MyActivity';
import UsersPage from './pages/Users';
import Roles from './pages/Roles';
import AuditLog from './pages/AuditLog';

// Route guard
function RequireAuth({ children, allowedRoles }: { children: ReactNode; allowedRoles?: string[] }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader size={32} className="text-brand animate-spin" />
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

// Navigation
interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
  hidden?: boolean;
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['superadmin', 'vet', 'technician'] },
  { path: '/zones', label: 'Zones', icon: MapPin, roles: ['superadmin', 'vet'] },
  { path: '/animals', label: 'Animals', icon: Dog, roles: ['vet', 'technician'] },
  { path: '/animals/register', label: 'Register Animal', icon: Dog, roles: ['vet', 'technician'], hidden: true },
  { path: '/owners', label: 'Owners', icon: Users, roles: ['vet', 'technician'] },
  { path: '/vaccinations/record', label: 'Record Vaccination', icon: Syringe, roles: ['vet', 'technician'], hidden: true },
  { path: '/vaccinations/due', label: 'Due Vaccinations', icon: AlertCircle, roles: ['vet', 'technician'] },
  { path: '/team', label: 'Team', icon: Users, roles: ['vet'] },
  { path: '/my-activity', label: 'My Activity', icon: Activity, roles: ['technician'] },
  { path: '/config/diseases', label: 'Disease Config', icon: Settings, roles: ['superadmin'] },
  { path: '/config/species', label: 'Species Config', icon: Settings, roles: ['superadmin'] },
  { path: '/users', label: 'Users', icon: Users, roles: ['superadmin'] },
  { path: '/roles', label: 'Roles', icon: Shield, roles: ['superadmin'] },
  { path: '/audit-log', label: 'Audit Log', icon: FileText, roles: ['superadmin'] },
];

const roleIcons: Record<string, LucideIcon> = { superadmin: Shield, vet: Stethoscope, technician: Wrench };

function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const RoleIcon = roleIcons[user?.role ?? ''] ?? Users;

  const visibleNav = navItems.filter(item =>
    user && item.roles.includes(user.role) && !item.hidden
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-border">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="text-lg font-display font-semibold text-ink">Vedata</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {visibleNav.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path ||
                (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-bg text-brand-text'
                      : 'text-ink-secondary hover:bg-bg hover:text-ink'
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-brand-bg flex items-center justify-center">
                <RoleIcon size={14} className="text-brand-text" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{user?.name}</p>
                <p className="text-xs text-ink-secondary capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-secondary hover:bg-bg hover:text-ink rounded-lg mt-1 transition-colors"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-bg/80 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-card rounded-lg"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex-1" />
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-card rounded-lg"
            >
              {theme === 'dark' ? <Sun size={18} className="text-ink-secondary" /> : <Moon size={18} className="text-ink-secondary" />}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/dashboard" element={<RequireAuth><Layout><Dashboard /></Layout></RequireAuth>} />
      <Route path="/zones" element={<RequireAuth allowedRoles={['superadmin', 'vet']}><Layout><Zones /></Layout></RequireAuth>} />
      <Route path="/zones/:id" element={<RequireAuth allowedRoles={['superadmin', 'vet']}><Layout><ZoneDetail /></Layout></RequireAuth>} />
      <Route path="/animals" element={<RequireAuth allowedRoles={['vet', 'technician']}><Layout><Animals /></Layout></RequireAuth>} />
      <Route path="/animals/register" element={<RequireAuth allowedRoles={['vet', 'technician']}><Layout><AnimalRegister /></Layout></RequireAuth>} />
      <Route path="/animals/:id" element={<RequireAuth allowedRoles={['vet', 'technician']}><Layout><AnimalDetail /></Layout></RequireAuth>} />
      <Route path="/owners" element={<RequireAuth allowedRoles={['vet', 'technician']}><Layout><Owners /></Layout></RequireAuth>} />
      <Route path="/owners/:id" element={<RequireAuth allowedRoles={['vet', 'technician']}><Layout><OwnerDetail /></Layout></RequireAuth>} />
      <Route path="/vaccinations/record" element={<RequireAuth allowedRoles={['vet', 'technician']}><Layout><VaccinationRecord /></Layout></RequireAuth>} />
      <Route path="/vaccinations/due" element={<RequireAuth allowedRoles={['vet', 'technician']}><Layout><VaccinationsDue /></Layout></RequireAuth>} />
      <Route path="/team" element={<RequireAuth allowedRoles={['vet']}><Layout><Team /></Layout></RequireAuth>} />
      <Route path="/team/:id" element={<RequireAuth allowedRoles={['vet']}><Layout><TechnicianDetail /></Layout></RequireAuth>} />
      <Route path="/my-activity" element={<RequireAuth allowedRoles={['technician']}><Layout><MyActivity /></Layout></RequireAuth>} />
      <Route path="/config/diseases" element={<RequireAuth allowedRoles={['superadmin']}><Layout><ConfigDiseases /></Layout></RequireAuth>} />
      <Route path="/config/species" element={<RequireAuth allowedRoles={['superadmin']}><Layout><ConfigSpecies /></Layout></RequireAuth>} />
      <Route path="/users" element={<RequireAuth allowedRoles={['superadmin']}><Layout><UsersPage /></Layout></RequireAuth>} />
      <Route path="/roles" element={<RequireAuth allowedRoles={['superadmin']}><Layout><Roles /></Layout></RequireAuth>} />
      <Route path="/audit-log" element={<RequireAuth allowedRoles={['superadmin']}><Layout><AuditLog /></Layout></RequireAuth>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
