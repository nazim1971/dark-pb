# Dark PB Server - Complete Backend Guideline

NestJS backend for a Music Publishing Administration Portal.

This guide explains:
- Project architecture and folder structure
- Setup and run steps
- Environment configuration
- Prisma workflow
- Auth and role model
- Full API list with request examples
- How to test endpoints properly (what data to pass)

## 1) Project Overview

- Framework: NestJS 10
- Language: TypeScript
- ORM: Prisma
- Database: PostgreSQL
- Auth: JWT access token + refresh flow
- Validation: class-validator + Zod
- Docs: Swagger at /docs
- Exports: CSV, Excel, PDF, CWR

Core entry points:
- [src/main.ts](src/main.ts)
- [src/app.module.ts](src/app.module.ts)
- [src/app.controller.ts](src/app.controller.ts)

## 2) Architecture Highlights

- Global request validation with ValidationPipe
- Global response shaping interceptor
- Global exception filter
- Global throttling (rate limit)
- Global JWT guard and role guard
- Module-driven architecture by business domain
- Prisma service abstraction in dedicated module

Relevant files:
- [src/common/filters/all-exceptions.filter.ts](src/common/filters/all-exceptions.filter.ts)
- [src/common/interceptors/response.interceptor.ts](src/common/interceptors/response.interceptor.ts)
- [src/common/validation/zod-validation.pipe.ts](src/common/validation/zod-validation.pipe.ts)
- [src/auth/guards/jwt-auth.guard.ts](src/auth/guards/jwt-auth.guard.ts)
- [src/auth/guards/roles.guard.ts](src/auth/guards/roles.guard.ts)
- [src/prisma/prisma.service.ts](src/prisma/prisma.service.ts)

## 3) Folder Structure (Module-Oriented)

Top-level:
- [src](src)
- [prisma](prisma)
- [dist](dist)

Backend source modules:
- [src/admin](src/admin)
- [src/auth](src/auth)
- [src/common](src/common)
- [src/compositions](src/compositions)
- [src/conflicts](src/conflicts)
- [src/contracts](src/contracts)
- [src/kyc](src/kyc)
- [src/notifications](src/notifications)
- [src/prisma](src/prisma)
- [src/publishers](src/publishers)
- [src/recordings](src/recordings)
- [src/reports](src/reports)
- [src/royalties](src/royalties)
- [src/search](src/search)
- [src/shared](src/shared)
- [src/statements](src/statements)
- [src/support](src/support)
- [src/users](src/users)
- [src/writers](src/writers)

Important module internals:
- Each domain generally has controller, service, module, dto, schemas, interfaces
- Shared pagination DTO: [src/shared/dto/pagination-query.dto.ts](src/shared/dto/pagination-query.dto.ts)
- Export helpers:
  - [src/reports/export.utils.ts](src/reports/export.utils.ts)
  - [src/admin/admin-export.utils.ts](src/admin/admin-export.utils.ts)

Database assets:
- [prisma/schema.prisma](prisma/schema.prisma)
- [prisma/seed.ts](prisma/seed.ts)
- [prisma/README.md](prisma/README.md)

## 4) Environment Configuration

Environment template:
- [.env.example](.env.example)

Copy values into .env and fill real secrets.

Required keys:
- NODE_ENV
- PORT
- DATABASE_URL
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET
- JWT_ACCESS_EXPIRATION
- JWT_REFRESH_EXPIRATION
- BCRYPT_ROUNDS
- PASSWORD_RESET_TOKEN_EXP_MINUTES
- EMAIL_VERIFICATION_TOKEN_EXP_HOURS
- COOKIE_SECRET
- PRISMA_LOG_QUERIES
- SEED_ADMIN_EMAIL
- SEED_ADMIN_PASSWORD
- SEED_ADMIN_FIRST_NAME
- SEED_ADMIN_LAST_NAME

## 5) Install, Build, Run

Scripts are defined in [package.json](package.json).

Install dependencies:

npm install

Generate Prisma client:

npm run prisma:generate

Apply migrations (development):

npm run prisma:migrate

Seed data:

npm run prisma:seed

Start dev server:

npm run start:dev

Build:

npm run build

Run production build:

npm run start:prod

