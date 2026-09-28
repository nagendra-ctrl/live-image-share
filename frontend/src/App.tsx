import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Smartphone,
  QrCode,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { fetchHealthStatus } from './services/api';
import type { HealthResponse } from './types';
import { CustomerVerificationView } from './components/CustomerVerificationView';
import { PhotographerStudio } from './components/PhotographerStudio';
import { CustomerGallery } from './components/CustomerGallery';
import { QrScannerModal } from './components/QrScannerModal';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [selectedEventCode] = useState<string>('WED-2026-8824');
  const [showScannerModal, setShowScannerModal] = useState<boolean>(false);

  // Hash-based routing for #/gallery/<token>
  const getHashToken = (): string | null => {
    const hash = window.location.hash;
    const match = hash.match(/^#\/gallery\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const [galleryToken, setGalleryToken] = useState<string | null>(getHashToken);
  const [viewMode, setViewMode] = useState<'customer-verification' | 'photographer-studio'>('customer-verification');

  // Sync hash changes (e.g. from camera scan, back/forward button, links)
  useEffect(() => {
    const onHashChange = () => {
      const token = getHashToken();
      setGalleryToken(token);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const checkHealth = async () => {
    try {
      const data = await fetchHealthStatus();
      setHealth(data);
    } catch {
      setHealth(null);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleScanSuccess = (token: string) => {
    window.location.hash = `#/gallery/${token}`;
    setGalleryToken(token);
    setShowScannerModal(false);
  };

  // If URL points to an event gallery token, show customer gallery
  if (galleryToken) {
    return (
      <>
        <CustomerGallery
          token={galleryToken}
          onBack={() => {
            window.location.hash = '';
            setGalleryToken(null);
          }}
          onOpenScanner={() => setShowScannerModal(true)}
        />
        <QrScannerModal
          isOpen={showScannerModal}
          onClose={() => setShowScannerModal(false)}
          onScanSuccess={handleScanSuccess}
        />
      </>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0c10', color: '#f8fafc' }}>
      {/* Universal Top Switcher Bar */}
      <header style={{
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(10, 12, 16, 0.95)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '10px 0',
      }}>
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #1e2535 0%, #0c0f17 100%)',
              border: '1px solid rgba(245, 190, 79, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-gold)',
              boxShadow: '0 0 18px rgba(245, 190, 79, 0.25), inset 0 0 10px rgba(0,0,0,0.8)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'radial-gradient(circle at center, rgba(245, 190, 79, 0.2) 0%, transparent 70%)',
              }} />
              <Camera size={22} strokeWidth={2.2} style={{ position: 'relative', zIndex: 1 }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.3rem',
                  fontWeight: 900,
                  letterSpacing: '-0.03em',
                  color: '#ffffff',
                }}>
                  Photo<span style={{ color: 'var(--accent-gold)' }}>Vault</span>
                </span>
                <span className="badge badge-gold" style={{ fontSize: '0.62rem', padding: '2px 8px' }}>
                  F/1.4 PRO
                </span>
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                color: 'var(--text-muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                Precision Optics • Live Image Share
              </div>
            </div>
          </div>

          {/* Navigation Controls: Customer View, Scan QR Code, Photographer Studio */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.04)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            gap: '6px',
            flexWrap: 'wrap',
          }}>
            <button
              id="nav-customer-screen"
              onClick={() => setViewMode('customer-verification')}
              className={`btn ${viewMode === 'customer-verification' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '7px 14px', fontSize: '0.82rem', borderRadius: '8px' }}
            >
              <Smartphone size={14} /> Customer Screen
            </button>

            <button
              id="nav-scan-qr-btn"
              onClick={() => setShowScannerModal(true)}
              className="btn btn-secondary"
              style={{
                padding: '7px 15px',
                fontSize: '0.82rem',
                borderRadius: '8px',
                background: 'rgba(226, 184, 85, 0.12)',
                color: '#e2b855',
                border: '1px solid rgba(226, 184, 85, 0.35)',
                fontWeight: 700,
              }}
            >
              <QrCode size={14} /> Scan QR Code
            </button>

            <button
              id="nav-photographer-studio"
              onClick={() => setViewMode('photographer-studio')}
              className={`btn ${viewMode === 'photographer-studio' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '7px 14px', fontSize: '0.82rem', borderRadius: '8px' }}
            >
              <Camera size={14} /> Photographer Studio
            </button>
          </div>

          {/* Server Connection Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              background: health ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${health ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            }}>
              <span className="pulse-dot" style={{
                backgroundColor: health ? 'var(--accent-emerald)' : '#ef4444',
                boxShadow: `0 0 8px ${health ? 'var(--accent-emerald)' : '#ef4444'}`,
                width: '6px',
                height: '6px',
              }} />
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: health ? '#34d399' : '#f87171' }}>
                {health ? 'Server Connected' : 'Local Vault Mode'}
              </span>
            </div>
            <button 
              onClick={checkHealth}
              title="Refresh connection"
              className="btn btn-secondary"
              style={{ padding: '6px', borderRadius: '50%' }}
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </div>
      </header>

      {/* Main View Router */}
      {viewMode === 'customer-verification' ? (
        <CustomerVerificationView 
          onBackToOverview={() => setViewMode('photographer-studio')}
          initialAccessCode={selectedEventCode}
          onOpenScanner={() => setShowScannerModal(true)}
        />
      ) : (
        <PhotographerStudio
          onViewGallery={(token) => {
            window.location.hash = `#/gallery/${token}`;
            setGalleryToken(token);
          }}
        />
      )}

      {/* Global QR Code Camera Scanner Modal */}
      <QrScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* Clean Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        background: '#07080a',
        padding: '16px 0',
        marginTop: 'auto',
      }}>
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.825rem',
          color: 'var(--text-muted)',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div>PhotoVault • WedGallery Private Event Photo & Video Delivery</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={13} color="var(--accent-gold)" />
            <span>Secure 48-char Token Encrypted QR Access</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
