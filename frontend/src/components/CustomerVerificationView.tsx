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
  Square
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
  const [eventDetails, setEventDetails] = useState<PhotoVaultEvent | null>(null);

  useEffect(() => {
    if (initialAccessCode) {
      setGalleryCode(initialAccessCode);
    }
  }, [initialAccessCode]);

  const [inGallery, setInGallery] = useState<boolean>(false);
  const [activeAlbum, setActiveAlbum] = useState<string>('All Photos');
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(true);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [pastedLink, setPastedLink] = useState<string>('');
  const [activePhoto, setActivePhoto] = useState<StoredPhoto | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search & Enable Editing States
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isEditingEnabled, setIsEditingEnabled] = useState<boolean>(false);
  const [editingPhoto, setEditingPhoto] = useState<StoredPhoto | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editAlbum, setEditAlbum] = useState<string>('Wedding');

  // Home page event search states
  const [homeSearchQuery, setHomeSearchQuery] = useState<string>('');
  const [homeSearchResults, setHomeSearchResults] = useState<PhotoVaultEvent[]>([]);
  const [homeSearchLoading, setHomeSearchLoading] = useState<boolean>(false);
  const [homeSearchFocused, setHomeSearchFocused] = useState<boolean>(false);
  const homeSearchRef = useRef<HTMLDivElement>(null);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);

  // Event-isolated photo storage state
  const [photos, setPhotos] = useState<StoredPhoto[]>([]);

  // Selection toggle for batch editing/deleting
  const toggleSelectPhoto = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPhotoIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
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

    fetchEventByCode(code)
      .then(data => setEventDetails(data))
      .catch(() => setEventDetails(null));
  };

  useEffect(() => {
    if (galleryCode) {
      loadCurrentEventData(galleryCode);
    }
  }, [galleryCode]);

  // Home search: fetch and filter events on query change
  const performHomeSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setHomeSearchResults([]);
      return;
    }
    setHomeSearchLoading(true);
    try {
      const all = await fetchEvents();
      const lower = q.toLowerCase();
      const filtered = all.filter(ev =>
        ev.eventName?.toLowerCase().includes(lower) ||
        ev.accessCode?.toLowerCase().includes(lower) ||
        ev.customerName?.toLowerCase().includes(lower)
      );
      setHomeSearchResults(filtered);
    } catch {
      setHomeSearchResults([]);
    } finally {
      setHomeSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => performHomeSearch(homeSearchQuery), 300);
    return () => clearTimeout(timer);
  }, [homeSearchQuery, performHomeSearch]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (homeSearchRef.current && !homeSearchRef.current.contains(e.target as Node)) {
        setHomeSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const triggerNotify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Called when a photo is captured with the real camera
  const handleCameraPhotoCaptured = (imageDataUrl: string, album: string, title: string) => {
    const now = new Date();
    const formattedDateTime = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' • ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const saved = saveEventPhoto(galleryCode, {
      src: imageDataUrl,
      title: title || `Wedding Photo #${photos.length + 1}`,
      album: album || 'Wedding',
      capturedAt: formattedDateTime,
      isFavorite: false,
    });

    setPhotos(prev => [saved, ...prev]);
    triggerNotify('📷 Photo captured & saved to event gallery!');
  };

  // File picker fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const now = new Date();
          const formattedDateTime = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' • ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
    triggerNotify(isNowFav ? 'Added to favorites ♥' : 'Removed from favorites');
  };

  const handleDownloadPhoto = (photo: StoredPhoto) => {
    const a = document.createElement('a');
    a.href = photo.src;
    const cleanTitle = (photo.title || 'wedding_photo').replace(/[^a-zA-Z0-9_-]/g, '_');
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

  return (
    <div style={{
      minHeight: '100vh',
      background: '#121316',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: isMobileFrame ? '24px 16px 48px 16px' : '0',
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
    }}>
      {/* Viewport & Device Controls Bar */}
      <div style={{
        width: '100%',
        maxWidth: isMobileFrame ? '420px' : '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        marginBottom: isMobileFrame ? '12px' : '0',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: isMobileFrame ? '16px' : '0',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        color: '#f8fafc',
        fontSize: '0.825rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onBackToOverview && (
            <button 
              onClick={onBackToOverview} 
              className="btn btn-secondary" 
              style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
            >
              ← Photographer Studio
            </button>
          )}
          {inGallery && (
            <button 
              onClick={() => setInGallery(false)} 
              className="btn btn-secondary" 
              style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
            >
              ← Verification Screen
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={() => setIsMobileFrame(!isMobileFrame)}
            className="btn btn-secondary"
            style={{ 
              padding: '6px 12px', 
              fontSize: '0.75rem', 
              borderRadius: '8px', 
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)' 
            }}
            title="Toggle Smartphone Mockup Frame vs Fullscreen"
          >
            {isMobileFrame ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Maximize2 size={13} /> Full Width
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Smartphone size={13} /> Mobile Mockup Frame
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Container / Smartphone Shell */}
      <div style={{
        width: '100%',
        maxWidth: isMobileFrame ? '420px' : '100%',
        background: '#fbf9f5', // Warm luxury cream/ivory
        borderRadius: isMobileFrame ? '44px' : '0',
        boxShadow: isMobileFrame ? '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 0 12px #262930' : 'none',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minHeight: isMobileFrame ? '844px' : '100vh',
        color: '#1c1917',
        border: isMobileFrame ? '4px solid #1a1b1f' : 'none',
      }}>

        {/* Status bar speaker notch (if in mobile mockup mode) */}
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
          }}>
            <div style={{ width: '45px', height: '4px', background: '#222', borderRadius: '2px' }} />
            <div style={{ width: '10px', height: '10px', background: '#111', borderRadius: '50%', marginLeft: '8px' }} />
          </div>
        )}

        {/* Notification Toast */}
        {notification && (
          <div style={{
            position: 'absolute',
            top: isMobileFrame ? '40px' : '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(28, 25, 23, 0.94)',
            color: '#fdfbf7',
            padding: '8px 18px',
            borderRadius: '999px',
            fontSize: '0.8rem',
            fontWeight: 500,
            boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
            zIndex: 100,
            animation: 'fadeIn 0.2s ease',
            whiteSpace: 'nowrap',
          }}>
            {notification}
          </div>
        )}

        {/* SCREEN 1: VERIFICATION SCREEN (EXACT MATCH TO USER SCREENSHOT) */}
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
              borderBottom: '1px solid rgba(0,0,0,0.04)',
            }}>
              {/* Back Arrow */}
              <button 
                onClick={onBackToOverview} 
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  color: '#292524',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Back"
              >
                <ChevronLeft size={22} strokeWidth={2.4} />
              </button>

              {/* Center Logo & Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Intertwined Gold Rings SVG */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="9" cy="12" r="6" stroke="#b4935a" strokeWidth="1.6" />
                  <circle cx="15" cy="12" r="6" stroke="#cbb279" strokeWidth="1.6" strokeDasharray="32" strokeDashoffset="4" />
                </svg>
                <span style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '1.18rem',
                  fontWeight: 700,
                  color: '#1a1816',
                  letterSpacing: '-0.02em',
                }}>
                  Private Pin Verification
                </span>
              </div>

              {/* Photographer Avatar Profile */}
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '1.5px solid rgba(180, 147, 90, 0.4)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
              }}>
                <img 
                  src="/photographer_avatar.jpg" 
                  alt="Photographer Elena Vance" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>

              {/* Hero Photography Card with '♥ PRIVATE KEEPSAKE' Badge */}
              <div style={{
                position: 'relative',
                borderRadius: '18px',
                overflow: 'hidden',
                boxShadow: '0 12px 28px -6px rgba(0,0,0,0.12)',
                aspectRatio: '16/10',
                background: '#e7e3dc',
              }}>
                <img 
                  src="/wedding_couple_hero.jpg" 
                  alt="Wedding Couple in Tuscan Courtyard" 
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />

                {/* Floating Frosted Keepsake Badge */}
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  background: 'rgba(247, 243, 235, 0.88)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  border: '1px solid rgba(255,255,255,0.6)',
                }}>
                  <span style={{ color: '#544330', fontSize: '0.75rem' }}>♥</span>
                  <span style={{
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#443727',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}>
                    Private Keepsake
                  </span>
                </div>
              </div>

              {/* Welcome Header */}
              <div style={{ textAlign: 'center', marginTop: '22px', marginBottom: '20px' }}>
                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#9e7b4f',
                  marginBottom: '8px',
                }}>
                  Welcome to WedGallery
                </div>
                <h2 style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '2.1rem',
                  fontWeight: 700,
                  color: '#1a1816',
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em',
                  marginBottom: '10px',
                }}>
                  Your memories,<br />
                  beautifully organized.
                </h2>
                <p style={{
                  color: '#78716c',
                  fontSize: '0.925rem',
                  lineHeight: 1.45,
                  maxWidth: '320px',
                  margin: '0 auto',
                }}>
                  View and preserve your wedding moments in one private gallery.
                </p>
              </div>

              {/* Event Search Bar */}
              <div ref={homeSearchRef} style={{ position: 'relative', marginBottom: '4px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: homeSearchFocused ? '#ffffff' : '#f5f5f4',
                  borderRadius: '12px',
                  padding: '11px 14px',
                  border: homeSearchFocused ? '1.5px solid #b4935a' : '1.5px solid #e7e5e4',
                  boxShadow: homeSearchFocused ? '0 0 0 3px rgba(180,147,90,0.12)' : 'none',
                  transition: 'all 0.2s',
                }}>
                  {homeSearchLoading ? (
                    <div style={{
                      width: '16px', height: '16px', border: '2px solid #e7e5e4',
                      borderTopColor: '#b4935a', borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite', flexShrink: 0,
                    }} />
                  ) : (
                    <Search size={16} color={homeSearchFocused ? '#b4935a' : '#a8a29e'} style={{ flexShrink: 0 }} />
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
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: '#292524',
                      width: '100%',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  />
                  {homeSearchQuery && (
                    <button
                      onClick={() => { setHomeSearchQuery(''); setHomeSearchResults([]); }}
                      style={{ background: 'none', border: 'none', color: '#a8a29e', cursor: 'pointer', padding: '2px', display: 'flex', flexShrink: 0 }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Search Dropdown Results */}
                {homeSearchFocused && homeSearchQuery.trim() && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    right: 0,
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e7e5e4',
                    boxShadow: '0 12px 32px -4px rgba(0,0,0,0.14)',
                    zIndex: 50,
                    overflow: 'hidden',
                    animation: 'fadeIn 0.15s ease',
                  }}>
                    {homeSearchResults.length === 0 && !homeSearchLoading ? (
                      <div style={{
                        padding: '16px',
                        textAlign: 'center',
                        color: '#a8a29e',
                        fontSize: '0.82rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        <Search size={18} color="#d6d3d1" />
                        <span>No events found for &ldquo;{homeSearchQuery}&rdquo;</span>
                      </div>
                    ) : (
                      homeSearchResults.slice(0, 5).map(ev => (
                        <div
                          key={ev.id}
                          onClick={() => {
                            setGalleryCode(ev.accessCode || '');
                            setHomeSearchQuery('');
                            setHomeSearchResults([]);
                            setHomeSearchFocused(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '11px 14px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f5f5f4',
                            transition: 'background 0.15s',
                          }}
                          onMouseOver={e => (e.currentTarget.style.background = '#faf8f4')}
                          onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '9px',
                            background: '#faeedb', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', color: '#785834', flexShrink: 0,
                          }}>
                            <Calendar size={17} strokeWidth={2.2} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1c1917', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {ev.eventName || 'Wedding Gallery'}
                            </div>
                            <div style={{ fontSize: '0.73rem', color: '#9e7b4f', fontWeight: 600, marginTop: '1px' }}>
                              {ev.accessCode}
                              {ev.customerName ? <span style={{ color: '#a8a29e', fontWeight: 400 }}> · {ev.customerName}</span> : null}
                            </div>
                          </div>
                          <ArrowRight size={14} color="#d6d3d1" />
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Main Card */}
              <div style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '22px 20px',
                boxShadow: '0 8px 24px -4px rgba(0,0,0,0.06)',
                border: '1px solid rgba(0,0,0,0.05)',
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
                    color: '#44403c',
                  }}>
                    Enter Gallery Code
                  </span>
                  <span style={{ color: '#a8a29e', fontSize: '0.72rem' }}>
                    e.g. wed-2026-8824
                  </span>
                </div>

                {/* Input with Lock Icon */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: '#f5f5f4',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  border: '1px solid #e7e5e4',
                  transition: 'border-color 0.2s',
                }}>
                  <Lock size={18} color="#a8a29e" />
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
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      color: '#292524',
                      width: '100%',
                      fontFamily: "'Plus Jakarta Sans', monospace",
                    }}
                  />
                </div>

                {/* Open Gallery Primary Button */}
                <button 
                  onClick={handleOpenGallery}
                  style={{
                    background: '#6d5538',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '14px 20px',
                    fontSize: '0.96rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(109, 85, 56, 0.25)',
                    transition: 'background 0.2s, transform 0.1s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#5c462c')}
                  onMouseOut={(e) => (e.currentTarget.style.background = '#6d5538')}
                >
                  Open Gallery <ArrowRight size={17} strokeWidth={2.4} />
                </button>

                {/* Divider */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  margin: '4px 0',
                }}>
                  <div style={{ flex: 1, height: '1px', background: '#e7e5e4' }} />
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#a8a29e',
                  }}>
                    Or Access Instantly
                  </span>
                  <div style={{ flex: 1, height: '1px', background: '#e7e5e4' }} />
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
                    border: '1px solid #e7e5e4',
                    background: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.borderColor = '#c7b299')}
                  onMouseOut={(e) => (e.currentTarget.style.borderColor = '#e7e5e4')}
                >
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: '#faeedb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#785834',
                    flexShrink: 0,
                  }}>
                    <QrCode size={22} strokeWidth={2.2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '0.92rem',
                      color: '#1c1917',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      Scan QR Code <span style={{ color: '#a8a29e' }}>›</span>
                    </div>
                    <div style={{
                      fontSize: '0.76rem',
                      color: '#78716c',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: '2px',
                    }}>
                      Printed on your invitation card or p...
                    </div>
                  </div>
                </div>

                {/* Private Link Helper */}
                <div style={{
                  textAlign: 'center',
                  fontSize: '0.78rem',
                  color: '#78716c',
                  marginTop: '4px',
                }}>
                  Have a private link?{' '}
                  <span 
                    onClick={() => setShowPasteModal(true)}
                    style={{
                      textDecoration: 'underline',
                      color: '#443727',
                      fontWeight: 600,
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
          /* SCREEN 2: CUSTOMER GALLERY VIEW (AFTER PIN VERIFICATION) */
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
              padding: '12px 20px',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
            }}>
              <button 
                onClick={() => setInGallery(false)} 
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  color: '#292524',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronLeft size={22} strokeWidth={2.4} />
              </button>

              <div style={{ textAlign: 'center', maxWidth: '160px', overflow: 'hidden' }}>
                <span style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#1a1816',
                  display: 'block',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {eventDetails?.customerName || 'Wedding Gallery'}
                </span>
                <span style={{ fontSize: '0.68rem', color: '#9e7b4f', fontWeight: 600, letterSpacing: '0.04em' }}>
                  {galleryCode}
                </span>
              </div>

              {/* Action Buttons: Prominent Capture Photo, Upload, and Favorites */}
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
                    background: 'linear-gradient(135deg, #e2b855 0%, #b88628 100%)',
                    color: '#08090c',
                    borderRadius: '999px',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(226, 184, 85, 0.4)',
                    transition: 'transform 0.15s',
                  }}
                  onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.96)'; }}
                  onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                >
                  <Camera size={14} strokeWidth={2.6} /> 📷 Capture Photo
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
                    background: '#6d5538',
                    color: '#ffffff',
                    borderRadius: '999px',
                    border: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(109, 85, 56, 0.25)',
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
                  background: '#faeedb',
                  borderRadius: '999px',
                  color: '#6d5538',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}>
                  <Heart size={13} fill="#6d5538" /> {favoriteCount}
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
                    background: showSearch ? '#6d5538' : '#efece6',
                    color: showSearch ? '#ffffff' : '#57534e',
                    borderRadius: '999px',
                    border: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
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
                    background: isEditingEnabled ? '#b88628' : '#efece6',
                    color: isEditingEnabled ? '#ffffff' : '#57534e',
                    borderRadius: '999px',
                    border: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: isEditingEnabled ? '0 2px 8px rgba(184, 134, 40, 0.35)' : 'none',
                  }}
                >
                  <Edit3 size={13} strokeWidth={2.4} /> {isEditingEnabled ? 'Done' : 'Edit'}
                </button>
              </div>
            </div>

            {/* Event Cover Banner */}
            <div style={{ position: 'relative', height: '190px', overflow: 'hidden' }}>
              <img 
                src={eventDetails?.coverImage || '/wedding_couple_hero.jpg'} 
                alt="Event Hero" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { (e.target as HTMLImageElement).src = '/wedding_couple_hero.jpg'; }}
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(20,18,16,0.92) 0%, rgba(20,18,16,0.2) 60%, transparent 100%)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: '16px 20px',
                color: '#ffffff',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f3cf7a', fontWeight: 700 }}>
                      {eventDetails?.eventType || 'WEDDING'} GALLERY • {galleryCode}
                    </div>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.35rem', margin: '2px 0 0 0', lineHeight: 1.2 }}>
                      {eventDetails?.eventName || 'Wedding of Marcus & Sophia'}
                    </h3>
                    <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.85)', marginTop: '4px' }}>
                      {eventDetails?.eventDate || '15 Sep 2026'} {eventDetails?.location ? `• ${eventDetails.location}` : ''}
                    </div>
                  </div>

                  {/* Prominent Hero Capture Button */}
                  <button
                    id="btn-hero-capture-photo"
                    onClick={() => setShowCameraModal(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '8px 16px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #e2b855 0%, #b88628 100%)',
                      color: '#08090c',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(226, 184, 85, 0.4)',
                    }}
                  >
                  <Camera size={15} strokeWidth={2.5} /> 📷 Capture Photo
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive Search Bar (Toggled by Search Button) */}
            {showSearch && (
              <div style={{
                padding: '10px 20px',
                background: '#faf9f6',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                animation: 'fadeIn 0.2s ease',
              }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={14} color="#78716c" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
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
                      border: '1px solid #d6d3d1',
                      background: '#ffffff',
                      fontSize: '0.82rem',
                      color: '#1c1917',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#78716c', cursor: 'pointer', padding: '2px', display: 'flex' }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                  style={{ background: 'none', border: 'none', color: '#78716c', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Enable Editing Toolbar Banner */}
            {isEditingEnabled && (
              <div style={{
                padding: '10px 20px',
                background: '#fdf6e7',
                borderBottom: '1px solid #faeedb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#785834', fontWeight: 700 }}>
                  <Edit3 size={13} /> Editing Mode Active ({photos.length} photos)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => setSelectedPhotoIds(selectedPhotoIds.length === filteredPhotos.length && filteredPhotos.length > 0 ? [] : filteredPhotos.map(p => p.id))}
                    style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #d6d3d1', background: '#fff', fontSize: '0.72rem', fontWeight: 600, color: '#443727', cursor: 'pointer' }}
                  >
                    {selectedPhotoIds.length === filteredPhotos.length && filteredPhotos.length > 0 ? 'Deselect All' : 'Select All'}
                  </button>
                  {selectedPhotoIds.length > 0 && (
                    <button
                      onClick={handleBatchDelete}
                      style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: '#dc2626', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Trash2 size={11} /> Delete Selected ({selectedPhotoIds.length})
                    </button>
                  )}
                  <button
                    onClick={() => setIsEditingEnabled(false)}
                    style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: '#6d5538', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Done Editing
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
              borderBottom: '1px solid rgba(0,0,0,0.05)',
              background: '#faf9f6',
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
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      background: activeAlbum === album ? '#6d5538' : '#efece6',
                      color: activeAlbum === album ? '#ffffff' : '#57534e',
                      transition: 'all 0.2s',
                    }}
                  >
                    {album} ({count})
                  </button>
                );
              })}
            </div>

            {/* Clean Wedding Photos Grid or Empty State */}
            {filteredPhotos.length === 0 ? (
              /* No Photos / Empty State with direct Camera action */
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 24px',
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.4)',
                borderRadius: '16px',
                border: '2px dashed rgba(180, 147, 90, 0.35)',
                margin: '20px',
                flex: 1,
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(226, 184, 85, 0.25), rgba(184, 134, 40, 0.15))',
                  border: '1px solid rgba(226, 184, 85, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9e7b4f',
                  marginBottom: '16px',
                  boxShadow: '0 0 20px rgba(226, 184, 85, 0.2)',
                }}>
                  <Camera size={30} strokeWidth={2.2} />
                </div>
                <h4 style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '1.25rem',
                  color: '#292524',
                  fontWeight: 700,
                  marginBottom: '8px',
                }}>
                  {activeAlbum === 'All Photos' ? 'No Wedding Photos Yet' : `No photos in "${activeAlbum}"`}
                </h4>
                <p style={{
                  fontSize: '0.85rem',
                  color: '#78716c',
                  maxWidth: '320px',
                  lineHeight: 1.5,
                  marginBottom: '20px',
                }}>
                  {activeAlbum === 'All Photos'
                    ? `Be the first to capture a timeless memory for ${eventDetails?.customerName || 'this wedding'}! Photos will be saved privately in this event gallery.`
                    : `No photos have been categorized under ${activeAlbum} yet.`}
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    id="empty-state-capture-btn"
                    onClick={() => setShowCameraModal(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '11px 22px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #e2b855 0%, #b88628 100%)',
                      color: '#08090c',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(226, 184, 85, 0.4)',
                    }}
                  >
                    <Camera size={16} strokeWidth={2.6} /> 📷 Capture Photo
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '11px 18px',
                      borderRadius: '12px',
                      background: '#efece6',
                      color: '#57534e',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      border: 'none',
                      cursor: 'pointer',
                    }}
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
                        boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        background: '#eae6df',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 20px rgba(0,0,0,0.16)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(0,0,0,0.1)';
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
                            background: selectedPhotoIds.includes(photo.id) ? '#b88628' : 'rgba(0,0,0,0.65)',
                            borderRadius: '6px',
                            padding: '4px',
                            color: '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                          }}
                          title={selectedPhotoIds.includes(photo.id) ? 'Deselect photo' : 'Select photo'}
                        >
                          {selectedPhotoIds.includes(photo.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                        </div>
                      )}

                      {/* Capture Date / Time Badge */}
                      {!isEditingEnabled && (
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          padding: '3px 7px',
                          borderRadius: '6px',
                          background: 'rgba(15, 17, 23, 0.75)',
                          backdropFilter: 'blur(6px)',
                          border: '1px solid rgba(226, 184, 85, 0.3)',
                          color: '#f3cf7a',
                          fontSize: '0.62rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          zIndex: 2,
                        }}>
                          <Calendar size={10} /> {photo.capturedAt}
                        </div>
                      )}

                      {/* Edit Details Pencil in Editing Mode */}
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
                            background: 'rgba(226,184,85,0.95)',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#08090c',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
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
                          background: 'rgba(255, 255, 255, 0.9)',
                          backdropFilter: 'blur(4px)',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: isFav ? '#dc2626' : '#57534e',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                          zIndex: 2,
                        }}
                        title={isFav ? 'Remove Favorite' : 'Add to Favorites'}
                      >
                        <Heart size={15} fill={isFav ? '#dc2626' : 'none'} />
                      </button>

                      {/* Bottom Caption Pill */}
                      <div style={{
                        position: 'absolute',
                        bottom: '6px',
                        left: '8px',
                        right: '8px',
                        padding: '5px 8px',
                        borderRadius: '6px',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.55))',
                        backdropFilter: 'blur(4px)',
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
                          color: '#f3cf7a',
                          background: 'rgba(226,184,85,0.15)',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          flexShrink: 0,
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
              borderTop: '1px solid rgba(0,0,0,0.06)',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}>
              <div style={{ fontSize: '0.78rem', color: '#78716c' }}>
                <strong>{photos.length}</strong> photos stored in <strong>{galleryCode}</strong>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowCameraModal(true)}
                  style={{
                    background: 'linear-gradient(135deg, #e2b855 0%, #b88628 100%)',
                    color: '#08090c',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(226, 184, 85, 0.3)',
                  }}
                >
                  <Camera size={14} strokeWidth={2.5} /> 📷 Capture
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODAL 1: QR Code Scanner Modal */}
      {showQrModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '20px',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '28px',
            maxWidth: '360px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            color: '#1c1917',
          }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowQrModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a8a29e' }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: '#faeedb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: '#785834',
            }}>
              <QrCode size={34} />
            </div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', marginBottom: '8px' }}>
              Scan Gallery QR Code
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#78716c', marginBottom: '20px', lineHeight: 1.4 }}>
              Point your camera at the QR code printed on the couple's wedding card or table keepsake.
            </p>
            {/* Simulated viewfinder */}
            <div style={{
              width: '200px',
              height: '200px',
              margin: '0 auto 20px auto',
              border: '2px dashed #b4935a',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fafaf9',
              position: 'relative',
            }}>
              <QrCode size={110} color="#6d5538" style={{ opacity: 0.85 }} />
            </div>
            <button 
              onClick={() => {
                setShowQrModal(false);
                setGalleryCode('WED-2026-8824');
                setInGallery(true);
                triggerNotify('QR Code scanned: WED-2026-8824');
              }}
              style={{
                width: '100%',
                background: '#6d5538',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '12px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
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
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '20px',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '380px',
            width: '100%',
            color: '#1c1917',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem' }}>Paste Private Gallery Link</h4>
              <button onClick={() => setShowPasteModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#78716c', marginBottom: '14px' }}>
              If you received a direct URL via WhatsApp, SMS, or email, paste it below to enter directly:
            </p>
            <input 
              type="text" 
              value={pastedLink} 
              onChange={(e) => setPastedLink(e.target.value)}
              placeholder="https://photovault.app/gallery/WED-2026-8824"
              className="input-field"
              style={{
                background: '#f5f5f4',
                color: '#1c1917',
                border: '1px solid #d6d3d1',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '0.85rem',
                marginBottom: '16px',
              }}
            />
            <button 
              onClick={() => {
                setShowPasteModal(false);
                setGalleryCode('WED-2026-8824');
                setInGallery(true);
                triggerNotify('Link verified: WED-2026-8824');
              }}
              style={{
                width: '100%',
                background: '#6d5538',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Verify & Open Gallery
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: Full-Screen Lightbox Photo Viewer */}
      {activePhoto && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(8, 9, 12, 0.96)',
          backdropFilter: 'blur(12px)',
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
            background: 'rgba(10, 12, 16, 0.8)',
          }}>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>{activePhoto.title}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#e2b855', fontWeight: 600 }}>{activePhoto.album}</span>
                <span>•</span>
                <span>Captured: {activePhoto.capturedAt}</span>
                <span>•</span>
                <span>Gallery: {galleryCode}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button 
                onClick={() => toggleFavorite(activePhoto.id)}
                style={{
                  background: activePhoto.isFavorite ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)',
                  color: activePhoto.isFavorite ? '#ef4444' : '#ffffff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                title={activePhoto.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart size={18} fill={activePhoto.isFavorite ? '#ef4444' : 'none'} />
              </button>

              <button 
                onClick={() => handleDownloadPhoto(activePhoto)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                title="Download Photo"
              >
                <Download size={18} />
              </button>

              <button 
                onClick={() => startEditingPhoto(activePhoto)}
                style={{
                  background: 'rgba(226, 184, 85, 0.15)',
                  color: '#e2b855',
                  border: '1px solid rgba(226, 184, 85, 0.3)',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                title="Edit Photo Title & Album"
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
                  transition: 'background 0.2s',
                }}
                title="Delete Photo from Gallery"
              >
                <Trash2 size={18} />
              </button>

              <button 
                onClick={() => setActivePhoto(null)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
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
                title="Close (Esc)"
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
                borderRadius: '12px',
                boxShadow: '0 24px 70px rgba(0,0,0,0.9), 0 0 30px rgba(226,184,85,0.15)',
              }}
            />
          </div>
        </div>
      )}

      {/* MODAL 4: Real Device Camera Capture Modal */}
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
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <form onSubmit={savePhotoEdit} style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '380px',
            width: '100%',
            color: '#1c1917',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={18} color="#b88628" /> Edit Photo Details
              </div>
              <button type="button" onClick={() => setEditingPhoto(null)} style={{ background: 'none', border: 'none', color: '#78716c', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#57534e', textTransform: 'uppercase', marginBottom: '6px' }}>
                Photo Title / Caption
              </label>
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                required
                autoFocus
                placeholder="e.g. First Dance, Ring Detail"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #d6d3d1',
                  background: '#fcfbf9',
                  color: '#1c1917',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#57534e', textTransform: 'uppercase', marginBottom: '6px' }}>
                Album Category
              </label>
              <select
                value={editAlbum}
                onChange={e => setEditAlbum(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #d6d3d1',
                  background: '#fcfbf9',
                  color: '#1c1917',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                }}
              >
                {['Wedding', 'Ceremony', 'Reception', 'Couple', 'Details', 'Family', 'Party'].map(alb => (
                  <option key={alb} value={alb}>{alb}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setEditingPhoto(null)}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #d6d3d1', background: '#fff', color: '#57534e', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ flex: 2, padding: '10px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #b88628, #8c6720)', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
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
