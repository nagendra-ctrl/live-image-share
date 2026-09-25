# 📸 PhotoVault

> **A modern, high-performance web platform for event photographers and their clients.**  
> Effortlessly manage private event galleries, bulk photo uploads, instant QR code access, client favorites, and high-speed downloads for weddings, birthdays, receptions, corporate functions, and more.

---

## 🌟 Key Features

### For Photographers
- **Dashboard Analytics**: Real-time stats on total events, active galleries, total photo counts, and storage consumption.
- **Event Management**: Create and configure events with metadata (Event type, couple/client name, date, location, cover image) and unique gallery access codes (e.g. `WED-2026-X8K9`).
- **Custom Albums**: Organize events into sub-albums (*All Photos, Wedding, Reception, Candid, Couple, Family, Friends, or Custom*).
- **High-Volume Photo Upload**: Multi-file batch uploader with progress percentage, remaining counts, retry queue, and non-blocking background thumbnail generation.
- **Instant QR Code & Sharing**: Generate, view, and export high-resolution QR codes and private gallery links for direct customer sharing.

### For Customers (Guests & Clients)
- **Zero-Friction Access**: No complex registration required. Access galleries simply via a private link, gallery access code, or QR code scan.
- **Fluid Photo Experience**: Responsive, ultra-fast thumbnail grid with a distraction-free, full-screen lightbox photo viewer (zoom, keyboard navigation, previous/next).
- **Client Favorites**: One-click hearting to curate personal selection lists.
- **Smart Downloads**: Download single photos, selected favorites, or complete albums as a ZIP archive.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Backend** | Java 21 LTS & Spring Boot 3.3 | Enterprise-grade, type-safe REST API server |
| **Security** | Spring Security & JJWT | Stateless JWT authentication, role guards, BCrypt |
| **Persistence** | Spring Data JPA & Hibernate | Entity modeling and database management |
| **Database** | PostgreSQL (Primary) / H2 (Local Dev) | Relational storage for users, events, albums, metadata |
| **Storage Layer**| Storage Abstraction Layer (`StorageService`) | Decoupled local disk & cloud object storage (S3/R2 ready) |
| **Frontend** | React 18/19 & TypeScript | Dynamic, component-driven client architecture |
| **Build & Tooling**| Vite & Maven | Lightning-fast HMR and reliable compilation |
| **Styling** | Vanilla CSS Design System | Obsidian dark luxury theme with gold accents & micro-animations |

---

## 📁 Project Structure

```
PhotoVault/
├── frontend/                   # React + TypeScript + Vite Client
│   ├── src/
│   │   ├── assets/             # Branding, illustrations, icons
│   │   ├── components/         # Reusable UI widgets (Modals, Lightbox, Badges)
│   │   ├── hooks/              # Custom React hooks (useAuth, useGallery)
│   │   ├── layouts/            # Dashboard & Customer portal layouts
│   │   ├── pages/              # Primary views (Dashboard, Gallery, Viewer, Login)
│   │   ├── services/           # Axios/Fetch API client layer
│   │   ├── types/              # TypeScript interface definitions
│   │   ├── App.tsx             # Root application orchestrator
│   │   ├── index.css           # Luxury dark design tokens & styles
│   │   └── main.tsx            # React entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts          # API proxy to backend :8080
│
├── backend/                    # Spring Boot 3.3 Server
│   ├── src/main/java/com/photovault/
│   │   ├── config/             # Security, CORS, and storage configuration
│   │   ├── controller/         # REST API endpoints
│   │   ├── dto/                # Request / Response DTO models
│   │   ├── entity/             # JPA database entities
│   │   ├── exception/          # GlobalExceptionHandler and custom errors
│   │   ├── repository/         # Spring Data JPA repositories
│   │   ├── security/           # JWT filter, token provider, security context
│   │   ├── service/            # Core business and storage logic
│   │   └── PhotoVaultApplication.java
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── application-dev.properties
│   └── pom.xml                 # Maven dependencies
│
├── database/                   # Database DDL and seed scripts
│   ├── schema.sql              # PostgreSQL DDL table definitions
│   └── seed-data.sql           # Initial demo dataset
│
├── docs/                       # Architecture & API documentation
│   └── api-spec.md
│
├── storage/                    # Storage abstraction root (configurable)
│   ├── uploads/                # Full-resolution originals
│   └── thumbnails/             # Auto-generated preview thumbnails
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Java 21 LTS** installed (`java -version`)
- **Node.js 20+ / 22+** and **npm** installed (`node -v`, `npm -v`)
- **PostgreSQL 15+** (Optional for local development; embedded H2 is configured out of the box)

---

### Running the Backend

1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Build and run using the Maven wrapper:
   ```bash
   # Windows
   .\mvnw.cmd spring-boot:run

   # macOS / Linux
   ./mvnw spring-boot:run
   ```
3. The server starts at `http://localhost:8080`.
4. Check backend health:
   ```bash
   curl http://localhost:8080/api/health
   ```

