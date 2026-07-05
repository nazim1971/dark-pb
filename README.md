# Dark Lab Records — Music Publishing API

NestJS backend for the **Music Publishing Administration Platform**.

- **Framework:** NestJS 10 + TypeScript  
- **Database:** PostgreSQL via Prisma  
- **Auth:** JWT access token + HTTP-only refresh cookie  
- **Validation:** Zod (runtime) + class-validator (Swagger DTOs)  
- **Docs:** Swagger UI at `/docs`

---

## Quick start

```bash
cd Server
cp .env.example .env
# Edit .env with your database URL, JWT secrets, and support contact details

npm install
npx prisma migrate deploy
npx prisma generate
npm run seed        # optional
npm run dev         # http://localhost:3000
```

Swagger: `http://localhost:3000/docs`

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection URL |
| `DIRECT_URL` | Yes | Direct DB URL (migrations) |
| `JWT_ACCESS_SECRET` | Yes | Min 32 characters |
| `JWT_REFRESH_SECRET` | Yes | Min 32 characters |
| `JWT_ACCESS_EXPIRATION` | Yes | e.g. `15m` |
| `JWT_REFRESH_EXPIRATION` | Yes | e.g. `7d` |
| `COOKIE_SECRET` | Yes | Min 32 characters |
| `SUPPORT_EMAIL` | Yes | Support email shown to users |
| `SUPPORT_WHATSAPP` | Yes | WhatsApp number (e.g. `+447700900123`) |
| `PORT` | No | Default `3000` |
| `CORS_ORIGINS` | No | Comma-separated origins |
| `REQUEST_BODY_LIMIT` | No | Default `1mb` |

---

## Authentication

All routes except `@Public()` endpoints require:

```http
Authorization: Bearer <access_token>
```

Refresh token is stored in a signed HTTP-only cookie on `/auth` routes.

### Roles

`SONGWRITER` · `PUBLISHER` · `RECORD_LABEL` · `ADMIN`  
(Also `COMPOSER` / `ARTIST` in schema for legacy accounts.)

### KYC gate

Users must have **VERIFIED** KYC before creating/updating songs, writers, royalties, etc.  
`GET` requests and auth/KYC/profile routes are exempt.

---

## Response format

### Success

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": { },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

### Paginated list

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "items": [],
    "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 1 }
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

Some admin/royalty endpoints use `"data"` instead of `"items"` — same `meta` shape.

### Error

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2026-07-05T15:00:00.000Z",
  "path": "/songs",
  "requestId": "uuid",
  "details": [{ "path": "writers", "message": "Total split percentage must equal exactly 100%", "code": "custom" }]
}
```

---

## API reference

Base URL: `http://localhost:3000`

Legend: **Public** = no token · **Auth** = any logged-in user · **Admin** = `ADMIN` role

---

### Health

#### `GET /` — Public

```json
{
  "success": true,
  "message": "Dark Lab Records API Running"
}
```

---

### Auth (`/auth`)

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/auth/register` | Public | Register account |
| POST | `/auth/login` | Public | Login |
| POST | `/auth/refresh` | Public | Refresh access token (cookie) |
| POST | `/auth/logout` | Public | Logout |
| POST | `/auth/forgot-password` | Public | Request reset token |
| POST | `/auth/reset-password` | Public | Reset password |
| POST | `/auth/send-verification-email` | Auth | Send verification email |
| POST | `/auth/verify-email` | Public | Verify email token |

**POST `/auth/register` — Songwriter (individual)**

```json
{
  "email": "writer@example.com",
  "password": "SecurePass123!",
  "role": "SONGWRITER",
  "registrationType": "INDIVIDUAL",
  "legalFirstName": "Jane",
  "legalLastName": "Doe",
  "stageName": "JD",
  "country": "GB",
  "phone": "+447700900000",
  "dateOfBirth": "1990-05-15",
  "pro": "PRS",
  "ipiNumber": "00123456789"
}
```

**POST `/auth/register` — Publisher (company)**

```json
{
  "email": "admin@publisher.com",
  "password": "SecurePass123!",
  "role": "PUBLISHER",
  "registrationType": "COMPANY",
  "companyLegalName": "Acme Publishing Ltd",
  "representativeName": "John Smith",
  "country": "GB",
  "registrationNumber": "12345678",
  "vatNumber": "GB123456789",
  "website": "https://acmepublishing.com",
  "phone": "+447700900001",
  "address": "10 Music Street, London"
}
```

**POST `/auth/login`**

```json
{
  "email": "writer@example.com",
  "password": "SecurePass123!"
}
```

**Response (register / login / refresh)**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresIn": "15m",
    "user": {
      "id": "uuid",
      "email": "writer@example.com",
      "firstName": "Jane",
      "lastName": "Doe",
      "role": "SONGWRITER",
      "status": "ACTIVE",
      "kycStatus": "PENDING"
    }
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

**POST `/auth/forgot-password`**

```json
{ "email": "writer@example.com" }
```

**POST `/auth/reset-password`**

```json
{
  "token": "reset-token-from-email",
  "password": "NewSecurePass123!"
}
```

---

### Users (`/users`) — Auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/me` | Current profile |
| GET | `/users/me/account-settings` | Account settings |
| PATCH | `/users/me/profile` | Update profile |
| PATCH | `/users/me/account-settings` | Update settings |
| PATCH | `/users/me/change-password` | Change password |
| PATCH | `/users/:id/status` | Admin: suspend/activate |

