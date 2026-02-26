# Fix Duplicate Logging Issue - TODO

## Problem
When clicking "Add Stock" or "Edit Item", TWO identical log entries appear in logs.html:
1. Database trigger automatically logs the activity (1st entry)
2. JavaScript then manually logs the same activity again (2nd entry)

## Root Cause
- Database trigger `items_activity_log` handles: CREATE, UPDATE_QUANTITY, EDIT, DELETE
- JavaScript was also manually logging: UPDATE_QUANTITY, EDIT
- Only DISTRIBUTE should be logged manually (trigger explicitly skips it)

## Fix Steps

- [ ] Step 1: Remove manual logActivity() call in handleUpdateQuantity() (Add Stock)
- [ ] Step 2: Remove manual logActivity() call in handleEditItem() (Edit Item)
- [ ] Step 3: Keep DISTRIBUTE logging in handleGetItemSubmit() (correctly handled only by JS)
- [ ] Step 4: Test the fixes

## Files to Edit
- `src/js/input.js` - Remove duplicate logging calls
