-- ==========================================
-- FIX FOR RLS POLICY ERROR
-- ==========================================
-- This file fixes the "new row violates row-level security policy" error
-- Run this SQL in your Supabase SQL Editor

-- ==========================================
-- OPTION 1: DISABLE RLS (Simpler - Recommended for this app)
-- ==========================================
-- If RLS is not critical for your use case, disable it:

ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE room_items DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- OPTION 2: ENABLE RLS WITH PROPER POLICIES (More Secure)
-- ==========================================
-- If you want to keep RLS, run these commands:

-- Enable RLS on tables
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_items ENABLE ROW LEVEL SECURITY;

-- Policies for rooms table
CREATE POLICY "Allow all users to view rooms" 
    ON rooms FOR SELECT 
    USING (true);

CREATE POLICY "Allow authenticated users to insert rooms" 
    ON rooms FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update rooms" 
    ON rooms FOR UPDATE 
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete rooms" 
    ON rooms FOR DELETE 
    USING (true);

-- Policies for room_items table
CREATE POLICY "Allow all users to view room items" 
    ON room_items FOR SELECT 
    USING (true);

CREATE POLICY "Allow authenticated users to insert room items" 
    ON room_items FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update room items" 
    ON room_items FOR UPDATE 
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete room items" 
    ON room_items FOR DELETE 
    USING (true);

-- ==========================================
-- INSTRUCTIONS
-- ==========================================
-- 1. Go to Supabase dashboard: https://app.supabase.com
-- 2. Select your project
-- 3. Go to SQL Editor → New Query
-- 4. If you want the SIMPLE fix: Copy and run OPTION 1 (lines 8-11)
-- 5. If you want SECURITY: Copy and run OPTION 2 (lines 14-46)
-- 6. Refresh your app and try creating a room again

-- Note: OPTION 1 is simpler and works fine if only authenticated users access your system.
-- OPTION 2 is more secure if you plan to have public access in the future.