Full db setup shortcut:

npm run db:setup

## 6) Authentication and Authorization

Auth module:
- [src/auth/auth.controller.ts](src/auth/auth.controller.ts)
- [src/auth/auth.service.ts](src/auth/auth.service.ts)
- [src/auth/auth.module.ts](src/auth/auth.module.ts)

Role decorator:
- [src/auth/decorators/roles.decorator.ts](src/auth/decorators/roles.decorator.ts)

Current user decorator:
- [src/auth/decorators/current-user.decorator.ts](src/auth/decorators/current-user.decorator.ts)

Public endpoint decorator:
- [src/auth/decorators/public.decorator.ts](src/auth/decorators/public.decorator.ts)

How it works:
- JWT guard is global
- Roles guard is global
- Endpoints marked public bypass auth
- Admin routes require role ADMIN

## 7) Swagger and Quick API Exploration

Swagger is configured in:
- [src/common/utils/swagger.ts](src/common/utils/swagger.ts)

After running server:
- Open http://localhost:3000/docs

Use Swagger for interactive testing first, then use cURL/Postman for scripted tests.

## 8) Core Enums and Domain Values

Prisma schema:
- [prisma/schema.prisma](prisma/schema.prisma)

Common enum values you will pass in requests:

Role:
- SONGWRITER
- COMPOSER
- ARTIST
- PUBLISHER
- RECORD_LABEL
- ADMIN

PublishingStatus:
- DRAFT
- SUBMITTED
- UNDER_REVIEW
- PUBLISHED
- REJECTED

RoyaltyType:
- PERFORMANCE
- MECHANICAL
- LYRICS
- SYNCHRONIZATION
- OTHER

ContractType:
- PUBLISHING_AGREEMENT
- SPLIT_SHEET
- ADMINISTRATION_AGREEMENT

ConflictStatus:
- OPEN
- UNDER_REVIEW
- RESOLVED
- REJECTED

TicketCategory:
- ACCOUNT
- KYC
- COMPOSITION
- ROYALTY
- CONTRACT
- TECHNICAL
- OTHER

TicketPriority:
- LOW
- MEDIUM
- HIGH
- URGENT

TicketStatus:
- OPEN
- IN_PROGRESS
- WAITING_FOR_USER
- RESOLVED
- CLOSED

## 9) Testing Workflow (Recommended)

1. Register a user
2. Login and store access token
3. Use Authorization header on protected routes
4. Create sample composition
5. Add royalties
6. Generate statements
7. Test contracts/conflicts/support
8. Use admin account for admin/report/export routes

Authorization header format:

Authorization: Bearer YOUR_ACCESS_TOKEN

Base URL used in examples:

http://localhost:3000

## 10) API Reference With Examples

Note:
- UUID path params must be valid UUID strings
- Date values should be ISO format where applicable
- Query pagination defaults generally are page=1 and limit=20

### 10.1 Health

GET /
- Auth: Public
- Purpose: Service health response

cURL:

curl -X GET http://localhost:3000/

### 10.2 Auth APIs

Controller:
- [src/auth/auth.controller.ts](src/auth/auth.controller.ts)

POST /auth/register
- Auth: Public
- Body example:

{
  "email": "writer1@example.com",
  "password": "StrongPass123!",
  "firstName": "Araf",
  "lastName": "Writer",
  "role": "SONGWRITER",
  "registrationType": "INDIVIDUAL"
}

cURL:

curl -X POST http://localhost:3000/auth/register -H "Content-Type: application/json" -d "{\"email\":\"writer1@example.com\",\"password\":\"StrongPass123!\",\"firstName\":\"Araf\",\"lastName\":\"Writer\",\"role\":\"SONGWRITER\",\"registrationType\":\"INDIVIDUAL\"}"

POST /auth/login
- Auth: Public
- Body:

{
  "email": "writer1@example.com",
  "password": "StrongPass123!"
}

POST /auth/refresh
- Auth: Protected by refresh cookie/session flow
- Body: none

POST /auth/logout
- Auth: Public endpoint in controller, clears refresh token context

POST /auth/forgot-password
- Auth: Public
- Body:

{
  "email": "writer1@example.com"
}

POST /auth/reset-password
- Auth: Public
- Body:

