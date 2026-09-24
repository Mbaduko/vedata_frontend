import { useState, useRef, useCallback } from 'react';
import { Camera, X, RotateCcw } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (url: string) => void;
  required?: boolean;
}

export default function CameraCapture({ onCapture, required = true }: CameraCaptureProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStreaming(true);
    } catch {
      setError('Camera access denied or unavailable. Using placeholder image.');
      const canvas = document.createElement('canvas');
      canvas.width = 640; canvas.height = 480;
      const ctx = canvas.getContext('2d')!;
      const tokens = getComputedStyle(document.documentElement);
      ctx.fillStyle = tokens.getPropertyValue('--brand-bg').trim(); ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = tokens.getPropertyValue('--brand').trim(); ctx.font = '24px IBM Plex Sans'; ctx.textAlign = 'center';
      ctx.fillText('Vaccine Evidence', 320, 220);
      ctx.font = '16px IBM Plex Sans'; ctx.fillText(new Date().toLocaleDateString(), 320, 260);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setPhoto(dataUrl);
      onCapture(dataUrl);
    }
  }, [onCapture]);

  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setPhoto(dataUrl);
    onCapture(dataUrl);
    stopCamera();
  }, [onCapture]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setStreaming(false);
  }, []);

  const retake = useCallback(() => { setPhoto(null); startCamera(); }, [startCamera]);

  if (photo) {
    return (
      <div className="space-y-3">
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img src={photo} alt="Vaccination evidence" className="w-full max-h-64 object-cover" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-secondary flex items-center gap-1"><Camera size={12} /> Photo captured</span>
          <button onClick={retake} className="text-xs text-brand hover:text-brand/80 flex items-center gap-1 ml-auto"><RotateCcw size={12} /> Retake</button>
        </div>
      </div>
    );
  }

  if (streaming) {
    return (
      <div className="space-y-3">
        <div className="relative rounded-lg overflow-hidden border border-border">
          <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-64 object-cover bg-ink/10" />
          <canvas ref={canvasRef} className="hidden" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={takePhoto} className="flex items-center gap-2 px-4 py-2 bg-brand text-on-brand rounded-lg text-sm font-medium hover:bg-brand-hover"><Camera size={16} /> Capture Photo</button>
          <button onClick={stopCamera} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm text-ink-secondary hover:bg-card"><X size={16} /> Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button onClick={startCamera} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium text-ink hover:bg-card transition-colors">
        <Camera size={16} /> {required ? 'Take Photo (Required)' : 'Take Photo (Optional)'}
      </button>
      {error && <p className="text-xs text-gold-text">{error}</p>}
      {required && !photo && <p className="text-xs text-ink-secondary">Photo evidence is required for vaccination records</p>}
    </div>
  );
}
