# Thorough Test Plan - Template Cell Filling for Lost/Stolen/Damaged/Destroyed Items

## Test Environment Setup
- Browser: Chrome/Firefox/Edge
- URL: `file:///e:/.vscode/inventory/src/pages/report.html` or your local server
- Required: Supabase connection for template storage

---

## Test Case 1: Template Upload with Flexible Header Mapping

### Objective
Verify that templates with various header names are properly mapped to system fields.

### Steps:
1. Navigate to Reports page
2. Click "Manage Templates" button
3. Click "Upload New Template"
4. Select a test Excel file with these headers (create test file):
   - Test File A: `Item`, `Type`, `Who`, `Qty`, `When`
   - Test File B: `Product Name`, `Category`, `Person`, `Amount`, `Date`
   - Test File C: `Description`, `Label`, `Officer`, `Count`, `Timestamp`

5. Set Export Type to "Items - Lost/Stolen/Damaged/Destroyed"
6. Upload each file
7. Check browser console for mapping logs

### Expected Results:
- Each header should be mapped to correct field:
  - Item/Product Name/Description → `item_name`
  - Type/Category/Label → `category`
  - Who/Person/Officer → `person`
  - Qty/Amount/Count → `quantity`
  - When/Date/Timestamp → `last_date`

### Console Logs to Verify:
```
Detected header row: X, data starts at: Y
Mapped header "Item" -> "item_name"
Mapped header "Type" -> "category"
...
Final column mappings: {Object}
```

---

## Test Case 2: Template Filling with Database Mappings

### Objective
Verify that data fills into correct cells based on template structure.

### Prerequisites:
- Successfully uploaded template from Test Case 1
- Template is set as active
- Have some items in inventory with distribution logs

### Steps:
1. Go to "Lost/Stolen/Damaged/Destroyed Items" report
2. Select 3-5 items from the list
3. Click "Create This Report"
4. Fill in form:
   - Report Date: 2024-01-15
   - Accountable Officer: John Doe
   - Immediate Supervisor: Jane Smith
   - Incident Description: Test incident description
5. Submit form

### Expected Results:
- Excel file downloads
- Open file and verify:
  - Item data appears in correct columns (matching template headers)
  - Date appears in row 12 (columns C-F)
  - Accountable Officer appears in row 39 (columns B-E)
  - Immediate Supervisor appears in row 39 (columns F-H)
  - Incident Description appears in cell B30

### Console Logs to Verify:
```
Template configuration: {
  columnMappings: {...},
  dataStartsAtRow: X,
  headerRow: Y,
  originalHeaders: [...]
}
Field to column mapping: {item_name: 0, category: 1, ...}
Filling data starting at row X using template column mappings
Set item_name: "Item Name" at A22
Set category: "Category" at B22
...
```

---

## Test Case 3: Fallback to Default Positions

### Objective
Verify system works when template has no mappings (backward compatibility).

### Steps:
1. Manually edit database to clear `column_mappings` for a template, OR
2. Use an old template uploaded before this fix
3. Try to generate Lost/Stolen/Damaged/Destroyed report

### Expected Results:
- Console warning: `No column mappings found, using default positions for items_lost`
- Data fills in default positions:
  - Column C: Item Name
  - Column D: Category
  - Column E: Person
  - Column F: Quantity
- Form data still fills correctly (date, officer, supervisor, description)

---

## Test Case 4: Government Form Template (Row 22 Pattern)

### Objective
Verify detection of government form templates where data starts at row 22.

### Steps:
1. Create Excel template with:
   - Header row at row 21
   - Data entry area starting at row 22
   - Form fields above (date, officer, etc.)
2. Upload as "Items - Lost/Stolen/Damaged/Destroyed"
3. Generate report

### Expected Results:
- Console log: `Detected header row: 21, data starts at: 22`
- Data fills starting at row 22
- Form data fills in correct cells (row 12 for date, row 39 for signatures)

---

## Test Case 5: Multiple Items (Rows 22-28 Limit)

### Objective
Verify handling of more items than available rows.

### Steps:
1. Select 10+ items for the report
2. Generate report

### Expected Results:
- First 7 items fill rows 22-28
- Console warning for remaining items: `Skipping item X, only rows 22-28 available`
- Or system should handle overflow gracefully

---

## Test Case 6: Empty/Null Data Handling

### Objective
Verify system handles missing data gracefully.

### Steps:
1. Select items that have no distribution logs (new items)
2. Generate report

