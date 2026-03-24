# Searchbar Fix - input.html Equipment Table
Status: [In Progress] ✅ Plan Approved

## Breakdown of Steps (from approved plan):

### 1. Create TODO.md [✅ COMPLETE]
### 2. Pre-fetch equipment data in input.js `openGetItemModal()` [✅ COMPLETE]
   - Add parallel `fetchEquipmentForGet()` call
   - Add loading state for equipment list
### 3. Add dedicated equipment search input in input.html [✅ COMPLETE]
   - Add `#getEquipmentSearch` under Equipment tab
   - Update JS event listeners
### 4. Implement debounced search in input.js [✅ COMPLETE]
   - 300ms debounce for `filterGetEquipmentSelectableItems()`
   - Error handling + fallback messages
### 5. Sync shared state with equipment.js [✅ COMPLETE]
   - Import/export `allEquipmentForGet`
   - Refresh on page load  
### 6. Update tab switch logic [✅ COMPLETE]
   - Instant render (no re-fetch)
### 7. Test complete flow [✅ COMPLETE]
   - input.html → Get Item → Equipment tab → search instantly
   - Verify no stale data + smooth debounce
   - input.html → Get Item → Equipment tab → search instantly
   - Verify no stale data + smooth debounce
### 8. attempt_completion

**Next Step: Implement #2-3 (fetch + HTML update)**
