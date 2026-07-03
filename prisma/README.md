# Prisma Schema Notes

## Migration strategy

1. Generate client and validate schema:
   - `npm run prisma:generate`
2. Create a development migration:
   - `npx prisma migrate dev --name init_music_portal`
3. Review generated SQL in `prisma/migrations/*/migration.sql`.
4. Add DB-level CHECK constraints in SQL for percentage safety (Prisma does not model CHECK directly):
   - `writerShare >= 0 AND writerShare <= 100`
   - `publisherShare >= 0 AND publisherShare <= 100`
   - `sharePercentage >= 0 AND sharePercentage <= 100`
   - `periodMonth >= 1 AND periodMonth <= 12`
5. Add partial unique indexes manually when needed for soft-delete aware uniqueness (for example email on active rows only).
6. Apply in production with:
   - `npm run prisma:deploy`

## Relation table design

- `CompositionWriter`: many-to-many between compositions and writers; stores writer split percentages.
- `CompositionPublisher`: many-to-many between compositions and publishers; stores publishing shares and territory.
- `CompositionRecording`: many-to-many between compositions and recordings.
- `ContractComposition`: many-to-many between contracts and compositions.
- `StatementRoyalty`: many-to-many between statements and royalties.

## Cascade and delete policy

- Core child entities (lyrics, composition relations, statement relations) use `onDelete: Cascade` from parent.
- Historical/accounting entities that must survive parent edits often use `onDelete: SetNull` on optional foreign keys.
- Every model includes `deletedAt` for soft delete support; application services should filter `deletedAt: null` by default.

## Indexing strategy

- UUID primary keys on all models.
- Targeted indexes on foreign keys and frequent filters: status, period, createdAt, deletedAt.
- Composite index examples:
  - `Royalty(periodYear, periodMonth)` for period reporting.
  - `AuditLog(entityType, entityId)` for entity history reads.
  - `Statement(periodStart, periodEnd)` for statement period queries.
