import { useData } from '../../context/DataContext';
import GracePeriodCountdown from '../GracePeriodCountdown';
import { FileText } from 'lucide-react';

interface Entry {
  id: string;
  type: 'animal' | 'vaccination';
  date: string;
  tagNumber?: string;
  editableUntil: string | null;
}

export default function RecentEntriesWidget() {
  const { currentUser, animals, vaccinations } = useData();

  const myEntries: Entry[] = [
    ...animals.filter(a => a.enteredByUserId === currentUser?.id).map(a => ({ id: a.id, type: 'animal' as const, date: a.registeredAt, tagNumber: a.tagNumber, editableUntil: a.editableUntil })),
    ...vaccinations.filter(v => v.administeredByUserId === currentUser?.id).map(v => ({ id: v.id, type: 'vaccination' as const, date: v.dateAdministered, editableUntil: v.editableUntil })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="text-lg font-display font-semibold text-ink mb-4">Recent Entries</h2>
      {myEntries.length === 0 ? (
        <p className="text-sm text-ink-secondary py-4 text-center">No entries yet</p>
      ) : (
        <div className="space-y-2">
          {myEntries.map(entry => (
            <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-bg">
              <div className="flex items-center gap-3">
                <FileText size={14} className="text-ink-secondary" />
                <div>
                  <p className="text-sm font-medium text-ink">{entry.type === 'animal' ? `Registered ${entry.tagNumber}` : `Vaccination ${entry.id}`}</p>
                  <p className="text-xs text-ink-secondary">{new Date(entry.date).toLocaleDateString()}</p>
                </div>
              </div>
              {entry.editableUntil && <GracePeriodCountdown editableUntil={entry.editableUntil} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
