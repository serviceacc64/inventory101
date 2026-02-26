-- Fix for foreign key constraint error when deleting items
-- This updates the trigger function to handle DELETE operations correctly
-- Run this in your Supabase SQL Editor

-- Update the trigger function to fix the DELETE handler
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
        -- FIXED: item_id is set to NULL because the item no longer exists
        -- Item details are preserved in the details JSONB field
        PERFORM log_activity(
            'DELETE',
            NULL,  -- Item no longer exists, so no valid foreign key reference
            OLD.name,
            0,
            OLD.quantity,
            0,
            NULL,
            jsonb_build_object(
                'deleted_item_id', OLD.id,  -- Preserve original ID for reference
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

-- Recreate the trigger to ensure it's using the updated function
DROP TRIGGER IF EXISTS items_activity_log ON items;

CREATE TRIGGER items_activity_log
    AFTER INSERT OR UPDATE OR DELETE ON items
    FOR EACH ROW
    EXECUTE FUNCTION log_item_changes();

-- Verify the fix
COMMENT ON FUNCTION log_item_changes() IS 'Fixed: DELETE operations now pass NULL for item_id to avoid foreign key constraint violations';
