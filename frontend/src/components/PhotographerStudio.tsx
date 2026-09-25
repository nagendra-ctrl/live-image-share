import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera, Plus, QrCode, Download, Share2, Copy, Check, X, Upload,
  Trash2, Eye, ToggleLeft, ToggleRight, Sparkles, ChevronRight, Film,
  Search, Edit3, Wifi, Globe, CheckCircle
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  getLocalEvents, saveLocalEvent, deleteLocalEvent,
  getEventMedia, saveEventMedia, deleteEventMedia, updateEventMedia,
  generateSecureToken, getGalleryUrl, getEventMediaCount,
  getPreferredHost, setPreferredHost, LOCAL_NETWORK_IP,
  type LocalEvent, type EventMedia
} from '../utils/eventStorage';

interface Props {
  onViewGallery?: (token: string) => void;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  WEDDING: '💍 Wedding', ENGAGEMENT: '💎 Engagement', RECEPTION: '🥂 Reception',
  BIRTHDAY: '🎂 Birthday', PARTY: '🎉 Party', CORPORATE: '🏢 Corporate', OTHER: '📸 Other',
};

export const PhotographerStudio: React.FC<Props> = ({ onViewGallery }) => {
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<LocalEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<LocalEvent | null>(null);
  const [qrModalEvent, setQrModalEvent] = useState<LocalEvent | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentHost, setCurrentHost] = useState<string>(getPreferredHost);
  const [showHostModal, setShowHostModal] = useState(false);

  const reload = () => setEvents(getLocalEvents());

  useEffect(() => { reload(); }, []);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteEvent = (token: string) => {
    if (!confirm('Delete this event and all its media? This cannot be undone.')) return;
    deleteLocalEvent(token);
    if (selectedEvent?.token === token) setSelectedEvent(null);
    reload();
    notify('Deleted event.');
  };

  const copyLink = (token: string) => {
    const url = getGalleryUrl(token);
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
    notify('Network gallery link copied!');
  };

  // Filter events by search query
  const filteredEvents = events.filter(e => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      e.eventName.toLowerCase().includes(q) ||
      e.customerName.toLowerCase().includes(q) ||
      e.eventDate.toLowerCase().includes(q) ||
      (e.location && e.location.toLowerCase().includes(q)) ||
      e.accessCode.toLowerCase().includes(q) ||
      e.eventType.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ minHeight: '100vh', background: '#08090c', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @keyframes studioSlideIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes studioFadeIn  { from { opacity:0; } to { opacity:1; } }
        .studio-card { animation: studioSlideIn 0.3s ease; }
      `}</style>

      {notification && (
        <div style={{ position: 'fixed', top: '80px', right: '24px', zIndex: 9999, background: 'rgba(226,184,85,0.15)', border: '1px solid rgba(226,184,85,0.4)', borderRadius: '12px', padding: '12px 20px', color: '#f8fafc', backdropFilter: 'blur(12px)', fontSize: '0.9rem', fontWeight: 600, boxShadow: '0 8px 30px rgba(0,0,0,0.5)', animation: 'studioFadeIn 0.2s ease' }}>
          {notification}
        </div>
      )}

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(226,184,85,0.12)', border: '1px solid rgba(226,184,85,0.3)', borderRadius: '999px', padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700, color: '#e2b855', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              <Camera size={12} /> Photographer Studio
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0, fontFamily: 'Outfit, sans-serif' }}>Event Manager</h1>
            <p style={{ color: '#64748b', marginTop: '4px', fontSize: '0.95rem' }}>Create events, upload media, generate QR codes and share network links</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowHostModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 18px', borderRadius: '12px', border: '1px solid rgba(56,189,248,0.3)', background: 'rgba(56,189,248,0.08)', color: '#38bdf8', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}
            >
              <Wifi size={16} /> Network Link Settings
            </button>
            <button
              id="create-event-btn"
              onClick={() => setShowCreateModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #e2b855, #b88628)', color: '#08090c', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 20px rgba(226,184,85,0.35)' }}
            >
              <Plus size={18} /> Create New Event
            </button>
          </div>
        </div>

        {/* Network Link Info Banner */}
        <div style={{
          background: 'linear-gradient(90deg, rgba(56,189,248,0.1) 0%, rgba(226,184,85,0.08) 100%)',
          border: '1px solid rgba(56,189,248,0.25)',
          borderRadius: '14px',
          padding: '14px 20px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
              <Wifi size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Active Network Host: <code style={{ color: '#38bdf8', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '6px' }}>{currentHost}</code>
                <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '1px 7px', borderRadius: '999px', border: '1px solid rgba(16,185,129,0.3)' }}>No Deployment Required</span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '2px' }}>
                Any phone or device connected to your Wi-Fi can directly scan the QR codes or open links
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowHostModal(true)}
            style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#f8fafc', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Change IP / Host
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '16px', marginBottom: '28px' }}>
          {[
            { label: 'Total Events', value: events.length, color: '#e2b855' },
            { label: 'Total Photos', value: events.reduce((a, e) => a + getEventMediaCount(e.token).photos, 0), color: '#38bdf8' },
            { label: 'Total Videos', value: events.reduce((a, e) => a + getEventMediaCount(e.token).videos, 0), color: '#c084fc' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px 24px' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: s.color, marginTop: '4px', lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Search Bar & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px', maxWidth: '480px' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              id="search-events-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search events by name, client, date, venue, code..."
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '11px 36px 11px 40px',
                color: '#ffffff',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', display: 'flex' }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Showing {filteredEvents.length} of {events.length} events
          </div>
        </div>

        {/* Event List */}
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📷</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>No events yet</div>
            <div style={{ color: '#64748b', marginBottom: '24px' }}>Create your first event to start uploading photos & videos</div>
            <button onClick={() => setShowCreateModal(true)} style={{ padding: '12px 28px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg,#e2b855,#b88628)', color: '#08090c', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
              Create First Event
            </button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔍</div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '4px' }}>No events found matching "{searchQuery}"</div>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Try searching with a different term or clear the filter</p>
            <button onClick={() => setSearchQuery('')} style={{ marginTop: '12px', padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f8fafc', fontSize: '0.8rem', cursor: 'pointer' }}>
              Clear Search
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredEvents.map(event => {
              const count = getEventMediaCount(event.token);
              const galleryUrl = getGalleryUrl(event.token);
              return (
                <div key={event.token} className="studio-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'linear-gradient(135deg,rgba(226,184,85,0.2),rgba(226,184,85,0.05))', border: '1px solid rgba(226,184,85,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Camera size={22} color="#e2b855" />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{event.eventName}</span>
                          <span style={{ background: 'rgba(226,184,85,0.12)', color: '#e2b855', border: '1px solid rgba(226,184,85,0.25)', borderRadius: '999px', padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}>
                            {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: '6px' }}>
                            {event.accessCode}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <span>📅 {event.eventDate}</span>
                          {event.location && <span>📍 {event.location}</span>}
                          <span>👤 {event.customerName}</span>
                          <span style={{ color: '#38bdf8' }}>📸 {count.photos} photos</span>
                          {count.videos > 0 && <span style={{ color: '#c084fc' }}>🎬 {count.videos} videos</span>}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => setSelectedEvent(selectedEvent?.token === event.token ? null : event)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f8fafc', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        <Upload size={13} /> {selectedEvent?.token === event.token ? 'Close' : 'Upload Media'}
                      </button>
                      <button
                        onClick={() => setEditingEvent(event)}
                        title="Enable Editing for this event"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '9px', border: '1px solid rgba(226,184,85,0.3)', background: 'rgba(226,184,85,0.08)', color: '#e2b855', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        <Edit3 size={13} /> Edit Event
                      </button>
                      <button
                        onClick={() => setQrModalEvent(event)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '9px', border: '1px solid rgba(226,184,85,0.3)', background: 'rgba(226,184,85,0.08)', color: '#e2b855', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        <QrCode size={13} /> QR Code
                      </button>
                      <button
                        onClick={() => onViewGallery?.(event.token)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '9px', border: '1px solid rgba(56,189,248,0.3)', background: 'rgba(56,189,248,0.08)', color: '#38bdf8', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        <Eye size={13} /> Preview
                      </button>
                      <button
                        onClick={() => copyLink(event.token)}
                        title="Copy network link"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '8px 12px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: copiedToken === event.token ? '#10b981' : '#64748b', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        {copiedToken === event.token ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.token)}
                        style={{ display: 'inline-flex', alignItems: 'center', padding: '8px', borderRadius: '9px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#f87171', cursor: 'pointer' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div style={{ padding: '0 24px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Network URL:</span>
                    <code style={{ fontSize: '0.72rem', color: '#38bdf8', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', padding: '2px 8px', borderRadius: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '500px', display: 'inline-block' }}>
                      {galleryUrl}
                    </code>
                  </div>

                  {selectedEvent?.token === event.token && (
                    <MediaUploadPanel event={event} onUploaded={() => { reload(); notify('Media updated!'); }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(evt) => { saveLocalEvent(evt); reload(); setShowCreateModal(false); setSelectedEvent(evt); notify('Event created! Now upload photos & videos.'); }}
        />
      )}

      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSaved={(updated) => { saveLocalEvent(updated); reload(); setEditingEvent(null); notify('Event details updated successfully!'); }}
        />
      )}

      {qrModalEvent && (
        <QrModal
          event={qrModalEvent}
          onClose={() => setQrModalEvent(null)}
          onCopyLink={() => copyLink(qrModalEvent.token)}
          onViewGallery={() => { onViewGallery?.(qrModalEvent.token); setQrModalEvent(null); }}
        />
      )}

      {showHostModal && (
        <NetworkHostModal
          currentHost={currentHost}
          onClose={() => setShowHostModal(false)}
          onSave={(newHost) => {
            setPreferredHost(newHost);
            setCurrentHost(getPreferredHost());
            setShowHostModal(false);
            notify(`Network host set to ${newHost}`);
          }}
        />
      )}
    </div>
  );
};

// ─── Media Upload & Editing Panel ─────────────────────────────────────────────
const MediaUploadPanel: React.FC<{ event: LocalEvent; onUploaded: () => void }> = ({ event, onUploaded }) => {
  const [media, setMedia] = useState<EventMedia[]>([]);
  const [activeTab, setActiveTab] = useState<'photos' | 'videos'>('photos');
  const [dragging, setDragging] = useState(false);
  const [isEditingMedia, setIsEditingMedia] = useState(false);
  const [editingItem, setEditingItem] = useState<EventMedia | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(() => setMedia(getEventMedia(event.token)), [event.token]);
  useEffect(() => { reload(); }, [reload]);

  const processFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isVideo && !isImage) continue;
      const reader = new FileReader();
      await new Promise<void>(resolve => {
        reader.onload = () => {
          saveEventMedia(event.token, {
            src: reader.result as string,
            type: isVideo ? 'video' : 'photo',
            title: file.name.replace(/\.[^/.]+$/, ''),
            album: isVideo ? 'Videos' : 'Photos',
            mimeType: file.type,
            sizeBytes: file.size,
            capturedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            allowDownload: event.allowDownload,
          });
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
    reload();
    onUploaded();
  };

  const saveItemTitle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    updateEventMedia(event.token, editingItem.id, { title: editTitle.trim() || editingItem.title });
    setEditingItem(null);
    reload();
    onUploaded();
  };

  const photos = media.filter(m => m.type === 'photo');
  const videos = media.filter(m => m.type === 'video');
  const displayed = activeTab === 'photos' ? photos : videos;

  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '20px 24px 24px', background: 'rgba(0,0,0,0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {(['photos', 'videos'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', background: activeTab === tab ? 'rgba(226,184,85,0.15)' : 'transparent', color: activeTab === tab ? '#e2b855' : '#64748b' }}>
            {tab === 'photos' ? `📸 ${photos.length} Photos` : `🎬 ${videos.length} Videos`}
          </button>
        ))}

        {/* Enable Editing Mode Button */}
        <button
          onClick={() => setIsEditingMedia(p => !p)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '8px',
            border: isEditingMedia ? '1px solid #e2b855' : '1px solid rgba(255,255,255,0.12)',
            background: isEditingMedia ? 'rgba(226,184,85,0.15)' : 'rgba(255,255,255,0.04)',
            color: isEditingMedia ? '#e2b855' : '#94a3b8',
            fontWeight: 600,
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          <Edit3 size={13} /> {isEditingMedia ? 'Done Editing' : 'Enable Media Editing'}
        </button>

        <div style={{ marginLeft: 'auto' }}>
          <input ref={fileRef} type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={e => processFiles(e.target.files)} />
          <button onClick={() => fileRef.current?.click()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '9px', border: 'none', background: 'linear-gradient(135deg,#e2b855,#b88628)', color: '#08090c', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
            <Upload size={13} /> Upload {activeTab === 'photos' ? 'Photos' : 'Videos'}
          </button>
        </div>
      </div>

      {isEditingMedia && (
        <div style={{ background: 'rgba(226,184,85,0.1)', border: '1px solid rgba(226,184,85,0.25)', borderRadius: '8px', padding: '8px 14px', marginBottom: '14px', fontSize: '0.78rem', color: '#e2b855', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Edit3 size={13} /> Editing enabled: Click pencil on any item to rename title, or click trash to remove.
        </div>
      )}

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); processFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        style={{ border: `2px dashed ${dragging ? '#e2b855' : 'rgba(255,255,255,0.12)'}`, borderRadius: '12px', padding: '20px', marginBottom: displayed.length > 0 ? '14px' : 0, background: dragging ? 'rgba(226,184,85,0.05)' : 'rgba(255,255,255,0.02)', textAlign: 'center', cursor: 'pointer' }}
      >
        <Upload size={22} style={{ color: dragging ? '#e2b855' : '#64748b', margin: '0 auto 6px' }} />
        <div style={{ fontSize: '0.8rem', color: dragging ? '#e2b855' : '#64748b', fontWeight: 600 }}>Drop {activeTab} here or click to browse</div>
      </div>

      {displayed.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: '10px' }}>
          {displayed.map(item => (
            <div key={item.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', background: '#111', border: isEditingMedia ? '1px solid rgba(226,184,85,0.3)' : '1px solid rgba(255,255,255,0.08)' }}>
              {item.type === 'photo' ? (
                <img src={item.src} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <video src={item.src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
              )}
              {item.type === 'video' && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Film size={12} color="#fff" />
                </div>
              )}

              {/* Title tag on hover/edit */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.75)', padding: '3px 6px', fontSize: '0.65rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.title}
              </div>

              {/* Edit pencil icon */}
              {isEditingMedia && (
                <button
                  onClick={() => { setEditingItem(item); setEditTitle(item.title); }}
                  title="Rename title"
                  style={{ position: 'absolute', top: '3px', left: '3px', background: 'rgba(226,184,85,0.9)', border: 'none', borderRadius: '5px', color: '#08090c', cursor: 'pointer', padding: '3px', display: 'flex' }}
                >
                  <Edit3 size={11} />
                </button>
              )}

              {/* Delete button */}
              <button
                onClick={() => { deleteEventMedia(event.token, item.id); reload(); onUploaded(); }}
                title="Delete media"
                style={{ position: 'absolute', top: '3px', right: '3px', background: 'rgba(239,68,68,0.85)', border: 'none', borderRadius: '5px', color: '#fff', cursor: 'pointer', padding: '3px', display: 'flex' }}
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mini Rename Modal */}
      {editingItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form onSubmit={saveItemTitle} style={{ background: '#12151c', border: '1px solid rgba(226,184,85,0.3)', borderRadius: '14px', padding: '20px', width: '320px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '10px' }}>Rename Media Item</div>
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)} required autoFocus style={{ ...cInput, marginBottom: '14px' }} />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditingItem(null)} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#e2b855,#b88628)', color: '#08090c', fontWeight: 700, cursor: 'pointer' }}>Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// ─── Create Event Modal ──────────────────────────────────────────────────────
const CreateEventModal: React.FC<{ onClose: () => void; onCreated: (e: LocalEvent) => void }> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({ eventName: '', eventType: 'WEDDING', customerName: '', eventDate: '', location: '', description: '', allowDownload: true });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.eventName.trim() || !form.eventDate || !form.customerName.trim()) return;
    setLoading(true);
    const token = generateSecureToken();
    const accessCode = `EVT-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    setTimeout(() => {
      onCreated({ token, accessCode, eventName: form.eventName.trim(), eventType: form.eventType, customerName: form.customerName.trim(), eventDate: form.eventDate, location: form.location.trim(), description: form.description.trim(), allowDownload: form.allowDownload, createdAt: new Date().toISOString() });
    }, 300);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 2000 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 2001, width: '95%', maxWidth: '540px', maxHeight: '92vh', overflowY: 'auto', background: 'linear-gradient(145deg,#12151c,#0e1118)', border: '1px solid rgba(226,184,85,0.2)', borderRadius: '20px', boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 26px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg,#e2b855,#b88628)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} color="#08090c" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Create New Event</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>A secure QR link will be auto-generated</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#64748b', cursor: 'pointer', padding: '7px', display: 'flex' }}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '22px 26px 26px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <CField label="Event Name" required>
            <input value={form.eventName} onChange={e => setForm(p => ({ ...p, eventName: e.target.value }))} placeholder="e.g. Wedding of Marcus & Sophia" required style={cInput} autoFocus />
          </CField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <CField label="Event Type" required>
              <select value={form.eventType} onChange={e => setForm(p => ({ ...p, eventType: e.target.value }))} style={{ ...cInput, cursor: 'pointer', appearance: 'auto' }}>
                {Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v} style={{ background: '#12151c' }}>{l}</option>)}
              </select>
            </CField>
            <CField label="Event Date" required>
              <input type="date" value={form.eventDate} onChange={e => setForm(p => ({ ...p, eventDate: e.target.value }))} required style={{ ...cInput, colorScheme: 'dark' }} />
            </CField>
          </div>
          <CField label="Client Name" required>
            <input value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} placeholder="e.g. Marcus & Sophia Sterling" required style={cInput} />
          </CField>
          <CField label="Venue / Location">
            <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Villa Cetinale, Tuscany" style={cInput} />
          </CField>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 14px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Allow Customer Downloads</div>
              <div style={{ fontSize: '0.73rem', color: '#64748b' }}>Customers can download photos & videos</div>
            </div>
            <button type="button" onClick={() => setForm(p => ({ ...p, allowDownload: !p.allowDownload }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: form.allowDownload ? '#10b981' : '#64748b' }}>
              {form.allowDownload ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ flex: 2, padding: '11px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#e2b855,#b88628)', color: '#08090c', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {loading ? 'Creating…' : <><Sparkles size={15} /> Create Event & Generate QR</>}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

// ─── Edit Event Modal (Enable Editing) ─────────────────────────────────────────
const EditEventModal: React.FC<{ event: LocalEvent; onClose: () => void; onSaved: (e: LocalEvent) => void }> = ({ event, onClose, onSaved }) => {
  const [form, setForm] = useState({
    eventName: event.eventName,
    eventType: event.eventType,
    customerName: event.customerName,
    eventDate: event.eventDate,
    location: event.location || '',
    description: event.description || '',
    allowDownload: event.allowDownload,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.eventName.trim() || !form.eventDate || !form.customerName.trim()) return;
    onSaved({
      ...event,
      eventName: form.eventName.trim(),
      eventType: form.eventType,
      customerName: form.customerName.trim(),
      eventDate: form.eventDate,
      location: form.location.trim(),
      description: form.description.trim(),
      allowDownload: form.allowDownload,
    });
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 2000 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 2001, width: '95%', maxWidth: '540px', maxHeight: '92vh', overflowY: 'auto', background: 'linear-gradient(145deg,#12151c,#0e1118)', border: '1px solid rgba(226,184,85,0.3)', borderRadius: '20px', boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 26px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(226,184,85,0.15)', border: '1px solid rgba(226,184,85,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e2b855' }}>
              <Edit3 size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Edit Event Details</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Code: {event.accessCode}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#64748b', cursor: 'pointer', padding: '7px', display: 'flex' }}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '22px 26px 26px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <CField label="Event Name" required>
            <input value={form.eventName} onChange={e => setForm(p => ({ ...p, eventName: e.target.value }))} required style={cInput} />
          </CField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <CField label="Event Type" required>
              <select value={form.eventType} onChange={e => setForm(p => ({ ...p, eventType: e.target.value }))} style={{ ...cInput, cursor: 'pointer', appearance: 'auto' }}>
                {Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v} style={{ background: '#12151c' }}>{l}</option>)}
              </select>
            </CField>
            <CField label="Event Date" required>
              <input type="text" value={form.eventDate} onChange={e => setForm(p => ({ ...p, eventDate: e.target.value }))} required style={cInput} />
            </CField>
          </div>
          <CField label="Client Name" required>
            <input value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} required style={cInput} />
          </CField>
          <CField label="Venue / Location">
            <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} style={cInput} />
          </CField>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 14px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Allow Customer Downloads</div>
              <div style={{ fontSize: '0.73rem', color: '#64748b' }}>Customers can download photos & videos</div>
            </div>
            <button type="button" onClick={() => setForm(p => ({ ...p, allowDownload: !p.allowDownload }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: form.allowDownload ? '#10b981' : '#64748b' }}>
              {form.allowDownload ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>Cancel</button>
            <button type="submit" style={{ flex: 2, padding: '11px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#e2b855,#b88628)', color: '#08090c', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Check size={16} /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

// ─── Network Host Settings Modal ──────────────────────────────────────────────
const NetworkHostModal: React.FC<{ currentHost: string; onClose: () => void; onSave: (host: string) => void }> = ({ currentHost, onClose, onSave }) => {
  const [selectedPreset, setSelectedPreset] = useState<'wifi' | 'local' | 'custom'>('wifi');
  const [customInput, setCustomInput] = useState(currentHost);

  const wifiUrl = `http://${LOCAL_NETWORK_IP}:5173`;
  const localhostUrl = `http://localhost:5173`;

  const handleApply = () => {
    if (selectedPreset === 'wifi') onSave(wifiUrl);
    else if (selectedPreset === 'local') onSave(localhostUrl);
    else onSave(customInput.trim());
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 3000 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 3001, width: '95%', maxWidth: '480px', background: '#12151c', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '20px', padding: '24px', boxShadow: '0 25px 70px rgba(0,0,0,0.8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
              <Wifi size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>Network Link Settings</div>
              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Configure QR code destination without deploying</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}><X size={18} /></button>
        </div>

        <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '18px' }}>
          Select which host URL should be encoded inside generated QR codes and shared links:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
          {/* Preset 1: Wi-Fi */}
          <div
            onClick={() => setSelectedPreset('wifi')}
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              border: selectedPreset === 'wifi' ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
              background: selectedPreset === 'wifi' ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.02)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Wifi size={14} color="#38bdf8" /> Local Wi-Fi Network (Recommended)
              </div>
              <code style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '2px', display: 'block' }}>{wifiUrl}</code>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Real smartphones on this Wi-Fi can scan and open instantly</div>
            </div>
            {selectedPreset === 'wifi' && <CheckCircle size={18} color="#38bdf8" />}
          </div>

          {/* Preset 2: Localhost */}
          <div
            onClick={() => setSelectedPreset('local')}
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              border: selectedPreset === 'local' ? '2px solid #e2b855' : '1px solid rgba(255,255,255,0.08)',
              background: selectedPreset === 'local' ? 'rgba(226,184,85,0.1)' : 'rgba(255,255,255,0.02)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f8fafc' }}>Localhost (Same Computer Only)</div>
              <code style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px', display: 'block' }}>{localhostUrl}</code>
            </div>
            {selectedPreset === 'local' && <CheckCircle size={18} color="#e2b855" />}
          </div>

          {/* Preset 3: Custom tunnel */}
          <div
            onClick={() => setSelectedPreset('custom')}
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              border: selectedPreset === 'custom' ? '2px solid #c084fc' : '1px solid rgba(255,255,255,0.08)',
              background: selectedPreset === 'custom' ? 'rgba(192,132,252,0.1)' : 'rgba(255,255,255,0.02)',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Globe size={14} color="#c084fc" /> Custom / Public Tunnel (e.g. ngrok / cloudflare)
            </div>
            <input
              value={customInput}
              onChange={e => { setSelectedPreset('custom'); setCustomInput(e.target.value); }}
              placeholder="https://your-tunnel.loca.lt"
              style={{ ...cInput, fontSize: '0.8rem', padding: '8px 10px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleApply} style={{ flex: 2, padding: '10px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#38bdf8,#0284c7)', color: '#08090c', fontWeight: 700, cursor: 'pointer' }}>Apply Host Settings</button>
        </div>
      </div>
    </>
  );
};