### Expected Results:
- Empty cells for missing data (not `undefined` or `null`)
- Category shows `-` or empty
- Person shows `-` or empty
- Date shows current date or item updated_at

---

## Test Case 7: Form Data Cell Filling

### Objective
Verify all form fields fill correctly in template.

### Steps:
1. Generate report with complete form data:
   - Date: 2024-03-15
   - Accountable Officer: "Maria Garcia"
   - Immediate Supervisor: "Robert Johnson"
   - Incident Description: "Items were damaged during transport due to improper handling."

2. Open generated Excel

### Expected Results:
| Cell | Expected Value |
|------|---------------|
| C12 | "Date" (label) |
| D12 | 03/15/2024 |
| E12 | 03/15/2024 |
| F12 | 03/15/2024 |
| B30 | "Items were damaged during transport..." |
| B39 | "Maria Garcia" |
| C39 | "Maria Garcia" |
| D39 | "Maria Garcia" |
| E39 | "Maria Garcia" |
| F39 | "Robert Johnson" |
| G39 | "Robert Johnson" |
| H39 | "Robert Johnson" |

---

## Test Case 8: Template Switching

### Objective
Verify system uses correct template when multiple exist.

### Steps:
1. Upload 2 different templates for `items_lost`
2. Set first as active
3. Generate report
4. Switch to second template
5. Generate another report

### Expected Results:
- Each report uses the currently active template
- Column positions match each template's structure
- Console log: `Found template for items_lost: [template name]`

---

## Test Case 9: Error Handling

### Objective
Verify graceful handling of errors.

### Steps:
1. Delete template file from Supabase Storage (simulate corruption)
2. Try to generate report
3. Check behavior

### Expected Results:
- Console error: `Error downloading template file`
- Fallback to default export (CSV/XLSX without template)
- User sees alert: "Report generated successfully!" (default format)

---

## Test Case 10: Date Formatting

### Objective
Verify date formats correctly in different locales.

### Steps:
1. Generate report with various dates:
   - 2024-01-01
   - 2024-12-31
   - Leap year date: 2024-02-29

### Expected Results:
- Date in row 12 formatted as: MM/DD/YYYY (e.g., "01/01/2024")
- Last distribution dates formatted as locale date strings

---

## Verification Checklist

After all tests, verify:

- [ ] All console logs show correct mappings
- [ ] No `undefined` or `null` values in generated Excel
- [ ] Form data appears in correct cells
- [ ] Item data aligns with template headers
- [ ] Fallback works when no mappings exist
- [ ] Error handling is graceful
- [ ] Date formatting is consistent

---

## Known Limitations

1. **Complex formatting**: Cell colors, fonts, borders from template are preserved but new data may not match exactly
2. **Formulas**: Any formulas in template cells will be overwritten with data
3. **Images/Charts**: Not supported in template filling

---

## Debug Information

If tests fail, check:

1. **Browser Console** (F12 → Console tab):
   - Look for red error messages
   - Verify template configuration logs

2. **Network Tab** (F12 → Network):
   - Check Supabase API calls
   - Verify template file downloads successfully

3. **Database** (Supabase Dashboard):
   - Check `excel_templates` table
   - Verify `template_data` column has `column_mappings`
   - Verify `file_path` points to valid storage file

---

## Test Results Log

| Test Case | Date | Tester | Result | Notes |
|-----------|------|--------|--------|-------|
| 1 - Upload | | | ⬜ Pass / ⬜ Fail | |
| 2 - Filling | | | ⬜ Pass / ⬜ Fail | |
| 3 - Fallback | | | ⬜ Pass / ⬜ Fail | |
| 4 - Gov Form | | | ⬜ Pass / ⬜ Fail | |
| 5 - Multiple | | | ⬜ Pass / ⬜ Fail | |
| 6 - Empty Data | | | ⬜ Pass / ⬜ Fail | |
| 7 - Form Data | | | ⬜ Pass / ⬜ Fail | |
| 8 - Switching | | | ⬜ Pass / ⬜ Fail | |
| 9 - Errors | | | ⬜ Pass / ⬜ Fail | |
| 10 - Dates | | | ⬜ Pass / ⬜ Fail | |

---

## Summary

This test plan covers:
- **Template upload** with flexible header matching
- **Data filling** using database column mappings
- **Fallback behavior** for legacy templates
- **Form data filling** in specific cells
- **Error handling** and edge cases
- **Multiple scenarios** (government forms, many items, empty data)

Follow each test case and mark results in the log. Report any failures with console logs and expected vs actual behavior.
