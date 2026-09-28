/**
 * cloudSync.ts
 * Real-time cross-browser and cross-device cloud synchronization.
 * Synchronizes events and media across Chrome, Brave, Safari, and Mobile browsers.
 */

import type { LocalEvent, EventMedia } from './eventStorage';

// Stable global sync bucket for live-image-share
const SYNC_BUCKET_KEY = 'photovault_nagendra_shared_vault_v1';
const CLOUD_KV_BASE = `https://kvdb.io/6mFqZ3qP99kXyN4w3e7r1t/${SYNC_BUCKET_KEY}`;

export interface CloudPayload {
  events: LocalEvent[];
  mediaMap: Record<string, EventMedia[]>;
  updatedAt: number;
}

/**
 * Fetch latest shared events and media from the cloud
 */
export async function pullCloudData(): Promise<CloudPayload | null> {
  try {
    const res = await fetch(`${CLOUD_KV_BASE}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    const data: CloudPayload = await res.json();
    if (data && Array.isArray(data.events)) {
      return data;
    }
    return null;
  } catch (err) {
    console.debug('Cloud sync pull note (using local cache):', err);
    return null;
  }
}

/**
 * Push current events and media to the cloud
 */
export async function pushCloudData(payload: CloudPayload): Promise<boolean> {
  try {
    const res = await fetch(`${CLOUD_KV_BASE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.debug('Cloud sync push note (saved locally):', err);
    return false;
  }
}

/**
 * Synchronize local storage with cloud:
 * 1. Reads local events & media
 * 2. Fetches cloud data
 * 3. Merges them (union by token / id)
 * 4. Saves merged result to both localStorage and cloud
 */
export async function syncAllData(): Promise<{ events: LocalEvent[]; updated: boolean }> {
  const EVENTS_KEY = 'photovault_local_events';
  const MEDIA_PREFIX = 'photovault_media_';

  // 1. Get current local events
  let localEvents: LocalEvent[] = [];
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (raw) localEvents = JSON.parse(raw);
  } catch { /* ignore */ }

  // 2. Pull cloud events
  const cloudData = await pullCloudData();

  if (!cloudData) {
    // If cloud is empty or first run, push local events to cloud
    if (localEvents.length > 0) {
      const mediaMap: Record<string, EventMedia[]> = {};
      localEvents.forEach(e => {
        try {
          const mRaw = localStorage.getItem(`${MEDIA_PREFIX}${e.token}`);
          if (mRaw) mediaMap[e.token] = JSON.parse(mRaw);
        } catch { /* ignore */ }
      });
      await pushCloudData({
        events: localEvents,
        mediaMap,
        updatedAt: Date.now(),
      });
    }
    return { events: localEvents, updated: false };
  }

  // 3. Merge events (cloud + local)
  const eventMap = new Map<string, LocalEvent>();
  (cloudData.events || []).forEach(e => {
    if (e && e.token) eventMap.set(e.token, e);
  });
  localEvents.forEach(e => {
    if (e && e.token) {
      // Local event exists: keep or update
      eventMap.set(e.token, e);
    }
  });

  const mergedEvents = Array.from(eventMap.values());

  // Save merged events to localStorage
  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(mergedEvents));
  } catch { /* ignore */ }

  // 4. Merge media
  const mergedMediaMap: Record<string, EventMedia[]> = cloudData.mediaMap || {};
  mergedEvents.forEach(e => {
    try {
      const mRaw = localStorage.getItem(`${MEDIA_PREFIX}${e.token}`);
      const localMediaList: EventMedia[] = mRaw ? JSON.parse(mRaw) : [];
      const cloudMediaList: EventMedia[] = mergedMediaMap[e.token] || [];

      const mediaItemMap = new Map<string, EventMedia>();
      cloudMediaList.forEach(m => mediaItemMap.set(m.id, m));
      localMediaList.forEach(m => mediaItemMap.set(m.id, m));

      const mergedList = Array.from(mediaItemMap.values());
      mergedMediaMap[e.token] = mergedList;
      localStorage.setItem(`${MEDIA_PREFIX}${e.token}`, JSON.stringify(mergedList));
    } catch { /* ignore */ }
  });

  // 5. Update cloud with full merged payload
  await pushCloudData({
    events: mergedEvents,
    mediaMap: mergedMediaMap,
    updatedAt: Date.now(),
  });

  return { events: mergedEvents, updated: true };
}
