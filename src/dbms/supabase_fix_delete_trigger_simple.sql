-- EMERGENCY FIX: Foreign Key Constraint Error on Item Delete
-- Run this in Supabase SQL Editor immediately to fix the 409 error

-- Step 1: Drop the existing trigger
DROP TRIGGER IF EXISTS items_activity_log ON items;

-- Step 2: Update the trigger function with the fix
CREATE OR REPLACE FUNCTION log_item_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_action_type TEXT;
    v_quantity_changed INTEGER;
    v_details JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action_type := 'CREATE';
        v_quantity_changed := NEW.quantity;
        v_details := jsonb_build_object('label', NEW.label, 'unit', NEW.unit);
        
        PERFORM log_activity(v_action_type, NEW.id, NEW.name, v_quantity_changed, 0, NEW.quantity, NULL, v_details);
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.quantity > OLD.quantity THEN
            v_action_type := 'UPDATE_QUANTITY';
            v_quantity_changed := NEW.quantity - OLD.quantity;
            PERFORM log_activity(v_action_type, NEW.id, NEW.name, v_quantity_changed, OLD.quantity, NEW.quantity, NULL, 
                jsonb_build_object('label', NEW.label, 'unit', NEW.unit, 'reason', 'Stock added'));
        END IF;
        
        IF OLD.name IS DISTINCT FROM NEW.name OR OLD.label IS DISTINCT FROM NEW.label OR OLD.unit IS DISTINCT FROM NEW.unit THEN
            PERFORM log_activity('EDIT', NEW.id, NEW.name, 0, OLD.quantity, NEW.quantity, NULL,
                jsonb_build_object('old_name', OLD.name, 'new_name', NEW.name, 'old_label', OLD.label, 'new_label', NEW.label, 'old_unit', OLD.unit, 'new_unit', NEW.unit));
        END IF;
        
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- CRITICAL FIX: Pass NULL for item_id since item no longer exists
        -- The deleted item's ID is preserved in details for reference
        PERFORM log_activity('DELETE', NULL, OLD.name, 0, OLD.quantity, 0, NULL,
            jsonb_build_object('deleted_item_id', OLD.id, 'label', OLD.label, 'unit', OLD.unit, 'final_quantity', OLD.quantity));
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Step 3: Recreate the trigger
CREATE TRIGGER items_activity_log
    AFTER INSERT OR UPDATE OR DELETE ON items
    FOR EACH ROW
    EXECUTE FUNCTION log_item_changes();

-- Step 4: Verify the fix was applied
SELECT 
    tgname AS trigger_name,
    proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'items_activity_log';

-- Success message
SELECT 'Trigger updated successfully! You can now delete items without errors.' AS status;
