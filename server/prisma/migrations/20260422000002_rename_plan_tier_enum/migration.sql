-- Rename PlanTier enum values to match current schema
ALTER TYPE "PlanTier" RENAME VALUE 'PRO' TO 'CERDAS';
ALTER TYPE "PlanTier" RENAME VALUE 'PREMIUM' TO 'CEMERLANG';
