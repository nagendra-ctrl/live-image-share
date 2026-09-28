export type EventType =
  | 'WEDDING'
  | 'ENGAGEMENT'
  | 'RECEPTION'
  | 'BIRTHDAY'
  | 'PARTY'
  | 'CORPORATE'
  | 'OTHER';

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  javaVersion: string;
  activeProfile: string;
  database: string;
  storage: string;
  uptimeMs: number;
  systemMetrics: {
    availableProcessors?: number;
    freeMemoryMb?: number;
    totalMemoryMb?: number;
    osName?: string;
  };
  timestamp: string;
}

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: 'ROLE_PHOTOGRAPHER' | 'ROLE_ADMIN' | 'ROLE_CUSTOMER';
  phone?: string;
  studioName?: string;
}

export interface Album {
  id: number;
  name: string;
  description?: string;
  isDefault: boolean;
  displayOrder: number;
  photoCount?: number;
}

export interface PhotoVaultEvent {
  id: number;
  eventName: string;
  eventType: EventType;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  eventDate: string;
  location?: string;
  description?: string;
  coverImage?: string;
  accessCode: string;
  instagramHandle?: string;
  whatsappNumber?: string;
  isActive: boolean;
  viewCount: number;
  photoCount: number;
  albumCount: number;
  albums?: Album[];
  createdAt: string;
  updatedAt?: string;
}

export interface CreateEventData {
  eventName: string;
  eventType: EventType;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  eventDate: string;
  location?: string;
  description?: string;
  coverImage?: string;
  instagramHandle?: string;
  whatsappNumber?: string;
}

export interface Photo {
  id: number;
  eventId: number;
  albumId?: number;
  originalFilename: string;
  storagePath: string;
  thumbnailPath: string;
  fileSizeBytes: number;
  mimeType: string;
  width?: number;
  height?: number;
  isHidden: boolean;
  uploadStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  isFavorite?: boolean;
  createdAt: string;
}
