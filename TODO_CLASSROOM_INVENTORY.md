# Classroom Inventory Excel Template - Implementation Plan

## Task Summary:
Create custom Excel template mapping for "CLASSROOM INVENTORY" with specific cell positions:
- Item Name: Column A, Rows 6-15
- Description: Column B, Rows 6-15
- Units: Column E, Rows 6-15
- Quantity: Column F, Rows 6-15
- Room Name: Column I, Rows 6-15
- Condition: Column J, Rows 6-15
- Remarks: Column K, Rows 6-15

## Implementation Steps:

### Phase 1: Update templateManager.js
- [ ] Modify `fillTemplateWithData` function to detect "CLASSROOM INVENTORY" template
- [ ] Add custom column mapping for classroom inventory:
  - Column A (index 0): Item Name
  - Column B (index 1): Description  
  - Column E (index 4): Units
  - Column F (index 5): Quantity
  - Column I (index 8): Room Name
  - Column J (index 9): Condition
  - Column K (index 10): Remarks
- [ ] Start data at row 6 (row 6-15 as specified)

### Phase 2: Test
- [ ] Test export with sample room data
- [ ] Verify correct cell positions

## Files to Modify:
- `src/js/templateManager.js` - Add classroom inventory specific handling
