-- Remove support ticket system (replaced by email/WhatsApp contact endpoint)

DROP TABLE IF EXISTS "ticket_replies" CASCADE;
DROP TABLE IF EXISTS "tickets" CASCADE;

DROP TYPE IF EXISTS "TicketCategory";
DROP TYPE IF EXISTS "TicketPriority";
DROP TYPE IF EXISTS "TicketStatus";

-- AuditEntityType: remove TICKET
CREATE TYPE "AuditEntityType_new" AS ENUM (
  'USER', 'COMPANY', 'KYC', 'COMPOSITION', 'WRITER', 'LYRICS', 'ROYALTY', 'STATEMENT', 'NOTIFICATION'
);

ALTER TABLE "audit_logs" ALTER COLUMN "entityType" TYPE "AuditEntityType_new" USING (
  CASE "entityType"::text
    WHEN 'TICKET' THEN 'NOTIFICATION'::"AuditEntityType_new"
    ELSE "entityType"::text::"AuditEntityType_new"
  END
);

DROP TYPE "AuditEntityType";
ALTER TYPE "AuditEntityType_new" RENAME TO "AuditEntityType";
