-- ==========================================
-- BUILDING ADDITIONAL FIELDS SETUP
-- ==========================================
-- Run these SQL commands in your Supabase SQL Editor.
-- This script is safe to run more than once.

ALTER TABLE buildings
    ADD COLUMN IF NOT EXISTS building_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS structure_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS number_of_storeys INTEGER,
    ADD COLUMN IF NOT EXISTS number_of_rooms INTEGER,
    ADD COLUMN IF NOT EXISTS room_usage TEXT,
    ADD COLUMN IF NOT EXISTS property_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS fund_source VARCHAR(255),
    ADD COLUMN IF NOT EXISTS acquisition_cost NUMERIC(14, 2),
    ADD COLUMN IF NOT EXISTS acquisition_date DATE;

CREATE INDEX IF NOT EXISTS idx_buildings_building_number ON buildings(building_number);
CREATE INDEX IF NOT EXISTS idx_buildings_property_number ON buildings(property_number);

-- Refresh PostgREST schema cache so the REST API can see the new columns.
NOTIFY pgrst, 'reload schema';
