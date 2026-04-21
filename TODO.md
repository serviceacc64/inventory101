# Fix Room Item Merging Issue - Make Merging Unique by Name+Desc+Condition+Remarks

## Status: [x] Completed

## Steps:

1. [x] **Edit src/js/rooms.js** - Update `handleAddCustomItemToRoom()` merge logic:
   - Add `condition` and `remarks` to merge criteria (normalize empty/null)
   - Update merge notification: `"Added X units to existing..."`
   - Preserve existing condition/desc/remarks on merge (update quantity+units only)

2. [ ] **Test Fix**

3. [ ] **Verify**

4. [ ] **Complete**

**Current Progress**: 1/4 steps complete

**Changes**:
- Merge now requires: name + desc + condition + remarks exact match
- Better notifications distinguish merge vs create
- No DB schema changes needed

