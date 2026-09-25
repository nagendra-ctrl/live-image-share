import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, RotateCcw, Check, RefreshCw, AlertCircle, SwitchCamera, Upload } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  eventName?: string;
  onClose: () => void;
  onPhotoCaptured: (imageDataUrl: string, album: string, title: string) => void;
}

const ALBUM_OPTIONS = ['Wedding', 'Ceremony', 'Reception', 'Couple', 'Highlights', 'Details'];

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  eventName = 'Wedding Celebration',
  onClose,
  onPhotoCaptured,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<string>('Wedding');
  const [photoTitle, setPhotoTitle] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileFallbackInputRef = useRef<HTMLInputElement>(null);

  // Initialize or re-initialize camera stream
  const startCamera = async (mode: 'environment' | 'user') => {
    stopCamera();
    setError(null);
    setPermissionDenied(false);
    setIsInitializing(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera API is not supported on this browser or connection. Please use the device file picker fallback.');
      setIsInitializing(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setError('Camera permission was denied. Please allow camera permissions in your browser address bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera device was detected on your computer or mobile device.');
      } else {
        // Try fallback with basic constraints
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          setStream(fallbackStream);
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            await videoRef.current.play().catch(() => {});
          }
          setIsInitializing(false);
          return;
        } catch {
          setError(err.message || 'Could not access camera. Please check device permissions.');
        }
      }
    } finally {
      setIsInitializing(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setPhotoTitle('');
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  // Flip between rear and front camera
  const handleFlipCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // Capture frame from video element
  const handleCapture = () => {
    if (!videoRef.current) return;

    // Trigger visual camera flash
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 150);

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // If front camera, mirror horizontally for natural portrait look
      if (facingMode === 'user') {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  // Discard preview and resume live camera
  const handleRetake = () => {
    setCapturedImage(null);
    startCamera(facingMode);
  };

  // Confirm photo and save
  const handleUsePhoto = () => {
    if (!capturedImage) return;
    const finalTitle = photoTitle.trim() || `Wedding Moment ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    onPhotoCaptured(capturedImage, selectedAlbum, finalTitle);
    onClose();
  };

  // Native device file/camera fallback
  const handleFallbackFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCapturedImage(reader.result);
        stopCamera();
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 2000,
      background: 'rgba(5, 6, 9, 0.95)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      flexDirection: 'column',
      animation: 'cameraFadeIn 0.25s ease-out',
      overflow: 'hidden',
    }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <input
        ref={fileFallbackInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFallbackFile}
        style={{ display: 'none' }}
      />

      {/* Camera Flash Overlay */}
      {isFlashing && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: '#ffffff',
          zIndex: 2010,
          pointerEvents: 'none',
          animation: 'cameraFlash 0.15s ease-out',
        }} />
      )}

      {/* Top Header Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        zIndex: 2005,
        borderBottom: '1px solid rgba(226, 184, 85, 0.15)',
        background: 'rgba(10, 12, 16, 0.8)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #e2b855 0%, #b88628 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#08090c',
            boxShadow: '0 0 12px rgba(226, 184, 85, 0.35)',
          }}>
            <Camera size={18} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{
              fontWeight: 700,
              fontSize: '0.95rem',
              color: '#ffffff',
              letterSpacing: '-0.01em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span>Live Wedding Camera</span>
              <span className="badge badge-gold" style={{ fontSize: '0.62rem', padding: '2px 6px' }}>
                PRO
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '1px' }}>
              {eventName}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!capturedImage && !permissionDenied && (
            <button
              onClick={handleFlipCamera}
              title="Switch Front/Rear Camera"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              <SwitchCamera size={18} />
            </button>
          )}

          <button
            onClick={onClose}
            title="Close Camera"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Viewport: Live Stream or Photo Preview */}
      <div style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#040507',
        overflow: 'hidden',
      }}>
        {/* Permission Denied or Error State */}
        {error && !capturedImage && (
          <div style={{
            maxWidth: '440px',
            margin: '20px',
            padding: '28px 24px',
            background: 'rgba(20, 24, 32, 0.95)',
            border: '1px solid rgba(226, 184, 85, 0.3)',
            borderRadius: '16px',
            textAlign: 'center',
            boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
            zIndex: 10,
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: '#f87171',
            }}>
              <AlertCircle size={28} />
            </div>
            <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '8px', fontWeight: 700 }}>
              Camera Permission Required
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#9ca3af', lineHeight: 1.5, marginBottom: '20px' }}>
              {error}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => startCamera(facingMode)}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <RefreshCw size={15} /> Retry Camera Permission
              </button>
              <button
                onClick={() => fileFallbackInputRef.current?.click()}
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Upload size={15} /> Use Device Camera / File Picker
              </button>
            </div>
          </div>
        )}

        {/* Live Camera Viewfinder */}
        {!capturedImage && !error && (
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                maxHeight: 'calc(100vh - 200px)',
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
              }}
            />

            {/* Viewfinder Golden Brackets (Wedding Camera Style) */}
            <div style={{
              position: 'absolute',
              width: '80%',
              maxWidth: '520px',
              height: '65%',
              maxHeight: '520px',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              {/* Top corners */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '28px', height: '28px', borderTop: '3px solid #e2b855', borderLeft: '3px solid #e2b855', borderTopLeftRadius: '8px' }} />
                <div style={{ width: '28px', height: '28px', borderTop: '3px solid #e2b855', borderRight: '3px solid #e2b855', borderTopRightRadius: '8px' }} />
              </div>
              {/* Center Crosshair / Focus Reticle */}
              <div style={{ alignSelf: 'center', width: '36px', height: '36px', border: '1px dashed rgba(226, 184, 85, 0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '6px', height: '6px', background: '#e2b855', borderRadius: '50%' }} />
              </div>
              {/* Bottom corners */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '28px', height: '28px', borderBottom: '3px solid #e2b855', borderLeft: '3px solid #e2b855', borderBottomLeftRadius: '8px' }} />
                <div style={{ width: '28px', height: '28px', borderBottom: '3px solid #e2b855', borderRight: '3px solid #e2b855', borderBottomRightRadius: '8px' }} />
              </div>
            </div>

            {/* Date & Time Watermark overlay indicator */}
            <div style={{
              position: 'absolute',
              bottom: '16px',
              left: '20px',
              padding: '4px 10px',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(6px)',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: '0.75rem',
              color: '#e2b855',
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}>
              ● LIVE • {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
            </div>
          </div>
        )}

        {/* Captured Photo Preview Screen */}
        {capturedImage && (
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}>
            <div style={{
              position: 'relative',
              maxWidth: '92%',
              maxHeight: 'calc(100vh - 270px)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.9), 0 0 40px rgba(226, 184, 85, 0.2)',
              border: '2px solid rgba(226, 184, 85, 0.4)',
            }}>
              <img
                src={capturedImage}
                alt="Captured Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  maxHeight: 'calc(100vh - 270px)',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(0, 0, 0, 0.7)',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '0.72rem',
                color: '#34d399',
                fontWeight: 700,
                border: '1px solid rgba(52, 211, 153, 0.3)',
              }}>
                ✓ Photo Captured
              </div>
            </div>

            {/* Album Selector & Title Input on Preview */}
            <div style={{
              marginTop: '16px',
              width: '100%',
              maxWidth: '460px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Caption / Memory Title (optional)"
                  value={photoTitle}
                  onChange={(e) => setPhotoTitle(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
                <select
                  value={selectedAlbum}
                  onChange={(e) => setSelectedAlbum(e.target.value)}
                  style={{
                    background: '#1a1d26',
                    border: '1px solid rgba(226, 184, 85, 0.3)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    color: '#e2b855',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {ALBUM_OPTIONS.map(alb => (
                    <option key={alb} value={alb}>{alb}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Shutter / Action Bar */}
      <div style={{
        padding: '20px 24px',
        background: 'rgba(10, 12, 16, 0.95)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        zIndex: 2005,
      }}>
        {!capturedImage ? (
          /* Live Camera Controls */
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <button
              onClick={() => fileFallbackInputRef.current?.click()}
              title="Upload existing image"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <Upload size={20} />
            </button>

            {/* Shutter Button */}
            <button
              id="shutter-button"
              onClick={handleCapture}
              disabled={isInitializing || !!error}
              title="Capture Photo"
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                border: '4px solid #e2b855',
                background: 'rgba(226, 184, 85, 0.2)',
                padding: '4px',
                cursor: isInitializing || !!error ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 24px rgba(226, 184, 85, 0.45)',
                transition: 'transform 0.1s, box-shadow 0.2s',
              }}
              onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.94)'; }}
              onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            >
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #fceda2 0%, #e2b855 50%, #b88628 100%)',
              }} />
            </button>

            <button
              onClick={handleFlipCamera}
              title="Switch camera"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <SwitchCamera size={20} />
            </button>
          </div>
        ) : (
          /* Preview Decisions: Retake vs Use Photo */
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            width: '100%',
            maxWidth: '460px',
          }}>
            <button
              id="retake-photo-button"
              onClick={handleRetake}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '14px 20px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.92rem',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              <RotateCcw size={16} /> Retake
            </button>

            <button
              id="use-photo-button"
              onClick={handleUsePhoto}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '14px 24px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #e2b855 0%, #b88628 100%)',
                color: '#08090c',
                fontWeight: 800,
                fontSize: '0.92rem',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(226, 184, 85, 0.4)',
                transition: 'transform 0.15s, box-shadow 0.2s',
              }}
            >
              <Check size={18} strokeWidth={2.6} /> Use Photo
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes cameraFadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes cameraFlash {
          0% { opacity: 0.9; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};
