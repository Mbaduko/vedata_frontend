import { useEffect, useState, FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { invitationApi, type InvitationPreview, ApiError } from '../services/api';
import {
  Loader,
  AlertCircle,
  CheckCircle,
  Mail,
  User,
  Lock,
  Shield,
  Stethoscope,
  Wrench,
  MapPin,
  Calendar,
  Eye,
  EyeOff,
} from 'lucide-react';

const roleIcons = {
  superadmin: Shield,
  vet: Stethoscope,
  technician: Wrench,
};

const roleLabels = {
  superadmin: 'System Administrator',
  vet: 'Veterinarian',
  technician: 'Field Technician',
};

const roleDescriptions = {
  superadmin: 'Full system access with administrative privileges',
  vet: 'Manage animals, vaccinations, and team in assigned zones',
  technician: 'Register animals and record vaccinations in the field',
};

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    loadPreview();
  }, [token]);

  const loadPreview = async () => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await invitationApi.getInvitationPreview(token);
      setPreview(data);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 404) {
          setError('This invitation link is invalid or has been revoked.');
        } else if (err.statusCode === 409) {
          setError('This invitation has already been used. Please sign in instead.');
        } else if (err.statusCode === 410) {
          setError('This invitation has expired. Please request a new one.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to load invitation');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!token || !preview) return;

    // Validation
    if (name.trim().length < 2) {
      setError('Please enter your full name');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      await invitationApi.acceptInvitation({
        token,
        name: name.trim(),
        password,
      });

      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Account created successfully! Please sign in with your credentials.' 
          } 
        });
      }, 3000);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 409) {
          setError('This invitation has already been used. Please sign in instead.');
          setTimeout(() => navigate('/login'), 3000);
        } else if (err.statusCode === 410) {
          setError('This invitation has expired. Please request a new one.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader size={40} className="text-brand animate-spin" />
          <p className="text-ink-secondary">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !preview) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} className="text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-ink mb-2">Invalid Invitation</h2>
            <p className="text-ink-secondary mb-6">{error}</p>
            <Link
              to="/login"
              className="inline-block px-6 py-2.5 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors font-medium"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-ink mb-2">Account Created!</h2>
            <p className="text-ink-secondary mb-4">
              Your account has been successfully created. Redirecting you to login...
            </p>
            <Loader size={24} className="text-brand animate-spin mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (!preview) return null;

  const RoleIcon = roleIcons[preview.role as keyof typeof roleIcons] || User;
  const expiryDate = new Date(preview.expiresAt);
  const isExpiringSoon = expiryDate.getTime() - Date.now() < 24 * 60 * 60 * 1000; // < 24 hours

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand mb-4">
            <span className="text-white font-bold text-2xl">V</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-ink">You've Been Invited!</h1>
          <p className="text-ink-secondary mt-2">Join the Vedata team to start making an impact</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Invitation Details Sidebar */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div>
                <p className="text-xs text-ink-secondary uppercase tracking-wide mb-2">Invited By</p>
                <p className="text-sm font-medium text-ink">{preview.invitedByName}</p>
              </div>

              <div>
                <p className="text-xs text-ink-secondary uppercase tracking-wide mb-2">Your Role</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-bg flex items-center justify-center">
                    <RoleIcon size={16} className="text-brand-text" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {roleLabels[preview.role as keyof typeof roleLabels] || preview.role}
                    </p>
                    <p className="text-xs text-ink-secondary">
                      {roleDescriptions[preview.role as keyof typeof roleDescriptions]}
                    </p>
                  </div>
                </div>
              </div>

              {preview.zoneName && (
                <div>
                  <p className="text-xs text-ink-secondary uppercase tracking-wide mb-2">Assigned Zone</p>
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-ink-secondary" />
                    <p className="text-sm font-medium text-ink">{preview.zoneName}</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-ink-secondary uppercase tracking-wide mb-2">Link Expires</p>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className={isExpiringSoon ? 'text-orange-600' : 'text-ink-secondary'} />
                  <div>
                    <p className={`text-sm font-medium ${isExpiringSoon ? 'text-orange-600' : 'text-ink'}`}>
                      {expiryDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {isExpiringSoon && (
                      <p className="text-xs text-orange-600">Expires soon!</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Registration Form */}
          <div className="lg:col-span-3">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-ink mb-6">Create Your Account</h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
                    <input
                      type="email"
                      value={preview.email}
                      readOnly
                      className="w-full pl-10 pr-3 py-2.5 bg-bg border border-border rounded-lg text-ink cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-ink-secondary mt-1">This email is pre-assigned and cannot be changed</p>
                </div>

                {/* Full Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-ink mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      minLength={2}
                      placeholder="Enter your full name"
                      className="w-full pl-10 pr-3 py-2.5 bg-bg border border-border rounded-lg text-ink placeholder-ink-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                      disabled={submitting}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-ink mb-1.5">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="Minimum 8 characters"
                      className="w-full pl-10 pr-10 py-2.5 bg-bg border border-border rounded-lg text-ink placeholder-ink-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-secondary hover:text-ink"
                      disabled={submitting}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-ink-secondary mt-1">Must be at least 8 characters long</p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink mb-1.5">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
                    <input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="Re-enter your password"
                      className="w-full pl-10 pr-10 py-2.5 bg-bg border border-border rounded-lg text-ink placeholder-ink-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-secondary hover:text-ink"
                      disabled={submitting}
                    >
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-brand hover:bg-brand/90 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
                >
                  {submitting ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      Create Account
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-xs text-ink-secondary text-center">
                  Already have an account?{' '}
                  <Link to="/login" className="text-brand hover:underline font-medium">
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
