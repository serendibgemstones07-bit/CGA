import { useEffect, useCallback, useState } from 'react';
import { X, ChevronLeft, ChevronRight, RotateCw, RotateCcw, Save, Loader2 } from 'lucide-react';

interface LightboxProps {
  url: string;
  alt?: string;
  mediaType?: 'image' | 'video' | 'certificate' | 'receipt';
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  onRotateSave?: (rotation: number) => Promise<void>;
}

export function Lightbox({ url, alt, mediaType, onClose, onPrev, onNext, hasPrev, hasNext, onRotateSave }: LightboxProps) {
  const [rotation, setRotation] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft' && hasPrev && onPrev) onPrev();
    if (e.key === 'ArrowRight' && hasNext && onNext) onNext();
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [handleKey]);

  useEffect(() => {
    setRotation(0);
  }, [url]);

  const isVideo = mediaType === 'video';
  const isImage = !isVideo;
  const hasRotation = rotation % 360 !== 0;

  async function handleSaveRotation() {
    if (!onRotateSave || !hasRotation) return;
    setSaving(true);
    try {
      await onRotateSave(rotation % 360);
      setRotation(0);
      onClose();
    } catch {
      alert('Failed to save rotation. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {isImage && onRotateSave && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); setRotation(r => r - 90); }}
            className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            title="Rotate left"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setRotation(r => r + 90); }}
            className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            title="Rotate right"
          >
            <RotateCw className="w-5 h-5" />
          </button>
          {hasRotation && (
            <button
              onClick={e => { e.stopPropagation(); handleSaveRotation(); }}
              disabled={saving}
              className="ml-2 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors"
              style={{ background: 'linear-gradient(135deg, #c9a84c, #b87714)', color: '#0a0e18' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save Rotation'}
            </button>
          )}
        </div>
      )}

      {hasPrev && onPrev && (
        <button
          onClick={e => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {hasNext && onNext && (
        <button
          onClick={e => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {isVideo ? (
          <video
            src={url}
            controls
            autoPlay
            className="max-w-[90vw] max-h-[90vh] rounded-lg"
          />
        ) : (
          <img
            src={url}
            alt={alt ?? ''}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg transition-transform duration-300"
            style={{ transform: `rotate(${rotation}deg)` }}
          />
        )}
      </div>
    </div>
  );
}

export async function rotateAndUpload(
  imageUrl: string,
  storagePath: string,
  degrees: number,
  supabase: any
): Promise<string> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const isPortraitSwap = degrees === 90 || degrees === 270 || degrees === -90 || degrees === -270;

  canvas.width = isPortraitSwap ? img.height : img.width;
  canvas.height = isPortraitSwap ? img.width : img.height;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas to blob failed')), 'image/jpeg', 0.92);
  });

  const { error } = await supabase.storage
    .from('gemstone-media')
    .update(storagePath, blob, { contentType: 'image/jpeg', upsert: true });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('gemstone-media')
    .getPublicUrl(storagePath);

  return publicUrl + '?t=' + Date.now();
}
