import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ChevronLeft, 
  Lock, 
  ArrowRight, 
  QrCode, 
  Heart, 
  Download, 
  X, 
  Maximize2, 
  Smartphone, 
  Upload, 
  Camera, 
  Trash2, 
  Calendar,
  Search,
  Edit3,
  CheckSquare,
  Square,
  Sparkles
} from 'lucide-react';
import { fetchEvents, fetchEventByCode } from '../services/api';
import type { StoredPhoto } from '../utils/photoStorage';
import { 
  getEventPhotos, 
  saveEventPhoto, 
  deleteEventPhoto, 
  toggleEventPhotoFavorite,
  updateEventPhoto
} from '../utils/photoStorage';
import { getLocalEvents } from '../utils/eventStorage';
import { CameraCaptureModal } from './CameraCaptureModal';
import type { PhotoVaultEvent } from '../types';

interface CustomerVerificationProps {
  onBackToOverview?: () => void;
  initialAccessCode?: string;
  onOpenScanner?: () => void;
}

export const CustomerVerificationView: React.FC<CustomerVerificationProps> = ({ 
  onBackToOverview,
  initialAccessCode = 'WED-2026-8824',
  onOpenScanner
}) => {
  const [galleryCode, setGalleryCode] = useState<string>(initialAccessCode);
  const [inGallery, setInGallery] = useState<boolean>(false);
  const [activeAlbum, setActiveAlbum] = useState<string>('All Photos');
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [pastedLink, setPastedLink] = useState<string>('');
  const [activePhoto, setActivePhoto] = useState<StoredPhoto | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(true);
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isEditingEnabled, setIsEditingEnabled] = useState<boolean>(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [editingPhoto, setEditingPhoto] = useState<StoredPhoto | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editAlbum, setEditAlbum] = useState<string>('');
  const [eventDetails, setEventDetails] = useState<PhotoVaultEvent | null>(null);

  // Home search state
  const [homeSearchQuery, setHomeSearchQuery] = useState<string>('');
  const [homeSearchResults, setHomeSearchResults] = useState<PhotoVaultEvent[]>([]);
  const [homeSearchLoading, setHomeSearchLoading] = useState<boolean>(false);
  const [homeSearchFocused, setHomeSearchFocused] = useState<boolean>(false);
  const homeSearchRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load photos for active event
  const [photos, setPhotos] = useState<StoredPhoto[]>(() => {
    return getEventPhotos(initialAccessCode);
  });

  const triggerNotify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 2800);
  };

  // Toggle photo selection for batch deletion
  const toggleSelectPhoto = (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPhotoIds(prev => 
      prev.includes(photoId) ? prev.filter(id => id !== photoId) : [...prev, photoId]
    );
  };

  // Batch delete selected photos
  const handleBatchDelete = () => {
    if (selectedPhotoIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedPhotoIds.length} selected photos? This cannot be undone.`)) return;
    selectedPhotoIds.forEach(id => {
      deleteEventPhoto(galleryCode, id);
    });
    setPhotos(prev => prev.filter(p => !selectedPhotoIds.includes(p.id)));
    setSelectedPhotoIds([]);
    triggerNotify(`Deleted ${selectedPhotoIds.length} photos.`);
  };

  // Open edit modal for a photo
  const startEditingPhoto = (photo: StoredPhoto, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingPhoto(photo);
    setEditTitle(photo.title);
    setEditAlbum(photo.album || 'Wedding');
  };

  // Save edited photo
  const savePhotoEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoto) return;
    const updatedTitle = editTitle.trim() || editingPhoto.title;
    const updatedAlbum = editAlbum.trim() || editingPhoto.album;
    updateEventPhoto(galleryCode, editingPhoto.id, {
      title: updatedTitle,
      album: updatedAlbum,
    });
    setPhotos(prev => prev.map(p => p.id === editingPhoto.id ? { ...p, title: updatedTitle, album: updatedAlbum } : p));
    if (activePhoto?.id === editingPhoto.id) {
      setActivePhoto({ ...activePhoto, title: updatedTitle, album: updatedAlbum });
    }
    setEditingPhoto(null);
    triggerNotify('Photo details updated!');
  };

  // Load photos and event metadata specifically for the active event
  const loadCurrentEventData = (code: string) => {
    if (!code) return;
    const currentPhotos = getEventPhotos(code);
    setPhotos(currentPhotos);

    // Look up local event first
    const local = getLocalEvents().find(le => le.accessCode.toUpperCase() === code.trim().toUpperCase() || le.token === code.trim());
    if (local) {
      setEventDetails({
        id: local.token,
        eventName: local.eventName,
        customerName: local.customerName,
        accessCode: local.accessCode,
        eventType: local.eventType as any,
        eventDate: local.eventDate,
        location: local.location,
        coverImage: local.coverImage,
      } as unknown as PhotoVaultEvent);
    }

    fetchEventByCode(code)
      .then(data => {
        if (data) setEventDetails(data);
      })
      .catch(() => {
        // Keep local if already set
      });
  };

  useEffect(() => {
    if (galleryCode) {
      loadCurrentEventData(galleryCode);
    }
  }, [galleryCode]);

  // Home search: fetch and filter events on query change
  const performHomeSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      // Show default available events on empty focus
      const localEvents = getLocalEvents().map(le => ({
        id: le.token,
        eventName: le.eventName,
        customerName: le.customerName,
        accessCode: le.accessCode,
        eventType: le.eventType as any,
        eventDate: le.eventDate,
        location: le.location,
        coverImage: le.coverImage,
      })) as unknown as PhotoVaultEvent[];
      setHomeSearchResults(localEvents);
      return;
    }
    setHomeSearchLoading(true);
    try {
      const localEvents = getLocalEvents().map(le => ({
        id: le.token,
        eventName: le.eventName,
        customerName: le.customerName,
        accessCode: le.accessCode,
        eventType: le.eventType as any,
        eventDate: le.eventDate,
        location: le.location,
        coverImage: le.coverImage,
      })) as unknown as PhotoVaultEvent[];

      let remoteEvents: PhotoVaultEvent[] = [];
      try {
        remoteEvents = await fetchEvents();
      } catch {
        remoteEvents = [];
      }

      const eventMap = new Map<string, PhotoVaultEvent>();
      [...localEvents, ...remoteEvents].forEach(ev => {
        if (ev && ev.accessCode) {
          eventMap.set(ev.accessCode.toUpperCase(), ev);
        }
      });

      const all = Array.from(eventMap.values());
      const lower = q.toLowerCase().trim();
      const filtered = all.filter(ev =>
        ev.eventName?.toLowerCase().includes(lower) ||
        ev.accessCode?.toLowerCase().includes(lower) ||
        ev.customerName?.toLowerCase().includes(lower) ||
        ev.location?.toLowerCase().includes(lower) ||
        ev.eventType?.toLowerCase().includes(lower)
      );
      setHomeSearchResults(filtered);
    } catch {
      setHomeSearchResults([]);
    } finally {
      setHomeSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performHomeSearch(homeSearchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [homeSearchQuery, performHomeSearch]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (homeSearchRef.current && !homeSearchRef.current.contains(e.target as Node)) {
        setHomeSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Handle Photo Captured by Real Device Camera
  const handleCameraPhotoCaptured = (imageDataUrl: string) => {
    const now = new Date();
    const formattedDateTime = now.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }) + ' ' + now.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const saved = saveEventPhoto(galleryCode, {
      src: imageDataUrl,
      title: `Live Shot ${photos.length + 1}`,
      album: activeAlbum === 'All Photos' ? 'Wedding' : activeAlbum,
      capturedAt: formattedDateTime,
      isFavorite: false,
    });
    setPhotos(prev => [saved, ...prev.filter(p => p.id !== saved.id)]);
    triggerNotify('📷 Photo captured and saved to event gallery!');
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const now = new Date();
          const formattedDateTime = now.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }) + ' ' + now.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit'
          });

          const saved = saveEventPhoto(galleryCode, {
            src: reader.result,
            title: file.name.replace(/\.[^/.]+$/, ''),
            album: activeAlbum === 'All Photos' ? 'Wedding' : activeAlbum,
            capturedAt: formattedDateTime,
            isFavorite: false,
          });

          setPhotos(prev => [saved, ...prev.filter(p => p.id !== saved.id)]);
        }
      };
      reader.readAsDataURL(file);
    });

    triggerNotify(`Added ${files.length} photo${files.length > 1 ? 's' : ''} to event gallery!`);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenGallery = () => {
    if (!galleryCode.trim()) {
      triggerNotify('Please enter a valid gallery code');
      return;
    }
    loadCurrentEventData(galleryCode);
    setInGallery(true);
    triggerNotify(`Welcome! Opened gallery: ${galleryCode.toUpperCase()}`);
  };

  const toggleFavorite = (photoId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isNowFav = toggleEventPhotoFavorite(galleryCode, photoId);
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, isFavorite: isNowFav } : p));
    if (activePhoto && activePhoto.id === photoId) {
      setActivePhoto(prev => prev ? { ...prev, isFavorite: isNowFav } : null);
    }
    triggerNotify(isNowFav ? 'Added to favorites ❤️' : 'Removed from favorites');
  };

  const handleDownloadPhoto = (photo: StoredPhoto) => {
    const a = document.createElement('a');
    a.href = photo.src;
    const cleanTitle = (photo.title || 'photo').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${cleanTitle}_${galleryCode}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    triggerNotify('Photo downloaded successfully!');
  };

  const handleDeletePhoto = (photoId: string) => {
    if (window.confirm('Are you sure you want to delete this photo from this event gallery?')) {
      deleteEventPhoto(galleryCode, photoId);
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      setActivePhoto(null);
      triggerNotify('Photo deleted from event gallery.');
    }
  };

  const filteredPhotos = photos.filter(p => {
    const matchesAlbum = activeAlbum === 'All Photos' || p.album.toLowerCase() === activeAlbum.toLowerCase();
    if (!matchesAlbum) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.title.toLowerCase().includes(q) ||
      p.album.toLowerCase().includes(q) ||
      (p.capturedAt && p.capturedAt.toLowerCase().includes(q))
    );
  });

  const favoriteCount = photos.filter(p => p.isFavorite).length;
  const baseUrl = import.meta.env.BASE_URL || '/';
  const heroLensImage = `${baseUrl}camera_lens_hero.jpg`;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(245, 190, 79, 0.08) 0%, #040508 70%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: isMobileFrame ? '24px 16px 48px 16px' : '0',
      fontFamily: 'Inter, -apple-system, sans-serif',
      color: '#f8fafc',
    }}>
      {/* Viewport & Device Controls Bar */}
      <div style={{
        width: '100%',
        maxWidth: isMobileFrame ? '440px' : '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        marginBottom: isMobileFrame ? '16px' : '0',
        background: 'rgba(14, 18, 28, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: isMobileFrame ? '16px' : '0',
        border: '1px solid rgba(245, 190, 79, 0.25)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
        color: '#f8fafc',
        fontSize: '0.825rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onBackToOverview && (
            <button 
              onClick={onBackToOverview} 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px', color: 'var(--accent-gold)', borderColor: 'rgba(245,190,79,0.3)' }}
            >
              ← Studio Mode
            </button>
          )}
          {inGallery && (
            <button 
              onClick={() => setInGallery(false)} 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px' }}
            >
              ← Verification
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={() => setIsMobileFrame(!isMobileFrame)}
            className="btn btn-secondary"
            style={{ 
              padding: '6px 14px', 
              fontSize: '0.75rem', 
              borderRadius: '8px', 
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: '#ffffff',
            }}
            title="Toggle Smartphone Frame vs Full Width"
          >
            {isMobileFrame ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Maximize2 size={13} /> Full Width
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Smartphone size={13} /> Mobile Mockup
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Container / Smartphone Shell */}
      <div style={{
        width: '100%',
        maxWidth: isMobileFrame ? '440px' : '100%',
        background: 'linear-gradient(180deg, #090c12 0%, #05070a 100%)',
        borderRadius: isMobileFrame ? '44px' : '0',
        boxShadow: isMobileFrame ? '0 30px 80px -15px rgba(0, 0, 0, 0.95), 0 0 0 10px #141720, 0 0 40px rgba(245, 190, 79, 0.15)' : 'none',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minHeight: isMobileFrame ? '844px' : '100vh',
        color: '#f8fafc',
        border: isMobileFrame ? '2px solid rgba(245, 190, 79, 0.35)' : 'none',
      }}>

        {/* Speaker notch (in mobile mockup mode) */}
        {isMobileFrame && (
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '110px',
            height: '24px',
            background: '#000000',
            borderRadius: '20px',
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ width: '45px', height: '4px', background: '#333', borderRadius: '2px' }} />
            <div style={{ width: '8px', height: '8px', background: '#222', borderRadius: '50%', marginLeft: '8px', border: '1px solid rgba(56,189,248,0.4)' }} />
          </div>
        )}

        {/* Notification Toast */}
        {notification && (
          <div style={{
            position: 'absolute',
            top: isMobileFrame ? '40px' : '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(18, 24, 38, 0.95)',
            border: '1px solid rgba(245, 190, 79, 0.5)',
            color: '#fde089',
            padding: '8px 20px',
            borderRadius: '999px',
            fontSize: '0.82rem',
            fontWeight: 700,
            boxShadow: '0 10px 30px rgba(0,0,0,0.8), 0 0 20px rgba(245, 190, 79, 0.25)',
            zIndex: 100,
            animation: 'fadeIn 0.2s ease',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Sparkles size={14} color="#f5be4f" /> {notification}
          </div>
        )}

        {/* SCREEN 1: VERIFICATION SCREEN (OBSIDIAN NOIR CAMERA LENS THEME) */}
        {!inGallery ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            paddingTop: isMobileFrame ? '38px' : '16px',
            paddingBottom: '32px',
          }}>
            {/* Top Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <button 
                onClick={onBackToOverview} 
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  padding: '6px',
                  color: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Back"
              >
                <ChevronLeft size={20} strokeWidth={2.4} />
              </button>

              {/* Center Logo & Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f5be4f 0%, #d49a2a 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#050608',
                  boxShadow: '0 0 10px rgba(245,190,79,0.4)',
                }}>
                  <Camera size={14} strokeWidth={2.4} />
                </div>
                <span style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: '1.12rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                }}>
                  Photo<span style={{ color: 'var(--accent-gold)' }}>Vault</span> Pass
                </span>
              </div>

              {/* Viewfinder Badge */}
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                color: 'var(--accent-gold)',
                background: 'rgba(245,190,79,0.12)',
                border: '1px solid rgba(245,190,79,0.3)',
                padding: '3px 8px',
                borderRadius: '999px',
                fontWeight: 700,
              }}>
                F1.4 PRO
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>

              {/* Hero Camera Lens Card with HUD Viewfinder Overlay */}
              <div style={{
                position: 'relative',
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '0 16px 40px -10px rgba(0,0,0,0.9), 0 0 30px rgba(245, 190, 79, 0.15)',
                aspectRatio: '16/10',
                background: '#000000',
                border: '1px solid rgba(245, 190, 79, 0.35)',
              }}>
                <img 
                  src={heroLensImage} 
                  alt="Cinematic Camera Lens Aperture" 
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                  onError={(e) => { (e.target as HTMLImageElement).src = '/wedding_couple_hero.jpg'; }}
                />

                {/* Camera HUD Grid Overlay */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(5,7,10,0.95) 0%, rgba(5,7,10,0.3) 50%, rgba(5,7,10,0.4) 100%)',
                  pointerEvents: 'none',
                }} />

                {/* Viewfinder Reticle in Center */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '60px',
                  height: '60px',
                  border: '1px solid rgba(245, 190, 79, 0.35)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  <div style={{ width: '4px', height: '4px', background: 'var(--accent-gold)', borderRadius: '50%' }} />
                </div>

                {/* Floating Optics Keepsake Badge */}
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  background: 'rgba(10, 14, 22, 0.88)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                  border: '1px solid rgba(245, 190, 79, 0.4)',
                }}>
                  <Sparkles size={12} color="var(--accent-gold)" />
                  <span style={{
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#fde089',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    Precision Optics • Keepsake
                  </span>
                </div>

                {/* Camera Specs Tag */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(0,0,0,0.65)',
                  backdropFilter: 'blur(8px)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.62rem',
                  color: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  50mm · f/1.4 · ISO 100
                </div>
              </div>

              {/* Welcome Header */}
              <div style={{ textAlign: 'center', marginTop: '22px', marginBottom: '18px' }}>
                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'var(--accent-gold)',
                  marginBottom: '8px',
                  fontFamily: 'var(--font-mono)',
                }}>
                  Private Gallery Vault
                </div>
                <h2 style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  lineHeight: 1.15,
                  letterSpacing: '-0.03em',
                  marginBottom: '8px',
                }}>
                  Your memories,<br />
                  <span style={{ color: 'var(--accent-gold)' }}>crystal clear.</span>
                </h2>
                <p style={{
                  color: '#94a3b8',
                  fontSize: '0.88rem',
                  lineHeight: 1.45,
                  maxWidth: '320px',
                  margin: '0 auto',
                }}>
                  Enter your private code or scan your QR ticket to unlock high-res moments.
                </p>
              </div>

              {/* Event Search Bar */}
              <div ref={homeSearchRef} style={{ position: 'relative', marginBottom: '14px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: homeSearchFocused ? 'rgba(18, 24, 38, 0.95)' : 'rgba(12, 16, 26, 0.8)',
                  borderRadius: '12px',
                  padding: '11px 14px',
                  border: homeSearchFocused ? '1.5px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: homeSearchFocused ? '0 0 0 3px rgba(245,190,79,0.2)' : 'none',
                  transition: 'all 0.2s',
                }}>
                  {homeSearchLoading ? (
                    <div style={{
                      width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.2)',
                      borderTopColor: 'var(--accent-gold)', borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite', flexShrink: 0,
                    }} />
                  ) : (
                    <Search size={16} color={homeSearchFocused ? '#f5be4f' : '#64748b'} style={{ flexShrink: 0 }} />
                  )}
                  <input
                    id="home-event-search"
                    type="text"
                    value={homeSearchQuery}
                    onChange={e => setHomeSearchQuery(e.target.value)}
                    onFocus={() => setHomeSearchFocused(true)}
                    placeholder="Search event by name or code…"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      fontSize: '0.88rem',
                      fontWeight: 500,
                      color: '#f8fafc',
                      width: '100%',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  />
                  {homeSearchQuery && (
                    <button
                      onClick={() => { setHomeSearchQuery(''); setHomeSearchResults([]); }}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px', display: 'flex', flexShrink: 0 }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Search Dropdown Results */}
                {homeSearchFocused && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    right: 0,
                    background: '#0d111a',
                    borderRadius: '14px',
                    border: '1px solid rgba(245,190,79,0.35)',
                    boxShadow: '0 16px 40px rgba(0,0,0,0.9)',
                    zIndex: 50,
                    overflow: 'hidden',
                    animation: 'fadeIn 0.15s ease',
                  }}>
                    {homeSearchResults.length === 0 && !homeSearchLoading ? (
                      <div style={{
                        padding: '16px',
                        textAlign: 'center',
                        color: '#64748b',
                        fontSize: '0.82rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        <Search size={18} color="#475569" />
                        <span>No events found for &ldquo;{homeSearchQuery}&rdquo;</span>
                      </div>
                    ) : (
                      homeSearchResults.slice(0, 6).map(ev => (
                        <div
                          key={ev.id}
                          onClick={() => {
                            const code = ev.accessCode || '';
                            setGalleryCode(code);
                            loadCurrentEventData(code);
                            setInGallery(true);
                            setHomeSearchQuery('');
                            setHomeSearchResults([]);
                            setHomeSearchFocused(false);
                            triggerNotify(`Unlocked: ${ev.eventName || code}`);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 14px',
                            cursor: 'pointer',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            transition: 'background 0.15s',
                          }}
                          onMouseOver={e => (e.currentTarget.style.background = 'rgba(245,190,79,0.12)')}
                          onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '9px',
                            background: 'rgba(245,190,79,0.15)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', color: 'var(--accent-gold)', flexShrink: 0,
                            border: '1px solid rgba(245,190,79,0.3)',
                          }}>
                            <Calendar size={17} strokeWidth={2.2} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {ev.eventName || 'Gallery'}
                            </div>
                            <div style={{ fontSize: '0.73rem', color: 'var(--accent-gold)', fontWeight: 600, marginTop: '1px', fontFamily: 'var(--font-mono)' }}>
                              {ev.accessCode}
                              {ev.customerName ? <span style={{ color: '#94a3b8', fontWeight: 400 }}> · {ev.customerName}</span> : null}
                            </div>
                          </div>
                          <ArrowRight size={14} color="#f5be4f" />
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Main Card */}
              <div style={{
                background: 'rgba(14, 18, 28, 0.9)',
                borderRadius: '18px',
                padding: '22px 20px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.7)',
                border: '1px solid rgba(245, 190, 79, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}>
                {/* Label Row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.72rem',
                }}>
                  <span style={{
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--accent-gold)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    Enter Gallery Code
                  </span>
                  <span style={{ color: '#64748b', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
                    e.g. WED-2026-8824
                  </span>
                </div>

                {/* Input with Lock Icon */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(7, 10, 16, 0.9)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  border: '1px solid rgba(245, 190, 79, 0.3)',
                  transition: 'border-color 0.2s',
                }}>
                  <Lock size={18} color="#f5be4f" />
                  <input 
                    type="text"
                    value={galleryCode}
                    onChange={(e) => setGalleryCode(e.target.value.toUpperCase())}
                    placeholder="WED-2026-8824"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      color: '#ffffff',
                      width: '100%',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                </div>

                {/* Open Gallery Primary Button */}
                <button 
                  onClick={handleOpenGallery}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    fontSize: '0.98rem',
                    borderRadius: '10px',
                  }}
                >
                  Unlock Gallery <ArrowRight size={17} strokeWidth={2.4} />
                </button>

                {/* Divider */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  margin: '4px 0',
                }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#64748b',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    Or Access Instantly
                  </span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                </div>

                {/* Scan QR Code Card */}
                <div 
                  onClick={() => {
                    if (onOpenScanner) {
                      onOpenScanner();
                    } else {
                      setShowQrModal(true);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(20, 26, 38, 0.6)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.borderColor = 'rgba(245,190,79,0.5)')}
                  onMouseOut={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                >
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: 'rgba(245, 190, 79, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-gold)',
                    flexShrink: 0,
                    border: '1px solid rgba(245, 190, 79, 0.3)',
                  }}>
                    <QrCode size={22} strokeWidth={2.2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      Scan QR Code <span style={{ color: 'var(--accent-gold)' }}>›</span>
                    </div>
                    <div style={{
                      fontSize: '0.76rem',
                      color: '#94a3b8',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: '2px',
                    }}>
                      Printed on card, invitation, or table stand
                    </div>
                  </div>
                </div>

                {/* Private Link Helper */}
                <div style={{
                  textAlign: 'center',
                  fontSize: '0.78rem',
                  color: '#64748b',
                  marginTop: '4px',
                }}>
                  Have a private token URL?{' '}
                  <span 
                    onClick={() => setShowPasteModal(true)}
                    style={{
                      textDecoration: 'underline',
                      color: 'var(--accent-gold)',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Paste link
                  </span>
                </div>
              </div>

            </div>
          </div>
        ) : (
          /* SCREEN 2: CUSTOMER GALLERY VIEW (OBSIDIAN NOIR PHOTO STUDIO) */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            paddingTop: isMobileFrame ? '38px' : '16px',
            paddingBottom: '32px',
          }}>
            {/* Gallery Top Navigation */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(10, 14, 22, 0.95)',
            }}>
              <button 
                onClick={() => setInGallery(false)} 
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  padding: '6px',
                  color: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronLeft size={20} strokeWidth={2.4} />
              </button>

              <div style={{ textAlign: 'center', maxWidth: '160px', overflow: 'hidden' }}>
                <span style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: '0.98rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  display: 'block',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {eventDetails?.customerName || 'Private Gallery'}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--accent-gold)', fontWeight: 700, letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}>
                  {galleryCode}
                </span>
              </div>

              {/* Action Buttons: Capture Photo, Upload, Favorites */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <button
                  id="btn-nav-capture-photo"
                  onClick={() => setShowCameraModal(true)}
                  title="Open live camera"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    background: 'linear-gradient(135deg, #f5be4f 0%, #d49a2a 100%)',
                    color: '#050608',
                    borderRadius: '999px',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(245, 190, 79, 0.4)',
                  }}
                >
                  <Camera size={14} strokeWidth={2.6} /> 📷 Snap
                </button>

                <button
                  id="btn-upload-photo"
                  onClick={() => fileInputRef.current?.click()}
                  title="Insert an image from device files"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#ffffff',
                    borderRadius: '999px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Upload size={13} strokeWidth={2.4} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 9px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '999px',
                  color: '#f87171',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}>
                  <Heart size={13} fill="#ef4444" /> {favoriteCount}
                </div>

                {/* Search Button */}
                <button
                  id="btn-nav-search"
                  onClick={() => setShowSearch(p => !p)}
                  title="Search photos"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 9px',
                    background: showSearch ? 'var(--accent-gold)' : 'rgba(255,255,255,0.08)',
                    color: showSearch ? '#050608' : '#ffffff',
                    borderRadius: '999px',
                    border: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Search size={13} strokeWidth={2.4} />
                </button>

                {/* Enable Editing Button */}
                <button
                  id="btn-nav-enable-editing"
                  onClick={() => {
                    setIsEditingEnabled(p => !p);
                    setSelectedPhotoIds([]);
                  }}
                  title="Enable photo editing"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 11px',
                    background: isEditingEnabled ? 'var(--accent-gold)' : 'rgba(255,255,255,0.08)',
                    color: isEditingEnabled ? '#050608' : '#ffffff',
                    borderRadius: '999px',
                    border: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  <Edit3 size={13} strokeWidth={2.4} /> {isEditingEnabled ? 'Done' : 'Edit'}
                </button>
              </div>
            </div>

            {/* Event Cover Banner */}
            <div style={{ position: 'relative', height: '190px', overflow: 'hidden' }}>
              <img 
                src={heroLensImage} 
                alt="Event Cover" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { (e.target as HTMLImageElement).src = '/wedding_couple_hero.jpg'; }}
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(7,9,14,0.95) 0%, rgba(7,9,14,0.3) 60%, transparent 100%)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: '16px 20px',
                color: '#ffffff',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-gold)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                      {eventDetails?.eventType || 'EVENT'} VAULT • {galleryCode}
                    </div>
                    <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 800, margin: '2px 0 0 0', lineHeight: 1.2 }}>
                      {eventDetails?.eventName || 'Live Photography Event'}
                    </h3>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '4px' }}>
                      {eventDetails?.eventDate || '15 Sep 2026'} {eventDetails?.location ? `• ${eventDetails.location}` : ''}
                    </div>
                  </div>

                  {/* Prominent Hero Capture Button */}
                  <button
                    id="btn-hero-capture-photo"
                    onClick={() => setShowCameraModal(true)}
                    className="btn btn-primary"
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.82rem',
                      borderRadius: '10px',
                    }}
                  >
                    <Camera size={15} strokeWidth={2.5} /> 📷 Snap Photo
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive Search Bar (Toggled by Search Button) */}
            {showSearch && (
              <div style={{
                padding: '10px 20px',
                background: '#0d111a',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                animation: 'fadeIn 0.2s ease',
              }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={14} color="#f5be4f" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="customer-search-input"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search photos by title, album, date..."
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '8px 30px 8px 34px',
                      borderRadius: '8px',
                      border: '1px solid rgba(245,190,79,0.3)',
                      background: '#07090e',
                      fontSize: '0.82rem',
                      color: '#ffffff',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px', display: 'flex' }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Enable Editing Toolbar Banner */}
            {isEditingEnabled && (
              <div style={{
                padding: '10px 20px',
                background: 'rgba(245, 190, 79, 0.12)',
                borderBottom: '1px solid rgba(245, 190, 79, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--accent-gold)', fontWeight: 800 }}>
                  <Edit3 size={13} /> Editing Mode Active ({photos.length} photos)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => setSelectedPhotoIds(selectedPhotoIds.length === filteredPhotos.length && filteredPhotos.length > 0 ? [] : filteredPhotos.map(p => p.id))}
                    style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', fontSize: '0.72rem', fontWeight: 600, color: '#ffffff', cursor: 'pointer' }}
                  >
                    {selectedPhotoIds.length === filteredPhotos.length && filteredPhotos.length > 0 ? 'Deselect All' : 'Select All'}
                  </button>
                  {selectedPhotoIds.length > 0 && (
                    <button
                      onClick={handleBatchDelete}
                      style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Trash2 size={11} /> Delete ({selectedPhotoIds.length})
                    </button>
                  )}
                  <button
                    onClick={() => setIsEditingEnabled(false)}
                    style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: 'var(--accent-gold)', color: '#050608', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* Album Tabs Navigation */}
            <div style={{
              display: 'flex',
              gap: '8px',
              padding: '12px 20px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: '#090c13',
            }}>
              {['All Photos', 'Wedding', 'Ceremony', 'Reception', 'Couple', 'Details'].map((album) => {
                const count = album === 'All Photos' 
                  ? photos.length 
                  : photos.filter(p => p.album.toLowerCase() === album.toLowerCase()).length;
                return (
                  <button
                    key={album}
                    onClick={() => setActiveAlbum(album)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '999px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      background: activeAlbum === album ? 'linear-gradient(135deg, #f5be4f 0%, #d49a2a 100%)' : 'rgba(255,255,255,0.06)',
                      color: activeAlbum === album ? '#050608' : '#94a3b8',
                      transition: 'all 0.2s',
                    }}
                  >
                    {album} ({count})
                  </button>
                );
              })}
            </div>

            {/* Photos Grid or Empty State */}
            {filteredPhotos.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 24px',
                textAlign: 'center',
                background: 'rgba(14, 18, 28, 0.5)',
                borderRadius: '16px',
                border: '2px dashed rgba(245, 190, 79, 0.3)',
                margin: '20px',
                flex: 1,
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(245, 190, 79, 0.2), rgba(212, 154, 42, 0.1))',
                  border: '1px solid rgba(245, 190, 79, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-gold)',
                  marginBottom: '16px',
                  boxShadow: '0 0 24px rgba(245, 190, 79, 0.25)',
                }}>
                  <Camera size={30} strokeWidth={2.2} />
                </div>
                <h4 style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: '1.25rem',
                  color: '#ffffff',
                  fontWeight: 800,
                  marginBottom: '8px',
                }}>
                  {activeAlbum === 'All Photos' ? 'No Photos in Vault Yet' : `No photos in "${activeAlbum}"`}
                </h4>
                <p style={{
                  fontSize: '0.85rem',
                  color: '#94a3b8',
                  maxWidth: '320px',
                  lineHeight: 1.5,
                  marginBottom: '20px',
                }}>
                  Capture a photo using the live camera or upload files to save them directly into this private vault.
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    id="empty-state-capture-btn"
                    onClick={() => setShowCameraModal(true)}
                    className="btn btn-primary"
                    style={{ padding: '11px 22px', fontSize: '0.88rem' }}
                  >
                    <Camera size={16} strokeWidth={2.6} /> 📷 Snap Photo
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-secondary"
                    style={{ padding: '11px 18px', fontSize: '0.88rem' }}
                  >
                    <Upload size={15} /> Upload Files
                  </button>
                </div>
              </div>
            ) : (
              /* Photos Grid */
              <div style={{
                padding: '16px 20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                flex: 1,
              }}>
                {filteredPhotos.map((photo) => {
                  const isFav = !!photo.isFavorite;
                  return (
                    <div 
                      key={photo.id}
                      onClick={() => setActivePhoto(photo)}
                      style={{
                        position: 'relative',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        aspectRatio: '1',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                        cursor: 'pointer',
                        background: '#0d111a',
                        border: '1px solid rgba(255,255,255,0.08)',
                        transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245, 190, 79, 0.5)';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 30px rgba(0,0,0,0.8), 0 0 15px rgba(245,190,79,0.2)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.6)';
                      }}
                    >
                      <img 
                        src={photo.src} 
                        alt={photo.title} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />

                      {/* Selection Checkbox in Editing Mode */}
                      {isEditingEnabled && (
                        <div 
                          onClick={(e) => toggleSelectPhoto(photo.id, e)}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            zIndex: 4,
                            background: selectedPhotoIds.includes(photo.id) ? 'var(--accent-gold)' : 'rgba(0,0,0,0.75)',
                            borderRadius: '6px',
                            padding: '4px',
                            color: selectedPhotoIds.includes(photo.id) ? '#050608' : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                          }}
                          title={selectedPhotoIds.includes(photo.id) ? 'Deselect' : 'Select'}
                        >
                          {selectedPhotoIds.includes(photo.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                        </div>
                      )}

                      {/* Capture Date Badge */}
                      {!isEditingEnabled && (
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          padding: '3px 7px',
                          borderRadius: '6px',
                          background: 'rgba(5, 7, 12, 0.8)',
                          backdropFilter: 'blur(6px)',
                          border: '1px solid rgba(245, 190, 79, 0.3)',
                          color: 'var(--text-gold)',
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          zIndex: 2,
                          fontFamily: 'var(--font-mono)',
                        }}>
                          <Calendar size={10} /> {photo.capturedAt}
                        </div>
                      )}

                      {/* Edit Details in Editing Mode */}
                      {isEditingEnabled && (
                        <button
                          onClick={(e) => startEditingPhoto(photo, e)}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '42px',
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            background: 'var(--accent-gold)',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#050608',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                            zIndex: 3,
                          }}
                          title="Edit Title & Album"
                        >
                          <Edit3 size={13} strokeWidth={2.4} />
                        </button>
                      )}

                      {/* Floating Heart Favorite Button */}
                      <button
                        onClick={(e) => toggleFavorite(photo.id, e)}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          background: 'rgba(10, 14, 22, 0.8)',
                          backdropFilter: 'blur(6px)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: isFav ? '#ef4444' : '#ffffff',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                          zIndex: 2,
                        }}
                        title={isFav ? 'Remove Favorite' : 'Add to Favorites'}
                      >
                        <Heart size={15} fill={isFav ? '#ef4444' : 'none'} />
                      </button>

                      {/* Bottom Caption Pill */}
                      <div style={{
                        position: 'absolute',
                        bottom: '6px',
                        left: '8px',
                        right: '8px',
                        padding: '5px 8px',
                        borderRadius: '6px',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.6))',
                        backdropFilter: 'blur(6px)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                      }}>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {photo.title}
                        </span>
                        <span style={{
                          fontSize: '0.6rem',
                          color: 'var(--accent-gold)',
                          background: 'rgba(245,190,79,0.15)',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          flexShrink: 0,
                          fontFamily: 'var(--font-mono)',
                        }}>
                          {photo.album}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Gallery Bottom Action Footer */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              background: '#07090e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                <strong style={{ color: '#ffffff' }}>{photos.length}</strong> photos stored in <strong style={{ color: 'var(--accent-gold)' }}>{galleryCode}</strong>
              </div>
              <button
                onClick={() => setShowCameraModal(true)}
                className="btn btn-primary"
                style={{ padding: '8px 14px', fontSize: '0.8rem', borderRadius: '8px' }}
              >
                <Camera size={14} strokeWidth={2.5} /> 📷 Snap
              </button>
            </div>
          </div>
        )}

      </div>

      {/* MODAL 1: QR Code Scanner Modal */}
      {showQrModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '20px',
        }}>
          <div style={{
            background: '#0d111a',
            border: '1px solid rgba(245,190,79,0.35)',
            borderRadius: '24px',
            padding: '28px',
            maxWidth: '360px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 25px 60px rgba(0,0,0,0.9), 0 0 30px rgba(245,190,79,0.15)',
            color: '#f8fafc',
          }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowQrModal(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'rgba(245,190,79,0.15)',
              border: '1px solid rgba(245,190,79,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: 'var(--accent-gold)',
            }}>
              <QrCode size={34} />
            </div>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>
              Scan Gallery QR Code
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '20px', lineHeight: 1.4 }}>
              Point your camera at the QR code printed on the event card or table stand.
            </p>
            {/* Viewfinder */}
            <div style={{
              width: '200px',
              height: '200px',
              margin: '0 auto 20px auto',
              border: '2px dashed var(--accent-gold)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(5,7,12,0.8)',
            }}>
              <QrCode size={110} color="#f5be4f" style={{ opacity: 0.9 }} />
            </div>
            <button 
              onClick={() => {
                setShowQrModal(false);
                setGalleryCode('WED-2026-8824');
                setInGallery(true);
                triggerNotify('QR Code verified: WED-2026-8824');
              }}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px' }}
            >
              Simulate Instant QR Scan
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: Paste Private Link Modal */}
      {showPasteModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '20px',
        }}>
          <div style={{
            background: '#0d111a',
            border: '1px solid rgba(245,190,79,0.35)',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '380px',
            width: '100%',
            color: '#f8fafc',
            boxShadow: '0 25px 60px rgba(0,0,0,0.9)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem', fontWeight: 800 }}>Paste Private Gallery Link</h4>
              <button onClick={() => setShowPasteModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '14px' }}>
              Paste your direct URL or gallery token below to unlock:
            </p>
            <input 
              type="text" 
              value={pastedLink} 
              onChange={(e) => setPastedLink(e.target.value)}
              placeholder="https://nagendra-ctrl.github.io/live-image-share/#/gallery/tok_..."
              className="input-field"
              style={{ marginBottom: '16px' }}
            />
            <button 
              onClick={() => {
                setShowPasteModal(false);
                setGalleryCode('WED-2026-8824');
                setInGallery(true);
                triggerNotify('Link verified: WED-2026-8824');
              }}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px' }}
            >
              Verify & Open Gallery
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: Lightbox Photo Viewer */}
      {activePhoto && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(3, 4, 6, 0.98)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 120,
        }}>
          {/* Lightbox Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            color: '#f8fafc',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(8, 11, 18, 0.9)',
          }}>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>{activePhoto.title}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>{activePhoto.album}</span>
                <span>•</span>
                <span>Captured: {activePhoto.capturedAt}</span>
                <span>•</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>Gallery: {galleryCode}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button 
                onClick={() => toggleFavorite(activePhoto.id)}
                style={{
                  background: activePhoto.isFavorite ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.08)',
                  color: activePhoto.isFavorite ? '#ef4444' : '#ffffff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title={activePhoto.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
              >
                <Heart size={18} fill={activePhoto.isFavorite ? '#ef4444' : 'none'} />
              </button>

              <button 
                onClick={() => handleDownloadPhoto(activePhoto)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title="Download Photo"
              >
                <Download size={18} />
              </button>

              <button 
                onClick={() => startEditingPhoto(activePhoto)}
                style={{
                  background: 'rgba(245, 190, 79, 0.15)',
                  color: 'var(--accent-gold)',
                  border: '1px solid rgba(245, 190, 79, 0.35)',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title="Edit Details"
              >
                <Edit3 size={18} />
              </button>

              <button 
                onClick={() => handleDeletePhoto(activePhoto.id)}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title="Delete Photo"
              >
                <Trash2 size={18} />
              </button>

              <button 
                onClick={() => setActivePhoto(null)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Lightbox Image Stage */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            position: 'relative',
          }}>
            <img 
              src={activePhoto.src} 
              alt={activePhoto.title}
              style={{
                maxWidth: '92vw',
                maxHeight: '82vh',
                objectFit: 'contain',
                borderRadius: '14px',
                boxShadow: '0 24px 80px rgba(0,0,0,0.95), 0 0 40px rgba(245, 190, 79, 0.2)',
              }}
            />
          </div>
        </div>
      )}

      {/* MODAL 4: Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={showCameraModal}
        eventName={eventDetails?.eventName || galleryCode}
        onClose={() => setShowCameraModal(false)}
        onPhotoCaptured={handleCameraPhotoCaptured}
      />

      {/* MODAL 5: Edit Photo Details Modal */}
      {editingPhoto && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <form onSubmit={savePhotoEdit} style={{
            background: '#0d111a',
            border: '1px solid rgba(245,190,79,0.35)',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '380px',
            width: '100%',
            color: '#f8fafc',
            boxShadow: '0 25px 60px rgba(0,0,0,0.9)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={18} color="var(--accent-gold)" /> Edit Photo Details
              </div>
              <button type="button" onClick={() => setEditingPhoto(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)', textTransform: 'uppercase', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
                Photo Title / Caption
              </label>
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                required
                autoFocus
                placeholder="e.g. First Dance, Lens Detail"
                className="input-field"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)', textTransform: 'uppercase', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
                Album Category
              </label>
              <select
                value={editAlbum}
                onChange={e => setEditAlbum(e.target.value)}
                className="input-field"
                style={{ cursor: 'pointer' }}
              >
                {['Wedding', 'Ceremony', 'Reception', 'Couple', 'Details', 'Family', 'Party'].map(alb => (
                  <option key={alb} value={alb} style={{ background: '#0d111a', color: '#fff' }}>{alb}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setEditingPhoto(null)}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '10px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 2, padding: '10px' }}
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CustomerVerificationView;
