-- ==========================================
-- PERSONNEL EQUIPMENT TRACKING SYSTEM - SQL SETUP
-- ==========================================
-- This file sets up the database tables for the Personnel Inventory feature.
-- Run these SQL commands in your Supabase SQL Editor.

-- ==========================================
-- 1. CREATE PERSONNEL TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS personnel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_name VARCHAR(255) NOT NULL,
    employee_id VARCHAR(100) UNIQUE NOT NULL,
    position VARCHAR(255) NOT NULL,
    school_level VARCHAR(50) NOT NULL, -- 'Senior High' or 'Junior High'
    department VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster search queries
CREATE INDEX IF NOT EXISTS idx_personnel_name ON personnel(employee_name);
CREATE INDEX IF NOT EXISTS idx_personnel_emp_id ON personnel(employee_id);
CREATE INDEX IF NOT EXISTS idx_personnel_school_level ON personnel(school_level);
CREATE INDEX IF NOT EXISTS idx_personnel_department ON personnel(department);

-- ==========================================
-- 2. CREATE PERSONNEL_ITEMS TABLE
-- ==========================================
-- Stores custom items and assigned inventory for each personnel
CREATE TABLE IF NOT EXISTS personnel_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    personnel_id UUID NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    units VARCHAR(50) DEFAULT 'pcs',
    unit_value NUMERIC(10, 2) DEFAULT 0.00,
    condition VARCHAR(50) DEFAULT 'Good',
    description TEXT,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key linking item to employee with cascade delete
    CONSTRAINT fk_personnel_items_personnel
        FOREIGN KEY (personnel_id)
        REFERENCES personnel(id)
        ON DELETE CASCADE
);

-- Create indexes for faster queries on personnel items
CREATE INDEX IF NOT EXISTS idx_personnel_items_personnel_id ON personnel_items(personnel_id);
CREATE INDEX IF NOT EXISTS idx_personnel_items_name ON personnel_items(item_name);

-- ==========================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
-- Enable RLS on both tables to secure data access
ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel_items ENABLE ROW LEVEL SECURITY;

-- Personnel policies (Allow authenticated users full access)
CREATE POLICY "Allow viewing personnel"
    ON personnel FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow inserting personnel"
    ON personnel FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow updating personnel"
    ON personnel FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow deleting personnel"
    ON personnel FOR DELETE
    TO authenticated
    USING (true);

-- Personnel items policies (Allow authenticated users full access)
CREATE POLICY "Allow viewing personnel items"
    ON personnel_items FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow inserting personnel items"
    ON personnel_items FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow updating personnel items"
    ON personnel_items FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow deleting personnel items"
    ON personnel_items FOR DELETE
    TO authenticated
    USING (true);

-- ==========================================
-- INSTRUCTIONS FOR SETUP
-- ==========================================
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/projects
-- 2. Select your project: RMNHS Inventory System
-- 3. Click on the "SQL Editor" tab on the left-hand navigation pane.
-- 4. Create a "New Query".
-- 5. Copy the SQL statements above and paste them into the editor.
-- 6. Click "Run" on the bottom right.
-- 7. Your tables, indexes, constraints, and RLS policies are now set up!
