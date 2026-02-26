-- Create the activity_logs table to track ALL inventory changes
-- Run this SQL in your Supabase SQL Editor

-- Drop table if exists (for clean setup)
DROP TABLE IF EXISTS activity_logs;

-- Create the activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action_type TEXT NOT NULL CHECK (action_type IN ('CREATE', 'UPDATE_QUANTITY', 'DISTRIBUTE', 'EDIT', 'DELETE')),
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    quantity_changed INTEGER DEFAULT 0,
    quantity_before INTEGER,
    quantity_after INTEGER,
    person TEXT,
    details JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_item_id ON activity_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for access control
-- Allow anonymous access (for development - change this for production!)
CREATE POLICY "Allow anonymous select" ON activity_logs
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert" ON activity_logs
    FOR INSERT WITH CHECK (true);

-- Create a function to log activity
CREATE OR REPLACE FUNCTION log_activity(
    p_action_type TEXT,
    p_item_id UUID,
    p_item_name TEXT,
    p_quantity_changed INTEGER DEFAULT 0,
    p_quantity_before INTEGER DEFAULT NULL,
    p_quantity_after INTEGER DEFAULT NULL,
    p_person TEXT DEFAULT NULL,
    p_details JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO activity_logs (
        action_type,
        item_id,
        item_name,
        quantity_changed,
        quantity_before,
        quantity_after,
        person,
        details,
        timestamp
    ) VALUES (
        p_action_type,
        p_item_id,
        p_item_name,
        p_quantity_changed,
        p_quantity_before,
        p_quantity_after,
        p_person,
        p_details,
        NOW()
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- Create a trigger function to automatically log item changes
-- NOTE: This trigger only logs CREATE, UPDATE_QUANTITY (when adding stock), and DELETE
-- DISTRIBUTE actions are logged manually from JavaScript to capture the person field
CREATE OR REPLACE FUNCTION log_item_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_action_type TEXT;
    v_quantity_changed INTEGER;
    v_details JSONB;
BEGIN
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        v_action_type := 'CREATE';
        v_quantity_changed := NEW.quantity;
        v_details := jsonb_build_object(
            'label', NEW.label,
            'unit', NEW.unit
        );
        
        -- Log the creation
        PERFORM log_activity(
            v_action_type,
            NEW.id,
            NEW.name,
            v_quantity_changed,
            0,
            NEW.quantity,
            NULL,
            v_details
        );
        
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Check if quantity increased (stock added) - NOT decreased (distribution)
        IF NEW.quantity > OLD.quantity THEN
            v_action_type := 'UPDATE_QUANTITY';
            v_quantity_changed := NEW.quantity - OLD.quantity;
            
            PERFORM log_activity(
                v_action_type,
                NEW.id,
                NEW.name,
                v_quantity_changed,
                OLD.quantity,
                NEW.quantity,
                NULL,
                jsonb_build_object(
                    'label', NEW.label,
                    'unit', NEW.unit,
                    'reason', 'Stock added'
                )
            );
        END IF;
        
        -- Check if other fields changed (name, label, unit)
        IF OLD.name IS DISTINCT FROM NEW.name OR 
           OLD.label IS DISTINCT FROM NEW.label OR 
           OLD.unit IS DISTINCT FROM NEW.unit THEN
            
            PERFORM log_activity(
                'EDIT',
                NEW.id,
                NEW.name,
                0,
                OLD.quantity,
                NEW.quantity,
                NULL,
                jsonb_build_object(
                    'old_name', OLD.name,
                    'new_name', NEW.name,
                    'old_label', OLD.label,
                    'new_label', NEW.label,
                    'old_unit', OLD.unit,
                    'new_unit', NEW.unit
                )
            );
        END IF;
        
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Log the deletion
        -- Note: item_id is set to NULL because the item no longer exists
        -- Item details are preserved in the details JSONB field
        PERFORM log_activity(
            'DELETE',
            NULL,  -- Item no longer exists, so no valid foreign key
            OLD.name,
            0,
            OLD.quantity,
            0,
            NULL,
            jsonb_build_object(
                'deleted_item_id', OLD.id,
                'label', OLD.label,
                'unit', OLD.unit,
                'final_quantity', OLD.quantity
            )
        );
        
        RETURN OLD;

    END IF;
    
    RETURN NULL;
END;
$$;

-- Create triggers on the items table
DROP TRIGGER IF EXISTS items_activity_log ON items;

CREATE TRIGGER items_activity_log
    AFTER INSERT OR UPDATE OR DELETE ON items
    FOR EACH ROW
    EXECUTE FUNCTION log_item_changes();

-- Comment explaining the table purpose
COMMENT ON TABLE activity_logs IS 'Tracks all inventory activities including item creation, quantity updates, distributions, edits, and deletions';

-- Sample query to get recent activities
-- SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 50;

-- Sample query to get activities for a specific item
-- SELECT * FROM activity_logs WHERE item_id = 'your-item-id' ORDER BY timestamp DESC;

-- Sample query to get activity summary by type
-- SELECT action_type, COUNT(*) as count FROM activity_logs GROUP BY action_type;