{
  "email": "writer1@example.com",
  "token": "reset-token-from-email",
  "newPassword": "NewStrongPass123!"
}

POST /auth/send-verification-email
- Auth: JWT required
- Body: none

POST /auth/verify-email
- Auth: Public
- Body:

{
  "email": "writer1@example.com",
  "token": "verify-token-from-email"
}

### 10.3 Users API

Controller:
- [src/users/users.controller.ts](src/users/users.controller.ts)

GET /users/me
- Auth: JWT required
- Body: none

cURL:

curl -X GET http://localhost:3000/users/me -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

### 10.4 Compositions APIs

Controller:
- [src/compositions/compositions.controller.ts](src/compositions/compositions.controller.ts)

POST /compositions
- Auth: JWT required
- Body example:

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

PATCH /compositions/:id
- Auth: JWT required
- Body: any editable subset from create payload

POST /compositions/:id/submit
- Auth: JWT required
- Body:

{
  "note": "Ready for review"
}

POST /compositions/:id/draft
- Auth: JWT required
- Body: none

POST /compositions/:id/approve
- Auth: ADMIN
- Body:

{
  "note": "Approved by admin"
}

POST /compositions/:id/reject
- Auth: ADMIN
- Body:

{
  "note": "Need metadata correction"
}

GET /compositions/:id
- Auth: JWT required

PATCH /compositions/:id/relations
- Auth: JWT required
- Body sample shape:

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

GET /compositions
- Auth: JWT required
- Query example:

/compositions?page=1&limit=20&songTitle=Midnight&status=DRAFT

### 10.5 Contracts APIs

Controller:
- [src/contracts/contracts.controller.ts](src/contracts/contracts.controller.ts)

POST /contracts
- Auth: JWT required
- Body:

{
  "contractNo": "CNT-2026-0001",
  "title": "Publishing Deal 2026",
  "type": "PUBLISHING_AGREEMENT",
  "status": "DRAFT",
  "effectiveFrom": "2026-01-01T00:00:00.000Z"
}

PATCH /contracts/:id
- Auth: JWT required
- Body: any editable contract fields

POST /contracts/:id/approve
- Auth: ADMIN
- Body:

{
  "note": "Contract approved"
}

PATCH /contracts/:id/compositions
- Auth: JWT required
- Body:

{
  "compositionIds": [
    "11111111-1111-1111-1111-111111111111",
    "22222222-2222-2222-2222-222222222222"
  ]
}

GET /contracts/:id
- Auth: JWT required

GET /contracts
- Auth: JWT required
- Query example:

/contracts?page=1&limit=20&type=PUBLISHING_AGREEMENT&status=DRAFT

### 10.6 Royalties APIs

Controller:
- [src/royalties/royalties.controller.ts](src/royalties/royalties.controller.ts)

POST /royalties
- Auth: JWT required
- Body:

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

GET /royalties
- Auth: JWT required
- Query example:

/royalties?page=1&limit=20&year=2026&month=6&dsp=Spotify&type=PERFORMANCE

GET /royalties/analytics
- Auth: JWT required
- Query: same filter family as list endpoint

GET /royalties/export
- Auth: JWT required
- Query example:

/royalties/export?format=csv&year=2026&month=6

Allowed format values:
- csv
- excel
- pdf

### 10.7 Statements APIs

Controller:
- [src/statements/statements.controller.ts](src/statements/statements.controller.ts)

POST /statements/generate
- Auth: JWT required
- Body:

{
  "periodStart": "2026-06-01T00:00:00.000Z",
  "periodEnd": "2026-06-30T23:59:59.999Z",
  "currency": "USD",
  "country": "US",
  "dsp": "Spotify"
}

GET /statements
- Auth: JWT required
- Query example:

/statements?page=1&limit=20&year=2026&month=6

GET /statements/export
- Auth: JWT required
- Query example:

/statements/export?format=excel&year=2026

GET /statements/:id
- Auth: JWT required

GET /statements/:id/export
- Auth: JWT required
- Query example:

/statements/11111111-1111-1111-1111-111111111111/export?format=pdf

Allowed export format values:
- csv
- excel
- pdf

### 10.8 Conflicts APIs

