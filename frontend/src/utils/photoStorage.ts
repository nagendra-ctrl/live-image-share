export interface StoredPhoto {
  id: string;
  eventCode: string;
  src: string; // Base64 data URL
  title: string;
  album: string;
  capturedAt: string;
  timestamp: number;
  isFavorite?: boolean;
}

const STORAGE_PREFIX = 'photovault_event_photos_';
const EVENTS_KEY = 'photovault_local_events';
const MEDIA_PREFIX = 'photovault_media_';

function findMatchingEvent(eventCode: string): { token: string; accessCode: string; allowDownload?: boolean } | null {
  if (!eventCode) return null;
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (!raw) return null;
    const events: Array<{ token: string; accessCode: string; allowDownload?: boolean }> = JSON.parse(raw);
    if (!Array.isArray(events)) return null;
    const code = eventCode.trim().toUpperCase();
    const found = events.find(e => 
      e.accessCode.toUpperCase() === code || 
      e.token.toUpperCase() === code || 
      e.token.toLowerCase() === eventCode.trim().toLowerCase()
    );
    return found ? { token: found.token, accessCode: found.accessCode, allowDownload: found.allowDownload } : null;
  } catch {
    return null;
  }
}

/**
 * Gets all photos specifically stored for a given event access code or token.
 */
export function getEventPhotos(eventCode: string): StoredPhoto[] {
  if (!eventCode) return [];
  try {
    const code = eventCode.trim().toUpperCase();
    const key = `${STORAGE_PREFIX}${code}`;
    const raw = localStorage.getItem(key);
    const photos: StoredPhoto[] = raw ? JSON.parse(raw) : [];

    // Also check token / accessCode mapping
    const match = findMatchingEvent(eventCode);
    if (match) {
      const otherCode = match.accessCode.toUpperCase() === code ? match.token.toUpperCase() : match.accessCode.toUpperCase();
      const otherRaw = localStorage.getItem(`${STORAGE_PREFIX}${otherCode}`);
      if (otherRaw) {
        const otherPhotos: StoredPhoto[] = JSON.parse(otherRaw);
        const seenIds = new Set(photos.map(p => p.id));
        otherPhotos.forEach(op => {
          if (!seenIds.has(op.id)) {
            photos.push(op);
            seenIds.add(op.id);
          }
        });
      }

      // Also pull from eventStorage media
      const mediaRaw = localStorage.getItem(`${MEDIA_PREFIX}${match.token}`);
      if (mediaRaw) {
        const mediaList: Array<{ id: string; src: string; title: string; album: string; capturedAt: string; timestamp: number; isFavorite?: boolean; type?: string }> = JSON.parse(mediaRaw);
        const seenIds = new Set(photos.map(p => p.id));
        mediaList.forEach(m => {
          if (m.type !== 'video' && !seenIds.has(m.id)) {
            photos.push({
              id: m.id,
              eventCode: match.accessCode,
              src: m.src,
              title: m.title || 'Photo',
              album: m.album || 'Wedding',
              capturedAt: m.capturedAt || '',
              timestamp: m.timestamp || Date.now(),
              isFavorite: m.isFavorite || false,
            });
            seenIds.add(m.id);
          }
        });
      }
    }

    return Array.isArray(photos) ? photos : [];
  } catch (err) {
    console.error(`Failed to load photos for event ${eventCode}:`, err);
    return [];
  }
}

/**
 * Saves a new photo to a specific event's isolated gallery and synchronizes to eventStorage.
 */
