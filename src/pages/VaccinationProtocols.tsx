import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { vaccinationApi, type VaccinationProtocol } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Archive, Edit, Eye, Loader, Plus, Settings } from 'lucide-react';

export default function VaccinationProtocols() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user?.role === 'vet' || user?.role === 'superadmin';

  const [protocols, setProtocols] = useState<VaccinationProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await vaccinationApi.getProtocols();
      setProtocols(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load protocols');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleArchive = async (protocol: VaccinationProtocol) => {
    if (!window.confirm(`Archive "${protocol.name}"? Existing enrollments keep their history.`)) {
      return;
    }
    try {
      setArchivingId(protocol.id);
      await vaccinationApi.archiveProtocol(protocol.id);
      setProtocols((prev) =>
        prev.map((p) => (p.id === protocol.id ? { ...p, isActive: false } : p)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive protocol');
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink">Vaccination Protocols</h1>
          <p className="text-sm text-ink-secondary mt-1">
            Configure dose schedules per disease and species, then enroll animals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/vaccinations')}
            className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-bg"
          >
            Back
          </button>
          {canManage && (
            <button
              onClick={() => navigate('/vaccinations/protocols/new')}
              className="flex items-center gap-2 px-4 py-2 bg-brand text-on-brand rounded-lg hover:bg-brand-hover"
            >
              <Plus size={16} /> Create Protocol
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-clay-bg border border-clay-border rounded-lg">
          <p className="text-sm text-clay-text">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader size={28} className="text-brand animate-spin" />
        </div>
      ) : protocols.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center space-y-3">
          <Settings size={28} className="mx-auto text-ink-secondary" />
          <p className="text-ink-secondary text-sm">
            No protocols yet. Create one to start tracking vaccination schedules.
          </p>
          {canManage && (
            <button
              onClick={() => navigate('/vaccinations/protocols/new')}
              className="px-4 py-2 bg-brand text-on-brand rounded-lg hover:bg-brand-hover text-sm"
            >
              Create the first protocol
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {protocols.map((protocol) => (
            <div
              key={protocol.id}
              className="p-6 bg-card border border-border rounded-xl hover:border-brand/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-ink">{protocol.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        protocol.isActive
                          ? 'bg-brand-bg text-brand-text'
                          : 'bg-muted-bg text-muted-text'
                      }`}
                    >
                      {protocol.isActive ? 'Active' : 'Archived'}
                    </span>
                  </div>
                  <p className="text-sm text-ink-secondary mt-1">
                    {protocol.species.name} • {protocol.disease.name} •{' '}
                    {protocol.doses.length} dose{protocol.doses.length === 1 ? '' : 's'}
                    {protocol.zone ? ` • ${protocol.zone.name}` : ' • All zones'}
                  </p>
                  {protocol.description && (
                    <p className="text-sm text-ink-secondary mt-2">{protocol.description}</p>
                  )}
                  <p className="text-sm text-ink-secondary mt-2">
                    {protocol._count?.animalEnrollments || 0} animals enrolled
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/vaccinations/protocols/${protocol.id}`)}
                    className="p-2 text-ink-secondary hover:text-ink rounded-lg hover:bg-bg"
                    title="View"
                  >
                    <Eye size={18} />
                  </button>
                  {canManage && (
                    <>
                      <button
                        onClick={() => navigate(`/vaccinations/protocols/${protocol.id}/edit`)}
                        className="p-2 text-ink-secondary hover:text-ink rounded-lg hover:bg-bg"
                        title="Edit"
                      >
                        <Edit size={18} />
                      </button>
                      {protocol.isActive && (
                        <button
                          onClick={() => handleArchive(protocol)}
                          disabled={archivingId === protocol.id}
                          className="p-2 text-ink-secondary hover:text-clay-text rounded-lg hover:bg-bg disabled:opacity-50"
                          title="Archive"
                        >
                          <Archive size={18} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Dose Timeline */}
              <div className="mt-4 flex items-center gap-2 overflow-x-auto">
                {protocol.doses.map((dose, index) => (
                  <div key={dose.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-brand text-on-brand flex items-center justify-center text-xs font-bold">
                        {dose.doseNumber}
                      </div>
                      <p className="text-xs text-ink-secondary mt-1 whitespace-nowrap">
                        {dose.daysFromPrevious === 0 ? 'Day 0' : `+${dose.daysFromPrevious}d`}
                        {dose.isRecurring && ' ↻'}
                      </p>
                    </div>
                    {index < protocol.doses.length - 1 && (
                      <div className="w-16 h-px bg-border mx-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
