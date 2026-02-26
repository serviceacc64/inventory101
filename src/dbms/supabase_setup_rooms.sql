-- ==========================================
-- ROOMS INVENTORY SYSTEM - SQL SETUP
-- ==========================================
-- This file sets up the necessary tables for the Room Inventory feature
-- Run these SQL commands in your Supabase SQL Editor

-- ==========================================
-- 1. CREATE ROOMS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    room_address TEXT,
    accountable VARCHAR(255),
    room_adviser VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_rooms_name ON rooms(name);

-- ==========================================
-- 2. CREATE ROOM_ITEMS TABLE
-- ==========================================
-- This table stores the items inventory for each room
CREATE TABLE IF NOT EXISTS room_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL,
    item_id UUID NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    units VARCHAR(50) DEFAULT 'pcs',
    condition VARCHAR(50) DEFAULT 'Good',
    remarks TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_room_items_room 
        FOREIGN KEY (room_id) 
        REFERENCES rooms(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_room_items_item 
        FOREIGN KEY (item_id) 
        REFERENCES items(id) 
        ON DELETE CASCADE,
    
    -- Prevent duplicate item entries in same room
    UNIQUE(room_id, item_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_room_items_room_id ON room_items(room_id);
CREATE INDEX IF NOT EXISTS idx_room_items_item_id ON room_items(item_id);
CREATE INDEX IF NOT EXISTS idx_room_items_item_name ON room_items(item_name);

-- ==========================================
-- 3. SAMPLE DATA (OPTIONAL)
-- ==========================================
-- Uncomment these lines to add sample data for testing

-- INSERT INTO rooms (name, description) VALUES
--     ('Grade 1 Classroom A', 'Classroom for Grade 1 students'),
--     ('Grade 1 Classroom B', 'Classroom for Grade 1 students'),
--     ('Library', 'Main library and reading area'),
--     ('Main Office', 'Administrative office'),
--     ('Gymnasium', 'Sports and activities hall');

-- ==========================================
-- 4. POLICIES (IF USING ROW LEVEL SECURITY)
-- ==========================================
-- Enable RLS and create policies for authenticated access
-- Run these if you're getting 403 Forbidden errors

-- Enable RLS on tables
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_items ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all rooms
CREATE POLICY "Allow viewing rooms" 
    ON rooms FOR SELECT 
    TO authenticated
    USING (true);

-- Allow authenticated users to insert rooms
CREATE POLICY "Allow inserting rooms" 
    ON rooms FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update rooms
CREATE POLICY "Allow updating rooms" 
    ON rooms FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to delete rooms
CREATE POLICY "Allow deleting rooms" 
    ON rooms FOR DELETE 
    TO authenticated
    USING (true);

-- Room items policies
CREATE POLICY "Allow viewing room items" 
    ON room_items FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "Allow inserting room items" 
    ON room_items FOR INSERT 
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow updating room items" 
    ON room_items FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow deleting room items" 
    ON room_items FOR DELETE 
    TO authenticated
    USING (true);

-- Allow anon access (for testing only - remove in production)
-- CREATE POLICY "Allow anon viewing rooms" 
--     ON rooms FOR SELECT 
--     TO anon
--     USING (true);

-- ==========================================
-- INSTRUCTIONS
-- ==========================================
-- 1. Go to your Supabase dashboard: https://app.supabase.com
-- 2. Select your project
-- 3. Navigate to SQL Editor -> New Query
-- 4. Copy and paste the SQL statements above (lines 9-43)
-- 5. Click "Run" to create the tables
-- 6. If you want sample data, uncomment and run the INSERT statements (lines 47-52)
-- 7. Test the Rooms feature by navigating to the Rooms page in your application