Controller:
- [src/conflicts/conflicts.controller.ts](src/conflicts/conflicts.controller.ts)

POST /conflicts
- Auth: JWT required
- Body:

{
  "compositionId": "11111111-1111-1111-1111-111111111111",
  "conflictReason": "Share mismatch with external claim",
  "currentClaim": 60,
  "ourClaim": 50,
  "status": "OPEN"
}

POST /conflicts/detect
- Auth: JWT required
- Body: claim comparison payload for auto-detection

GET /conflicts
- Auth: JWT required
- Query example:

/conflicts?page=1&limit=20&status=OPEN

GET /conflicts/:id
- Auth: JWT required

GET /conflicts/:id/timeline
- Auth: JWT required

PATCH /conflicts/:id
- Auth: JWT required
- Body: editable conflict fields (reason/claims/status)

PATCH /conflicts/:id/review
- Auth: ADMIN
- Body:

{
  "note": "Moved to review"
}

PATCH /conflicts/:id/resolve
- Auth: ADMIN
- Body:

{
  "status": "RESOLVED",
  "note": "Accepted and settled"
}

### 10.9 Support Ticket APIs

Controller:
- [src/support/support.controller.ts](src/support/support.controller.ts)

POST /support/tickets
- Auth: JWT required
- Body:

{
  "subject": "Statement mismatch",
  "message": "June statement total does not match royalty report",
  "category": "ROYALTY",
  "priority": "HIGH"
}

GET /support/tickets
- Auth: JWT required
- Query example:

/support/tickets?page=1&limit=20&status=OPEN&priority=HIGH

GET /support/tickets/:id
- Auth: JWT required

POST /support/tickets/:id/replies
- Auth: JWT required
- Body:

{
  "message": "Please check statement ID ST-2026-0003"
}

PATCH /support/tickets/:id/status
- Auth: JWT required
- Body:

{
  "status": "IN_PROGRESS",
  "note": "Investigating the issue"
}

GET /support/tickets/:id/history
- Auth: JWT required

### 10.10 Reports APIs

Controller:
- [src/reports/reports.controller.ts](src/reports/reports.controller.ts)

GET /reports/royalties
- Auth: JWT required
- Query example:

/reports/royalties?year=2026&month=6&country=US

GET /reports/royalties/export
- Auth: JWT required
- Query example:

/reports/royalties/export?format=pdf&year=2026

GET /reports/statements
- Auth: JWT required
- Query example:

/reports/statements?year=2026&month=6

GET /reports/statements/export
- Auth: JWT required
- Query example:

/reports/statements/export?format=csv&year=2026

### 10.11 Search API

Controller:
- [src/search/search.controller.ts](src/search/search.controller.ts)

GET /search
- Auth: JWT required
- Query example:

/search?q=Midnight&types=composition&types=writer&sortBy=relevance&sortDirection=desc&page=1&limit=20

Other searchable query fields:
- song
- writer
- publisher
- artist
- isrc
- iswc
- ipi
- spotifyUrl

### 10.12 Admin APIs (Prompt 14 Scope)

Controller:
- [src/admin/admin.controller.ts](src/admin/admin.controller.ts)

All endpoints below require ADMIN role.

PATCH /admin/kyc/:id/approve
- Body:

{
  "note": "KYC documents verified"
}

PATCH /admin/kyc/:id/reject
- Body:

{
  "note": "Document quality insufficient"
}

PATCH /admin/works/:id/approve
- Body:

{
  "note": "Work approved"
}

PATCH /admin/works/:id/reject
- Body:

{
  "note": "Metadata incomplete"
}

PATCH /admin/works/:id/metadata
- Body (editable fields):

{
  "songTitle": "Midnight Rain (Official)",
  "language": "English",
  "genre": "Pop",
  "isrc": "USRC17607839",
  "spotifyUrl": "https://open.spotify.com/track/abc",
  "releaseDate": "2026-06-01T00:00:00.000Z",
  "version": "Final"
}

PATCH /admin/works/:id/iswc
- Body:

{
  "iswc": "T-123.456.789-0"
}

PATCH /admin/writers/:id/ipi
- Body:

{
  "ipi": "12345678901"
}

PATCH /admin/publishers/:id/ipi
- Body:

