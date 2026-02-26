-- Create the item_distributions table to track who gets items from inventory
-- Run this SQL in your Supabase SQL Editor

-- Create the table
CREATE TABLE IF NOT EXISTS item_distributions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    person TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_item_distributions_item_id ON item_distributions(item_id);
CREATE INDEX IF NOT EXISTS idx_item_distributions_person ON item_distributions(person);
CREATE INDEX IF NOT EXISTS idx_item_distributions_timestamp ON item_distributions(timestamp);
CREATE INDEX IF NOT EXISTS idx_item_distributions_created_at ON item_distributions(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE item_distributions ENABLE ROW LEVEL SECURITY;

-- Create policies for access control
-- Allow anonymous access (for development - change this for production!)
CREATE POLICY "Allow anonymous select" ON item_distributions
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert" ON item_distributions
    FOR INSERT WITH CHECK (true);

-- Optional: Create a function to handle the distribution atomically
-- This ensures both the item quantity update and distribution record are created together
CREATE OR REPLACE FUNCTION distribute_item(
    p_item_id UUID,
    p_person TEXT,
    p_quantity INTEGER,
    p_timestamp TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_item_name TEXT;
    v_current_quantity INTEGER;
BEGIN
    -- Get current item info
    SELECT name, quantity INTO v_item_name, v_current_quantity
    FROM items WHERE id = p_item_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item not found';
    END IF;
    
    IF v_current_quantity < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_current_quantity, p_quantity;
    END IF;
    
    -- Update item quantity
    UPDATE items 
    SET quantity = quantity - p_quantity,
        updated_at = NOW()
    WHERE id = p_item_id;
    
    -- Create distribution record
    INSERT INTO item_distributions (
        item_id,
        item_name,
        person,
        quantity,
        timestamp,
        created_at
    ) VALUES (
        p_item_id,
        v_item_name,
        p_person,
        p_quantity,
        p_timestamp,
        NOW()
    );
END;
$$;

-- Comment explaining the table purpose
COMMENT ON TABLE item_distributions IS 'Tracks all item distributions/withdrawals from inventory';
