# Excel Template Export Feature - Implementation Plan

## 1. Information Gathered

### Current Export Functions:
- **report.js**: `exportReport()` and `generateReportFile()` - exports reports in CSV/XLSX
- **logs.js**: `exportLogs()` - exports activity logs in CSV
- **rooms.js**: `exportRoomItemsToExcel()` - exports room items in XLSX

### Data Structures:
- **Items**: id, name, label, quantity, unit, created_at, updated_at
- **Activity Logs**: id, action_type, item_id, item_name, quantity_changed, quantity_before, quantity_after, person, details, timestamp
- **Reports**: Period stats (items added, removed, transactions, net change)

## 2. Implementation Plan

### Phase 1: Template Storage System
- [ ] Create `templateStorage.js` - Handles saving/loading templates from localStorage
- [ ] Define template data structure:
  
```
javascript
  {
    id: 'unique-template-id',
    name: 'My Template',
    createdAt: '2024-01-01T00:00:00Z',
    columnMappings: {
      item_name: 'Item Name',
      quantity: 'Quantity',
      // ... custom column mappings
    },
    exportTypes: ['items', 'logs', 'reports', 'rooms']
  }
  
```

### Phase 2: Template Upload UI
- [ ] Add template management section in settings/dashboard
- [ ] Create modal for uploading Excel template
- [ ] Parse uploaded Excel file to extract column headers
- [ ] Map template columns to system fields

### Phase 3: Modify Export Functions
- [ ] Update `report.js` - Use template for column mapping
- [ ] Update `logs.js` - Use template for column mapping  
- [ ] Update `rooms.js` - Use template for column mapping
- [ ] Add export function to `input.js` for items list

### Phase 4: Integration
- [ ] Create templateManager.js - Central template management
- [ ] Add "Use Template" toggle in export modals
- [ ] Fallback to default columns if no template set

## 3. Files to Create/Modify

### New Files:
- `src/js/templateManager.js` - Template storage and management
- `src/pages/template-settings.html` - UI for managing templates

### Files to Modify:
- `src/js/report.js` - Use template in exports
- `src/js/logs.js` - Use template in exports
- `src/js/rooms.js` - Use template in exports
- `src/js/input.js` - Add items export + use template

## 4. Technical Approach

### Template Parsing:
1. User uploads Excel file
2. System reads headers (first row)
3. User maps each header to system fields
4. Template saved to localStorage

### Export Process:
1. Check if template exists and is active
2. If yes, use template column mappings
3. If no, use default column structure
4. Generate Excel/CSV with mapped columns

## 5. Limitations
- Complex Excel formatting (colors, fonts, cell styles) cannot be replicated
- Only column names and order can be customized
- Formula support is not possible

## 6. Follow-up Steps
1. User confirms this plan
2. Create template storage system
3. Build template upload UI
4. Modify each export function
5. Test all export types