**PATCH `/users/me/profile`**

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "stageName": "JD",
  "country": "GB",
  "phone": "+447700900000",
  "pro": "PRS",
  "ipiNumber": "00123456789"
}
```

**PATCH `/users/me/change-password`**

```json
{
  "currentPassword": "SecurePass123!",
  "newPassword": "NewSecurePass456!"
}
```

---

### KYC (`/kyc`) — Auth

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/kyc/submit` | Auth | Submit KYC |
| GET | `/kyc/me` | Auth | My KYC status |
| GET | `/kyc/pending` | Admin | List pending KYC |

**POST `/kyc/submit`**

```json
{
  "documentType": "PASSPORT",
  "documentNumber": "AB1234567",
  "country": "GB",
  "notes": "First submission"
}
```

---

### Writers (`/writers`) — Auth + KYC

| Method | Path | Description |
|--------|------|-------------|
| POST | `/writers` | Create writer |
| GET | `/writers` | List (paginated) |
| GET | `/writers/:id` | Get by ID |
| PATCH | `/writers/:id` | Update |
| DELETE | `/writers/:id` | Soft delete |

**POST `/writers`**

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "pro": "PRS",
  "ipiNumber": "00123456789",
  "dob": "1990-05-15"
}
```

**GET `/writers?page=1&limit=20&q=jane`**

---

### Songs (`/songs`) — Auth + KYC

| Method | Path | Description |
|--------|------|-------------|
| POST | `/songs` | Register song |
| GET | `/songs` | List (paginated) |
| GET | `/songs/:id` | Get by ID |
| PATCH | `/songs/:id` | Update |
| DELETE | `/songs/:id` | Soft delete |

**POST `/songs`**

```json
{
  "released": true,
  "spotifyUrl": "https://open.spotify.com/track/abc123",
  "songTitle": "Midnight Drive",
  "alternativeTitle": "Midnight",
  "artistName": "JD",
  "language": "English",
  "isrc": "GBUM71234567",
  "duration": 210,
  "lyrics": "Verse 1...",
  "releaseDate": "2025-06-01",
  "status": "SUBMITTED",
  "writers": [
    { "writerId": "writer-uuid-1", "splitPercentage": 60 },
    { "writerId": "writer-uuid-2", "splitPercentage": 40 }
  ]
}
```

> Writer splits must total **exactly 100%**.  
> `spotifyUrl` is required when `released` is `true`.

**GET `/songs?page=1&limit=20&q=midnight&status=SUBMITTED`**

---

### Royalties (`/royalties`) — Auth

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/royalties` | Admin | Create royalty |
| GET | `/royalties` | Auth | List (scoped to owner unless admin) |
| GET | `/royalties/analytics` | Auth | Analytics |
| GET | `/royalties/export` | Auth | Export CSV/Excel/PDF |
| GET | `/royalties/:id` | Auth | Get by ID |
| PATCH | `/royalties/:id` | Admin | Update |
| DELETE | `/royalties/:id` | Admin | Soft delete |

**POST `/royalties`** (Admin)

```json
{
  "compositionId": "song-uuid",
  "writerId": "writer-uuid",
  "type": "PERFORMANCE",
  "dsp": "Spotify",
  "country": "GB",
  "royaltyDate": "2026-01-15",
  "totalViews": 150000,
  "grossAmount": 1250.5,
  "currency": "USD",
  "adminSharePercentage": 15
}
```

**GET `/royalties?year=2026&month=1&dsp=Spotify&page=1&limit=20`**

---

### Statements (`/statements`) — Auth

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/statements/generate` | Admin | Generate statement |
| GET | `/statements` | Auth | List |
| GET | `/statements/export` | Admin | Bulk export |
| GET | `/statements/:id` | Auth | Get by ID |
| GET | `/statements/:id/export` | Auth | Download PDF/CSV/CWR |

**POST `/statements/generate`** (Admin)

```json
{
  "periodStart": "2026-01-01",
  "periodEnd": "2026-01-31",
  "userId": "user-uuid",
  "currency": "USD"
}
```

**GET `/statements/:id/export?format=pdf`**

---

### Notifications (`/notifications`) — Auth

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/notifications` | Admin | Create notification |
| GET | `/notifications` | Auth | List my notifications |
| PATCH | `/notifications/:id/read` | Auth | Mark as read |
| PATCH | `/notifications/read-all` | Auth | Mark all read |

**POST `/notifications`** (Admin)

```json
{
  "userId": "user-uuid",
  "category": "ANNOUNCEMENT",
  "title": "Platform maintenance",
  "message": "Scheduled maintenance on Sunday 2am UTC."
}
```

