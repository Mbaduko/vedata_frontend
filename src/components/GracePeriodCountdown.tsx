import { useState, useEffect } from 'react';
import { Clock, Lock } from 'lucide-react';

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
}

export default function GracePeriodCountdown({ editableUntil }: { editableUntil: string | null }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    if (!editableUntil) return;

    const update = () => {
      const diff = new Date(editableUntil).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft(null); return; }
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ hours, minutes, seconds });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [editableUntil]);

  if (!editableUntil) return null;

  if (!timeLeft) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary bg-bg px-2 py-1 rounded-full">
        <Lock size={12} /> Record locked
      </span>
    );
  }

  const isUrgent = timeLeft.hours === 0 && timeLeft.minutes < 30;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${isUrgent ? 'bg-gold-bg text-gold-text' : 'bg-brand-bg text-brand-text'}`}>
      <Clock size={12} />
      {timeLeft.hours > 0 && `${timeLeft.hours}h `}
      {timeLeft.minutes}m {timeLeft.seconds}s remaining
    </span>
  );
}
