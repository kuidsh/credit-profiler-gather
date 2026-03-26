-- Migration: 001_fix_nullable_result_columns
--
-- Problem: sesiones_wizard was created via `prisma db push` when
-- clasificacion_recomendada, viabilidad_inicial, and carga_financiera were
-- NOT NULL. Those three columns were later made nullable in the schema
-- (String?) to reflect the correct design (null until Step 4 is executed),
-- but the Aurora column constraints were never updated.
--
-- Effect of the bug: Prisma Studio (and PrismaClient) throw
--   "Error converting field "clasificacionRecomendada" of expected
--    non-nullable type "String", found incompatible value of "null""
-- when reading any session row that was saved before Step 4 completed.
--
-- Fix: drop the NOT NULL constraint on all three affected columns.
--
-- Safe to run multiple times: ALTER COLUMN ... DROP NOT NULL is idempotent
-- in PostgreSQL — it is a no-op if the column is already nullable.

ALTER TABLE sesiones_wizard
  ALTER COLUMN clasificacion_recomendada DROP NOT NULL;

ALTER TABLE sesiones_wizard
  ALTER COLUMN viabilidad_inicial DROP NOT NULL;

ALTER TABLE sesiones_wizard
  ALTER COLUMN carga_financiera DROP NOT NULL;
