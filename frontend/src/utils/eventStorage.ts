/**
 * eventStorage.ts
 * Local storage management for events and their media (photos + videos).
 * Events are stored locally with a cryptographically random secure token.
 */

export type MediaType = 'photo' | 'video';

export interface EventMedia {
  id: string;
  eventToken: string;
  src: string; // base64 data URL or blob URL
  type: MediaType;
  title: string;
  album: string;
  mimeType: string;
  sizeBytes?: number;
  capturedAt: string;
  timestamp: number;
  isFavorite?: boolean;
  allowDownload?: boolean;
}

export interface LocalEvent {
  token: string;           // Secure random token — used in QR URL
  accessCode: string;      // Human-readable code e.g. WED-2026-8824
  eventName: string;
  eventType: string;
  eventDate: string;
  customerName: string;
  location?: string;
  description?: string;
  coverImage?: string;
  createdAt: string;
  allowDownload: boolean;
}

// ─── Keys ───────────────────────────────────────────────────────────────────
const EVENTS_KEY = 'photovault_local_events';
const MEDIA_PREFIX = 'photovault_media_';
const TOKEN_INDEX_KEY = 'photovault_token_index'; // token → accessCode map

// ─── Token generation ───────────────────────────────────────────────────────
export function generateSecureToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Seed Data ──────────────────────────────────────────────────────────────
const DEFAULT_DEMO_TOKEN = 'a1b2c3d4e5f6789012345678abcdef0123456789abcdef01';
const DEFAULT_DEMO_CODE = 'WED-2026-8824';

function seedInitialDataIfEmpty(): LocalEvent[] {
  const defaultEvent: LocalEvent = {
    token: DEFAULT_DEMO_TOKEN,
    accessCode: DEFAULT_DEMO_CODE,
    eventName: 'Wedding of Marcus & Sophia',
    eventType: 'WEDDING',
    eventDate: '15 Sep 2026',
    customerName: 'Marcus & Sophia Sterling',
    location: 'Villa Cetinale, Tuscany',
    description: 'Private high-resolution photo & video gallery for family and friends.',
    coverImage: '/wedding_couple_hero.jpg',
    createdAt: new Date().toISOString(),
    allowDownload: true,
  };

  const initialMedia: EventMedia[] = [
    {
      id: 'demo_media_1',
      eventToken: DEFAULT_DEMO_TOKEN,
      src: '/wedding_couple_hero.jpg',
      type: 'photo',
      title: 'Couple Portrait in Villa Garden',
      album: 'Portraits',
      mimeType: 'image/jpeg',
      capturedAt: '15 Sep 2026',
      timestamp: Date.now() - 3600000,
      isFavorite: true,
      allowDownload: true,
    },
    {
      id: 'demo_media_2',
      eventToken: DEFAULT_DEMO_TOKEN,
      src: '/wedding_reception_dinner.jpg',
      type: 'photo',
      title: 'Candlelight Reception Dinner',
      album: 'Reception',
      mimeType: 'image/jpeg',
      capturedAt: '15 Sep 2026',
      timestamp: Date.now() - 3000000,
      isFavorite: false,
      allowDownload: true,
    },
    {
      id: 'demo_media_3',
      eventToken: DEFAULT_DEMO_TOKEN,
      src: '/wedding_rings_detail.jpg',
      type: 'photo',
      title: 'Custom Gold Bands & Calligraphy',
      album: 'Details',
      mimeType: 'image/jpeg',
      capturedAt: '15 Sep 2026',
      timestamp: Date.now() - 2500000,
      isFavorite: true,
      allowDownload: true,
    },
    {
      id: 'demo_media_4',
      eventToken: DEFAULT_DEMO_TOKEN,
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      type: 'video',
      title: 'First Dance & Evening Fireworks',
      album: 'Highlights',
      mimeType: 'video/mp4',
      capturedAt: '15 Sep 2026',
      timestamp: Date.now() - 1500000,
      isFavorite: true,
      allowDownload: true,
    },
  ];

  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify([defaultEvent]));
    localStorage.setItem(`${MEDIA_PREFIX}${DEFAULT_DEMO_TOKEN}`, JSON.stringify(initialMedia));
    const tokenIndex: Record<string, string> = {};
    tokenIndex[DEFAULT_DEMO_TOKEN] = DEFAULT_DEMO_CODE;
    localStorage.setItem(TOKEN_INDEX_KEY, JSON.stringify(tokenIndex));
    return [defaultEvent];
  } catch {
    return [defaultEvent];
  }
}

