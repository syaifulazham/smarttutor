-- Add columns that exist in schema but were missing from the initial migration

ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "title" TEXT;

ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "schemeAnswer" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "correctLetter" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "notes" TEXT;
