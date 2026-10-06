import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  vaccinationApi,
  animalApi,
  type VaccinationProtocol,
  type AnimalVaccinationEnrollment,
  type Animal,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import DataTable from '../components/DataTable';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Edit,
  Loader,
  Plus,
  Search,
  X,
} from 'lucide-react';

const statusChip: Record<string, string> = {
  active: 'bg-brand-bg text-brand-text',
  completed: 'bg-sky-bg text-sky-text',
  discontinued: 'bg-clay-bg text-clay-text',
};

export default function VaccinationProtocolDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user?.role === 'vet' || user?.role === 'superadmin';

  const [protocol, setProtocol] = useState<VaccinationProtocol | null>(null);
  const [enrollments, setEnrollments] = useState<AnimalVaccinationEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Enroll animal box
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Animal[]>([]);
  const [searching, setSearching] = useState(false);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  // Discontinue modal
  const [discontinuing, setDiscontinuing] = useState<AnimalVaccinationEnrollment | null>(null);
  const [reason, setReason] = useState('');
  const [savingReason, setSavingReason] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [protocolData, enrollmentData] = await Promise.all([
        vaccinationApi.getProtocol(id),
        vaccinationApi.getEnrollments({ protocolId: id }),
      ]);
      setProtocol(protocolData);
      setEnrollments(enrollmentData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load protocol');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Debounced animal search for enrollment
  useEffect(() => {
    const term = search.trim();
    if (term.length < 3) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const data = await animalApi.getAnimals({ search: term, limit: 5 });
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Success/error auto-dismiss
  useEffect(() => {
    if (!success) return;
    const timeout = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(timeout);
  }, [success]);

  const enrolledAnimalIds = useMemo(
    () => new Set(enrollments.map((e) => e.animalId)),
    [enrollments],
  );

  const handleEnroll = async (animal: Animal) => {
    if (!id) return;
    try {
      setEnrollingId(animal.id);
      setError(null);
      const enrollment = await vaccinationApi.enrollAnimal({
        animalId: animal.id,
        protocolId: id,
      });
      setEnrollments((prev) => [enrollment, ...prev]);
      setResults((prev) => prev.filter((a) => a.id !== animal.id));
      setSearch('');
      setSuccess(`${animal.tagNumber} enrolled in ${protocol?.name ?? 'the protocol'}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll animal');
    } finally {
      setEnrollingId(null);
    }
  };

  const handleDiscontinue = async () => {
    if (!discontinuing || !reason.trim()) return;
    try {
      setSavingReason(true);
      const updated = await vaccinationApi.discontinueEnrollment(discontinuing.id, {
        reason: reason.trim(),
      });
      setEnrollments((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      setDiscontinuing(null);
      setReason('');
      setSuccess('Enrollment discontinued.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to discontinue enrollment');
    } finally {
      setSavingReason(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader size={32} className="text-brand animate-spin" />
      </div>
    );
  }

  if (!protocol) {
    return (
      <div className="max-w-7xl mx-auto space-y-4">
        <p className="text-sm text-clay-text">{error ?? 'Protocol not found.'}</p>
        <button
          onClick={() => navigate('/vaccinations/protocols')}
          className="flex items-center gap-2 text-sm text-brand hover:text-brand-hover"
        >
          <ArrowLeft size={16} /> Back to protocols
        </button>
      </div>
    );
  }

  const totalDoses = protocol.doses.filter((d) => !d.isRecurring).length;

  const columns = [
    {
      header: 'Animal',
      accessor: 'animal',
      render: (row: AnimalVaccinationEnrollment) => (
        <div>
          <p className="font-medium text-ink">{row.animal?.tagNumber}</p>
          <p className="text-xs text-ink-secondary">{row.animal?.species.name}</p>
        </div>
      ),
    },
    {
      header: 'Owner',
      accessor: 'animal.owner',
      render: (row: AnimalVaccinationEnrollment) => (
        <div>
          <p className="text-sm text-ink">{row.animal?.owner.name}</p>
          <p className="text-xs text-ink-secondary">{row.animal?.owner.phone}</p>
        </div>
      ),
    },
    {
      header: 'Dose',
      accessor: 'currentDose',
      render: (row: AnimalVaccinationEnrollment) => {
        const dose = row.currentDose;
        if (dose === 0) return <span className="text-ink-secondary">Not started</span>;
        return (
          <span className="tabular-nums">
            {dose > totalDoses ? `Booster #${dose - totalDoses}` : `${dose}/${totalDoses}`}
          </span>
        );
      },
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row: AnimalVaccinationEnrollment) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs capitalize ${
            statusChip[row.status] ?? 'bg-muted-bg text-muted-text'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: 'Last Dose',
      accessor: 'vaccinations',
      render: (row: AnimalVaccinationEnrollment) => {
        const last = row.vaccinations?.[0];
        return last ? (
          <span className="text-sm">{new Date(last.dateAdministered).toLocaleDateString()}</span>
        ) : (
          <span className="text-ink-secondary">—</span>
        );
      },
    },
    {
      header: 'Enrolled',
      accessor: 'enrolledAt',
      render: (row: AnimalVaccinationEnrollment) => (
        <span className="text-sm">{new Date(row.enrolledAt).toLocaleDateString()}</span>
      ),
    },
    {
      header: '',
      accessor: 'id',
      align: 'right' as const,
      render: (row: AnimalVaccinationEnrollment) =>
        canManage && row.status === 'active' ? (
          <button
            onClick={() => {
              setDiscontinuing(row);
              setReason('');
              setError(null);
            }}
            className="px-3 py-1 border border-border text-sm rounded-lg hover:bg-bg text-ink-secondary"
          >
            Discontinue
          </button>
        ) : null,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/vaccinations/protocols')}
            className="flex items-center gap-2 text-sm text-ink-secondary hover:text-ink mb-2"
          >
            <ArrowLeft size={16} /> All protocols
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-display font-semibold text-ink">{protocol.name}</h1>
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
            {protocol.zone ? protocol.zone.name : 'All zones'} • Created by{' '}
            {protocol.createdBy.name}
          </p>
          {protocol.description && (
            <p className="text-sm text-ink-secondary mt-2">{protocol.description}</p>
          )}
        </div>
        {canManage && (
          <button
            onClick={() => navigate(`/vaccinations/protocols/${protocol.id}/edit`)}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-bg"
          >
            <Edit size={16} /> Edit
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-clay-bg border border-clay-border rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-clay-text mt-0.5 shrink-0" />
            <p className="text-sm text-clay-text">{error}</p>
          </div>
        </div>
      )}
      {success && (
        <div className="p-3 bg-brand-bg border border-brand-border rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle size={16} className="text-brand-text mt-0.5 shrink-0" />
            <p className="text-sm text-brand-text">{success}</p>
          </div>
        </div>
      )}

      {/* Doses */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-ink mb-4">Dose Schedule</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {protocol.doses.map((dose) => (
            <div key={dose.id} className="p-4 bg-bg border border-border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-full bg-brand text-on-brand flex items-center justify-center text-xs font-bold">
                  {dose.doseNumber}
                </span>
                <span className="text-xs text-ink-secondary">
                  {dose.daysFromPrevious === 0 ? 'Day 0' : `+${dose.daysFromPrevious} days`}
                </span>
              </div>
              {dose.isRecurring && (
                <p className="text-xs text-brand-text mt-2">
                  Repeats every {dose.recurringIntervalDays} days (booster)
                </p>
              )}
              <ul className="mt-3 space-y-1">
                {dose.allowedVaccines.map((av) => (
                  <li key={av.vaccineId} className="text-sm text-ink">
                    {av.vaccine.name}
                    {av.vaccine.manufacturer ? (
                      <span className="text-ink-secondary"> — {av.vaccine.manufacturer}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Enroll animal */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Enroll an Animal</h2>
          <p className="text-sm text-ink-secondary">
            Search by tag number, owner name or NID — only {protocol.species.name}s can join this
            protocol.
          </p>
        </div>
        <div className="relative">
          <Search
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Enter at least 3 characters..."
            className="w-full pl-10 pr-4 py-2 bg-bg border border-border rounded-lg text-sm"
          />
        </div>

        {searching && (
          <div className="flex items-center gap-2 text-sm text-ink-secondary">
            <Loader size={16} className="animate-spin" />
            Searching...
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((animal) => {
              const speciesMatches = animal.speciesId === protocol.speciesId;
              const alreadyEnrolled = enrolledAnimalIds.has(animal.id);
              const disabled = !speciesMatches || alreadyEnrolled;
              return (
                <div
                  key={animal.id}
                  className="flex items-center justify-between gap-3 p-3 border border-border rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{animal.tagNumber}</p>
                    <p className="text-xs text-ink-secondary">
                      {animal.species?.name} • {animal.owner?.name}
                      {!speciesMatches && ' • wrong species for this protocol'}
                      {alreadyEnrolled && ' • already enrolled'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleEnroll(animal)}
                    disabled={disabled || enrollingId === animal.id}
                    className="flex items-center gap-1.5 px-3 py-1 bg-brand text-on-brand text-sm rounded-lg hover:bg-brand-hover disabled:opacity-50"
                  >
                    {enrollingId === animal.id ? (
                      <Loader size={14} className="animate-spin" />
                    ) : (
                      <Plus size={14} />
                    )}
                    Enroll
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Enrolled animals */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">
            Enrolled Animals ({enrollments.length})
          </h2>
        </div>
        <DataTable
          columns={columns}
          data={enrollments}
          emptyMessage="No animals enrolled in this protocol yet"
        />
      </div>

      {/* Discontinue modal */}
      {discontinuing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full mx-4 p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold font-display">Discontinue Enrollment</h3>
              <button
                onClick={() => setDiscontinuing(null)}
                className="p-1 hover:bg-bg rounded-lg"
              >
                <X size={18} className="text-ink-secondary" />
              </button>
            </div>
            <p className="text-sm text-ink-secondary mb-4">
              Stop tracking{' '}
              <span className="font-medium text-ink">
                {discontinuing.animal?.tagNumber}
              </span>{' '}
              on this protocol. Recorded doses stay in history, but it will leave the due list.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Reason (required) — e.g. owner declined, animal relocated..."
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm mb-6"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDiscontinuing(null)}
                className="px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-bg rounded-lg border border-border"
              >
                Cancel
              </button>
              <button
                onClick={handleDiscontinue}
                disabled={!reason.trim() || savingReason}
                className="px-4 py-2 text-sm font-medium bg-clay-bg text-clay-text rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {savingReason ? 'Discontinuing...' : 'Discontinue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
