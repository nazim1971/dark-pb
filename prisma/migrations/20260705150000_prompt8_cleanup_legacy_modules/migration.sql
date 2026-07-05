-- Prompt 8: Remove legacy modules (conflicts, recordings, contracts, publishers entity, compositions workflow)

-- Drop junction and legacy tables (preserve statement_royalties)
DROP TABLE IF EXISTS "contract_compositions" CASCADE;
DROP TABLE IF EXISTS "composition_recordings" CASCADE;
DROP TABLE IF EXISTS "composition_publishers" CASCADE;
DROP TABLE IF EXISTS "conflicts" CASCADE;
DROP TABLE IF EXISTS "contracts" CASCADE;
DROP TABLE IF EXISTS "recordings" CASCADE;
DROP TABLE IF EXISTS "publishers" CASCADE;

-- Remove legacy royalty foreign keys
ALTER TABLE "royalties" DROP COLUMN IF EXISTS "recordingId";
ALTER TABLE "royalties" DROP COLUMN IF EXISTS "publisherId";
ALTER TABLE "royalties" DROP COLUMN IF EXISTS "contractId";

-- Remove legacy publishing workflow status from compositions
ALTER TABLE "compositions" DROP COLUMN IF EXISTS "status";

-- TicketCategory: map legacy values then recreate enum without CONTRACT
CREATE TYPE "TicketCategory_new" AS ENUM ('ACCOUNT', 'KYC', 'SONG', 'ROYALTY', 'TECHNICAL', 'OTHER');

ALTER TABLE "tickets" ALTER COLUMN "category" DROP DEFAULT;

ALTER TABLE "tickets" ALTER COLUMN "category" TYPE "TicketCategory_new" USING (
  CASE "category"::text
    WHEN 'COMPOSITION' THEN 'SONG'::"TicketCategory_new"
    WHEN 'CONTRACT' THEN 'OTHER'::"TicketCategory_new"
    ELSE "category"::text::"TicketCategory_new"
  END
);

DROP TYPE "TicketCategory";
ALTER TYPE "TicketCategory_new" RENAME TO "TicketCategory";
ALTER TABLE "tickets" ALTER COLUMN "category" SET DEFAULT 'OTHER'::"TicketCategory";

-- AuditEntityType: map removed entity types then recreate enum
CREATE TYPE "AuditEntityType_new" AS ENUM (
  'USER', 'COMPANY', 'KYC', 'COMPOSITION', 'WRITER', 'LYRICS', 'ROYALTY', 'STATEMENT', 'TICKET', 'NOTIFICATION'
);

ALTER TABLE "audit_logs" ALTER COLUMN "entityType" TYPE "AuditEntityType_new" USING (
  CASE "entityType"::text
    WHEN 'RECORDING' THEN 'COMPOSITION'::"AuditEntityType_new"
    WHEN 'PUBLISHER' THEN 'COMPANY'::"AuditEntityType_new"
    WHEN 'CONTRACT' THEN 'COMPOSITION'::"AuditEntityType_new"
    WHEN 'CONFLICT' THEN 'COMPOSITION'::"AuditEntityType_new"
    ELSE "entityType"::text::"AuditEntityType_new"
  END
);

DROP TYPE "AuditEntityType";
ALTER TYPE "AuditEntityType_new" RENAME TO "AuditEntityType";

-- Drop unused enum types
DROP TYPE IF EXISTS "PublishingStatus";
DROP TYPE IF EXISTS "ConflictStatus";
DROP TYPE IF EXISTS "ContractType";
DROP TYPE IF EXISTS "ContractStatus";
