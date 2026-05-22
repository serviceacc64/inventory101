-- ==========================================================
-- EQUIPMENT INVENTORY SYSTEM - ADD NEW PROPERTY & COUNT FIELDS
-- ==========================================================
-- Run these SQL commands in your Supabase SQL Editor to update
-- the existing equipment table structure.

-- 1. Alter equipment table to add the new fields
ALTER TABLE equipment 
ADD COLUMN IF NOT EXISTS old_property_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS new_property_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS unit_of_measurement VARCHAR(50),
ADD COLUMN IF NOT EXISTS quantity_per_physical_count INTEGER,
ADD COLUMN IF NOT EXISTS condition VARCHAR(50) DEFAULT 'Good';

-- 2. Create indexes for property numbers to optimize search queries
CREATE INDEX IF NOT EXISTS idx_equipment_old_property ON equipment(old_property_number);
CREATE INDEX IF NOT EXISTS idx_equipment_new_property ON equipment(new_property_number);
