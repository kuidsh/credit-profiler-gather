---
name: nullable_columns_production_fix
description: NOT NULL constraint mismatch on sesiones_wizard nullable result columns — root cause, fix applied, and commands needed for Aurora
type: project
---

Table `sesiones_wizard` was originally created via `prisma db push` when `clasificacionRecomendada`, `viabilidadInicial`, and `cargaFinanciera` were `String` (NOT NULL). They were later changed to `String?` in the schema but `prisma db push` was never re-run against Aurora, leaving a NOT NULL / nullable mismatch that caused Prisma Studio and PrismaClient to throw a field conversion error when reading rows where those columns were NULL.

**Why:** The db:push and db:generate npm scripts only targeted `schema.dev.prisma` (SQLite). There were no scripts for the production schema (`prisma/schema.prisma`).

**Fix applied (2026-03-25):**
- Created `prisma/migrations/001_fix_nullable_result_columns/migration.sql` — drops NOT NULL on the three columns via `ALTER TABLE sesiones_wizard ALTER COLUMN ... DROP NOT NULL`.
- Added `postinstall: prisma generate` to `package.json` so Amplify/Lambda deployments regenerate the client against the main schema on `npm install`.
- Added `db:generate:prod`, `db:push:prod`, `db:studio:prod`, `db:migrate:prod` npm scripts targeting the production schema.

**How to apply:** To sync Aurora, run the SQL in `prisma/migrations/001_fix_nullable_result_columns/migration.sql` directly against the production DB (via psql or the RDS query editor), OR use `prisma migrate deploy` if the project transitions to a full migration workflow. Do NOT use `prisma db push` in production — it is destructive and does not record migration history.