{
  "ipi": "99887766554"
}

GET /admin/reports/dashboard
- Query:
- from (optional date)
- to (optional date)
- format optional (csv or cwr, default csv)

Example:

/admin/reports/dashboard?from=2026-01-01&to=2026-12-31

GET /admin/reports/activity
- Query:
- page, limit
- action (AuditAction enum)
- entityType (AuditEntityType enum)

Example:

/admin/reports/activity?page=1&limit=20&action=APPROVE&entityType=COMPOSITION

GET /admin/reports/export
- Query:
- from, to
- format=csv or format=cwr

Example:

/admin/reports/export?format=cwr&from=2026-01-01&to=2026-12-31

Admin service and report integration:
- [src/admin/admin.service.ts](src/admin/admin.service.ts)
- [src/reports/reports.service.ts](src/reports/reports.service.ts)
- [src/admin/schemas/admin.zod.ts](src/admin/schemas/admin.zod.ts)

## 11) Export Formats and Testing

Core export utility:
- [src/reports/export.utils.ts](src/reports/export.utils.ts)

Admin export utility:
- [src/admin/admin-export.utils.ts](src/admin/admin-export.utils.ts)

Supported exports:
- CSV: royalties/statements/reports/admin
- Excel: royalties/statements/reports
- PDF: royalties/statements/reports
- CWR: admin export

How to test export quickly:

curl -L -X GET "http://localhost:3000/admin/reports/export?format=csv" -H "Authorization: Bearer ADMIN_TOKEN" -o admin-report.csv

curl -L -X GET "http://localhost:3000/admin/reports/export?format=cwr" -H "Authorization: Bearer ADMIN_TOKEN" -o admin-report.cwr

curl -L -X GET "http://localhost:3000/reports/royalties/export?format=excel&year=2026" -H "Authorization: Bearer YOUR_ACCESS_TOKEN" -o royalties.xlsx

## 12) Audit Logging and Activity Tracking

Prompt 14 requirements are implemented through admin service actions and report activity APIs.

Primary implementation files:
- [src/admin/admin.service.ts](src/admin/admin.service.ts)
- [src/admin/admin.controller.ts](src/admin/admin.controller.ts)

Audit-related enums live in schema:
- [prisma/schema.prisma](prisma/schema.prisma)

## 13) Notes on Current Module Status

Active controller endpoints exist for:
- app
- auth
- users
- compositions
- contracts
- royalties
- statements
- conflicts
- support
- reports
- search
- admin

Controllers currently scaffolded but without functional route handlers:
- [src/kyc/kyc.controller.ts](src/kyc/kyc.controller.ts)
- [src/notifications/notifications.controller.ts](src/notifications/notifications.controller.ts)
- [src/publishers/publishers.controller.ts](src/publishers/publishers.controller.ts)
- [src/recordings/recordings.controller.ts](src/recordings/recordings.controller.ts)
- [src/writers/writers.controller.ts](src/writers/writers.controller.ts)

## 14) Postman Collection Tips

Create variables:
- baseUrl = http://localhost:3000
- accessToken = your jwt token
- adminToken = admin jwt token

Use pre-request script for Authorization:
- Authorization header value: Bearer {{accessToken}}
- For admin routes, use Bearer {{adminToken}}

Group requests by module matching controller names.

## 15) Troubleshooting

Prisma client generation issue on Windows file lock:
- Close running Node processes
- Re-run npm run prisma:generate
- If still locked, restart terminal/editor and retry

Validation errors:
- Check enum uppercase values exactly
- Check UUID format for id parameters
- Check date format ISO for Date fields

401/403 errors:
- 401 means token missing/invalid
- 403 means role missing (for ADMIN routes)

## 16) Production Readiness Checklist

- Set strong JWT and cookie secrets
- Restrict CORS origins per environment
- Run migrations in CI/CD before deploy
- Seed only required bootstrap accounts
- Enable secure logging and monitoring
- Verify swagger docs are not publicly exposed in strict production environments

---

If you want, next I can also generate:
- A ready-to-import Postman collection JSON for all endpoints
- A sample seed data matrix with realistic linked records (user, composition, royalty, statement, contract, conflict, ticket)
- A QA checklist file for end-to-end module validation
