# PhotoVault REST API Specification

This document details the REST API contracts, path structures, payload formats, and error handling for the PhotoVault backend service.

---

## Base URL
```
http://localhost:8080/api
```

---

## 1. System & Health
### `GET /api/health`
Returns the operational health, Java runtime, memory status, and database connectivity.
- **Access**: Public
- **Response (200 OK)**:
```json
{
  "status": "UP",
  "service": "PhotoVault API",
  "version": "1.0.0",
  "javaVersion": "21.0.6",
  "timestamp": "2026-09-19T00:56:00Z",
  "database": "CONNECTED",
  "storage": "READY"
}
```

---

## 2. Authentication (`/api/auth`)

### `POST /api/auth/register`
Photographer registration.
- **Request Body**:
```json
{
  "fullName": "Aarav Sharma",
  "email": "aarav@lenscraft.com",
  "password": "SecurePassword123!",
  "phone": "+91 98765 43210",
  "studioName": "Lenscraft Studios"
}
```
- **Response (201 Created)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "type": "Bearer",
  "user": {
    "id": 1,
    "email": "aarav@lenscraft.com",
    "fullName": "Aarav Sharma",
    "role": "ROLE_PHOTOGRAPHER",
    "studioName": "Lenscraft Studios"
  }
}
```

### `POST /api/auth/login`
Photographer login.
- **Request Body**:
```json
{
  "email": "aarav@lenscraft.com",
  "password": "SecurePassword123!"
}
```
- **Response (200 OK)**: Same as register response with valid JWT token.

---

## 3. Events (`/api/events`)

### `GET /api/events`
List all events created by the logged-in photographer.
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**: Array of Event objects with photo and album counts.

### `POST /api/events`
Create a new event.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "name": "Wedding of Rahul & Priya",
  "eventType": "WEDDING",
  "customerName": "Rahul & Priya Verma",
  "customerEmail": "rahul.priya@example.com",
  "customerPhone": "+91 98765 11223",
  "eventDate": "2026-12-15",
  "eventLocation": "The Grand Palace, Udaipur"
}
```
- **Response (201 Created)**: Event object including auto-generated `accessCode` (e.g. `WED-2026-X8K9`).

### `GET /api/events/{id}`
Fetch full details, albums, and photo statistics of an event.

### `PUT /api/events/{id}`
Update event metadata.

### `DELETE /api/events/{id}`
Delete event and associated photo records.

---

## 4. Albums (`/api/events/{eventId}/albums`)

### `GET /api/events/{eventId}/albums`
Retrieve albums for an event (e.g., All Photos, Wedding, Reception, Candid, Couple).

### `POST /api/events/{eventId}/albums`
Create a custom album.
- **Request Body**:
```json
{
  "name": "Haldi & Mehendi",
  "description": "Pre-wedding ceremonies"
}
```

---

## 5. Photos (`/api/events/{eventId}/photos`)

### `POST /api/events/{eventId}/photos/upload`
Upload batch photos.
- **Content-Type**: `multipart/form-data`
- **Form Data**:
  - `files`: Array of image binary files (JPEG, PNG, WEBP, etc.)
  - `albumId`: Optional target album ID
- **Response (200 OK)**:
```json
{
  "uploaded": 15,
  "failed": 0,
  "photos": [
    {
      "id": 101,
      "originalFilename": "IMG_4021.JPG",
      "thumbnailUrl": "/api/photos/101/thumbnail",
      "storageUrl": "/api/photos/101/original",
      "fileSizeBytes": 4520930,
      "uploadStatus": "COMPLETED"
    }
  ]
}
```

### `GET /api/events/{eventId}/photos`
Get paginated photos filtered by album.

---

## 6. Customer Gallery Access (`/api/gallery`)

### `POST /api/gallery/access`
Verify access code and obtain guest access session.
- **Request Body**:
```json
{
  "accessCode": "WED-2026-X8K9",
  "pin": "optional"
}
```
- **Response (200 OK)**:
```json
{
  "valid": true,
  "galleryToken": "gst_89a7f23c91...",
  "event": {
    "id": 1,
    "name": "Wedding of Rahul & Priya",
    "eventType": "WEDDING",
    "eventDate": "2026-12-15",
    "coverPhotoUrl": "/api/photos/cover.jpg",
    "photographerStudio": "Lenscraft Studios",
    "totalPhotos": 450
  }
}
```

### `GET /api/gallery/{accessCode}/photos`
Customer photo feed with pagination and album filters.

### `POST /api/gallery/{accessCode}/photos/{photoId}/favorite`
Toggle favorite state.

### `GET /api/gallery/{accessCode}/download`
Request download of selected photo IDs or complete album as a ZIP stream.