---

### Support (`/support`)

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/support/contact` | Public | Email & WhatsApp contact info |

**GET `/support/contact`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "email": "support@darklabrecords.com",
    "whatsapp": "+447700900123",
    "whatsappUrl": "https://wa.me/447700900123",
    "message": "Contact our support team by email or WhatsApp."
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

### Search (`/search`) — Auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/search` | Global search |

**GET `/search?q=midnight&types=song,writer&page=1&limit=20`**

- **Users:** songs, writers  
- **Admin:** also users, publishers (user accounts), record labels

---

### Admin (`/admin`) — Admin only

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/dashboard/stats` | Dashboard counts |
| GET | `/admin/dashboard/analytics` | Time-series analytics |
| GET | `/admin/users` | List users |
| PATCH | `/admin/users/:id/activate` | Activate user |
| PATCH | `/admin/users/:id/suspend` | Suspend user |
| GET | `/admin/kyc` | List KYC records |
| PATCH | `/admin/kyc/:id/approve` | Approve KYC |
| PATCH | `/admin/kyc/:id/verify` | Verify KYC (alias) |
| PATCH | `/admin/kyc/:id/reject` | Reject KYC |
| GET | `/admin/songs` | List all songs |
| PATCH | `/admin/songs/:id/status` | Update song status |
| PATCH | `/admin/songs/:id/metadata` | Edit song metadata |
| PATCH | `/admin/songs/:id/iswc` | Add ISWC |
| PATCH | `/admin/writers/:id/ipi` | Add writer IPI |
| GET | `/admin/royalties` | List royalties |
| GET | `/admin/statements` | List statements |
| PATCH | `/admin/statements/:id/status` | Update statement status |
| GET | `/admin/reports/dashboard` | Admin report summary |
| GET | `/admin/reports/activity` | Audit activity log |
| GET | `/admin/reports/export` | Export CSV or CWR |

**PATCH `/admin/songs/:id/status`**

```json
{
  "status": "REGISTERED",
  "note": "All documents verified"
}
```

Song status values: `SUBMITTED` · `PROCESSING` · `REGISTERED`

**PATCH `/admin/songs/:id/metadata`**

```json
{
  "songTitle": "Midnight Drive (Remaster)",
  "language": "English",
  "genre": "Pop",
  "isrc": "GBUM71234567",
  "spotifyUrl": "https://open.spotify.com/track/abc123"
}
```

**PATCH `/admin/songs/:id/iswc`**

```json
{ "iswc": "T-123456789-0" }
```

**PATCH `/admin/kyc/:id/approve`**

```json
{ "note": "Documents verified" }
```

---

### Reports (`/reports`) — Admin only

| Method | Path | Description |
|--------|------|-------------|
| GET | `/reports/royalties` | Royalty report + analytics |
| GET | `/reports/royalties/export` | Export royalties |
| GET | `/reports/statements` | Statement report |
| GET | `/reports/statements/export` | Export statements |

**GET `/reports/royalties/export?format=csv&year=2026&month=1`**

---

## Project structure

```
src/
├── auth/           # JWT auth, registration, guards
├── users/          # Profile & account settings
├── kyc/            # KYC submission & review
├── writers/        # Writer CRUD
├── songs/          # Song registration (Composition model)
├── royalties/      # Royalty management
├── statements/     # Statement generation & export
├── notifications/  # In-app notifications
├── support/        # Contact info (email + WhatsApp)
├── search/         # Global search
├── admin/          # Admin dashboard & management
├── reports/        # Admin reports & exports
├── common/         # Filters, middleware, validation helpers
├── shared/         # Shared enums & constants
└── prisma/         # Prisma service & query helpers
```

---

## Database

```bash
npx prisma migrate deploy   # apply migrations
npx prisma generate         # regenerate client
npx prisma studio           # GUI explorer
npm run seed                # seed admin user (optional)
```

### Core models

`User` · `Company` · `KYC` · `Composition` (songs) · `CompositionWriter` · `Writer` · `Lyrics` · `Royalty` · `Statement` · `Notification` · `AuditLog` · `Session`

---

## Testing tips

1. Register → login → copy `accessToken`
2. Submit KYC → admin approves → register songs
3. Create writers first, then attach them to songs with 100% split
4. Use Swagger at `/docs` for interactive testing
5. Export endpoints return file downloads (not JSON wrappers)

### Example curl

```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}'

# List songs
curl http://localhost:3000/songs?page=1&limit=10 \
  -H "Authorization: Bearer <accessToken>"

# Support contact (no auth)
curl http://localhost:3000/support/contact
```

---

## Production checklist

- [ ] Set strong JWT and cookie secrets (32+ chars)
- [ ] Set `CORS_ORIGINS` to your frontend domain(s)
- [ ] Set `SUPPORT_EMAIL` and `SUPPORT_WHATSAPP`
- [ ] Run `npx prisma migrate deploy`
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS (required for secure cookies)
