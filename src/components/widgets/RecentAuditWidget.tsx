import { useData } from '../../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';

export default function RecentAuditWidget() {
  const { auditLog, users } = useData();
  const navigate = useNavigate();
  const recent = [...auditLog].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8);
  const getUserName = (userId: string) => users.find(u => u.id === userId)?.name ?? 'Unknown';

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display font-semibold text-ink">Recent Activity</h2>
        <button onClick={() => navigate('/audit-log')} className="text-xs text-brand hover:text-brand/80 font-medium flex items-center gap-1">View full log <ArrowRight size={12} /></button>
      </div>
      <div className="space-y-3">
        {recent.map(entry => (
          <div key={entry.id} className="flex items-start gap-3 py-2 border-b border-border last:border-b-0">
            <Clock size={14} className="text-ink-secondary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink"><span className="font-medium">{getUserName(entry.userId)}</span> <span className="text-ink-secondary">{entry.action.replace(/\./g, ' ').replace(/_/g, ' ')}</span></p>
              <p className="text-xs text-ink-secondary mt-0.5">{new Date(entry.timestamp).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