// ─── QR Code Modal ────────────────────────────────────────────────────────────
const QrModal: React.FC<{ event: LocalEvent; onClose: () => void; onCopyLink: () => void; onViewGallery: () => void }> = ({ event, onClose, onCopyLink, onViewGallery }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const galleryUrl = getGalleryUrl(event.token);

  useEffect(() => {
    QRCode.toDataURL(galleryUrl, { width: 280, margin: 2, color: { dark: '#000000', light: '#ffffff' }, errorCorrectionLevel: 'H' }).then(setQrDataUrl).catch(console.error);
  }, [galleryUrl]);

  const downloadQr = () => {
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR-${event.eventName.replace(/\s+/g, '-')}.png`;
    a.click();
  };

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: event.eventName, url: galleryUrl });
    } else {
      navigator.clipboard.writeText(galleryUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 3000 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 3001, width: '95%', maxWidth: '420px', background: 'linear-gradient(145deg,#12151c,#0e1118)', border: '1px solid rgba(226,184,85,0.3)', borderRadius: '22px', padding: '28px', boxShadow: '0 30px 80px rgba(0,0,0,0.8), 0 0 40px rgba(226,184,85,0.08)', textAlign: 'center' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '8px', color: '#64748b', cursor: 'pointer', padding: '6px', display: 'flex' }}><X size={16} /></button>

        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '999px', padding: '4px 12px', fontSize: '0.7rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
            <Wifi size={11} /> Wi-Fi Network Link
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{event.eventName}</div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>{event.eventDate}{event.location ? ` • ${event.location}` : ''}</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', display: 'inline-block', marginBottom: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}>
          {qrDataUrl
            ? <img src={qrDataUrl} alt="Gallery QR Code" style={{ width: '200px', height: '200px', display: 'block' }} />
            : <div style={{ width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', borderRadius: '8px' }}><QrCode size={40} color="#ccc" /></div>
          }
        </div>

        <div style={{ fontSize: '0.76rem', color: '#38bdf8', marginBottom: '12px', fontWeight: 600 }}>
          📱 Ready for any phone on your Wi-Fi network • No app required
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', textAlign: 'left' }}>
          <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Network Gallery URL</div>
          <div style={{ fontSize: '0.73rem', color: '#94a3b8', wordBreak: 'break-all', lineHeight: 1.6 }}>{galleryUrl}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button onClick={downloadQr} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '11px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#e2b855,#b88628)', color: '#08090c', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
              <Download size={15} /> Download QR
            </button>
            <button onClick={share} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '11px', borderRadius: '10px', border: '1px solid rgba(226,184,85,0.3)', background: 'rgba(226,184,85,0.08)', color: '#e2b855', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
              <Share2 size={15} /> Share Link
            </button>
          </div>
          <button onClick={() => { onCopyLink(); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: copied ? '#10b981' : '#94a3b8', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
            {copied ? <><Check size={14} /> Copied Network Link!</> : <><Copy size={14} /> Copy Network Link</>}
          </button>
          <button onClick={onViewGallery} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '10px', borderRadius: '10px', border: '1px solid rgba(56,189,248,0.25)', background: 'rgba(56,189,248,0.07)', color: '#38bdf8', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
            <Eye size={14} /> Preview Customer Gallery <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </>
  );
};

const CField: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <div>
    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
      {label}{required && <span style={{ color: '#e2b855', marginLeft: '2px' }}>*</span>}
    </label>
    {children}
  </div>
);

const cInput: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '11px 14px', color: '#ffffff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' };
