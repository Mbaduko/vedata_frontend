import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { invitationApi, zoneApi, featureApi, type Zone, ApiError } from '../services/api';
import {
  Loader,
  AlertCircle,
  CheckCircle,
  Mail,
  Stethoscope,
  Wrench,
  MapPin,
  Clock,
  ArrowLeft,
  Send,
  Copy,
  Check,
} from 'lucide-react';

const roleOptions = [
  {
    value: 'vet',
    label: 'Veterinarian',
    icon: Stethoscope,
    description: 'Manage animals, vaccinations, and team members in zones',
    allowedFor: ['superadmin', 'vet'], // Added 'vet' here
  },
  {
    value: 'technician',
    label: 'Field Technician',
    icon: Wrench,
    description: 'Register animals and record vaccinations in assigned zones',
    allowedFor: ['vet'],
  },
];

export default function InviteUser() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'technician' | 'vet'>(() => {
    // Default role based on user type
    return user?.role === 'superadmin' ? 'vet' : 'technician';
  });
  const [zoneId, setZoneId] = useState('');
  const [inviteExpiryHours, setInviteExpiryHours] = useState(168); // 7 days default
  
  const [zones, setZones] = useState<Zone[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);
  const [vetToVetEnabled, setVetToVetEnabled] = useState(false);
  const [loadingFeatures, setLoadingFeatures] = useState(true);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isSuperadmin = user?.role === 'superadmin';
  const isVet = user?.role === 'vet';

  // Filter role options based on user role AND feature flags
  const availableRoleOptions = roleOptions.filter(option => {
    if (!option.allowedFor.includes(user?.role || '')) return false;
    // For vets, only show 'vet' option if feature is enabled
    if (isVet && option.value === 'vet' && !vetToVetEnabled) return false;
    return true;
  });

  useEffect(() => {
    // Load feature flags
    loadFeatureFlags();
    
    // Load zones for both superadmin and vet
    if (isSuperadmin || isVet) {
      loadZones();
    }
  }, [isSuperadmin, isVet]);

  const loadFeatureFlags = async () => {
    try {
      setLoadingFeatures(true);
      const features = await featureApi.getFeatureFlags();
      setVetToVetEnabled(features.vetToVetInvitation);
    } catch (err) {
      console.error('Failed to load feature flags:', err);
      setVetToVetEnabled(false);
    } finally {
      setLoadingFeatures(false);
    }
  };

  const loadZones = async () => {
    try {
      setLoadingZones(true);
      const zonesData = await zoneApi.getZones({ limit: 100 });
      setZones(zonesData || []);
    } catch (err) {
      console.error('Failed to load zones:', err);
    } finally {
      setLoadingZones(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(false);
      
      // Use different endpoint based on user role and invited role
      const data = isSuperadmin
        ? await invitationApi.inviteUser({
            email: email.trim().toLowerCase(),
            role,
            zoneId: zoneId || undefined,
            inviteExpiryHours,
          })
        : role === 'vet'
        ? await invitationApi.inviteUser({
            email: email.trim().toLowerCase(),
            role: 'vet',
            zoneId: zoneId || undefined,
            inviteExpiryHours,
          })
        : await invitationApi.inviteTechnician({
            email: email.trim().toLowerCase(),
            zoneId: zoneId || undefined,
            inviteExpiryHours,
          });

      setSuccess(true);
      if (data.inviteUrl) {
        setInviteUrl(data.inviteUrl);
      }
      
      // Reset form
      setEmail('');
      setRole('technician');
      setZoneId('');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to send invitation. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyUrl = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-card rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-ink-secondary" />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold text-ink">
            {isSuperadmin 
              ? 'Invite Veterinarian'
              : isVet && role === 'vet'
              ? 'Invite Veterinarian'
              : 'Invite Technician'}
          </h1>
          <p className="text-ink-secondary mt-1">
            {isSuperadmin 
              ? 'Send an invitation to a veterinarian to join your system'
              : isVet && role === 'vet'
              ? 'Send an invitation to a veterinarian to join your team'
              : 'Send an invitation to a technician to join your team'
            }
          </p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CheckCircle size={20} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-1">
                Invitation Sent Successfully!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                An email has been sent with instructions to create an account.
              </p>
              {inviteUrl && (
                <div className="space-y-2">
                  <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                    Development Mode: Copy this link to test
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={inviteUrl}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded-lg text-xs text-ink font-mono"
                    />
                    <button
                      onClick={handleCopyUrl}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                    >
                      {copied ? (
                        <>
                          <Check size={16} />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={16} />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-card border border-border rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Feature Disabled Info for Vets - Moved inside form as informational note */}
          {isVet && !vetToVetEnabled && loadingFeatures === false && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Wrench size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Inviting Field Technicians
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    As a veterinarian, you can invite technicians to join your team in your zones.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="user@example.com"
                className="w-full pl-10 pr-3 py-2.5 bg-bg border border-border rounded-lg text-ink placeholder-ink-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                disabled={submitting}
              />
            </div>
            <p className="text-xs text-ink-secondary mt-1.5">
              An invitation email will be sent to this address
            </p>
          </div>

          {/* Role Selection - For Superadmin and Vet */}
          {(isSuperadmin || isVet) && availableRoleOptions.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-ink mb-3">
                Role <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {availableRoleOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = role === option.value;
                  
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRole(option.value as any)}
                      disabled={submitting}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? 'border-brand bg-brand-bg'
                          : 'border-border hover:border-brand/30 bg-bg'
                      } cursor-pointer`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-brand text-white' : 'bg-card'
                        }`}>
                          <Icon size={20} />
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${isSelected ? 'text-ink' : 'text-ink'}`}>
                            {option.label}
                          </p>
                          <p className="text-sm text-ink-secondary mt-1">{option.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {isSuperadmin && (
                <p className="text-xs text-ink-secondary mt-2">
                  ℹ️ Superadmins can only invite veterinarians
                </p>
              )}
              {isVet && (
                <p className="text-xs text-ink-secondary mt-2">
                  ℹ️ Vets can invite other vets or technicians to zones where they have authority
                </p>
              )}
            </div>
          )}

          {/* Role info when only one option */}
          {isVet && availableRoleOptions.length === 1 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Wrench size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Inviting Field Technician
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    As a veterinarian, you can invite technicians to join your team in your zones.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Zone Selection - For both superadmin and vet inviting vets */}
          {(isSuperadmin || (isVet && role === 'vet')) && (
            <div>
              <label htmlFor="zoneId" className="block text-sm font-medium text-ink mb-2">
                Assign to Zone {isVet && role === 'vet' ? <span className="text-red-500">*</span> : <span className="text-xs text-ink-secondary font-normal">(Optional)</span>}
              </label>
              <div className="relative">
                <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
                <select
                  id="zoneId"
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  required={isVet && role === 'vet'}
                  disabled={submitting || loadingZones}
                  className="w-full pl-10 pr-3 py-2.5 bg-bg border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent appearance-none cursor-pointer"
                >
                  <option value="">{isVet && role === 'vet' ? 'Select a zone' : 'No zone assignment'}</option>
                  {zones?.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} ({zone.label})
                    </option>
                  ))}
                </select>
                {loadingZones && (
                  <Loader size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-ink-secondary" />
                )}
              </div>
              <p className="text-xs text-ink-secondary mt-1.5">
                {isVet && role === 'vet' 
                  ? 'Select a zone where you have authority (owned or lead vet)'
                  : 'User will be automatically assigned to this zone upon registration'
                }
              </p>
            </div>
          )}

          {/* Expiry Time */}
          <div>
            <label htmlFor="expiry" className="block text-sm font-medium text-ink mb-2">
              Invitation Expiry
            </label>
            <div className="relative">
              <Clock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
              <select
                id="expiry"
                value={inviteExpiryHours}
                onChange={(e) => setInviteExpiryHours(Number(e.target.value))}
                disabled={submitting}
                className="w-full pl-10 pr-3 py-2.5 bg-bg border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent appearance-none cursor-pointer"
              >
                <option value={24}>24 hours</option>
                <option value={72}>3 days</option>
                <option value={168}>7 days (recommended)</option>
                <option value={336}>14 days</option>
                <option value={720}>30 days</option>
              </select>
            </div>
            <p className="text-xs text-ink-secondary mt-1.5">
              The invitation link will expire after this period
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-brand hover:bg-brand/90 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Sending Invitation...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Send Invitation
                </>
              )}
            </button>
            <Link
              to="/users"
              className="px-6 py-3 border border-border text-ink-secondary hover:text-ink hover:border-brand/30 rounded-lg transition-colors font-medium"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-ink mb-1">Secure Links</h3>
          <p className="text-xs text-ink-secondary">
            Each invitation uses a unique, encrypted token that expires after use
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-ink mb-1">Email Delivery</h3>
          <p className="text-xs text-ink-secondary">
            Professional invitation emails are sent automatically with clear instructions
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-ink mb-1">Audit Trail</h3>
          <p className="text-xs text-ink-secondary">
            All invitations are logged with full details for compliance and tracking
          </p>
        </div>
      </div>
    </div>
  );
}
