import { useCallback, useEffect, useRef, useState } from 'react';

export interface GeoFix {
  lat: number;
  lng: number;
  /** Radius in metres, as reported by the device. */
  accuracy: number;
  at: number;
}

export type GeoStatus =
  | 'locating'
  | 'ready'
  | 'denied'
  | 'unavailable'
  | 'unsupported'
  | 'insecure';

/** Above this the fix is usable but worth flagging (indoors, wifi-only, etc). */
export const WEAK_ACCURACY_M = 100;

/**
 * Watches the device position for as long as the component is mounted, so the
 * fix saved with a record reflects where the person is when they tap Save —
 * not where they were when the form opened.
 */
export function useLiveLocation() {
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [status, setStatus] = useState<GeoStatus>('locating');
  const [attempt, setAttempt] = useState(0);
  const fixRef = useRef<GeoFix | null>(null);

  useEffect(() => {
    if (!window.isSecureContext) {
      setStatus('insecure');
      return;
    }
    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const next: GeoFix = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          at: Date.now(),
        };
        const prev = fixRef.current;
        // Ignore a much rougher reading that arrives right after a good one
        if (prev && next.accuracy > prev.accuracy * 2 && next.at - prev.at < 20_000) return;
        fixRef.current = next;
        setFix(next);
        setStatus('ready');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          fixRef.current = null;
          setFix(null);
          setStatus('denied');
        } else if (!fixRef.current) {
          // Timeouts don't stop the watch — a later fix still flips this to ready
          setStatus('unavailable');
        }
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [attempt]);

  const retry = useCallback(() => {
    setStatus('locating');
    setAttempt((a) => a + 1);
  }, []);

  return { fix, status, retry };
}

export const mapHref = (fix: { lat: number; lng: number }) =>
  `https://www.openstreetmap.org/?mlat=${fix.lat}&mlon=${fix.lng}#map=17/${fix.lat}/${fix.lng}`;
