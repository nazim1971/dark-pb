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

Legend: **Public** = no token · **Auth** = any logged-in user · **Admin** = `ADMIN` role · **KYC** = verified KYC required for writes

> Unless noted, JSON responses are wrapped as `{ success, message, data, timestamp }`.  
> **Export** endpoints return a file download (`Content-Disposition: attachment`) — not JSON.

---

### Health

#### `GET /` — Public

Health check. No request body.

**Response `200`**

```json
{
  "success": true,
  "message": "Dark Lab Records API Running"
}
```

```bash
curl http://localhost:3000/
```

---

### Auth (`/auth`)

#### `POST /auth/register` — Public

Register a new account (individual or company).

**Request — Songwriter (individual)**

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

**Request — Publisher (company)**

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

**Response `201`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresIn": "15m",
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "writer@example.com",
      "firstName": "Jane",
      "lastName": "Doe",
      "role": "SONGWRITER",
      "createdAt": "2026-07-05T15:00:00.000Z",
      "updatedAt": "2026-07-05T15:00:00.000Z"
    }
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

Sets an HTTP-only `refreshToken` cookie on `/auth`.

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"writer@example.com","password":"SecurePass123!","role":"SONGWRITER","registrationType":"INDIVIDUAL","legalFirstName":"Jane","legalLastName":"Doe","country":"GB"}'
```

---

#### `POST /auth/login` — Public

**Request**

```json
{
  "email": "writer@example.com",
  "password": "SecurePass123!"
}
```

**Response `200`** — same shape as register (access token + user + refresh cookie).

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"writer@example.com","password":"SecurePass123!"}'
```

---

#### `POST /auth/refresh` — Public

Refresh the access token using the signed refresh cookie. No request body.

**Response `200`** — same shape as login.

```bash
curl -X POST http://localhost:3000/auth/refresh -b cookies.txt
```

---

#### `POST /auth/logout` — Public

Invalidate the refresh session and clear the cookie. No request body.

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "message": "Logged out successfully"
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

```bash
curl -X POST http://localhost:3000/auth/logout -b cookies.txt
```

---

#### `POST /auth/forgot-password` — Public

**Request**

```json
{
  "email": "writer@example.com"
}
```

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "message": "If an account exists for this email, a password reset link has been sent"
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `POST /auth/reset-password` — Public

**Request**

```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass123!"
}
```

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "message": "Password reset successfully"
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `POST /auth/send-verification-email` — Auth

Send an email verification token to the logged-in user. No request body.

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "message": "Verification email sent"
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

```bash
curl -X POST http://localhost:3000/auth/send-verification-email \
  -H "Authorization: Bearer <accessToken>"
```

---

#### `POST /auth/verify-email` — Public

**Request**

```json
{
  "token": "verification-token-from-email"
}
```

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "message": "Email verified successfully"
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

### Users (`/users`) — Auth

#### `GET /users/me` — Auth

Get the current user's profile. No request body.

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "writer@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "role": "SONGWRITER",
    "status": "ACTIVE",
    "registrationType": "INDIVIDUAL",
    "stageName": "JD",
    "country": "GB",
    "phone": "+447700900000",
    "pro": "PRS",
    "ipiNumber": "00123456789",
    "createdAt": "2026-07-05T15:00:00.000Z",
    "updatedAt": "2026-07-05T15:00:00.000Z"
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `GET /users/me/account-settings` — Auth

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "writer@example.com",
    "country": "GB",
    "phone": "+447700900000",
    "status": "ACTIVE",
    "role": "SONGWRITER",
    "registrationType": "INDIVIDUAL",
    "company": null
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `PATCH /users/me/profile` — Auth

**Request** (all fields optional)

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

**Response `200`** — updated profile (same shape as `GET /users/me`).

---

#### `PATCH /users/me/account-settings` — Auth

**Request** (all fields optional)

```json
{
  "email": "newemail@example.com",
  "country": "US",
  "phone": "+15551234567",
  "companyLegalName": "Acme Publishing Ltd",
  "representativeName": "John Smith",
  "registrationNumber": "12345678",
  "vatNumber": "GB123456789",
  "website": "https://acmepublishing.com"
}
```

**Response `200`** — updated account settings (same shape as `GET /users/me/account-settings`).

---

#### `PATCH /users/me/change-password` — Auth

**Request**

```json
{
  "currentPassword": "SecurePass123!",
  "newPassword": "NewSecurePass456!"
}
```

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "message": "Password changed successfully"
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `PATCH /users/:id/status` — Admin