export function saveEventPhoto(eventCode: string, photo: Omit<StoredPhoto, 'id' | 'eventCode' | 'timestamp'>): StoredPhoto {
  const code = eventCode.trim().toUpperCase();
  const key = `${STORAGE_PREFIX}${code}`;
  const existing = getEventPhotos(code);

  const newPhoto: StoredPhoto = {
    ...photo,
    id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    eventCode: code,
    timestamp: Date.now(),
  };

  // Prepend so newest is first
  const updated = [newPhoto, ...existing.filter(p => p.id !== newPhoto.id)];
  try {
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.error(`Storage error for event ${eventCode}:`, err);
    if (existing.length > 5) {
      const trimmed = [newPhoto, ...existing.slice(0, 10)];
      localStorage.setItem(key, JSON.stringify(trimmed));
    }
  }

  // Synchronize to the matching event token in eventStorage
  const match = findMatchingEvent(eventCode);
  if (match) {
    try {
      const mediaKey = `${MEDIA_PREFIX}${match.token}`;
      const existingMediaRaw = localStorage.getItem(mediaKey);
      const existingMedia: Array<any> = existingMediaRaw ? JSON.parse(existingMediaRaw) : [];
      const newMediaItem = {
        id: newPhoto.id,
        eventToken: match.token,
        src: newPhoto.src,
        type: 'photo',
        title: newPhoto.title,
        album: newPhoto.album || 'Photos',
        mimeType: 'image/jpeg',
        capturedAt: newPhoto.capturedAt,
        timestamp: newPhoto.timestamp,
        isFavorite: newPhoto.isFavorite ?? false,
        allowDownload: match.allowDownload ?? true,
      };
      const updatedMedia = [newMediaItem, ...existingMedia.filter(m => m.id !== newPhoto.id)];
      localStorage.setItem(mediaKey, JSON.stringify(updatedMedia));

      // Also save to accessCode key if code was token
      localStorage.setItem(`${STORAGE_PREFIX}${match.accessCode.toUpperCase()}`, JSON.stringify(updated));
      localStorage.setItem(`${STORAGE_PREFIX}${match.token.toUpperCase()}`, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to sync photo to eventMedia:', err);
    }
  }

  return newPhoto;
}

/**
 * Deletes a photo from an event's gallery and syncs to eventStorage.
 */
export function deleteEventPhoto(eventCode: string, photoId: string): boolean {
  const code = eventCode.trim().toUpperCase();
  const key = `${STORAGE_PREFIX}${code}`;
  const existing = getEventPhotos(code);
  const updated = existing.filter(p => p.id !== photoId);
  try {
    localStorage.setItem(key, JSON.stringify(updated));

    const match = findMatchingEvent(eventCode);
    if (match) {
      const mediaKey = `${MEDIA_PREFIX}${match.token}`;
      const existingMediaRaw = localStorage.getItem(mediaKey);
      if (existingMediaRaw) {
        const existingMedia: Array<any> = JSON.parse(existingMediaRaw);
        localStorage.setItem(mediaKey, JSON.stringify(existingMedia.filter(m => m.id !== photoId)));
      }
      localStorage.setItem(`${STORAGE_PREFIX}${match.accessCode.toUpperCase()}`, JSON.stringify(updated));
      localStorage.setItem(`${STORAGE_PREFIX}${match.token.toUpperCase()}`, JSON.stringify(updated));
    }
    return true;
  } catch (err) {
    console.error(`Failed to delete photo ${photoId} from event ${eventCode}:`, err);
    return false;
  }
}

/**
 * Toggles the favorite status of a photo in an event.
 */
export function toggleEventPhotoFavorite(eventCode: string, photoId: string): boolean {
  const code = eventCode.trim().toUpperCase();
  const key = `${STORAGE_PREFIX}${code}`;
  const existing = getEventPhotos(code);
  let isFav = false;

  const updated = existing.map(p => {
    if (p.id === photoId) {
      isFav = !p.isFavorite;
      return { ...p, isFavorite: isFav };
    }
    return p;
  });

  try {
    localStorage.setItem(key, JSON.stringify(updated));

    const match = findMatchingEvent(eventCode);
    if (match) {
      const mediaKey = `${MEDIA_PREFIX}${match.token}`;
      const existingMediaRaw = localStorage.getItem(mediaKey);
      if (existingMediaRaw) {
        const existingMedia: Array<any> = JSON.parse(existingMediaRaw);
        const updatedMedia = existingMedia.map(m => m.id === photoId ? { ...m, isFavorite: isFav } : m);
        localStorage.setItem(mediaKey, JSON.stringify(updatedMedia));
      }
    }
  } catch (err) {
    console.error('Failed to update favorite status:', err);
  }

  return isFav;
}

/**
 * Get count of photos captured for a specific event
 */
export function getEventPhotoCount(eventCode: string): number {
  return getEventPhotos(eventCode).length;
}

/**
 * Updates a photo's metadata (e.g. title, album) in an event's gallery.
 */
export function updateEventPhoto(eventCode: string, photoId: string, updates: Partial<StoredPhoto>): boolean {
  const code = eventCode.trim().toUpperCase();
  const key = `${STORAGE_PREFIX}${code}`;
  const existing = getEventPhotos(code);
  const updated = existing.map(p => p.id === photoId ? { ...p, ...updates } : p);
  try {
    localStorage.setItem(key, JSON.stringify(updated));

    const match = findMatchingEvent(eventCode);
    if (match) {
      const mediaKey = `${MEDIA_PREFIX}${match.token}`;
      const existingMediaRaw = localStorage.getItem(mediaKey);
      if (existingMediaRaw) {
        const existingMedia: Array<any> = JSON.parse(existingMediaRaw);
        const updatedMedia = existingMedia.map(m => m.id === photoId ? { ...m, ...updates } : m);
        localStorage.setItem(mediaKey, JSON.stringify(updatedMedia));
      }
    }
    return true;
  } catch (err) {
    console.error('Failed to update photo:', err);
    return false;
  }
}
