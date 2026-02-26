-- Migration: Convert property textual columns to bilingual JSONB payloads
-- Run inside Supabase SQL editor or psql. Wrap in transaction to ensure atomicity.

BEGIN;

-- Helper defaults to keep structure consistent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'jsonb' AND n.nspname = 'pg_catalog'
  ) THEN
    RAISE EXCEPTION 'jsonb type not available';
  END IF;
END $$;

-- Normalize NULL text fields before casting
UPDATE public.property_details
SET
  project_name = NULLIF(project_name, ''),
  address = NULLIF(address, ''),
  house_condition = NULLIF(house_condition, ''),
  highlight = NULLIF(highlight, ''),
  area_around = NULLIF(area_around, ''),
  description = NULLIF(description, '');

-- Convert simple text columns to jsonb { th, en }
ALTER TABLE public.property_details
ALTER COLUMN project_name TYPE jsonb
USING CASE
  WHEN project_name IS NULL THEN jsonb_build_object('th', NULL, 'en', NULL)
  ELSE jsonb_build_object('th', project_name, 'en', NULL)
END,
ALTER COLUMN project_name SET DEFAULT jsonb_build_object('th', NULL, 'en', NULL);

ALTER TABLE public.property_details
ALTER COLUMN address TYPE jsonb
USING CASE
  WHEN address IS NULL THEN jsonb_build_object('th', NULL, 'en', NULL)
  ELSE jsonb_build_object('th', address, 'en', NULL)
END,
ALTER COLUMN house_condition TYPE jsonb
USING CASE
  WHEN house_condition IS NULL THEN jsonb_build_object('th', NULL, 'en', NULL)
  ELSE jsonb_build_object('th', house_condition, 'en', NULL)
END,
ALTER COLUMN highlight TYPE jsonb
USING CASE
  WHEN highlight IS NULL THEN jsonb_build_object('th', NULL, 'en', NULL)
  ELSE jsonb_build_object('th', highlight, 'en', NULL)
END,
ALTER COLUMN area_around TYPE jsonb
USING CASE
  WHEN area_around IS NULL THEN jsonb_build_object('th', NULL, 'en', NULL)
  ELSE jsonb_build_object('th', area_around, 'en', NULL)
END,
ALTER COLUMN description TYPE jsonb
USING CASE
  WHEN description IS NULL THEN jsonb_build_object('th', NULL, 'en', NULL)
  ELSE jsonb_build_object('th', description, 'en', NULL)
END;

ALTER TABLE public.property_details
ALTER COLUMN address SET DEFAULT jsonb_build_object('th', NULL, 'en', NULL),
ALTER COLUMN house_condition SET DEFAULT jsonb_build_object('th', NULL, 'en', NULL),
ALTER COLUMN highlight SET DEFAULT jsonb_build_object('th', NULL, 'en', NULL),
ALTER COLUMN area_around SET DEFAULT jsonb_build_object('th', NULL, 'en', NULL),
ALTER COLUMN description SET DEFAULT jsonb_build_object('th', NULL, 'en', NULL);

-- Convert facilities arrays to jsonb payload
ALTER TABLE public.property_details
ALTER COLUMN facilities TYPE jsonb
USING CASE
  WHEN facilities IS NULL THEN jsonb_build_object('th', '[]'::jsonb, 'en', '[]'::jsonb)
  ELSE jsonb_build_object('th', to_jsonb(facilities), 'en', '[]'::jsonb)
END,
ALTER COLUMN project_facilities TYPE jsonb
USING CASE
  WHEN project_facilities IS NULL THEN jsonb_build_object('th', '[]'::jsonb, 'en', '[]'::jsonb)
  ELSE jsonb_build_object('th', to_jsonb(project_facilities), 'en', '[]'::jsonb)
END;

ALTER TABLE public.property_details
ALTER COLUMN facilities SET DEFAULT jsonb_build_object('th', '[]'::jsonb, 'en', '[]'::jsonb),
ALTER COLUMN project_facilities SET DEFAULT jsonb_build_object('th', '[]'::jsonb, 'en', '[]'::jsonb);

-- Ensure any future inserts have correct shape
ALTER TABLE public.property_details
ALTER COLUMN project_name SET NOT NULL;

COMMIT;

-- Post-migration verification queries (optional)
-- SELECT project_id, project_name, address FROM public.property_details LIMIT 10;

