import { useEffect, useState } from 'react';
import { useData, useDispatch } from '../context/DataContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Plus, Mail } from 'lucide-react';

export default function Team() {
  const { currentUser, users, zones, invitations } = useData();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showInvite, setShowInvite] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Dashboard quick action: /team?invite=1 opens the invite form directly.
  useEffect(() => {
    if (searchParams.get('invite')) {
      setShowInvite(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    zoneId: currentUser?.zoneRoles?.find(zr => zr.isLead)?.zoneId || '',
    contractStart: '',
    contractEnd: '',
    inviteExpiryHours: 168,
  });

  const myZoneId = currentUser?.zoneRoles?.find(zr => zr.isLead)?.zoneId;
  const myZone = zones.find(z => z.id === myZoneId);

  const technicians = users.filter(u =>
    u.role === 'technician' && u.zoneRoles.some(zr => zr.zoneId === myZoneId)
  );

  const zoneInvitations = invitations.filter(i => i.zoneId === myZoneId);

  const handleInvite = () => {
    if (!inviteForm.email || !inviteForm.contractStart || !inviteForm.contractEnd) return;
    dispatch({
      type: 'INVITE_TECHNICIAN',
      payload: {
        email: inviteForm.email,
        zoneId: inviteForm.zoneId,
        contractStart: inviteForm.contractStart,
        contractEnd: inviteForm.contractEnd,
        expiresAt: new Date(Date.now() + inviteForm.inviteExpiryHours * 60 * 60 * 1000).toISOString(),
      },
    });
    setInviteForm({ email: '', zoneId: myZoneId || '', contractStart: '', contractEnd: '', inviteExpiryHours: 168 });
    setShowInvite(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink">Team</h1>
          <p className="text-sm text-ink-secondary mt-1">
            {myZone?.name} · {technicians.length} technician{technicians.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-on-brand text-sm font-medium rounded-lg hover:bg-brand-hover"
        >
          <Plus size={16} /> Invite Technician
        </button>
      </div>

      {showInvite && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-ink mb-4">Invite Technician</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-ink-secondary mb-1">Email *</label>
              <input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="technician@email.com"
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Contract Start *</label>
              <input
                type="date"
                value={inviteForm.contractStart}
                onChange={(e) => setInviteForm({ ...inviteForm, contractStart: e.target.value })}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Contract End *</label>
              <input
                type="date"
                value={inviteForm.contractEnd}
                onChange={(e) => setInviteForm({ ...inviteForm, contractEnd: e.target.value })}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Invite Expiry (hours)</label>
              <input
                type="number"
                value={inviteForm.inviteExpiryHours}
                onChange={(e) => setInviteForm({ ...inviteForm, inviteExpiryHours: parseInt(e.target.value) || 168 })}
                min="1"
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
              <p className="text-xs text-ink-secondary mt-1">
                Link expires in {inviteForm.inviteExpiryHours}h
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleInvite}
              disabled={!inviteForm.email || !inviteForm.contractStart || !inviteForm.contractEnd}
              className="px-4 py-2 bg-brand text-on-brand text-sm font-medium rounded-lg hover:bg-brand-hover disabled:opacity-50"
            >
              Send Invitation
            </button>
            <button
              onClick={() => setShowInvite(false)}
              className="px-4 py-2 text-sm text-ink-secondary hover:bg-bg rounded-lg border border-border"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Technicians */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-display font-semibold text-ink mb-4">Active Technicians</h2>
        {technicians.length === 0 ? (
          <p className="text-sm text-ink-secondary py-4 text-center">No technicians assigned yet</p>
        ) : (
          <div className="space-y-3">
            {technicians.map(tech => {
              const zoneRole = tech.zoneRoles.find(zr => zr.zoneId === myZoneId);
              const isExpired = zoneRole?.contractEnd && new Date(zoneRole.contractEnd) < new Date();
              return (
                <button
                  key={tech.id}
                  onClick={() => navigate(`/team/${tech.id}`)}
                  className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-bg transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-bg flex items-center justify-center">
                      <Users size={16} className="text-brand-text" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">{tech.name}</p>
                      <p className="text-xs text-ink-secondary">{tech.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      isExpired ? 'bg-clay-bg text-clay-text' : 'bg-brand-bg text-brand-text'
                    }`}>
                      {isExpired ? 'Expired' : 'Active'}
                    </span>
                    {zoneRole?.contractEnd && (
                      <p className="text-xs text-ink-secondary mt-1">
                        Until {new Date(zoneRole.contractEnd).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-display font-semibold text-ink mb-4">Pending Invitations</h2>
        {zoneInvitations.length === 0 ? (
          <p className="text-sm text-ink-secondary py-4 text-center">No pending invitations</p>
        ) : (
          <div className="space-y-2">
            {zoneInvitations.map(inv => {
              const isExpired = new Date(inv.expiresAt) < new Date();
              const status = inv.status === 'accepted' ? 'accepted' : isExpired ? 'expired' : 'pending';
              return (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-bg rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail size={14} className="text-ink-secondary" />
                    <div>
                      <p className="text-sm font-medium text-ink">{inv.email}</p>
                      <p className="text-xs text-ink-secondary">
                        Expires {new Date(inv.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    status === 'accepted' ? 'bg-brand-bg text-brand-text' :
                    status === 'expired' ? 'bg-clay-bg text-clay-text' :
                    'bg-gold-bg text-gold-text'
                  }`}>
                    {status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