**Request**

```json
{
  "status": "SUSPENDED",
  "reason": "Terms of service violation"
}
```

Status values: `ACTIVE` · `SUSPENDED`

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "id": "user-uuid",
    "email": "writer@example.com",
    "status": "SUSPENDED",
    "updatedAt": "2026-07-05T15:00:00.000Z"
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

### KYC (`/kyc`) — Auth

#### `POST /kyc/submit` — Auth

**Request**

```json
{
  "documentType": "PASSPORT",
  "documentNumber": "AB1234567",
  "country": "GB",
  "notes": "First submission"
}
```

**Response `201`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "id": "kyc-uuid",
    "userId": "user-uuid",
    "documentType": "PASSPORT",
    "documentNumber": "AB1234567",
    "country": "GB",
    "status": "PENDING",
    "notes": "First submission",
    "createdAt": "2026-07-05T15:00:00.000Z",
    "updatedAt": "2026-07-05T15:00:00.000Z"
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `GET /kyc/me` — Auth

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "status": "PENDING",
    "latestSubmission": {
      "id": "kyc-uuid",
      "documentType": "PASSPORT",
      "status": "PENDING",
      "submittedAt": "2026-07-05T15:00:00.000Z"
    }
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `GET /kyc/pending` — Admin

**Query:** `?page=1&limit=20`

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "items": [
      {
        "id": "kyc-uuid",
        "userId": "user-uuid",
        "documentType": "PASSPORT",
        "status": "PENDING",
        "user": {
          "email": "writer@example.com",
          "firstName": "Jane",
          "lastName": "Doe"
        }
      }
    ],
    "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

### Writers (`/writers`) — Auth + KYC

#### `POST /writers` — Auth + KYC

