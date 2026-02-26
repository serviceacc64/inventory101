-- =============================================
-- Excel Template Storage Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- Drop table if exists to recreate with correct schema
DROP TABLE IF EXISTS excel_templates;

-- Create excel_templates table to store uploaded templates
CREATE TABLE IF NOT EXISTS excel_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    supported_types TEXT[] DEFAULT ARRAY['items_list', 'items_lost', 'rooms', 'logs'],
    is_active BOOLEAN DEFAULT false,
    file_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT  -- Changed from UUID to TEXT to support localStorage auth
);

-- Enable RLS (Row Level Security)
ALTER TABLE excel_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all operations" ON excel_templates;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON excel_templates;
DROP POLICY IF EXISTS "Allow read for anonymous" ON excel_templates;
DROP POLICY IF EXISTS "Users can manage own templates" ON excel_templates;
DROP POLICY IF EXISTS "Templates are viewable by authenticated users" ON excel_templates;

-- Policy: Allow all operations for everyone (public access)
-- This is needed because the app uses localStorage auth, not Supabase Auth
CREATE POLICY "Allow all operations" ON excel_templates
FOR ALL 
TO public
USING (true)
WITH CHECK (true);

-- =============================================
-- Storage Bucket Setup
-- Make sure you create a "templates" bucket first in the Storage UI
-- Then run these policies:
-- =============================================

-- Drop existing storage policies if any
DROP POLICY IF EXISTS "Allow all storage operations" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;

-- Policy: Allow all operations on templates bucket (public access)
-- This is needed because the app uses localStorage auth, not Supabase Auth
CREATE POLICY "Allow all storage operations" ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'templates')
WITH CHECK (bucket_id = 'templates');

-- =============================================
-- Example Template Data Structure (JSONB):
-- {
--   "column_mappings": {
--     "Item Name": "name",
--     "Category": "label",
--     "Quantity": "quantity",
--     "Unit": "unit",
--     "Date Added": "created_at"
--   },
--   "header_row": 1,
--   "data_starts_at_row": 2,
--   "sheet_name": "Sheet1",
--   "export_type": "items_list"
-- }
-- =============================================
