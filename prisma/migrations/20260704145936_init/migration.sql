-- CreateEnum
CREATE TYPE "Role" AS ENUM ('songwriter', 'composer', 'artist', 'publisher', 'record_label', 'admin');

-- CreateEnum
CREATE TYPE "RegistrationType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('PUBLISHER', 'RECORD_LABEL', 'ADMINISTRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PublishingStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WriterRole" AS ENUM ('SONGWRITER', 'COMPOSER', 'LYRICIST', 'ARRANGER', 'ADAPTOR', 'OTHER');

-- CreateEnum
CREATE TYPE "RoyaltyType" AS ENUM ('PERFORMANCE', 'MECHANICAL', 'LYRICS', 'SYNCHRONIZATION', 'OTHER');

-- CreateEnum
CREATE TYPE "RoyaltyStatus" AS ENUM ('PENDING', 'PROCESSED', 'DISPUTED', 'PAID');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('PUBLISHING_AGREEMENT', 'SPLIT_SHEET', 'ADMINISTRATION_AGREEMENT');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "StatementStatus" AS ENUM ('DRAFT', 'FINALIZED', 'SENT', 'PAID');

-- CreateEnum
CREATE TYPE "ConflictStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('ACCOUNT', 'KYC', 'COMPOSITION', 'ROYALTY', 'CONTRACT', 'TECHNICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'ADMIN_ALERT');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT', 'EXPORT');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('USER', 'COMPANY', 'KYC', 'COMPOSITION', 'WRITER', 'RECORDING', 'PUBLISHER', 'LYRICS', 'CONTRACT', 'ROYALTY', 'STATEMENT', 'CONFLICT', 'TICKET', 'NOTIFICATION');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "legalName" TEXT,
    "stageName" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "country" TEXT,
    "phone" TEXT,
    "spotifyArtistLink" TEXT,
    "pro" TEXT,
    "ipiNumber" TEXT,
    "role" "Role" NOT NULL DEFAULT 'artist',
    "registrationType" "RegistrationType" NOT NULL DEFAULT 'INDIVIDUAL',
    "companyId" UUID,
    "emailVerifiedAt" TIMESTAMP(3),
    "emailVerificationTokenHash" TEXT,
    "emailVerificationExpiresAt" TIMESTAMP(3),
    "passwordResetTokenHash" TEXT,
    "passwordResetExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "companyNumber" TEXT,
    "address" TEXT,
    "director" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "registrationNumber" TEXT,
    "taxId" TEXT,
    "country" TEXT,
    "type" "CompanyType" NOT NULL DEFAULT 'OTHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "companyId" UUID,
    "documentType" TEXT NOT NULL,
    "documentNumber" TEXT,
    "country" TEXT,
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "kyc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compositions" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "companyId" UUID,
    "songTitle" TEXT NOT NULL,
    "alternativeTitle" TEXT,
    "language" TEXT,
    "genre" TEXT,
    "spotifyUrl" TEXT,
    "appleMusicUrl" TEXT,
    "youtubeUrl" TEXT,
    "iswc" TEXT,
    "isrc" TEXT,
    "releaseDate" TIMESTAMP(3),
    "version" TEXT,
    "status" "PublishingStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "compositions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "writers" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "legalName" TEXT NOT NULL,
    "stageName" TEXT,
    "ipiNumber" TEXT,
    "pro" TEXT,
    "role" "WriterRole" NOT NULL DEFAULT 'SONGWRITER',
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "writers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recordings" (
    "id" UUID NOT NULL,
    "isrc" TEXT,
    "artist" TEXT,
    "spotifyLink" TEXT,
    "appleMusicUrl" TEXT,
    "youtubeUrl" TEXT,
    "durationSecond" INTEGER,
    "releaseDate" TIMESTAMP(3),
    "version" TEXT,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "recordings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publishers" (
    "id" UUID NOT NULL,
    "companyId" UUID,
    "publisherName" TEXT NOT NULL,
    "ipi" TEXT,
    "territory" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "publishers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lyrics" (
    "id" UUID NOT NULL,
    "compositionId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "language" TEXT,
    "version" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "lyrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "contractNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ContractType" NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "companyId" UUID,
    "publisherId" UUID,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "royalties" (
    "id" UUID NOT NULL,
    "compositionId" UUID,
    "recordingId" UUID,
    "writerId" UUID,
    "publisherId" UUID,
    "contractId" UUID,
    "type" "RoyaltyType" NOT NULL,
    "status" "RoyaltyStatus" NOT NULL DEFAULT 'PENDING',
    "sourceDsp" TEXT,
    "country" TEXT,
    "usageDate" TIMESTAMP(3),
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "sharePercentage" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "royalties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statements" (
    "id" UUID NOT NULL,
    "statementNo" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "companyId" UUID,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "StatementStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conflicts" (
    "id" UUID NOT NULL,
    "compositionId" UUID NOT NULL,
    "reportingUserId" UUID,
    "conflictReason" TEXT NOT NULL,
    "currentClaim" DECIMAL(5,2) NOT NULL,
    "ourClaim" DECIMAL(5,2) NOT NULL,
    "status" "ConflictStatus" NOT NULL DEFAULT 'OPEN',
    "resolutionNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL,
    "ticketNo" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "assignedToId" UUID,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" "TicketCategory" NOT NULL DEFAULT 'OTHER',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_replies" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "isAdminReply" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ticket_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "companyId" UUID,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "companyId" UUID,
    "action" "AuditAction" NOT NULL,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" TEXT,
    "summary" TEXT,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "composition_writers" (
    "id" UUID NOT NULL,
    "compositionId" UUID NOT NULL,
    "writerId" UUID NOT NULL,
    "controlledPublisher" TEXT,
    "writerShare" DECIMAL(5,2) NOT NULL,
    "publisherShare" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "composition_writers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "composition_publishers" (
    "id" UUID NOT NULL,
    "compositionId" UUID NOT NULL,
    "publisherId" UUID NOT NULL,
    "territory" TEXT,
    "sharePercentage" DECIMAL(5,2) NOT NULL,
    "agreementFrom" TIMESTAMP(3),
    "agreementTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "composition_publishers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "composition_recordings" (
    "id" UUID NOT NULL,
    "compositionId" UUID NOT NULL,
    "recordingId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "composition_recordings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_compositions" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "compositionId" UUID NOT NULL,
    "territory" TEXT,
    "sharePercentage" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "contract_compositions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statement_royalties" (
    "id" UUID NOT NULL,
    "statementId" UUID NOT NULL,
    "royaltyId" UUID NOT NULL,
    "allocatedAmount" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "statement_royalties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "compromisedAt" TIMESTAMP(3),
    "replacedById" UUID,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_companyId_idx" ON "users"("companyId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_registrationType_idx" ON "users"("registrationType");

-- CreateIndex
CREATE INDEX "users_ipiNumber_idx" ON "users"("ipiNumber");

-- CreateIndex
CREATE INDEX "users_emailVerifiedAt_idx" ON "users"("emailVerifiedAt");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "companies_name_idx" ON "companies"("name");

-- CreateIndex
CREATE INDEX "companies_type_idx" ON "companies"("type");

-- CreateIndex
CREATE INDEX "companies_deletedAt_idx" ON "companies"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_userId_key" ON "kyc"("userId");

-- CreateIndex
CREATE INDEX "kyc_companyId_idx" ON "kyc"("companyId");

-- CreateIndex
CREATE INDEX "kyc_status_idx" ON "kyc"("status");

-- CreateIndex
CREATE INDEX "kyc_reviewedById_idx" ON "kyc"("reviewedById");

-- CreateIndex
CREATE INDEX "kyc_deletedAt_idx" ON "kyc"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "compositions_iswc_key" ON "compositions"("iswc");

-- CreateIndex
CREATE INDEX "compositions_ownerId_idx" ON "compositions"("ownerId");

-- CreateIndex
CREATE INDEX "compositions_companyId_idx" ON "compositions"("companyId");

-- CreateIndex
CREATE INDEX "compositions_songTitle_idx" ON "compositions"("songTitle");

-- CreateIndex
CREATE INDEX "compositions_alternativeTitle_idx" ON "compositions"("alternativeTitle");

-- CreateIndex
CREATE INDEX "compositions_spotifyUrl_idx" ON "compositions"("spotifyUrl");

-- CreateIndex
CREATE INDEX "compositions_iswc_idx" ON "compositions"("iswc");

-- CreateIndex
CREATE INDEX "compositions_isrc_idx" ON "compositions"("isrc");

-- CreateIndex
CREATE INDEX "compositions_status_idx" ON "compositions"("status");

-- CreateIndex
CREATE INDEX "compositions_deletedAt_idx" ON "compositions"("deletedAt");

-- CreateIndex
CREATE INDEX "compositions_createdAt_idx" ON "compositions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "writers_ipiNumber_key" ON "writers"("ipiNumber");

-- CreateIndex
CREATE INDEX "writers_userId_idx" ON "writers"("userId");

-- CreateIndex
CREATE INDEX "writers_legalName_idx" ON "writers"("legalName");

-- CreateIndex
CREATE INDEX "writers_stageName_idx" ON "writers"("stageName");

-- CreateIndex
CREATE INDEX "writers_pro_idx" ON "writers"("pro");

-- CreateIndex
CREATE INDEX "writers_deletedAt_idx" ON "writers"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "recordings_isrc_key" ON "recordings"("isrc");

-- CreateIndex
CREATE INDEX "recordings_isrc_idx" ON "recordings"("isrc");

-- CreateIndex
CREATE INDEX "recordings_artist_idx" ON "recordings"("artist");

-- CreateIndex
CREATE INDEX "recordings_spotifyLink_idx" ON "recordings"("spotifyLink");

-- CreateIndex
CREATE INDEX "recordings_deletedAt_idx" ON "recordings"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "publishers_ipi_key" ON "publishers"("ipi");

-- CreateIndex
CREATE INDEX "publishers_companyId_idx" ON "publishers"("companyId");

-- CreateIndex
CREATE INDEX "publishers_publisherName_idx" ON "publishers"("publisherName");

-- CreateIndex
CREATE INDEX "publishers_territory_idx" ON "publishers"("territory");

-- CreateIndex
CREATE INDEX "publishers_deletedAt_idx" ON "publishers"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "lyrics_compositionId_key" ON "lyrics"("compositionId");

-- CreateIndex
CREATE INDEX "lyrics_deletedAt_idx" ON "lyrics"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_contractNo_key" ON "contracts"("contractNo");

-- CreateIndex
CREATE INDEX "contracts_companyId_idx" ON "contracts"("companyId");

-- CreateIndex
CREATE INDEX "contracts_publisherId_idx" ON "contracts"("publisherId");

-- CreateIndex
CREATE INDEX "contracts_createdById_idx" ON "contracts"("createdById");

-- CreateIndex
CREATE INDEX "contracts_type_idx" ON "contracts"("type");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "contracts_effectiveFrom_effectiveTo_idx" ON "contracts"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "contracts_deletedAt_idx" ON "contracts"("deletedAt");

-- CreateIndex
CREATE INDEX "royalties_compositionId_idx" ON "royalties"("compositionId");

-- CreateIndex
CREATE INDEX "royalties_recordingId_idx" ON "royalties"("recordingId");

-- CreateIndex
CREATE INDEX "royalties_writerId_idx" ON "royalties"("writerId");

-- CreateIndex
CREATE INDEX "royalties_publisherId_idx" ON "royalties"("publisherId");

-- CreateIndex
CREATE INDEX "royalties_contractId_idx" ON "royalties"("contractId");

-- CreateIndex
CREATE INDEX "royalties_type_idx" ON "royalties"("type");

-- CreateIndex
CREATE INDEX "royalties_status_idx" ON "royalties"("status");

-- CreateIndex
CREATE INDEX "royalties_periodYear_periodMonth_idx" ON "royalties"("periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "royalties_country_idx" ON "royalties"("country");

-- CreateIndex
CREATE INDEX "royalties_sourceDsp_idx" ON "royalties"("sourceDsp");

-- CreateIndex
CREATE INDEX "royalties_deletedAt_idx" ON "royalties"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "statements_statementNo_key" ON "statements"("statementNo");

-- CreateIndex
CREATE INDEX "statements_userId_idx" ON "statements"("userId");

-- CreateIndex
CREATE INDEX "statements_companyId_idx" ON "statements"("companyId");

-- CreateIndex
CREATE INDEX "statements_status_idx" ON "statements"("status");

-- CreateIndex
CREATE INDEX "statements_periodStart_periodEnd_idx" ON "statements"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "statements_deletedAt_idx" ON "statements"("deletedAt");

-- CreateIndex
CREATE INDEX "conflicts_compositionId_idx" ON "conflicts"("compositionId");

-- CreateIndex
CREATE INDEX "conflicts_reportingUserId_idx" ON "conflicts"("reportingUserId");

-- CreateIndex
CREATE INDEX "conflicts_status_idx" ON "conflicts"("status");

-- CreateIndex
CREATE INDEX "conflicts_createdAt_idx" ON "conflicts"("createdAt");

-- CreateIndex
CREATE INDEX "conflicts_resolvedAt_idx" ON "conflicts"("resolvedAt");

-- CreateIndex
CREATE INDEX "conflicts_deletedAt_idx" ON "conflicts"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticketNo_key" ON "tickets"("ticketNo");

-- CreateIndex
CREATE INDEX "tickets_userId_idx" ON "tickets"("userId");

-- CreateIndex
CREATE INDEX "tickets_assignedToId_idx" ON "tickets"("assignedToId");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE INDEX "tickets_priority_idx" ON "tickets"("priority");

-- CreateIndex
CREATE INDEX "tickets_createdAt_idx" ON "tickets"("createdAt");

-- CreateIndex
CREATE INDEX "tickets_deletedAt_idx" ON "tickets"("deletedAt");

-- CreateIndex
CREATE INDEX "ticket_replies_ticketId_idx" ON "ticket_replies"("ticketId");

-- CreateIndex
CREATE INDEX "ticket_replies_userId_idx" ON "ticket_replies"("userId");

-- CreateIndex
CREATE INDEX "ticket_replies_createdAt_idx" ON "ticket_replies"("createdAt");

-- CreateIndex
CREATE INDEX "ticket_replies_deletedAt_idx" ON "ticket_replies"("deletedAt");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_companyId_idx" ON "notifications"("companyId");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_deletedAt_idx" ON "notifications"("deletedAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_companyId_idx" ON "audit_logs"("companyId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_deletedAt_idx" ON "audit_logs"("deletedAt");

-- CreateIndex
CREATE INDEX "composition_writers_writerId_idx" ON "composition_writers"("writerId");

-- CreateIndex
CREATE INDEX "composition_writers_deletedAt_idx" ON "composition_writers"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "composition_writers_compositionId_writerId_key" ON "composition_writers"("compositionId", "writerId");

-- CreateIndex
CREATE INDEX "composition_publishers_publisherId_idx" ON "composition_publishers"("publisherId");

-- CreateIndex
CREATE INDEX "composition_publishers_deletedAt_idx" ON "composition_publishers"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "composition_publishers_compositionId_publisherId_key" ON "composition_publishers"("compositionId", "publisherId");

-- CreateIndex
CREATE INDEX "composition_recordings_recordingId_idx" ON "composition_recordings"("recordingId");

-- CreateIndex
CREATE INDEX "composition_recordings_deletedAt_idx" ON "composition_recordings"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "composition_recordings_compositionId_recordingId_key" ON "composition_recordings"("compositionId", "recordingId");

-- CreateIndex
CREATE INDEX "contract_compositions_compositionId_idx" ON "contract_compositions"("compositionId");

-- CreateIndex
CREATE INDEX "contract_compositions_deletedAt_idx" ON "contract_compositions"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "contract_compositions_contractId_compositionId_key" ON "contract_compositions"("contractId", "compositionId");

-- CreateIndex
CREATE INDEX "statement_royalties_royaltyId_idx" ON "statement_royalties"("royaltyId");

-- CreateIndex
CREATE INDEX "statement_royalties_deletedAt_idx" ON "statement_royalties"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "statement_royalties_statementId_royaltyId_key" ON "statement_royalties"("statementId", "royaltyId");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "sessions_revokedAt_idx" ON "sessions"("revokedAt");

-- CreateIndex
CREATE INDEX "sessions_deletedAt_idx" ON "sessions"("deletedAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc" ADD CONSTRAINT "kyc_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc" ADD CONSTRAINT "kyc_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc" ADD CONSTRAINT "kyc_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compositions" ADD CONSTRAINT "compositions_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compositions" ADD CONSTRAINT "compositions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "writers" ADD CONSTRAINT "writers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publishers" ADD CONSTRAINT "publishers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lyrics" ADD CONSTRAINT "lyrics_compositionId_fkey" FOREIGN KEY ("compositionId") REFERENCES "compositions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "publishers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "royalties" ADD CONSTRAINT "royalties_compositionId_fkey" FOREIGN KEY ("compositionId") REFERENCES "compositions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "royalties" ADD CONSTRAINT "royalties_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "recordings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "royalties" ADD CONSTRAINT "royalties_writerId_fkey" FOREIGN KEY ("writerId") REFERENCES "writers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "royalties" ADD CONSTRAINT "royalties_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "publishers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "royalties" ADD CONSTRAINT "royalties_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statements" ADD CONSTRAINT "statements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statements" ADD CONSTRAINT "statements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conflicts" ADD CONSTRAINT "conflicts_compositionId_fkey" FOREIGN KEY ("compositionId") REFERENCES "compositions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conflicts" ADD CONSTRAINT "conflicts_reportingUserId_fkey" FOREIGN KEY ("reportingUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "composition_writers" ADD CONSTRAINT "composition_writers_compositionId_fkey" FOREIGN KEY ("compositionId") REFERENCES "compositions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "composition_writers" ADD CONSTRAINT "composition_writers_writerId_fkey" FOREIGN KEY ("writerId") REFERENCES "writers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "composition_publishers" ADD CONSTRAINT "composition_publishers_compositionId_fkey" FOREIGN KEY ("compositionId") REFERENCES "compositions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "composition_publishers" ADD CONSTRAINT "composition_publishers_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "publishers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "composition_recordings" ADD CONSTRAINT "composition_recordings_compositionId_fkey" FOREIGN KEY ("compositionId") REFERENCES "compositions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "composition_recordings" ADD CONSTRAINT "composition_recordings_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "recordings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_compositions" ADD CONSTRAINT "contract_compositions_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_compositions" ADD CONSTRAINT "contract_compositions_compositionId_fkey" FOREIGN KEY ("compositionId") REFERENCES "compositions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statement_royalties" ADD CONSTRAINT "statement_royalties_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "statements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statement_royalties" ADD CONSTRAINT "statement_royalties_royaltyId_fkey" FOREIGN KEY ("royaltyId") REFERENCES "royalties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