**Request**

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "pro": "PRS",
  "ipiNumber": "00123456789",
  "dob": "1990-05-15"
}
```

**Response `201`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "id": "writer-uuid",
    "userId": "user-uuid",
    "firstName": "Jane",
    "lastName": "Doe",
    "legalName": "Jane Doe",
    "pro": "PRS",
    "ipiNumber": "00123456789",
    "dob": "1990-05-15T00:00:00.000Z",
    "createdAt": "2026-07-05T15:00:00.000Z",
    "updatedAt": "2026-07-05T15:00:00.000Z"
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `GET /writers` — Auth + KYC

**Query:** `?page=1&limit=20&q=jane&pro=PRS&ipiNumber=00123456789`

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "items": [
      {
        "id": "writer-uuid",
        "firstName": "Jane",
        "lastName": "Doe",
        "legalName": "Jane Doe",
        "pro": "PRS",
        "ipiNumber": "00123456789"
      }
    ],
    "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `GET /writers/:id` — Auth + KYC

**Response `200`** — single writer object (same fields as create response).

---

#### `PATCH /writers/:id` — Auth + KYC

**Request** (all fields optional)

```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "pro": "ASCAP",
  "ipiNumber": "00987654321"
}
```

**Response `200`** — updated writer object.

---

#### `DELETE /writers/:id` — Auth + KYC

Soft-deletes the writer. No request body.

**Response `200`** — deleted writer record.

---

### Songs (`/songs`) — Auth + KYC

#### `POST /songs` — Auth + KYC

**Request**

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

> Writer splits must total **exactly 100%**. `spotifyUrl` is required when `released` is `true`.

**Response `201`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "id": "song-uuid",
    "songTitle": "Midnight Drive",
    "artistName": "JD",
    "released": true,
    "status": "SUBMITTED",
    "isrc": "GBUM71234567",
    "spotifyUrl": "https://open.spotify.com/track/abc123",
    "owner": {
      "id": "user-uuid",
      "email": "writer@example.com",
      "firstName": "Jane",
      "lastName": "Doe"
    },
    "writers": [
      {
        "writerId": "writer-uuid-1",
        "splitPercentage": 60,
        "writer": { "id": "writer-uuid-1", "firstName": "Jane", "lastName": "Doe" }
      }
    ],
    "lyrics": { "content": "Verse 1..." },
    "createdAt": "2026-07-05T15:00:00.000Z",
    "updatedAt": "2026-07-05T15:00:00.000Z"
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `GET /songs` — Auth + KYC

**Query:** `?page=1&limit=20&q=midnight&status=SUBMITTED&released=true&language=English`

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "items": [
      {
        "id": "song-uuid",
        "songTitle": "Midnight Drive",
        "artistName": "JD",
        "status": "SUBMITTED",
        "released": true
      }
    ],
    "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `GET /songs/:id` — Auth + KYC

**Response `200`** — full song with owner, writers, and lyrics (same shape as create response).

---

#### `PATCH /songs/:id` — Auth + KYC

**Request** (partial update; splits must still total 100% if `writers` is provided)

```json
{
  "songTitle": "Midnight Drive (Radio Edit)",
  "duration": 195,
  "writers": [
    { "writerId": "writer-uuid-1", "splitPercentage": 100 }
  ]
}
```

**Response `200`** — updated song object.

---

#### `DELETE /songs/:id` — Auth + KYC

Soft-deletes the song. No request body.

**Response `200`** — deleted song record.

---

### Royalties (`/royalties`) — Auth

#### `POST /royalties` — Admin

**Request**

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

DSP values: `Spotify` · `Apple Music` · `YouTube` · `TikTok` · `Meta` · `Other`

**Response `201`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "id": "royalty-uuid",
    "compositionId": "song-uuid",
    "type": "PERFORMANCE",
    "status": "PENDING",
    "sourceDsp": "Spotify",
    "country": "GB",
    "amount": "1250.50",
    "sharePercentage": "15.00",
    "currency": "USD",
    "createdAt": "2026-07-05T15:00:00.000Z"
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `GET /royalties` — Auth

**Query:** `?page=1&limit=20&year=2026&month=1&dsp=Spotify&country=GB&type=PERFORMANCE&status=PENDING`

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "data": [
      {
        "id": "royalty-uuid",
        "type": "PERFORMANCE",
        "status": "PENDING",
        "song": "Midnight Drive",
        "compositionId": "song-uuid",
        "sourceDsp": "Spotify",
        "country": "GB",
        "periodYear": 2026,
        "periodMonth": 1,
        "grossAmount": 1250.5,
        "adminSharePercentage": 15,
        "adminIncome": 187.58,
        "ownerIncome": 1062.92,
        "currency": "USD"
      }
    ],
    "meta": { "page": 1, "limit": 20, "total": 1 },
    "summary": {
      "totalGrossAmount": 1250.5,
      "totalAdminIncome": 187.58,
      "totalOwnerIncome": 1062.92,
      "currency": "USD",
      "recordCount": 1
    }
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `GET /royalties/analytics` — Auth

**Query:** `?year=2026&month=1&dsp=Spotify`

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "totals": {
      "grossAmount": 1250.5,
      "averageAdminSharePercentage": 15,
      "recordCount": 1
    },
    "byType": [
      { "type": "PERFORMANCE", "amount": 1250.5, "count": 1 }
    ],
    "byCountry": [
      { "country": "GB", "amount": 1250.5, "count": 1 }
    ],
    "byDsp": [
      { "dsp": "Spotify", "amount": 1250.5, "count": 1 }
    ],
    "byMonth": [
      { "year": 2026, "month": 1, "amount": 1250.5, "count": 1 }
    ]
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `GET /royalties/export` — Auth

**Query:** `?format=csv&year=2026&month=1&dsp=Spotify`

Formats: `csv` · `excel` · `pdf`

**Response `200`** — file download (not JSON).

```
Content-Type: text/csv
Content-Disposition: attachment; filename="royalties-2026-01.csv"
```

---

#### `GET /royalties/:id` — Auth

**Response `200`** — single royalty object (same mapped fields as list items).

---

#### `PATCH /royalties/:id` — Admin

**Request** (partial)

```json
{
  "grossAmount": 1300.0,
  "status": "PROCESSED"
}
```

Status values: `PENDING` · `PROCESSED` · `DISPUTED` · `PAID`

**Response `200`** — updated royalty object.

---

#### `DELETE /royalties/:id` — Admin

Soft-deletes the royalty. No request body.

**Response `200`** — deleted royalty record.

---

### Statements (`/statements`) — Auth

#### `POST /statements/generate` — Admin

**Request**

```json
{
  "periodStart": "2026-01-01",
  "periodEnd": "2026-01-31",
  "userId": "user-uuid",
  "currency": "USD"
}
```

**Response `201`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "id": "statement-uuid",
    "userId": "user-uuid",
    "periodStart": "2026-01-01T00:00:00.000Z",
    "periodEnd": "2026-01-31T00:00:00.000Z",
    "status": "DRAFT",
    "currency": "USD",
    "totalAmount": "1062.92",
    "createdAt": "2026-07-05T15:00:00.000Z"
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `GET /statements` — Auth

**Query:** `?page=1&limit=20&year=2026&month=1&status=DRAFT`

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "items": [
      {
        "id": "statement-uuid",
        "periodStart": "2026-01-01T00:00:00.000Z",
        "periodEnd": "2026-01-31T00:00:00.000Z",
        "status": "DRAFT",
        "currency": "USD",
        "totalAmount": "1062.92"
      }
    ],
    "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `GET /statements/export` — Admin

**Query:** `?format=csv&year=2026&month=1`

Formats: `csv` · `excel` · `pdf` · `cwr`

**Response `200`** — file download (not JSON).

---

#### `GET /statements/:id` — Auth

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "id": "statement-uuid",
    "userId": "user-uuid",
    "periodStart": "2026-01-01T00:00:00.000Z",
    "periodEnd": "2026-01-31T00:00:00.000Z",
    "status": "DRAFT",
    "currency": "USD",
    "totalAmount": "1062.92",
    "lineItems": [
      {
        "royaltyId": "royalty-uuid",
        "song": "Midnight Drive",
        "amount": "1062.92"
      }
    ]
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `GET /statements/:id/export` — Auth

**Query:** `?format=pdf`

Formats: `csv` · `excel` · `pdf` · `cwr`

**Response `200`** — file download (not JSON).

---

### Notifications (`/notifications`) — Auth

#### `POST /notifications` — Admin

**Request**

```json
{
  "userId": "user-uuid",
  "category": "ANNOUNCEMENT",
  "title": "Platform maintenance",
  "message": "Scheduled maintenance on Sunday 2am UTC."
}
```

Category values: `ANNOUNCEMENT` · `SYSTEM_UPDATE` · `STATUS_UPDATE`

**Response `201`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "id": "notification-uuid",
    "userId": "user-uuid",
    "category": "ANNOUNCEMENT",
    "title": "Platform maintenance",
    "message": "Scheduled maintenance on Sunday 2am UTC.",
    "isRead": false,
    "createdAt": "2026-07-05T15:00:00.000Z"
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `GET /notifications` — Auth

**Query:** `?page=1&limit=20&isRead=false&category=ANNOUNCEMENT`

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "items": [
      {
        "id": "notification-uuid",
        "category": "ANNOUNCEMENT",
        "title": "Platform maintenance",
        "message": "Scheduled maintenance on Sunday 2am UTC.",
        "isRead": false,
        "createdAt": "2026-07-05T15:00:00.000Z"
      }
    ],
    "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `PATCH /notifications/:id/read` — Auth

Mark one notification as read. No request body.

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "id": "notification-uuid",
    "isRead": true,
    "readAt": "2026-07-05T15:00:00.000Z"
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `PATCH /notifications/read-all` — Auth

Mark all notifications as read. No request body.

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "updatedCount": 5
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

### Support (`/support`)

#### `GET /support/contact` — Public

Returns support email and WhatsApp contact details. No request body.

**Response `200`**

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

```bash
curl http://localhost:3000/support/contact
```

---

### Search (`/search`) — Auth

#### `GET /search` — Auth

**Query:** `?q=midnight&types=song,writer&page=1&limit=20&sortBy=relevance&sortDirection=desc`

- **Non-admin:** `song`, `writer`
- **Admin:** also `user`, `publisher`, `recordLabel`

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "data": [
      {
        "entityType": "song",
        "id": "song-uuid",
        "title": "Midnight Drive",
        "subtitle": "JD",
        "score": 12,
        "createdAt": "2026-07-05T15:00:00.000Z",
        "updatedAt": "2026-07-05T15:00:00.000Z",
        "payload": { "status": "SUBMITTED", "released": true }
      },
      {
        "entityType": "writer",
        "id": "writer-uuid",
        "title": "Jane Doe",
        "subtitle": "PRS",
        "score": 8,
        "createdAt": "2026-07-05T14:00:00.000Z",
        "updatedAt": "2026-07-05T14:00:00.000Z",
        "payload": { "ipiNumber": "00123456789" }
      }
    ],
    "meta": { "page": 1, "limit": 20, "total": 2 },
    "filters": {
      "q": "midnight",
      "types": ["song", "writer"]
    }
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

### Admin (`/admin`) — Admin only

#### `GET /admin/dashboard/stats` — Admin

**Query:** `?from=2026-01-01&to=2026-12-31` (optional date range)

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "stats": {
      "totalUsers": 120,
      "songwriters": 85,
      "publishers": 20,
      "recordLabels": 10,
      "pendingKyc": 5,
      "verifiedKyc": 90,
      "songs": 340,
      "royalties": 1250,
      "statements": 48
    },
    "filters": {
      "from": "2026-01-01T00:00:00.000Z",
      "to": "2026-12-31T00:00:00.000Z"
    }
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `GET /admin/dashboard/analytics` — Admin

**Query:** `?from=2026-01-01&to=2026-12-31`

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "usersOverTime": [
      { "date": "2026-01-01", "count": 3 },
      { "date": "2026-01-02", "count": 5 }
    ],
    "songsOverTime": [
      { "date": "2026-01-01", "count": 10 }
    ],
    "royaltiesOverTime": [
      { "date": "2026-01-01", "amount": 5000.0 }
    ],
    "filters": {
      "from": "2026-01-01T00:00:00.000Z",
      "to": "2026-12-31T00:00:00.000Z"
    }
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `GET /admin/users` — Admin

**Query:** `?page=1&limit=20&search=jane&role=SONGWRITER&status=ACTIVE&registrationType=INDIVIDUAL`

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "items": [
      {
        "id": "user-uuid",
        "email": "writer@example.com",
        "firstName": "Jane",
        "lastName": "Doe",
        "role": "SONGWRITER",
        "status": "ACTIVE",
        "registrationType": "INDIVIDUAL",
        "createdAt": "2026-07-05T15:00:00.000Z"
      }
    ],
    "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `PATCH /admin/users/:id/activate` — Admin

**Request** (optional)

```json
{
  "note": "Account reinstated after review"
}
```

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "id": "user-uuid",
    "status": "ACTIVE",
    "updatedAt": "2026-07-05T15:00:00.000Z"
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `PATCH /admin/users/:id/suspend` — Admin

**Request** (optional)

```json
{
  "note": "Suspended for policy violation"
}
```

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "id": "user-uuid",
    "status": "SUSPENDED",
    "updatedAt": "2026-07-05T15:00:00.000Z"
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `GET /admin/kyc` — Admin

**Query:** `?page=1&limit=20&search=jane&status=PENDING`

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "items": [
      {
        "id": "kyc-uuid",
        "userId": "user-uuid",
        "documentType": "PASSPORT",
        "status": "PENDING",
        "user": {
          "email": "writer@example.com",
          "firstName": "Jane",
          "lastName": "Doe"
        }
      }
    ],
    "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `PATCH /admin/kyc/:id/approve` — Admin

**Request** (optional)

```json
{
  "note": "Documents verified"
}
```

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "id": "kyc-uuid",
    "status": "VERIFIED",
    "reviewedAt": "2026-07-05T15:00:00.000Z"
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `PATCH /admin/kyc/:id/verify` — Admin

Alias for approve. Same request and response as `PATCH /admin/kyc/:id/approve`.

---

#### `PATCH /admin/kyc/:id/reject` — Admin

**Request** (optional)

```json
{
  "note": "Document image is unreadable"
}
```

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "id": "kyc-uuid",
    "status": "REJECTED",
    "reviewedAt": "2026-07-05T15:00:00.000Z"
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `GET /admin/songs` — Admin

**Query:** `?page=1&limit=20&search=midnight&status=SUBMITTED&released=true`

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "items": [
      {
        "id": "song-uuid",
        "songTitle": "Midnight Drive",
        "artistName": "JD",
        "status": "SUBMITTED",
        "owner": { "email": "writer@example.com" }
      }
    ],
    "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `PATCH /admin/songs/:id/status` — Admin

**Request**

```json
{
  "status": "REGISTERED",
  "note": "All documents verified"
}
```

Song status values: `SUBMITTED` · `PROCESSING` · `REGISTERED`

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "id": "song-uuid",
    "status": "REGISTERED",
    "updatedAt": "2026-07-05T15:00:00.000Z"
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `PATCH /admin/songs/:id/metadata` — Admin

**Request** (all fields optional)

```json
{
  "songTitle": "Midnight Drive (Remaster)",
  "language": "English",
  "genre": "Pop",
  "isrc": "GBUM71234567",
  "spotifyUrl": "https://open.spotify.com/track/abc123",
  "appleMusicUrl": "https://music.apple.com/track/abc123",
  "youtubeUrl": "https://youtube.com/watch?v=abc123",
  "releaseDate": "2025-06-01",
  "version": "Remaster"
}
```

**Response `200`** — updated song metadata object.

---

#### `PATCH /admin/songs/:id/iswc` — Admin

**Request**

```json
{
  "iswc": "T-123456789-0"
}
```

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "id": "song-uuid",
    "iswc": "T-123456789-0",
    "updatedAt": "2026-07-05T15:00:00.000Z"
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `PATCH /admin/writers/:id/ipi` — Admin

**Request**

```json
{
  "ipi": "00123456789"
}
```

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "id": "writer-uuid",
    "ipiNumber": "00123456789",
    "updatedAt": "2026-07-05T15:00:00.000Z"
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `GET /admin/royalties` — Admin

**Query:** `?page=1&limit=20&year=2026&month=1&dsp=Spotify`

**Response `200`** — same shape as `GET /royalties` (paginated `data` + `summary`).

---

#### `GET /admin/statements` — Admin

**Query:** `?page=1&limit=20&year=2026&month=1&status=DRAFT`

**Response `200`** — same shape as `GET /statements`.

---

#### `PATCH /admin/statements/:id/status` — Admin

**Request**

```json
{
  "status": "FINALIZED",
  "note": "Ready to send"
}
```

Statement status values: `DRAFT` · `FINALIZED` · `SENT` · `PAID`

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "id": "statement-uuid",
    "status": "FINALIZED",
    "updatedAt": "2026-07-05T15:00:00.000Z"
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `GET /admin/reports/dashboard` — Admin

**Query:** `?from=2026-01-01&to=2026-12-31&format=csv`

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "summary": {
      "totalRoyalties": 1250,
      "totalStatements": 48,
      "totalGrossAmount": 250000.0
    },
    "period": {
      "from": "2026-01-01T00:00:00.000Z",
      "to": "2026-12-31T00:00:00.000Z"
    }
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `GET /admin/reports/activity` — Admin

**Query:** `?page=1&limit=20&action=UPDATE&entityType=COMPOSITION`

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "items": [
      {
        "id": "audit-uuid",
        "action": "UPDATE",
        "entityType": "COMPOSITION",
        "entityId": "song-uuid",
        "userId": "admin-uuid",
        "metadata": { "field": "status", "from": "SUBMITTED", "to": "REGISTERED" },
        "createdAt": "2026-07-05T15:00:00.000Z"
      }
    ],
    "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `GET /admin/reports/export` — Admin

**Query:** `?from=2026-01-01&to=2026-12-31&format=csv`

Formats: `csv` · `cwr`

**Response `200`** — file download (not JSON).

---

### Reports (`/reports`) — Admin only

#### `GET /reports/royalties` — Admin

**Query:** `?page=1&limit=20&year=2026&month=1&dsp=Spotify`

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "report": {
      "data": [
        {
          "id": "royalty-uuid",
          "song": "Midnight Drive",
          "type": "PERFORMANCE",
          "grossAmount": 1250.5,
          "currency": "USD"
        }
      ],
      "meta": { "page": 1, "limit": 20, "total": 1 }
    },
    "analytics": {
      "totals": { "grossAmount": 1250.5, "recordCount": 1 }
    }
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `GET /reports/royalties/export` — Admin

**Query:** `?format=csv&year=2026&month=1&dsp=Spotify`

**Response `200`** — file download (not JSON).

```bash
curl "http://localhost:3000/reports/royalties/export?format=csv&year=2026&month=1" \
  -H "Authorization: Bearer <accessToken>" \
  -o royalties-report.csv
```

---

#### `GET /reports/statements` — Admin

**Query:** `?page=1&limit=20&year=2026&month=1&status=FINALIZED`

**Response `200`**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "items": [
      {
        "id": "statement-uuid",
        "userId": "user-uuid",
        "periodStart": "2026-01-01T00:00:00.000Z",
        "periodEnd": "2026-01-31T00:00:00.000Z",
        "status": "FINALIZED",
        "totalAmount": "1062.92",
        "currency": "USD"
      }
    ],
    "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  },
  "timestamp": "2026-07-05T15:00:00.000Z"
}
```

---

#### `GET /reports/statements/export` — Admin

**Query:** `?format=pdf&year=2026&month=1`

**Response `200`** — file download (not JSON).

```bash
curl "http://localhost:3000/reports/statements/export?format=pdf&year=2026&month=1" \
  -H "Authorization: Bearer <accessToken>" \
  -o statements-report.pdf
```

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
