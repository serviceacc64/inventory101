-- ==========================================
-- EQUIPMENT INVENTORY SYSTEM - SQL SETUP
-- ==========================================
-- This file sets up the necessary tables for the Equipment Inventory feature
-- Run these SQL commands in your Supabase SQL Editor

-- ==========================================
-- 1. CREATE SUPPLIERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_name VARCHAR(255) NOT NULL,
    contact_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(supplier_name);

-- ==========================================
-- 2. CREATE EQUIPMENT TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number VARCHAR(50),
    old_property_number VARCHAR(100),
    new_property_number VARCHAR(100),
    unit_of_measurement VARCHAR(50),
    quantity_per_physical_count INTEGER,
    condition VARCHAR(50) DEFAULT 'Good',
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_cost DECIMAL(10, 2) DEFAULT 0.00,
    amount DECIMAL(10, 2) DEFAULT 0.00,
    supplier_id UUID REFERENCES suppliers(id),
    accountable VARCHAR(255),
    received_by VARCHAR(255),
    date_delivered DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_equipment_name ON equipment(item_name);
-- Create index for supplier foreign key
CREATE INDEX IF NOT EXISTS idx_equipment_supplier ON equipment(supplier_id);
-- Create index for date_delivered
CREATE INDEX IF NOT EXISTS idx_equipment_date_delivered ON equipment(date_delivered);
-- Create index for receipt_number
CREATE INDEX IF NOT EXISTS idx_equipment_receipt ON equipment(receipt_number);
-- Create index for old_property_number
CREATE INDEX IF NOT EXISTS idx_equipment_old_property ON equipment(old_property_number);
-- Create index for new_property_number
CREATE INDEX IF NOT EXISTS idx_equipment_new_property ON equipment(new_property_number);

-- ==========================================
-- 3. POLICIES (ROW LEVEL SECURITY)
-- ==========================================
-- Enable RLS and create policies for suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow viewing suppliers" 
    ON suppliers FOR SELECT USING (true);

CREATE POLICY "Allow inserting suppliers" 
    ON suppliers FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow updating suppliers" 
    ON suppliers FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow deleting suppliers" 
    ON suppliers FOR DELETE USING (true);

-- Enable RLS and create policies for equipment
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow viewing equipment" 
    ON equipment FOR SELECT USING (true);

CREATE POLICY "Allow inserting equipment" 
    ON equipment FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow updating equipment" 
    ON equipment FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow deleting equipment" 
    ON equipment FOR DELETE USING (true);

-- ==========================================
-- INSTRUCTIONS
-- ==========================================
-- 1. Go to your Supabase dashboard: https://app.supabase.com
-- 2. Select your project
-- 3. Navigate to SQL Editor -> New Query
-- 4. Copy and paste all the SQL statements above
-- 5. Click "Run" to create the tables and policies
-- 6. Test the Equipment feature by navigating to the Equipment page in your application