---

### Running the Frontend

1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser at `http://localhost:5173`.

---

## 💾 Database Configuration

The application is configured to run out-of-the-box with an embedded H2 database (compatible with PostgreSQL syntax) or connect to your local/production PostgreSQL instance.

### Using PostgreSQL (Recommended for Production)
In `backend/src/main/resources/application.properties` (or via environment variables):
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/photovault
spring.datasource.username=postgres
spring.datasource.password=your_password
spring.jpa.hibernate.ddl-auto=update
```

---

## 🖼️ Photo Storage Architecture

PhotoVault implements a **Storage Abstraction Layer** (`StorageService` interface):
1. **Separation of Concerns**: High-resolution image binaries are **never** stored inside the relational database.
2. **Metadata vs. Binaries**:
   - The database stores lightweight metadata: file key, filename, content type, byte size, resolution dimensions, upload timestamp, event/album foreign keys.
   - The filesystem or object store manages raw bytes.
3. **Thumbnail Generation**: When an image is uploaded, a lightweight 600px preview thumbnail is generated automatically, saving massive bandwidth on client mobile devices.
4. **Cloud Migration**: To switch from local disk storage to AWS S3, Cloudflare R2, or Google Cloud Storage, implement the `StorageService` interface and set `photovault.storage.provider=s3`.

---

## 🔑 Environment Variables

| Variable | Description | Default |
|---|---|---|
| `SERVER_PORT` | Backend HTTP port | `8080` |
| `SPRING_PROFILES_ACTIVE` | Active Spring profile (`dev` or `prod`) | `dev` |
| `SPRING_DATASOURCE_URL` | PostgreSQL JDBC connection URL | `jdbc:postgresql://localhost:5432/photovault` |
| `SPRING_DATASOURCE_USERNAME` | Database username | `postgres` |
| `SPRING_DATASOURCE_PASSWORD` | Database password | `postgres` |
| `PHOTOVAULT_STORAGE_LOCATION` | Path to storage root folder | `../storage` |
| `JWT_SECRET` | 256-bit secret key for signing JWTs | *(Auto-generated default for dev)* |
| `JWT_EXPIRATION_MS` | JWT token validity window | `86400000` (24 hours) |

---

## 📡 API Overview

### Authentication
- `POST /api/auth/register` - Register a new photographer account
- `POST /api/auth/login` - Authenticate and receive JWT token

### Events (Photographer)
- `GET /api/events` - List all events for logged-in photographer
- `POST /api/events` - Create a new event with cover metadata
- `GET /api/events/{id}` - Get full event details & album hierarchy
- `PUT /api/events/{id}` - Update event metadata
- `DELETE /api/events/{id}` - Soft-delete or purge event

### Albums
- `GET /api/events/{eventId}/albums` - List albums for an event
- `POST /api/events/{eventId}/albums` - Create a new album
- `DELETE /api/albums/{albumId}` - Delete album

### Photos & Upload
- `POST /api/events/{eventId}/photos/upload` - Multipart batch photo upload
- `GET /api/events/{eventId}/photos` - Paginated photos with thumbnail URLs
- `DELETE /api/photos/{photoId}` - Delete photo

### Customer Gallery Access
- `POST /api/gallery/access` - Verify gallery access code (e.g. `WED-2026-X8K9`)
- `GET /api/gallery/{accessCode}` - Retrieve public customer gallery view
- `POST /api/photos/{photoId}/favorite` - Toggle photo favorite
- `GET /api/gallery/{accessCode}/favorites` - Retrieve customer favorites
- `GET /api/gallery/{accessCode}/download` - Download single or ZIP archive

---

## 🔮 Future Improvements
- AI-driven facial recognition to group photos by guest.
- Watermark overlay engine for photographer proofs.
- Direct print lab integration for customer physical album ordering.
- Multi-region CDN distribution for instant worldwide delivery.
