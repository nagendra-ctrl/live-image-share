-- ==========================================================
-- PhotoVault Database Schema (PostgreSQL)
-- Supports Photographers, Private Event Galleries, Albums,
-- Photos, Access Security, Favorites, and Downloads.
-- ==========================================================

-- Enable UUID extension if supported
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table (Authentication for Photographers / Staff)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL DEFAULT 'ROLE_PHOTOGRAPHER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Photographer Profiles
CREATE TABLE IF NOT EXISTS photographer_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    studio_name VARCHAR(200),
    website VARCHAR(255),
    bio TEXT,
    storage_used_bytes BIGINT NOT NULL DEFAULT 0,
    storage_quota_bytes BIGINT NOT NULL DEFAULT 53687091200, -- 50 GB default
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Events Table
CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    photographer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL, -- Wedding, Engagement, Birthday, Reception, Party, Corporate, Other
    customer_name VARCHAR(200) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    event_date DATE NOT NULL,
    event_location VARCHAR(255),
    cover_photo_path VARCHAR(500),
    access_code VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'WED-2026-X8K9' or 'PHOTO-2026-ABCD'
    pin_code VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup on customer access
CREATE INDEX IF NOT EXISTS idx_events_access_code ON events(access_code);
CREATE INDEX IF NOT EXISTS idx_events_photographer ON events(photographer_id);

-- 4. Albums Table (Sub-albums within an event)
CREATE TABLE IF NOT EXISTS albums (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL, -- 'All Photos', 'Wedding', 'Reception', 'Candid', etc.
    description VARCHAR(500),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_albums_event_id ON albums(event_id);

-- 5. Photos Table
CREATE TABLE IF NOT EXISTS photos (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    album_id BIGINT REFERENCES albums(id) ON DELETE SET NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    thumbnail_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    width INTEGER,
    height INTEGER,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    upload_status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED', -- PENDING, PROCESSING, COMPLETED, FAILED
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_photos_event_id ON photos(event_id);
CREATE INDEX IF NOT EXISTS idx_photos_album_id ON photos(album_id);

-- 6. Favorites Table (Customer hearting photos)
CREATE TABLE IF NOT EXISTS favorites (
    id BIGSERIAL PRIMARY KEY,
    photo_id BIGINT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    client_identifier VARCHAR(150) NOT NULL, -- Session token / customer email
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_favorite_photo_client UNIQUE (photo_id, client_identifier)
);

CREATE INDEX IF NOT EXISTS idx_favorites_event_client ON favorites(event_id, client_identifier);

-- 7. Gallery Access Logs (Tracking QR scans and access code entries)
CREATE TABLE IF NOT EXISTS gallery_access_logs (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    access_code VARCHAR(50) NOT NULL,
    client_ip VARCHAR(100),
    user_agent VARCHAR(500),
    accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Downloads Table (Tracking download activity)
CREATE TABLE IF NOT EXISTS downloads (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    download_type VARCHAR(50) NOT NULL, -- SINGLE, ALBUM, FAVORITES, ALL
    target_id BIGINT, -- Photo ID or Album ID
    file_count INTEGER NOT NULL DEFAULT 1,
    client_identifier VARCHAR(150),
    downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
