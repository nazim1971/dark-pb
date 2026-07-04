# Dark Lab Records Publishing Portal Server - Complete Backend Guideline

**NestJS backend for a Music Publishing Administration Portal.**

This guide explains:
- Project architecture and folder structure
- Setup and run steps
- Environment configuration
- Prisma workflow
- Auth and role model
- Full API list with request examples
- How to test endpoints properly (what data to pass)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Highlights](#2-architecture-highlights)
3. [Folder Structure](#3-folder-structure-module-oriented)
4. [Environment Configuration](#4-environment-configuration)
5. [Install, Build, Run](#5-install-build-run)
6. [Authentication and Authorization](#6-authentication-and-authorization)
7. [Swagger and Quick API Exploration](#7-swagger-and-quick-api-exploration)
8. [Core Enums and Domain Values](#8-core-enums-and-domain-values)
9. [Testing Workflow](#9-testing-workflow-recommended)
10. [API Reference With Examples](#10-api-reference-with-examples)
11. [Export Formats and Testing](#11-export-formats-and-testing)
12. [Audit Logging and Activity Tracking](#12-audit-logging-and-activity-tracking)
13. [Notes on Current Module Status](#13-notes-on-current-module-status)
14. [Postman Collection Tips](#14-postman-collection-tips)
15. [Troubleshooting](#15-troubleshooting)
16. [Production Readiness Checklist](#16-production-readiness-checklist)

---

## 1) Project Overview

- **Framework:** NestJS 10
- **Language:** TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Auth:** JWT access token + refresh flow
- **Validation:** class-validator + Zod
- **Docs:** Swagger at `/docs`
- **Exports:** CSV, Excel, PDF, CWR

**Core entry points:**
- [src/main.ts](src/main.ts)
- [src/app.module.ts](src/app.module.ts)
- [src/app.controller.ts](src/app.controller.ts)

---

## 2) Architecture Highlights

- Global request validation with ValidationPipe
- Global response shaping interceptor
- Global exception filter
- Global throttling (rate limit)
- Global JWT guard and role guard
- Module-driven architecture by business domain
- Prisma service abstraction in dedicated module

**Relevant files:**
- [src/common/filters/all-exceptions.filter.ts](src/common/filters/all-exceptions.filter.ts)
- [src/common/interceptors/response.interceptor.ts](src/common/interceptors/response.interceptor.ts)
- [src/common/validation/zod-validation.pipe.ts](src/common/validation/zod-validation.pipe.ts)
- [src/auth/guards/jwt-auth.guard.ts](src/auth/guards/jwt-auth.guard.ts)
- [src/auth/guards/roles.guard.ts](src/auth/guards/roles.guard.ts)
- [src/prisma/prisma.service.ts](src/prisma/prisma.service.ts)

---

## 3) Folder Structure (Module-Oriented)

### Top-Level Directories

```
|-- src/
|-- prisma/
`-- dist/
```

### Backend Source Modules

```
src/
|-- admin/
|-- auth/
|-- common/
|-- compositions/
|-- conflicts/
|-- contracts/
|-- kyc/
|-- notifications/
|-- prisma/
|-- publishers/
|-- recordings/
|-- reports/
|-- royalties/
|-- search/
|-- shared/
|-- statements/
|-- support/
|-- users/
`-- writers/
```

### Important Module Internals

- Each domain generally has controller, service, module, dto, schemas, interfaces
- Shared pagination DTO: [src/shared/dto/pagination-query.dto.ts](src/shared/dto/pagination-query.dto.ts)
- Export helpers:
  - [src/reports/export.utils.ts](src/reports/export.utils.ts)
  - [src/admin/admin-export.utils.ts](src/admin/admin-export.utils.ts)

### Database Assets

- [prisma/schema.prisma](prisma/schema.prisma)
- [prisma/seed.ts](prisma/seed.ts)
- [prisma/README.md](prisma/README.md)

---

## 4) Environment Configuration

**Environment template:** [.env.example](.env.example)

Copy values into `.env` and fill real secrets.

### Required Keys

| Key | Description |
|-----|-------------|
| `NODE_ENV` | Environment (development/production) |
| `PORT` | Server port |
| `DATABASE_URL` | PostgreSQL connection string |
| `DIRECT_URL` | Direct PostgreSQL connection string for Prisma migrate |
| `ALLOWED_ORIGINS` | Comma-separated frontend origins |
| `JWT_ACCESS_SECRET` | JWT access token secret |
| `JWT_REFRESH_SECRET` | JWT refresh token secret |
| `JWT_ACCESS_EXPIRATION` | Access token expiry (e.g., 15m) |
| `JWT_REFRESH_EXPIRATION` | Refresh token expiry (e.g., 7d) |
| `BCRYPT_ROUNDS` | Salt rounds for bcrypt |
| `PASSWORD_RESET_TOKEN_EXP_MINUTES` | Reset token expiry in minutes |
| `EMAIL_VERIFICATION_TOKEN_EXP_HOURS` | Email verification token expiry in hours |
| `COOKIE_SECRET` | Cookie encryption secret |
| `PRISMA_LOG_QUERIES` | Enable query logging (true/false) |
| `SEED_ADMIN_EMAIL` | Admin email for seeding |
| `SEED_ADMIN_PASSWORD` | Admin password for seeding |
| `SEED_ADMIN_FIRST_NAME` | Admin first name |
| `SEED_ADMIN_LAST_NAME` | Admin last name |

---

## 5) Install, Build, Run

**Scripts are defined in [package.json](package.json).**

### Install Dependencies

```bash
npm install
```

### Generate Prisma Client

```bash
npm run prisma:generate
```

### Apply Migrations (Development)

```bash
npm run prisma:migrate
```

### Seed Data

```bash
npm run prisma:seed
```

### Start Dev Server

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Run Production Build

```bash
npm run start:prod
```

### Full DB Setup Shortcut

```bash
npm run db:setup
```

---

## 6) Authentication and Authorization

**Auth Module:**
- [src/auth/auth.controller.ts](src/auth/auth.controller.ts)
- [src/auth/auth.service.ts](src/auth/auth.service.ts)
- [src/auth/auth.module.ts](src/auth/auth.module.ts)

**Decorators:**
- Role decorator: [src/auth/decorators/roles.decorator.ts](src/auth/decorators/roles.decorator.ts)
- Current user decorator: [src/auth/decorators/current-user.decorator.ts](src/auth/decorators/current-user.decorator.ts)
- Public endpoint decorator: [src/auth/decorators/public.decorator.ts](src/auth/decorators/public.decorator.ts)
- Skip KYC check decorator: [src/auth/decorators/skip-kyc-check.decorator.ts](src/auth/decorators/skip-kyc-check.decorator.ts)

### How It Works

- JWT guard is global
- Roles guard is global
- KYC action guard is global for non-admin write routes
- Endpoints marked `@Public()` bypass auth
- Endpoints marked `@SkipKycCheck()` bypass KYC action guard
- Admin routes require role `ADMIN`

---

## 7) Swagger and Quick API Exploration

**Swagger Configuration:**
- [src/common/utils/swagger.ts](src/common/utils/swagger.ts)

After running server:

```
http://localhost:3000/docs
```

Use Swagger for interactive testing first, then use cURL/Postman for scripted tests.

---

## 8) Core Enums and Domain Values

**Prisma Schema:** [prisma/schema.prisma](prisma/schema.prisma)

### Common Enum Values

#### Role
- `SONGWRITER`
- `COMPOSER`
- `ARTIST`
- `PUBLISHER`
- `RECORD_LABEL`
- `ADMIN`

#### PublishingStatus
- `DRAFT`
- `SUBMITTED`
- `UNDER_REVIEW`
- `PUBLISHED`
- `REJECTED`

#### RoyaltyType
- `PERFORMANCE`
- `MECHANICAL`
- `LYRICS`
- `SYNCHRONIZATION`
- `OTHER`

#### ContractType
- `PUBLISHING_AGREEMENT`
- `SPLIT_SHEET`
- `ADMINISTRATION_AGREEMENT`

#### ConflictStatus
- `OPEN`
- `UNDER_REVIEW`
- `RESOLVED`
- `REJECTED`

#### TicketCategory
- `ACCOUNT`
- `KYC`
- `COMPOSITION`
- `ROYALTY`
- `CONTRACT`
- `TECHNICAL`
- `OTHER`

#### TicketPriority
- `LOW`
- `MEDIUM`
- `HIGH`
- `URGENT`

#### TicketStatus
- `OPEN`
- `IN_PROGRESS`
- `WAITING_FOR_USER`
- `RESOLVED`
- `CLOSED`

---

## 9) Testing Workflow (Recommended)

1. Register a user
2. Login and store access token
3. Use Authorization header on protected routes
4. Create sample composition
5. Add royalties
6. Generate statements
7. Test contracts/conflicts/support
8. Use admin account for admin/report/export routes

### Authorization Header Format

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Base URL used in examples:** `http://localhost:3000`

---

## 10) API Reference With Examples

> **Note:**
> - UUID path params must be valid UUID strings
> - Date values should be ISO format where applicable
> - Query pagination defaults generally are `page=1` and `limit=20`

---

### 10.1 Health

**GET /** 
- **Auth:** Public
- **Purpose:** Service health response

```bash
curl -X GET http://localhost:3000/
```

---

### 10.2 Auth APIs

**Controller:** [src/auth/auth.controller.ts](src/auth/auth.controller.ts)

#### POST /auth/register
- **Auth:** Public

**Body Example:**
```json
{
  "legalName": "Araf Writer",
  "stageName": "Araf",
  "country": "Bangladesh",
  "phone": "+8801XXXXXXXXX",
  "spotifyArtistLink": "https://open.spotify.com/artist/abc",
  "pro": "BMI",
  "ipiNumber": "123456789",
  "email": "writer1@example.com",
  "password": "StrongPass123!",
  "role": "SONGWRITER",
  "registrationType": "INDIVIDUAL"
}
```

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"writer1@example.com","password":"StrongPass123!","legalName":"Araf Writer","role":"SONGWRITER","registrationType":"INDIVIDUAL"}'
```

#### POST /auth/login
- **Auth:** Public

**Body Example:**
```json
{
  "email": "writer1@example.com",
  "password": "StrongPass123!"
}
```

#### POST /auth/refresh
- **Auth:** Protected by refresh cookie/session flow
- **Body:** none

#### POST /auth/logout
- **Auth:** Public endpoint, clears refresh token context

#### POST /auth/forgot-password
- **Auth:** Public

**Body Example:**
```json
{
  "email": "writer1@example.com"
}
```

#### POST /auth/reset-password
- **Auth:** Public

**Body Example:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewStrongPass123!"
}
```

#### POST /auth/send-verification-email
- **Auth:** JWT required
- **Body:** none

#### POST /auth/verify-email
- **Auth:** Public

**Body Example:**
```json
{
  "token": "verify-token-from-email"
}
```

---

### 10.3 Users API

**Controller:** [src/users/users.controller.ts](src/users/users.controller.ts)

#### GET /users/me
- **Auth:** JWT required
- **Body:** none

```bash
curl -X GET http://localhost:3000/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 10.4 KYC APIs

**Controller:** [src/kyc/kyc.controller.ts](src/kyc/kyc.controller.ts)

#### GET /kyc/me
- **Auth:** JWT required

#### GET /kyc/pending
- **Auth:** ADMIN

**Query Example:**
```
/kyc/pending?page=1&limit=20
```

---

### 10.5 Compositions APIs

**Controller:** [src/compositions/compositions.controller.ts](src/compositions/compositions.controller.ts)

#### POST /compositions
- **Auth:** JWT required

**Body Example:**
```json
{
  "songTitle": "Midnight Rain",
  "alternativeTitle": "MR Demo",
  "language": "English",
  "genre": "Pop",
  "lyrics": "Sample lyrics here",
  "spotifyUrl": "https://open.spotify.com/track/abc",
  "youtubeUrl": "https://youtube.com/watch?v=123",
  "isrc": "USRC17607839",
  "releaseDate": "2026-06-01",
  "version": "1.0",
  "status": "DRAFT"
}
```

#### PATCH /compositions/:id
- **Auth:** JWT required
- **Body:** any editable subset from create payload

#### POST /compositions/:id/submit
- **Auth:** JWT required

**Body Example:**
```json
{
  "note": "Ready for review"
}
```

#### POST /compositions/:id/draft
- **Auth:** JWT required
- **Body:** none

#### POST /compositions/:id/approve
- **Auth:** ADMIN

**Body Example:**
```json
{
  "note": "Approved by admin"
}
```

#### POST /compositions/:id/reject
- **Auth:** ADMIN

**Body Example:**
```json
{
  "note": "Need metadata correction"
}
```

#### GET /compositions/:id
- **Auth:** JWT required

#### PATCH /compositions/:id/relations
- **Auth:** JWT required

**Body Example:**
```json
{
  "writers": [
    {
      "legalName": "John Doe",
      "stageName": "JD",
      "ipiNumber": "123456789",
      "pro": "ASCAP",
      "role": "COMPOSER",
      "writerShare": 50,
      "country": "US"
    }
  ],
  "recordings": [
    {
      "isrc": "USRC17607839",
      "artist": "Artist Name",
      "spotifyLink": "https://open.spotify.com/track/abc",
      "duration": 210,
      "release": "2026-06-01",
      "version": "Original",
      "label": "Dark Lab"
    }
  ],
  "publishers": [
    {
      "publisherName": "Global Publishing",
      "ipi": "9988776655",
      "territory": "Worldwide",
      "share": 50
    }
  ]
}
```

#### GET /compositions
- **Auth:** JWT required

**Query Example:**
```
/compositions?page=1&limit=20&songTitle=Midnight&status=DRAFT
```

---

### 10.6 Contracts APIs

**Controller:** [src/contracts/contracts.controller.ts](src/contracts/contracts.controller.ts)

#### POST /contracts
- **Auth:** JWT required

**Body Example:**
```json
{
  "contractNo": "CNT-2026-0001",
  "title": "Publishing Deal 2026",
  "type": "PUBLISHING_AGREEMENT",
  "status": "DRAFT",
  "effectiveFrom": "2026-01-01T00:00:00.000Z"
}
```

#### PATCH /contracts/:id
- **Auth:** JWT required
- **Body:** any editable contract fields

#### POST /contracts/:id/approve
- **Auth:** ADMIN

**Body Example:**
```json
{
  "note": "Contract approved"
}
```

#### PATCH /contracts/:id/compositions
- **Auth:** JWT required

**Body Example:**
```json
{
  "compositions": [
    {
      "compositionId": "11111111-1111-1111-1111-111111111111",
      "territory": "Worldwide",
      "sharePercentage": 50
    }
  ]
}
```

#### GET /contracts/:id
- **Auth:** JWT required

#### GET /contracts
- **Auth:** JWT required

**Query Example:**
```
/contracts?page=1&limit=20&type=PUBLISHING_AGREEMENT&status=DRAFT
```

---

### 10.7 Royalties APIs

**Controller:** [src/royalties/royalties.controller.ts](src/royalties/royalties.controller.ts)

#### POST /royalties
- **Auth:** JWT required

**Body Example:**
```json
{
  "compositionId": "11111111-1111-1111-1111-111111111111",
  "type": "PERFORMANCE",
  "sourceDsp": "Spotify",
  "country": "US",
  "periodYear": 2026,
  "periodMonth": 6,
  "amount": 1250.5,
  "currency": "USD",
  "sharePercentage": 50
}
```

#### GET /royalties
- **Auth:** JWT required

**Query Example:**
```
/royalties?page=1&limit=20&year=2026&month=6&dsp=Spotify&type=PERFORMANCE
```

#### GET /royalties/analytics
- **Auth:** JWT required
- **Query:** same filter family as list endpoint

#### GET /royalties/export
- **Auth:** JWT required

**Query Example:**
```
/royalties/export?format=csv&year=2026&month=6
```

**Allowed format values:**
- `csv`
- `excel`
- `pdf`

---

### 10.8 Statements APIs

**Controller:** [src/statements/statements.controller.ts](src/statements/statements.controller.ts)

#### POST /statements/generate
- **Auth:** JWT required

**Body Example:**
```json
{
  "periodStart": "2026-06-01T00:00:00.000Z",
  "periodEnd": "2026-06-30T23:59:59.999Z",
  "currency": "USD",
  "country": "US",
  "dsp": "Spotify"
}
```

#### GET /statements
- **Auth:** JWT required

**Query Example:**
```
/statements?page=1&limit=20&year=2026&month=6
```

#### GET /statements/export
- **Auth:** JWT required

**Query Example:**
```
/statements/export?format=excel&year=2026
```

#### GET /statements/:id
- **Auth:** JWT required

#### GET /statements/:id/export
- **Auth:** JWT required

**Query Example:**
```
/statements/11111111-1111-1111-1111-111111111111/export?format=pdf
```

**Allowed export format values:**
- `csv`
- `excel`
- `pdf`

---

### 10.9 Conflicts APIs

**Controller:** [src/conflicts/conflicts.controller.ts](src/conflicts/conflicts.controller.ts)

#### POST /conflicts
- **Auth:** JWT required

**Body Example:**
```json
{
  "compositionId": "11111111-1111-1111-1111-111111111111",
  "conflictReason": "Share mismatch with external claim",
  "currentClaim": 60,
  "ourClaim": 50,
  "status": "OPEN"
}
```

#### POST /conflicts/detect
- **Auth:** JWT required
- **Body:** claim comparison payload for auto-detection

#### GET /conflicts
- **Auth:** JWT required

**Query Example:**
```
/conflicts?page=1&limit=20&status=OPEN
```

#### GET /conflicts/:id
- **Auth:** JWT required

#### GET /conflicts/:id/timeline
- **Auth:** JWT required

#### PATCH /conflicts/:id
- **Auth:** JWT required
- **Body:** editable conflict fields (reason/claims/status)

#### PATCH /conflicts/:id/review
- **Auth:** ADMIN

**Body Example:**
```json
{
  "note": "Moved to review"
}
```

#### PATCH /conflicts/:id/resolve
- **Auth:** ADMIN

**Body Example:**
```json
{
  "status": "RESOLVED",
  "note": "Accepted and settled"
}
```

---

### 10.10 Support Ticket APIs

**Controller:** [src/support/support.controller.ts](src/support/support.controller.ts)

#### POST /support/tickets
- **Auth:** JWT required

**Body Example:**
```json
{
  "subject": "Statement mismatch",
  "message": "June statement total does not match royalty report",
  "category": "ROYALTY",
  "priority": "HIGH"
}
```

#### GET /support/tickets
- **Auth:** JWT required

**Query Example:**
```
/support/tickets?page=1&limit=20&status=OPEN&priority=HIGH
```

#### GET /support/tickets/:id
- **Auth:** JWT required

#### POST /support/tickets/:id/replies
- **Auth:** JWT required

**Body Example:**
```json
{
  "message": "Please check statement ID ST-2026-0003"
}
```

#### PATCH /support/tickets/:id/status
- **Auth:** JWT required

**Body Example:**
```json
{
  "status": "IN_PROGRESS",
  "note": "Investigating the issue"
}
```

#### GET /support/tickets/:id/history
- **Auth:** JWT required

---

### 10.11 Reports APIs

**Controller:** [src/reports/reports.controller.ts](src/reports/reports.controller.ts)

#### GET /reports/royalties
- **Auth:** JWT required

**Query Example:**
```
/reports/royalties?year=2026&month=6&country=US
```

#### GET /reports/royalties/export
- **Auth:** JWT required

**Query Example:**
```
/reports/royalties/export?format=pdf&year=2026
```

#### GET /reports/statements
- **Auth:** JWT required

**Query Example:**
```
/reports/statements?year=2026&month=6
```

#### GET /reports/statements/export
- **Auth:** JWT required

**Query Example:**
```
/reports/statements/export?format=csv&year=2026
```

---

### 10.12 Search API

**Controller:** [src/search/search.controller.ts](src/search/search.controller.ts)

#### GET /search
- **Auth:** JWT required

**Query Example:**
```
/search?q=Midnight&types=composition&types=writer&sortBy=relevance&sortDirection=desc&page=1&limit=20
```

**Other searchable query fields:**
- `song`
- `writer`
- `publisher`
- `artist`
- `isrc`
- `iswc`
- `ipi`
- `spotifyUrl`

---

### 10.13 Admin APIs

**Controller:** [src/admin/admin.controller.ts](src/admin/admin.controller.ts)

> All endpoints below require ADMIN role.

#### PATCH /admin/kyc/:id/approve

**Body Example:**
```json
{
  "note": "KYC documents verified"
}
```

#### PATCH /admin/kyc/:id/reject

**Body Example:**
```json
{
  "note": "Document quality insufficient"
}
```

#### PATCH /admin/works/:id/approve

**Body Example:**
```json
{
  "note": "Work approved"
}
```

#### PATCH /admin/works/:id/reject

**Body Example:**
```json
{
  "note": "Metadata incomplete"
}
```

#### PATCH /admin/works/:id/metadata

**Body Example:**
```json
{
  "songTitle": "Midnight Rain (Official)",
  "language": "English",
  "genre": "Pop",
  "isrc": "USRC17607839",
  "spotifyUrl": "https://open.spotify.com/track/abc",
  "releaseDate": "2026-06-01T00:00:00.000Z",
  "version": "Final"
}
```

#### PATCH /admin/works/:id/iswc

**Body Example:**
```json
{
  "iswc": "T-123.456.789-0"
}
```

#### PATCH /admin/writers/:id/ipi

**Body Example:**
```json
{
  "ipi": "12345678901"
}
```

#### PATCH /admin/publishers/:id/ipi

**Body Example:**
```json
{
  "ipi": "99887766554"
}
```

#### GET /admin/reports/dashboard

**Query Parameters:**
- `from` (optional date)
- `to` (optional date)
- `format` optional (csv or cwr, default csv)

**Example:**
```
/admin/reports/dashboard?from=2026-01-01&to=2026-12-31
```

#### GET /admin/reports/activity

**Query Parameters:**
- `page`, `limit`
- `action` (AuditAction enum)
- `entityType` (AuditEntityType enum)

**Example:**
```
/admin/reports/activity?page=1&limit=20&action=APPROVE&entityType=COMPOSITION
```

#### GET /admin/reports/export

**Query Parameters:**
- `from`, `to`
- `format=csv` or `format=cwr`

**Example:**
```
/admin/reports/export?format=cwr&from=2026-01-01&to=2026-12-31
```

**Admin service and report integration:**
- [src/admin/admin.service.ts](src/admin/admin.service.ts)
- [src/reports/reports.service.ts](src/reports/reports.service.ts)
- [src/admin/schemas/admin.zod.ts](src/admin/schemas/admin.zod.ts)

---

## 11) Export Formats and Testing

**Core export utility:**
- [src/reports/export.utils.ts](src/reports/export.utils.ts)

**Admin export utility:**
- [src/admin/admin-export.utils.ts](src/admin/admin-export.utils.ts)

### Supported Exports

| Format | Usage |
|--------|-------|
| **CSV** | Royalties / Statements / Reports / Admin |
| **Excel** | Royalties / Statements / Reports |
| **PDF** | Royalties / Statements / Reports |
| **CWR** | Admin export |

### Testing Export Endpoints

```bash
# CSV Export
curl -L -X GET "http://localhost:3000/admin/reports/export?format=csv" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -o admin-report.csv

# CWR Export
curl -L -X GET "http://localhost:3000/admin/reports/export?format=cwr" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -o admin-report.cwr

# Excel Export
curl -L -X GET "http://localhost:3000/reports/royalties/export?format=excel&year=2026" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -o royalties.xlsx
```

---

## 12) Audit Logging and Activity Tracking

Prompt 14 requirements are implemented through admin service actions and report activity APIs.

**Primary implementation files:**
- [src/admin/admin.service.ts](src/admin/admin.service.ts)
- [src/admin/admin.controller.ts](src/admin/admin.controller.ts)

**Audit-related enums** live in schema:
- [prisma/schema.prisma](prisma/schema.prisma)

---

## 13) Notes on Current Module Status

### Active Controller Endpoints Exist For:

- app
- auth
- users
- kyc
- compositions
- contracts
- royalties
- statements
- conflicts
- support
- reports
- search
- admin

### Controllers Scaffolded but Without Functional Route Handlers:

- [src/notifications/notifications.controller.ts](src/notifications/notifications.controller.ts)
- [src/publishers/publishers.controller.ts](src/publishers/publishers.controller.ts)
- [src/recordings/recordings.controller.ts](src/recordings/recordings.controller.ts)
- [src/writers/writers.controller.ts](src/writers/writers.controller.ts)

---

## 14) Postman Collection Tips

### Create Variables

| Variable | Value |
|----------|-------|
| `baseUrl` | `http://localhost:3000` |
| `accessToken` | Your JWT token |
| `adminToken` | Admin JWT token |

### Authorization Header

Use pre-request script for Authorization:

```
Authorization: Bearer {{accessToken}}
```

For admin routes:

```
Authorization: Bearer {{adminToken}}
```

### Organization

Group requests by module matching controller names.

---

## 15) Troubleshooting

### Prisma Client Generation Issue on Windows File Lock

```bash
# Close running Node processes
# Re-run generation
npm run prisma:generate

# If still locked, restart terminal/editor and retry
```

### Validation Errors

| Issue | Solution |
|-------|----------|
| Enum values invalid | Check uppercase values exactly |
| UUID format invalid | Verify UUID format for id parameters |
| Date format invalid | Use ISO format for Date fields |

### 401/403 Errors

| Error | Meaning |
|-------|---------|
| **401** | Token missing or invalid |
| **403** | Role missing (for ADMIN routes) |

---

## 16) Production Readiness Checklist

- [ ] Set strong JWT and cookie secrets
- [ ] Restrict CORS origins per environment
- [ ] Run migrations in CI/CD before deploy
- [ ] Seed only required bootstrap accounts
- [ ] Enable secure logging and monitoring
- [ ] Verify swagger docs are not publicly exposed in strict production environments

---

## Additional Resources

If you want, next I can also generate:

- **Postman Collection:** A ready-to-import JSON for all endpoints
- **Seed Data Matrix:** Sample realistic linked records (user, composition, royalty, statement, contract, conflict, ticket)
- **QA Checklist:** End-to-end module validation checklist

---
