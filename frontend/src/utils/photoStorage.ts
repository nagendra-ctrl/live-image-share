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

/**
 * Gets all photos specifically stored for a given event access code.
 */
export function getEventPhotos(eventCode: string): StoredPhoto[] {
  if (!eventCode) return [];
  try {
    const key = `${STORAGE_PREFIX}${eventCode.trim().toUpperCase()}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: StoredPhoto[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error(`Failed to load photos for event ${eventCode}:`, err);
    return [];
  }
}

/**
 * Saves a new photo to a specific event's isolated gallery.
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
  const updated = [newPhoto, ...existing];
  try {
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.error(`Storage error for event ${eventCode}:`, err);
    // If quota exceeded, remove oldest half
    if (existing.length > 5) {
      const trimmed = [newPhoto, ...existing.slice(0, 10)];
      localStorage.setItem(key, JSON.stringify(trimmed));
    }
  }

  return newPhoto;
}

/**
 * Deletes a photo from an event's gallery.
 */
export function deleteEventPhoto(eventCode: string, photoId: string): boolean {
  const code = eventCode.trim().toUpperCase();
  const key = `${STORAGE_PREFIX}${code}`;
  const existing = getEventPhotos(code);
  const updated = existing.filter(p => p.id !== photoId);
  try {
    localStorage.setItem(key, JSON.stringify(updated));
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
    return true;
  } catch (err) {
    console.error('Failed to update photo:', err);
    return false;
  }
}