// ─── Events ─────────────────────────────────────────────────────────────────
export function getLocalEvents(): LocalEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (!raw) return seedInitialDataIfEmpty();
    const parsed: LocalEvent[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return seedInitialDataIfEmpty();
    }
    return parsed;
  } catch {
    return seedInitialDataIfEmpty();
  }
}

export function saveLocalEvent(event: LocalEvent): void {
  const events = getLocalEvents();
  const index = events.findIndex(e => e.token === event.token);
  if (index >= 0) {
    events[index] = event;
  } else {
    events.unshift(event);
  }
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));

  // Update token index
  const tokenIndex = getTokenIndex();
  tokenIndex[event.token] = event.accessCode;
  localStorage.setItem(TOKEN_INDEX_KEY, JSON.stringify(tokenIndex));

  // Background cloud sync
  import('./cloudSync').then(m => m.syncAllData()).catch(() => {});
}

export function getLocalEventByToken(token: string): LocalEvent | null {
  const events = getLocalEvents();
  return events.find(e => e.token === token) || null;
}

export function getLocalEventByCode(accessCode: string): LocalEvent | null {
  const events = getLocalEvents();
  return events.find(e => e.accessCode.toUpperCase() === accessCode.toUpperCase()) || null;
}

function getTokenIndex(): Record<string, string> {
  try {
    const raw = localStorage.getItem(TOKEN_INDEX_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

export function deleteLocalEvent(token: string): void {
  const events = getLocalEvents().filter(e => e.token !== token);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  // Delete all media
  try {
    localStorage.removeItem(`${MEDIA_PREFIX}${token}`);
  } catch { /* ignore */ }

  // Background cloud sync
  import('./cloudSync').then(m => m.syncAllData()).catch(() => {});
}

// ─── Media ──────────────────────────────────────────────────────────────────
export function getEventMedia(token: string): EventMedia[] {
  try {
    const raw = localStorage.getItem(`${MEDIA_PREFIX}${token}`);
    const parsed: EventMedia[] = raw ? JSON.parse(raw) : [];
    const media: EventMedia[] = Array.isArray(parsed) ? parsed : [];

    // Also pull photos from photoStorage if any exist under token or accessCode
    const events = getLocalEvents();
    const event = events.find(e => e.token === token || e.accessCode.toUpperCase() === token.toUpperCase());
    const accessCode = event ? event.accessCode : token;

    const seenIds = new Set(media.map(m => m.id));

    // Check photovault_event_photos_ keys
    const checkKeys = [
      `photovault_event_photos_${accessCode.trim().toUpperCase()}`,
      `photovault_event_photos_${token.trim().toUpperCase()}`,
    ];

    checkKeys.forEach(k => {
      const pRaw = localStorage.getItem(k);
      if (pRaw) {
        try {
          const photoList: Array<any> = JSON.parse(pRaw);
          if (Array.isArray(photoList)) {
            photoList.forEach(p => {
              if (p && p.id && !seenIds.has(p.id)) {
                media.push({
                  id: p.id,
                  eventToken: event ? event.token : token,
                  src: p.src,
                  type: 'photo',
                  title: p.title || 'Photo',
                  album: p.album || 'Photos',
                  mimeType: 'image/jpeg',
                  capturedAt: p.capturedAt || '',
                  timestamp: p.timestamp || Date.now(),
                  isFavorite: p.isFavorite ?? false,
                  allowDownload: event ? event.allowDownload : true,
                });
                seenIds.add(p.id);
              }
            });
          }
        } catch { /* ignore */ }
      }
    });

    return media;
  } catch {
    return [];
  }
}

export function saveEventMedia(token: string, media: Omit<EventMedia, 'id' | 'eventToken' | 'timestamp'>): EventMedia {
  const existing = getEventMedia(token);
  const newMedia: EventMedia = {
    ...media,
    id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    eventToken: token,
    timestamp: Date.now(),
  };
  const updated = [newMedia, ...existing.filter(m => m.id !== newMedia.id)];
  try {
    localStorage.setItem(`${MEDIA_PREFIX}${token}`, JSON.stringify(updated));
  } catch {
    // Storage quota — trim oldest
    const trimmed = [newMedia, ...existing.slice(0, 20)];
    localStorage.setItem(`${MEDIA_PREFIX}${token}`, JSON.stringify(trimmed));
  }

  // Also sync to photoStorage keys
  try {
    const events = getLocalEvents();
    const event = events.find(e => e.token === token || e.accessCode.toUpperCase() === token.toUpperCase());
    if (event) {
      const pKey = `photovault_event_photos_${event.accessCode.toUpperCase()}`;
      const pRaw = localStorage.getItem(pKey);
      const pList: Array<any> = pRaw ? JSON.parse(pRaw) : [];
      const newStoredPhoto = {
        id: newMedia.id,
        eventCode: event.accessCode,
        src: newMedia.src,
        title: newMedia.title,
        album: newMedia.album || 'Photos',
        capturedAt: newMedia.capturedAt || '',
        timestamp: newMedia.timestamp,
        isFavorite: newMedia.isFavorite ?? false,
      };
      const pUpdated = [newStoredPhoto, ...pList.filter(p => p.id !== newMedia.id)];
      localStorage.setItem(pKey, JSON.stringify(pUpdated));
      localStorage.setItem(`photovault_event_photos_${event.token.toUpperCase()}`, JSON.stringify(pUpdated));
    }
  } catch { /* ignore */ }

  // Background cloud sync
  import('./cloudSync').then(m => m.syncAllData()).catch(() => {});

  return newMedia;
}

export function deleteEventMedia(token: string, mediaId: string): void {
  const existing = getEventMedia(token).filter(m => m.id !== mediaId);
  localStorage.setItem(`${MEDIA_PREFIX}${token}`, JSON.stringify(existing));

  try {
    const events = getLocalEvents();
    const event = events.find(e => e.token === token || e.accessCode.toUpperCase() === token.toUpperCase());
    if (event) {
      const pKey = `photovault_event_photos_${event.accessCode.toUpperCase()}`;
      const pRaw = localStorage.getItem(pKey);
      if (pRaw) {
        const pList: Array<any> = JSON.parse(pRaw);
        localStorage.setItem(pKey, JSON.stringify(pList.filter(p => p.id !== mediaId)));
      }
      const tKey = `photovault_event_photos_${event.token.toUpperCase()}`;
      const tRaw = localStorage.getItem(tKey);
      if (tRaw) {
        const tList: Array<any> = JSON.parse(tRaw);
        localStorage.setItem(tKey, JSON.stringify(tList.filter(p => p.id !== mediaId)));
      }
    }
  } catch { /* ignore */ }

  // Background cloud sync
  import('./cloudSync').then(m => m.syncAllData()).catch(() => {});
}

export function updateEventMedia(token: string, mediaId: string, updates: Partial<EventMedia>): boolean {
  const existing = getEventMedia(token);
  const updated = existing.map(m => m.id === mediaId ? { ...m, ...updates } : m);
  try {
    localStorage.setItem(`${MEDIA_PREFIX}${token}`, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
}

export function toggleMediaFavorite(token: string, mediaId: string): boolean {
  const existing = getEventMedia(token);
  let isFav = false;
  const updated = existing.map(m => {
    if (m.id === mediaId) {
      isFav = !m.isFavorite;
      return { ...m, isFavorite: isFav };
    }
    return m;
  });
  localStorage.setItem(`${MEDIA_PREFIX}${token}`, JSON.stringify(updated));
  return isFav;
}

export function getEventMediaCount(token: string): { photos: number; videos: number } {
  const media = getEventMedia(token);
  return {
    photos: media.filter(m => m.type === 'photo').length,
    videos: media.filter(m => m.type === 'video').length,
  };
}

// ─── Network Link / Host helper ──────────────────────────────────────────────
export const LOCAL_NETWORK_IP = '192.168.1.14';
const NETWORK_HOST_KEY = 'photovault_network_host';

export function getPreferredHost(): string {
  try {
    const saved = localStorage.getItem(NETWORK_HOST_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch {
    // ignore
  }

  // If running on localhost or 127.0.0.1, default to local network IP so phone cameras can access it!
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocal) {
    const port = window.location.port ? `:${window.location.port}` : ':5173';
    return `http://${LOCAL_NETWORK_IP}${port}`;
  }
  return window.location.origin;
}

export function setPreferredHost(host: string): void {
  try {
    if (!host || !host.trim()) {
      localStorage.removeItem(NETWORK_HOST_KEY);
    } else {
      localStorage.setItem(NETWORK_HOST_KEY, host.trim());
    }
  } catch {
    // ignore
  }
}

// ─── Gallery URL helper ──────────────────────────────────────────────────────
export function getGalleryUrl(token: string, hostOverride?: string): string {
  const host = hostOverride || getPreferredHost();
  const cleanHost = host.replace(/\/+$/, '');
  const pathname = window.location.pathname.startsWith('/') ? window.location.pathname : `/${window.location.pathname}`;
  const cleanPath = pathname === '/' ? '' : pathname.replace(/\/+$/, '');
  return `${cleanHost}${cleanPath}/#/gallery/${token}`;
}

