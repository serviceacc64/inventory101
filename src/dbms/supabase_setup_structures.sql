-- ==========================================
-- STRUCTURES TABLE SETUP
-- ==========================================
-- Run these SQL commands in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'Instructional', 'Non-Instructional', 'Others'
    
    -- Fields for Instructional
    number_of_rooms INTEGER,
    room_names TEXT,
    
    -- Fields for Non-Instructional
    purpose TEXT,
    
    -- Fields for Others
    function TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_structures_building
        FOREIGN KEY (building_id) 
        REFERENCES buildings(id) 
        ON DELETE CASCADE
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_structures_building_id ON structures(building_id);

-- Enable RLS
ALTER TABLE structures ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Allow viewing structures" 
    ON structures FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "Allow inserting structures" 
    ON structures FOR INSERT 
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow updating structures" 
    ON structures FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow deleting structures" 
    ON structures FOR DELETE 
    TO authenticated
    USING (true);
