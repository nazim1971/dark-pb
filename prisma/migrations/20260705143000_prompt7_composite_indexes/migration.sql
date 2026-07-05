-- Composite indexes for common list/filter query patterns

CREATE INDEX "users_role_status_deletedAt_idx" ON "users"("role", "status", "deletedAt");

CREATE INDEX "kyc_status_deletedAt_idx" ON "kyc"("status", "deletedAt");

CREATE INDEX "compositions_ownerId_songStatus_deletedAt_idx" ON "compositions"("ownerId", "songStatus", "deletedAt");

CREATE INDEX "compositions_ownerId_deletedAt_updatedAt_idx" ON "compositions"("ownerId", "deletedAt", "updatedAt");

CREATE INDEX "royalties_compositionId_status_deletedAt_idx" ON "royalties"("compositionId", "status", "deletedAt");

CREATE INDEX "royalties_status_periodYear_periodMonth_deletedAt_idx" ON "royalties"("status", "periodYear", "periodMonth", "deletedAt");

CREATE INDEX "statements_userId_status_deletedAt_idx" ON "statements"("userId", "status", "deletedAt");

CREATE INDEX "tickets_userId_status_deletedAt_idx" ON "tickets"("userId", "status", "deletedAt");

CREATE INDEX "notifications_userId_isRead_deletedAt_idx" ON "notifications"("userId", "isRead", "deletedAt");
