import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, RefreshCw, Upload, AlertCircle, CheckCircle, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { getLocalEventByCode, getLocalEventByToken } from '../utils/eventStorage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (token: string) => void;
}

export const QrScannerModal: React.FC<Props> = ({ isOpen, onClose, onScanSuccess }) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'qr-camera-stream-container';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Play audio beep on scan success
  const playBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // AudioContext not allowed or not supported
    }
  }, [soundEnabled]);

  // Extract token from QR code payload
  const parseTokenFromPayload = useCallback((rawText: string): string => {
    const text = rawText.trim();

    // 1. Check for standard hash-based gallery URL: #/gallery/<token>
    const hashMatch = text.match(/#\/gallery\/([a-zA-Z0-9_-]+)/i);
    if (hashMatch) return hashMatch[1];

    // 2. Check for path-based gallery URL: /gallery/<token>
    const pathMatch = text.match(/\/gallery\/([a-zA-Z0-9_-]+)/i);
    if (pathMatch) return pathMatch[1];

    // 3. Check if text is a direct 48-char hex token
    if (/^[a-f0-9]{48}$/i.test(text)) {
      return text;
    }

    // 4. Check if text is an event code like WED-2026-8824 or EVT-XXXXXX
    const eventByCode = getLocalEventByCode(text);
    if (eventByCode) {
      return eventByCode.token;
    }

    // 5. If it's a direct token that exists in local storage
    const eventByToken = getLocalEventByToken(text);
    if (eventByToken) {
      return eventByToken.token;
    }

    // Default: return raw text stripped of whitespace
    return text;
  }, []);

  const handleDetectedCode = useCallback((decodedText: string) => {
    if (scannedResult) return; // Prevent double trigger
    playBeep();
    setScannedResult(decodedText);

    const token = parseTokenFromPayload(decodedText);

    // Short delay to show the nice scanned effect before transitioning
    setTimeout(() => {
      onScanSuccess(token);
      onClose();
    }, 600);
  }, [scannedResult, playBeep, parseTokenFromPayload, onScanSuccess, onClose]);

  // Initialize and start scanner
  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    setIsInitializing(true);
    setCameraError(null);

    try {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } else {
        scannerRef.current = new Html5Qrcode(containerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
      }

      await scannerRef.current.start(
        { facingMode: mode },
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edge = Math.floor(minEdge * 0.72);
            return { width: edge, height: edge };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleDetectedCode(decodedText);
        },
        () => {
          // Frame error (normal during scanning frames), suppress
        }
      );

      setIsScanning(true);
      setIsInitializing(false);
    } catch (err: unknown) {
      console.warn('Camera start error:', err);
      setIsInitializing(false);
      setIsScanning(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('NotAllowedError') || errMsg.includes('Permission')) {
        setCameraError('Camera permission was denied. Please allow camera access in your browser settings.');
      } else if (errMsg.includes('NotFoundError') || errMsg.includes('DevicesNotFoundError')) {
        setCameraError('No camera found on this device. You can upload a QR image below.');
      } else {
        setCameraError('Unable to access camera: ' + errMsg + '. Try uploading a QR image.');
      }
    }
  }, [containerId, handleDetectedCode]);

  // Stop scanner
  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  // Effect to manage camera lifecycle when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setScannedResult(null);
      setCameraError(null);
      return;
    }

    // Small delay to ensure container element is mounted in DOM
    const timer = setTimeout(() => {
      startCamera(facingMode);
    }, 150);

    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [isOpen, facingMode, startCamera, stopCamera]);

  // Handle image file upload fallback
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsInitializing(true);
      let html5QrCode = scannerRef.current;
      if (!html5QrCode) {
        html5QrCode = new Html5Qrcode(containerId);
        scannerRef.current = html5QrCode;
      } else if (html5QrCode.isScanning) {
        await html5QrCode.stop();
      }

      const decodedText = await html5QrCode.scanFile(file, true);
      handleDetectedCode(decodedText);
    } catch (err) {
      console.error('File scan error:', err);
      alert('Could not find a valid QR code in this image. Please try another photo or use the live camera.');
      setIsInitializing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 6, 8, 0.88)',
          backdropFilter: 'blur(10px)',
          zIndex: 2500,
          animation: 'qrFadeIn 0.2s ease',
        }}
      />

      <style>{`
        @keyframes qrFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes qrSlideUp { from { transform: translate(-50%, -45%); opacity: 0; } to { transform: translate(-50%, -50%); opacity: 1; } }
        @keyframes scanBeam {
          0% { top: 12%; opacity: 0.8; }
          50% { top: 88%; opacity: 1; }
          100% { top: 12%; opacity: 0.8; }
        }
        @keyframes pulseCorner {
          0%, 100% { border-color: #e2b855; }
          50% { border-color: #ffffff; }
        }
        #qr-camera-stream-container video {
          border-radius: 18px;
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>

      {/* Modal Dialog */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 2501,
          width: '92%',
          maxWidth: '440px',
          background: 'linear-gradient(160deg, #131722 0%, #0a0d14 100%)',
          border: '1px solid rgba(226, 184, 85, 0.35)',
          borderRadius: '24px',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85), 0 0 40px rgba(226, 184, 85, 0.12)',
          overflow: 'hidden',
          color: '#f8fafc',
          fontFamily: 'Inter, sans-serif',
          animation: 'qrSlideUp 0.25s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 22px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #e2b855, #b88628)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#08090c',
              }}
            >
              <Camera size={19} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Scan Event QR <Sparkles size={14} color="#e2b855" />
              </div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Point camera at the event QR code</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setSoundEnabled(p => !p)}
              title={soundEnabled ? 'Mute beep' : 'Enable beep'}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: soundEnabled ? '#e2b855' : '#64748b',
                cursor: 'pointer',
                padding: '7px',
                display: 'flex',
              }}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '7px',
                display: 'flex',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Viewfinder Area */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '340px',
            background: '#000000',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* html5-qrcode video container */}
          <div
            id={containerId}
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
              inset: 0,
            }}
          />

          {/* Initializing / Loading state */}
          {isInitializing && !cameraError && (
            <div
              style={{
                position: 'absolute',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                color: '#e2b855',
              }}
            >
              <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} />
              <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 600 }}>Starting camera...</div>
            </div>
          )}

          {/* Scanner Viewfinder Box Overlay */}
          {isScanning && !scannedResult && (
            <div
              style={{
                position: 'absolute',
                width: '230px',
                height: '230px',
                zIndex: 5,
                pointerEvents: 'none',
              }}
            >
              {/* Corner brackets */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '28px', height: '28px', borderTop: '4px solid #e2b855', borderLeft: '4px solid #e2b855', borderTopLeftRadius: '12px' }} />
              <div style={{ position: 'absolute', top: 0, right: 0, width: '28px', height: '28px', borderTop: '4px solid #e2b855', borderRight: '4px solid #e2b855', borderTopRightRadius: '12px' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '28px', height: '28px', borderBottom: '4px solid #e2b855', borderLeft: '4px solid #e2b855', borderBottomLeftRadius: '12px' }} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '28px', height: '28px', borderBottom: '4px solid #e2b855', borderRight: '4px solid #e2b855', borderBottomRightRadius: '12px' }} />

              {/* Scanning red/gold animated laser beam */}
              <div
                style={{
                  position: 'absolute',
                  left: '6px',
                  right: '6px',
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, #e2b855 50%, transparent)',
                  boxShadow: '0 0 12px #e2b855, 0 0 4px #ffffff',
                  animation: 'scanBeam 2.2s ease-in-out infinite',
                }}
              />
            </div>
          )}

          {/* Scanned Success Feedback Overlay */}
          {scannedResult && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(16, 185, 129, 0.25)',
                backdropFilter: 'blur(4px)',
                zIndex: 20,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                animation: 'qrFadeIn 0.2s ease',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 0 30px rgba(16, 185, 129, 0.6)',
                }}
              >
                <CheckCircle size={36} />
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>QR Code Recognized!</div>
              <div style={{ fontSize: '0.82rem', color: '#d1fae5' }}>Opening private event gallery...</div>
            </div>
          )}

          {/* Camera Error / Permission Fallback */}
          {cameraError && (
            <div
              style={{
                position: 'absolute',
                inset: '20px',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '20px',
                background: 'rgba(15, 23, 42, 0.95)',
                borderRadius: '16px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <AlertCircle size={38} color="#ef4444" style={{ marginBottom: '10px' }} />
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f87171', marginBottom: '6px' }}>Camera Inaccessible</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '16px' }}>
                {cameraError}
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={() => startCamera(facingMode)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(226, 184, 85, 0.4)',
                    background: 'rgba(226, 184, 85, 0.15)',
                    color: '#e2b855',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RefreshCw size={13} /> Retry Camera
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #e2b855, #b88628)',
                    color: '#08090c',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Upload size={13} /> Upload QR Image
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Controls & Fallback upload bar */}
        <div style={{ padding: '16px 20px', background: 'rgba(0, 0, 0, 0.35)', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            {/* Flip camera */}
            <button
              onClick={() => {
                const nextMode = facingMode === 'environment' ? 'user' : 'environment';
                setFacingMode(nextMode);
                startCamera(nextMode);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#e2e8f0',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} /> {facingMode === 'environment' ? 'Flip to Front' : 'Flip to Back'}
            </button>

            {/* Upload QR image button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(226, 184, 85, 0.3)',
                background: 'rgba(226, 184, 85, 0.08)',
                color: '#e2b855',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Upload size={14} /> Upload QR Photo
            </button>
          </div>

          <div style={{ fontSize: '0.74rem', color: '#64748b', textAlign: 'center', marginTop: '12px' }}>
            You can also scan this QR code directly with your device's native Camera app.
          </div>
        </div>
      </div>
    </>
  );
};
