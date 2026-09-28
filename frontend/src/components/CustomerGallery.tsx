import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft, Download, Share2, Heart, Play, Film, Image as ImageIcon,
  X, ChevronLeft, ChevronRight, Sparkles, Calendar, MapPin,
  Maximize2, ZoomIn, ZoomOut, AlertCircle, QrCode, RefreshCw
} from 'lucide-react';
import {
  getLocalEventByToken, getLocalEventByCode, getEventMedia,
  toggleMediaFavorite, getGalleryUrl, type LocalEvent, type EventMedia
} from '../utils/eventStorage';

interface Props {
  token: string;
  onBack?: () => void;
  onOpenScanner?: () => void;
}

export const CustomerGallery: React.FC<Props> = ({ token, onBack, onOpenScanner }) => {
  const [event, setEvent] = useState<LocalEvent | null>(null);
  const [media, setMedia] = useState<EventMedia[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'photos' | 'videos' | 'favorites'>('all');
  const [selectedAlbum, setSelectedAlbum] = useState<string>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [videoModalItem, setVideoModalItem] = useState<EventMedia | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load event and its media
  const loadData = useCallback(() => {
    setLoading(true);
    let evt = getLocalEventByToken(token);
    if (!evt) {
      evt = getLocalEventByCode(token);
    }
    setEvent(evt);

    if (evt) {
      const items = getEventMedia(evt.token);
      setMedia(items);
    } else {
      setMedia([]);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Extract unique album names
  const albums = useMemo(() => {
    const set = new Set<string>();
    media.forEach(m => {
      if (m.album && m.album !== 'Photos' && m.album !== 'Videos') {
        set.add(m.album);
      }
    });
    return Array.from(set);
  }, [media]);

  // Filter media based on tab, album, and search query
  const filteredMedia = useMemo(() => {
    return media.filter(item => {
      if (activeTab === 'photos' && item.type !== 'photo') return false;
      if (activeTab === 'videos' && item.type !== 'video') return false;
      if (activeTab === 'favorites' && !item.isFavorite) return false;
      if (selectedAlbum !== 'all' && item.album !== selectedAlbum) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches = item.title.toLowerCase().includes(q) ||
          item.album.toLowerCase().includes(q) ||
          (item.capturedAt && item.capturedAt.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [media, activeTab, selectedAlbum, searchQuery]);

  const photosOnly = useMemo(() => filteredMedia.filter(m => m.type === 'photo'), [filteredMedia]);

  // Toggle favorite status
  const handleToggleFavorite = (e: React.MouseEvent, item: EventMedia) => {
    e.stopPropagation();
    if (!event) return;
    const isFav = toggleMediaFavorite(event.token, item.id);
    setMedia(prev => prev.map(m => m.id === item.id ? { ...m, isFavorite: isFav } : m));
    showToast(isFav ? 'Added to favorites ❤️' : 'Removed from favorites');
  };

  // Download media item
  const handleDownload = (e: React.MouseEvent | null, item: EventMedia) => {
    if (e) e.stopPropagation();
    if (!event?.allowDownload && !item.allowDownload) {
      showToast('Downloads are disabled by the photographer');
      return;
    }

    const a = document.createElement('a');
    a.href = item.src;
    a.download = `${item.title || 'media'}.${item.type === 'video' ? 'mp4' : 'jpg'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Downloading ${item.title}...`);
  };

  // Share gallery link
  const handleShareGallery = async () => {
    if (!event) return;
    const url = getGalleryUrl(event.token);
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.eventName,
          text: `View photos & videos from ${event.eventName}`,
          url: url,
        });
      } catch {
        // Share dismissed
      }
    } else {
      navigator.clipboard.writeText(url);
      showToast('Gallery link copied to clipboard!');
    }
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex !== null) {
        if (e.key === 'Escape') setLightboxIndex(null);
        if (e.key === 'ArrowRight') navigateLightbox(1);
        if (e.key === 'ArrowLeft') navigateLightbox(-1);
      }
      if (videoModalItem && e.key === 'Escape') {
        setVideoModalItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, videoModalItem, photosOnly.length]);

  const navigateLightbox = (step: number) => {
    if (lightboxIndex === null || photosOnly.length === 0) return;
    setZoomLevel(1);
    const next = (lightboxIndex + step + photosOnly.length) % photosOnly.length;
    setLightboxIndex(next);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#08090c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e2b855' }}>
        <RefreshCw size={36} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  // Not Found State
  if (!event) {
    return (
      <div style={{ minHeight: '100vh', background: '#08090c', color: '#f8fafc', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '440px', width: '100%', textAlign: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(226,184,85,0.2)', borderRadius: '24px', padding: '36px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', color: '#f87171' }}>
            <AlertCircle size={32} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>Private Gallery Not Found</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '24px' }}>
            The QR code or token <code style={{ color: '#e2b855', background: 'rgba(226,184,85,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{token.slice(0, 16)}...</code> does not correspond to an active event.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {onOpenScanner && (
              <button
                onClick={onOpenScanner}
                style={{ padding: '12px 20px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #e2b855, #b88628)', color: '#08090c', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <QrCode size={16} /> Scan Another QR Code
              </button>
            )}
            {onBack && (
              <button
                onClick={onBack}
                style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
              >
                Return to Home
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentPhoto = lightboxIndex !== null ? photosOnly[lightboxIndex] : null;

  return (
    <div style={{ minHeight: '100vh', background: '#08090c', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .gallery-grid { perspective: 1000px; }
        .gallery-card { transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease; transform-style: preserve-3d; }
        .gallery-card:hover { transform: translateY(-10px) rotateX(5deg) rotateY(-5deg) scale(1.05); box-shadow: -10px 20px 40px rgba(0,0,0,0.7), inset 0 0 15px rgba(226,184,85,0.2); }
        .gallery-card:hover .card-overlay { opacity: 1; transform: translateZ(30px); }
        .card-overlay { opacity: 0; transition: opacity 0.3s ease, transform 0.3s ease; transform: translateZ(0); }
        @media (max-width: 640px) {
          .card-overlay { opacity: 1 !important; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%) !important; transform: none !important; }
          .gallery-card:hover { transform: translateY(-5px); }
        }
      `}</style>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: 'rgba(18, 22, 31, 0.95)',
          border: '1px solid rgba(226, 184, 85, 0.4)',
          borderRadius: '14px',
          padding: '12px 24px',
          color: '#f8fafc',
          backdropFilter: 'blur(12px)',
          fontSize: '0.9rem',
          fontWeight: 600,
          boxShadow: '0 10px 40px rgba(0,0,0,0.7)',
          animation: 'fadeIn 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Sparkles size={16} color="#e2b855" />
          {toastMessage}
        </div>
      )}

      {/* Top Mobile-First Navigation Bar */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(8, 9, 12, 0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '12px 20px',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {onBack && (
              <button
                onClick={onBack}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '7px 12px',
                  color: '#e2e8f0',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <ArrowLeft size={15} /> Back
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: '1.15rem',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.02em',
              }}>
                Photo<span style={{ color: '#e2b855' }}>Vault</span>
              </span>
              <span style={{
                background: 'rgba(226, 184, 85, 0.12)',
                color: '#e2b855',
                border: '1px solid rgba(226, 184, 85, 0.3)',
                borderRadius: '999px',
                padding: '2px 8px',
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}>
                Private Access
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onOpenScanner && (
              <button
                onClick={onOpenScanner}
                title="Scan QR Code"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(226, 184, 85, 0.1)',
                  border: '1px solid rgba(226, 184, 85, 0.3)',
                  borderRadius: '10px',
                  padding: '7px 14px',
                  color: '#e2b855',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <QrCode size={14} /> Scan
              </button>
            )}
            <button
              onClick={handleShareGallery}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #e2b855, #b88628)',
                border: 'none',
                borderRadius: '10px',
                padding: '7px 16px',
                color: '#08090c',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Share2 size={14} /> Share
            </button>
          </div>
        </div>
      </nav>

      {/* Event Header Banner */}
      <header style={{
        padding: '36px 20px 24px',
        maxWidth: '1280px',
        margin: '0 auto',
      }}>
        <div style={{
          background: 'linear-gradient(145deg, rgba(226,184,85,0.08) 0%, rgba(255,255,255,0.02) 100%)',
          border: '1px solid rgba(226, 184, 85, 0.25)',
          borderRadius: '24px',
          padding: '32px 28px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        }}>
          {/* Subtle gold glow in corner */}
          <div style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '180px',
            height: '180px',
            background: 'radial-gradient(circle, rgba(226,184,85,0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(226,184,85,0.15)', border: '1px solid rgba(226,184,85,0.3)', borderRadius: '999px', padding: '3px 12px', fontSize: '0.72rem', fontWeight: 700, color: '#e2b855', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
            <Sparkles size={11} /> {event.eventType || 'Event'} Gallery
          </div>

          <h1 style={{
            fontSize: 'clamp(1.7rem, 4vw, 2.8rem)',
            fontWeight: 800,
            fontFamily: 'Outfit, sans-serif',
            letterSpacing: '-0.03em',
            margin: '0 0 10px 0',
            lineHeight: 1.15,
            color: '#ffffff',
          }}>
            {event.eventName}
          </h1>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            color: '#94a3b8',
            fontSize: '0.9rem',
            flexWrap: 'wrap',
            marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} color="#e2b855" />
              <span>{event.eventDate}</span>
            </div>
            {event.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={15} color="#e2b855" />
                <span>{event.location}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>👤 {event.customerName}</span>
            </div>
          </div>

          {/* Quick counts & permissions badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ImageIcon size={14} /> {media.filter(m => m.type === 'photo').length} Photos
              </span>
              <span style={{ fontSize: '0.82rem', color: '#c084fc', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Film size={14} /> {media.filter(m => m.type === 'video').length} Videos
              </span>
              <span style={{ fontSize: '0.78rem', color: event.allowDownload ? '#34d399' : '#94a3b8', background: event.allowDownload ? 'rgba(52, 211, 153, 0.1)' : 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '6px', border: `1px solid ${event.allowDownload ? 'rgba(52, 211, 153, 0.25)' : 'rgba(255,255,255,0.08)'}` }}>
                {event.allowDownload ? '✓ High-Res Downloads Enabled' : 'View Only Mode'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleShareGallery}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px',
                  padding: '8px 14px',
                  color: '#e2e8f0',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Share2 size={14} /> Share Link
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs & Filtering Bar */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 20px 20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: '16px',
        }}>
          {/* Main Media Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: `All (${media.length})`, icon: Sparkles },
              { id: 'photos', label: `Photos (${media.filter(m => m.type === 'photo').length})`, icon: ImageIcon },
              { id: 'videos', label: `Videos (${media.filter(m => m.type === 'video').length})`, icon: Film },
              { id: 'favorites', label: `Favorites (${media.filter(m => m.isFavorite).length})`, icon: Heart },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id as typeof activeTab); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    border: isActive ? '1px solid #e2b855' : '1px solid rgba(255,255,255,0.08)',
                    background: isActive ? 'rgba(226,184,85,0.15)' : 'rgba(255,255,255,0.02)',
                    color: isActive ? '#e2b855' : '#94a3b8',
                    fontSize: '0.85rem',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <Icon size={14} color={isActive ? '#e2b855' : '#94a3b8'} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Album filter if multiple albums exist */}
          {albums.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Album:</span>
              <select
                value={selectedAlbum}
                onChange={e => setSelectedAlbum(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  color: '#f8fafc',
                  fontSize: '0.82rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all" style={{ background: '#12151c' }}>All Albums</option>
                {albums.map(alb => (
                  <option key={alb} value={alb} style={{ background: '#12151c' }}>{alb}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </section>

      {/* Media Grid Section */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 20px 60px' }}>
        {filteredMedia.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 24px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '24px',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
          }}>
            <div style={{ fontSize: '42px', marginBottom: '12px' }}>📷</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>No media items in this view</div>
            <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '380px', margin: '0 auto 20px' }}>
              {activeTab === 'favorites'
                ? 'Tap the heart icon on any photo or video to add it to your favorites.'
                : 'The photographer has not uploaded media for this section yet.'}
            </p>
            {activeTab !== 'all' && (
              <button
                onClick={() => { setActiveTab('all'); setSelectedAlbum('all'); }}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: '1px solid rgba(226,184,85,0.4)',
                  background: 'rgba(226,184,85,0.12)',
                  color: '#e2b855',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                View All Media
              </button>
            )}
          </div>
        ) : (
          <div className="gallery-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}>
            {filteredMedia.map(item => {
              const isVideo = item.type === 'video';

              return (
                <div
                  key={item.id}
                  className="gallery-card"
                  onClick={() => {
                    if (isVideo) {
                      setVideoModalItem(item);
                    } else {
                      const pIdx = photosOnly.findIndex(p => p.id === item.id);
                      setLightboxIndex(pIdx >= 0 ? pIdx : 0);
                    }
                  }}
                  style={{
                    position: 'relative',
                    aspectRatio: '4/3',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: '#13161f',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                  }}
                >
                  {/* Media Item */}
                  {isVideo ? (
                    <video
                      src={item.src}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      muted
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={item.src}
                      alt={item.title}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}

                  {/* Top Badges: Type & Favorite */}
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    right: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    zIndex: 2,
                    pointerEvents: 'none',
                  }}>
                    {isVideo ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        border: '1px solid rgba(192, 132, 252, 0.4)',
                        color: '#c084fc',
                        borderRadius: '999px',
                        padding: '3px 8px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        backdropFilter: 'blur(6px)',
                      }}>
                        <Film size={10} /> VIDEO
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(15, 23, 42, 0.75)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#f8fafc',
                        borderRadius: '999px',
                        padding: '3px 8px',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        backdropFilter: 'blur(6px)',
                      }}>
                        {item.album || 'Photo'}
                      </span>
                    )}

                    {/* Favorite Heart Button */}
                    <button
                      onClick={e => handleToggleFavorite(e, item)}
                      title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      style={{
                        pointerEvents: 'auto',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: item.isFavorite ? '#ef4444' : 'rgba(0, 0, 0, 0.55)',
                        border: item.isFavorite ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        backdropFilter: 'blur(6px)',
                        transition: 'transform 0.2s',
                      }}
                    >
                      <Heart size={15} fill={item.isFavorite ? '#ffffff' : 'none'} />
                    </button>
                  </div>

                  {/* Play Icon Overlay for Videos */}
                  {isVideo && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '54px',
                      height: '54px',
                      borderRadius: '50%',
                      background: 'rgba(8, 9, 12, 0.8)',
                      border: '2px solid rgba(226, 184, 85, 0.8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#e2b855',
                      boxShadow: '0 0 25px rgba(226, 184, 85, 0.4)',
                      zIndex: 2,
                    }}>
                      <Play size={22} style={{ marginLeft: '3px' }} fill="#e2b855" />
                    </div>
                  )}

                  {/* Bottom Hover/Touch Overlay */}
                  <div
                    className="card-overlay"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(8,9,12,0.92) 0%, rgba(8,9,12,0.3) 50%, transparent 100%)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      padding: '16px',
                      zIndex: 3,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                          {item.capturedAt || event.eventDate}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {event.allowDownload && (
                          <button
                            onClick={e => handleDownload(e, item)}
                            title="Download item"
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: 'rgba(255,255,255,0.12)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Download size={14} />
                          </button>
                        )}
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'rgba(226,184,85,0.2)',
                            border: '1px solid rgba(226,184,85,0.4)',
                            color: '#e2b855',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Maximize2 size={14} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* FULLSCREEN PHOTO LIGHTBOX VIEWER */}
      {currentPhoto && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 6, 8, 0.96)',
          backdropFilter: 'blur(16px)',
          zIndex: 3000,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          {/* Lightbox Top Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            zIndex: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => setLightboxIndex(null)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                }}
              >
                <X size={18} />
              </button>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{currentPhoto.title}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Photo {lightboxIndex! + 1} of {photosOnly.length} • {currentPhoto.album || 'Gallery'}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Zoom controls */}
              <button
                onClick={() => setZoomLevel(z => Math.min(z + 0.3, 2.5))}
                title="Zoom in"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  padding: '7px',
                  display: 'flex',
                }}
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={() => setZoomLevel(z => Math.max(z - 0.3, 1))}
                title="Zoom out"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  padding: '7px',
                  display: 'flex',
                }}
              >
                <ZoomOut size={16} />
              </button>

              {/* Toggle Favorite */}
              <button
                onClick={e => handleToggleFavorite(e, currentPhoto)}
                style={{
                  background: currentPhoto.isFavorite ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.06)',
                  border: currentPhoto.isFavorite ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  color: currentPhoto.isFavorite ? '#ef4444' : '#f8fafc',
                  cursor: 'pointer',
                  padding: '7px',
                  display: 'flex',
                }}
              >
                <Heart size={16} fill={currentPhoto.isFavorite ? '#ef4444' : 'none'} />
              </button>

              {/* Download */}
              {event.allowDownload && (
                <button
                  onClick={e => handleDownload(e, currentPhoto)}
                  title="Download Photo"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'linear-gradient(135deg, #e2b855, #b88628)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#08090c',
                    cursor: 'pointer',
                    padding: '7px 14px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}
                >
                  <Download size={14} /> Download
                </button>
              )}
            </div>
          </div>

          {/* Lightbox Center Image & Nav buttons */}
          <div style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            padding: '16px',
          }}>
            {/* Prev button */}
            {photosOnly.length > 1 && (
              <button
                onClick={() => navigateLightbox(-1)}
                style={{
                  position: 'absolute',
                  left: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 20,
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {/* Photo with zoom transform */}
            <img
              src={currentPhoto.src}
              alt={currentPhoto.title}
              style={{
                maxWidth: '92%',
                maxHeight: '82vh',
                objectFit: 'contain',
                borderRadius: '8px',
                transform: `scale(${zoomLevel})`,
                transition: 'transform 0.2s ease',
                boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
              }}
            />

            {/* Next button */}
            {photosOnly.length > 1 && (
              <button
                onClick={() => navigateLightbox(1)}
                style={{
                  position: 'absolute',
                  right: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 20,
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>

          {/* Bottom Thumbnail Strip */}
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            overflowX: 'auto',
          }}>
            {photosOnly.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => { setZoomLevel(1); setLightboxIndex(idx); }}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: idx === lightboxIndex ? '2px solid #e2b855' : '1px solid rgba(255,255,255,0.1)',
                  padding: 0,
                  background: '#000',
                  cursor: 'pointer',
                  opacity: idx === lightboxIndex ? 1 : 0.5,
                  flexShrink: 0,
                }}
              >
                <img src={p.src} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* FULLSCREEN VIDEO PLAYER MODAL */}
      {videoModalItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 6, 8, 0.96)',
          backdropFilter: 'blur(16px)',
          zIndex: 3000,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
        }}>
          {/* Header */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            right: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(192, 132, 252, 0.15)',
                border: '1px solid rgba(192, 132, 252, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#c084fc',
              }}>
                <Film size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#ffffff' }}>{videoModalItem.title}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Event Video • {videoModalItem.album || 'Highlights'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {event.allowDownload && (
                <button
                  onClick={() => handleDownload(null, videoModalItem)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #e2b855, #b88628)',
                    color: '#08090c',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Download size={14} /> Download Video
                </button>
              )}
              <button
                onClick={() => setVideoModalItem(null)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* HTML5 Video Player Container */}
          <div style={{
            width: '100%',
            maxWidth: '900px',
            maxHeight: '75vh',
            borderRadius: '18px',
            overflow: 'hidden',
            boxShadow: '0 25px 80px rgba(0,0,0,0.85)',
            background: '#000000',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <video
              src={videoModalItem.src}
              controls
              autoPlay
              style={{
                width: '100%',
                maxHeight: '75vh',
                display: 'block',
                outline: 'none',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
