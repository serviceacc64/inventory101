-- ==========================================
-- FIX FOR CUSTOM ITEMS IN ROOMS
-- ==========================================
-- The room_items table needs to allow NULL for item_id (for custom items)
-- Run this SQL in your Supabase SQL Editor

-- Drop the NOT NULL constraint on item_id to allow custom items
ALTER TABLE room_items ALTER COLUMN item_id DROP NOT NULL;

-- The foreign key constraint can stay - it only applies when item_id is NOT NULL

-- Verify the change (optional - just to check)
-- SELECT column_name, is_nullable, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'room_items' AND column_name = 'item_id';
