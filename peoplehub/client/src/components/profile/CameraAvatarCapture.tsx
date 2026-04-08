import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Camera } from 'lucide-react';

/** Контур при съёмке: документ или ракурс авто */
export type CameraOverlayType =
  | 'document'
  | 'car-front'
  | 'car-rear'
  | 'car-side-left'
  | 'car-side-right'
  | 'car-interior'
  | 'car-seat'
  | 'car-trunk'
  | 'car-extra'
  | null;

interface CameraAvatarCaptureProps {
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
  /** 'user' = front (selfie), 'environment' = back (documents, car) */
  facingMode?: 'user' | 'environment';
  title?: string;
  /** Контур-оверлей: документ или ракурс авто */
  overlay?: CameraOverlayType;
}

/** Camera-only capture. No file input — only live camera. */
export default function CameraAvatarCapture({
  onCapture,
  onCancel,
  facingMode = 'user',
  title = 'Сделайте селфи для аватара',
  overlay = null,
}: CameraAvatarCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    setError(null);
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false,
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch (e: any) {
        if (mounted) {
          setError(e?.message?.includes('Permission') ? 'Разрешите доступ к камере' : 'Не удалось включить камеру');
        }
      }
    })();
    return () => {
      mounted = false;
      stopStream();
    };
  }, [stopStream]);

  function handleCapture() {
    const video = videoRef.current;
    if (!video || !streamRef.current || !ready) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    let resolved = false;
    let fallbackId: ReturnType<typeof setTimeout>;
    const done = (blob: Blob | null) => {
      if (resolved || !blob) return;
      resolved = true;
      clearTimeout(fallbackId);
      stopStream();
      onCapture(blob);
    };

    canvas.toBlob(done, 'image/jpeg', 0.9);
    // На мобильных toBlob иногда не вызывает callback — fallback через toDataURL
    fallbackId = setTimeout(() => {
      if (resolved) return;
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        fetch(dataUrl).then((r) => r.blob()).then(done);
      } catch (_) {}
    }, 1500);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col safe-top safe-bottom">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-white text-sm font-medium">{title}</p>
        <button
          type="button"
          onClick={() => { stopStream(); onCancel(); }}
          className="p-2 rounded-full bg-white/20 text-white"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center min-h-0 relative">
        {error ? (
          <div className="text-center px-6">
            <p className="text-red-400 mb-2">{error}</p>
            <p className="text-white/80 text-sm">Используйте камеру в приложении — загрузка из галереи недоступна.</p>
            <button
              type="button"
              onClick={onCancel}
              className="mt-4 px-4 py-2 bg-white/20 text-white rounded-xl"
            >
              Закрыть
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`max-h-full w-full object-cover ${facingMode === 'user' ? 'mirror' : ''}`}
              style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : undefined}
            />
            {overlay && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={`border-4 border-white/90 rounded-lg bg-black/20 flex items-center justify-center shadow-lg ${
                    overlay === 'document'
                      ? 'w-[72%] max-w-[280px] aspect-[3/4]'
                      : overlay === 'car-front' || overlay === 'car-rear'
                        ? 'w-[85%] max-w-[320px] aspect-[4/3]'
                        : overlay === 'car-side-left' || overlay === 'car-side-right'
                          ? 'w-[90%] max-w-[340px] aspect-[2/1]'
                          : 'w-[80%] max-w-[300px] aspect-square'
                  }`}
                >
                  <span className="text-white/90 text-xs font-medium drop-shadow-md px-2 text-center">
                    {overlay === 'document'
                      ? 'Документ в рамку'
                      : overlay === 'car-front'
                        ? 'Спереди'
                        : overlay === 'car-rear'
                          ? 'Сзади'
                          : overlay === 'car-side-left'
                            ? 'Слева'
                            : overlay === 'car-side-right'
                              ? 'Справа'
                              : overlay === 'car-interior'
                                ? 'Салон'
                                : overlay === 'car-seat'
                                  ? 'Сиденье'
                                  : overlay === 'car-trunk'
                                    ? 'Багажник'
                                    : 'Фото'}
                  </span>
                </div>
              </div>
            )}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center">
              <button
                type="button"
                onClick={handleCapture}
                disabled={!ready}
                className="w-16 h-16 rounded-full bg-white border-4 border-primary-500 flex items-center justify-center shadow-lg disabled:opacity-50"
              >
                <Camera size={28} className="text-primary-500" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
