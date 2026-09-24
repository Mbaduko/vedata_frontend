import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { invitationApi, type Invitation, ApiError } from '../services/api';
import {
  Loader,
  AlertCircle,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  UserPlus,
  Shield,
  Stethoscope,
  Wrench,
  MapPin,
  Calendar,
  Copy,
  Check,
} from 'lucide-react';
import { Link } from 'react-router-dom';

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

const statusColors = {
  pending: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  accepted: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  expired: 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300',
  revoked: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300',
};

const statusIcons = {
  pending: Clock,
  accepted: CheckCircle,
  expired: XCircle,
  revoked: XCircle,
};

export default function Invitations() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isSuperadmin = user?.role === 'superadmin';
  const isVet = user?.role === 'vet';

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = isSuperadmin
        ? await invitationApi.getInvitations()
        : await invitationApi.getTeamInvitations();
      
      setInvitations(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load invitations');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (id: string) => {
    try {
      setActionLoading(id);
      await invitationApi.resendInvitation(id);
      await loadInvitations();
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert('Failed to resend invitation');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;

    try {
      setActionLoading(id);
      await invitationApi.revokeInvitation(id);
      await loadInvitations();
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert('Failed to revoke invitation');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyEmail = (email: string, id: string) => {
    navigator.clipboard.writeText(email);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <Loader size={32} className="text-brand animate-spin" />
        </div>
      </div>
    );
  }

  const pendingInvites = invitations.filter(i => i.status === 'pending');
  const otherInvites = invitations.filter(i => i.status !== 'pending');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink">Invitations</h1>
          <p className="text-ink-secondary mt-1">
            Manage pending and historical user invitations
          </p>
        </div>
        <Link
          to={isSuperadmin ? '/users/invite' : '/team/invite'}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand/90 text-white rounded-lg transition-colors font-medium"
        >
          <UserPlus size={18} />
          New Invitation
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">Failed to load invitations</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <Clock size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink">{pendingInvites.length}</p>
              <p className="text-sm text-ink-secondary">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink">
                {invitations.filter(i => i.status === 'accepted').length}
              </p>
              <p className="text-sm text-ink-secondary">Accepted</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-900/20 flex items-center justify-center">
              <XCircle size={20} className="text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink">
                {invitations.filter(i => i.status === 'expired').length}
              </p>
              <p className="text-sm text-ink-secondary">Expired</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <Trash2 size={20} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink">
                {invitations.filter(i => i.status === 'revoked').length}
              </p>
              <p className="text-sm text-ink-secondary">Revoked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Invitations */}
      {pendingInvites.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-ink mb-3">Pending Invitations</h2>
          <div className="space-y-3">
            {pendingInvites.map((invite) => (
              <InvitationCard
                key={invite.id}
                invite={invite}
                onResend={handleResend}
                onRevoke={handleRevoke}
                onCopyEmail={handleCopyEmail}
                actionLoading={actionLoading}
                copiedId={copiedId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Invitations */}
      {otherInvites.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-ink mb-3">History</h2>
          <div className="space-y-3">
            {otherInvites.map((invite) => (
              <InvitationCard
                key={invite.id}
                invite={invite}
                onResend={handleResend}
                onRevoke={handleRevoke}
                onCopyEmail={handleCopyEmail}
                actionLoading={actionLoading}
                copiedId={copiedId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {invitations.length === 0 && !error && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-bg flex items-center justify-center mx-auto mb-4">
            <Mail size={32} className="text-brand-text" />
          </div>
          <h3 className="text-lg font-semibold text-ink mb-2">No Invitations Yet</h3>
          <p className="text-ink-secondary mb-6">
            Start building your team by sending invitations
          </p>
          <Link
            to={isSuperadmin ? '/users/invite' : '/team/invite'}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand hover:bg-brand/90 text-white rounded-lg transition-colors font-medium"
          >
            <UserPlus size={18} />
            Send Invitation
          </Link>
        </div>
      )}
    </div>
  );
}

function InvitationCard({
  invite,
  onResend,
  onRevoke,
  onCopyEmail,
  actionLoading,
  copiedId,
}: {
  invite: Invitation;
  onResend: (id: string) => void;
  onRevoke: (id: string) => void;
  onCopyEmail: (email: string, id: string) => void;
  actionLoading: string | null;
  copiedId: string | null;
}) {
  const RoleIcon = roleIcons[invite.role as keyof typeof roleIcons] || Shield;
  const StatusIcon = statusIcons[invite.status];
  const statusColor = statusColors[invite.status];

  const expiryDate = new Date(invite.expiresAt);
  const isExpiringSoon = invite.status === 'pending' && expiryDate.getTime() - Date.now() < 24 * 60 * 60 * 1000;

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-brand/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Icon */}
          <div className="w-12 h-12 rounded-lg bg-brand-bg flex items-center justify-center flex-shrink-0">
            <RoleIcon size={20} className="text-brand-text" />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => onCopyEmail(invite.email, invite.id)}
                    className="text-sm font-medium text-ink hover:text-brand transition-colors flex items-center gap-1.5 group"
                  >
                    <Mail size={14} className="text-ink-secondary group-hover:text-brand" />
                    {invite.email}
                    {copiedId === invite.id ? (
                      <Check size={14} className="text-green-600" />
                    ) : (
                      <Copy size={14} className="opacity-0 group-hover:opacity-100 text-ink-secondary" />
                    )}
                  </button>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                    <StatusIcon size={12} className="inline mr-1" />
                    {invite.status}
                  </span>
                </div>
                <p className="text-sm text-ink-secondary mt-1">
                  {roleLabels[invite.role as keyof typeof roleLabels] || invite.role}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-ink-secondary flex-wrap">
              {invite.invitedByName && (
                <span className="flex items-center gap-1">
                  <Shield size={12} />
                  Invited by {invite.invitedByName}
                </span>
              )}
              {invite.zoneName && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {invite.zoneName}
                </span>
              )}
              <span className={`flex items-center gap-1 ${isExpiringSoon ? 'text-orange-600 font-medium' : ''}`}>
                <Calendar size={12} />
                {invite.status === 'accepted' && invite.acceptedAt
                  ? `Accepted ${new Date(invite.acceptedAt).toLocaleDateString()}`
                  : `Expires ${expiryDate.toLocaleDateString()}`}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {invite.status === 'pending' && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onResend(invite.id)}
              disabled={actionLoading === invite.id}
              className="p-2 text-brand hover:bg-brand-bg rounded-lg transition-colors disabled:opacity-50"
              title="Resend invitation"
            >
              {actionLoading === invite.id ? (
                <Loader size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
            </button>
            <button
              onClick={() => onRevoke(invite.id)}
              disabled={actionLoading === invite.id}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
              title="Revoke invitation"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
