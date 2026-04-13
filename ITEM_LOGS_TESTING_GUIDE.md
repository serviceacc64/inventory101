# Item Logs Testing Guide - Practical Execution Steps

**Last Updated**: April 8, 2026

## Quick Start

### Option 1: Run Automated Unit Tests (Browser Console)

1. **Open your inventory application** in the browser
2. **Open Browser DevTools** (F12 or Right-click → Inspect)
3. **Go to Console tab**
4. **Paste and run**:
```javascript
import('./src/js/testItemLogs.js').then(m => m.runAllTests());
```

5. **Review results** - Green ✓ = Pass, Red ✗ = Fail

### Option 2: Manual Testing with Supabase

#### Prerequisites
- Access to Supabase admin panel
- Direct database access or via UI
- The inventory app loaded in browser

---

## Test Execution Steps

### Phase 1: Data Setup

#### 1.1 Clear Test Data
```sql
-- Clear old test data from Supabase if needed
DELETE FROM activity_logs 
WHERE item_id IN (
  SELECT id FROM items WHERE name LIKE 'TEST_%'
);

DELETE FROM items WHERE name LIKE 'TEST_%';
```

#### 1.2 Create Test Items
Either via UI or SQL:

```sql
-- Create test items
INSERT INTO items (id, name, label, quantity, unit, created_at, updated_at) VALUES
('test-item-001', 'TEST_Item_A', 'Electronics', 0, 'pcs', NOW(), NOW()),
('test-item-002', 'TEST_Item_B', 'Office', 0, 'pcs', NOW(), NOW()),
('test-item-003', 'TEST_Item_C', 'Tools', 0, 'pcs', NOW(), NOW());
```

---

### Phase 2: Test Scenario Execution

#### Scenario 1: Basic Item Creation → Export

**Step 1: Create Item in UI**
- Go to Input page
- Add Item: "TEST_Item_A"
- Quantity: 100
- Category: Electronics
- Submit

**Step 2: Verify Log Created**
- Go to Logs page
- Search for "TEST_Item_A"
- Confirm CREATE action logged
- Verify quantity_after = 100

**Step 3: View Item History**
- Go to Reports → Item History Report
- Select: TEST_Item_A
- From Date: [Today]
- To Date: [Today]
- Click Generate

**Step 4: Verify Summary**
- Stock Added: 100
- Stock Distributed: 0
- Net Change: +100
- Transactions: 1

**Step 5: Export**
- Click "Export to XLSX"
- Download and open file
- **Verify in Excel**:
  - Sheet name: "Item History"
  - Summary section shows correct values
  - Detail section shows CREATE action
  - Quantity columns populated

---

#### Scenario 2: Stock Addition & Distribution

**Step 1: Add Stock**
- Go to Input page
- Get Item → TEST_Item_A
- Quantity to Add: 50
- Submit

**Step 2: Distribute Item**
- Go to Input page
- Use Classroom Distribution
- Select TEST_Item_A
- Distribute 25 units to Room A
- 25 units to Room B
- Submit

**Step 3: View Full History**
- Reports → Item History
- Select: TEST_Item_A
- Same date range
- Generate

**Step 4: Verify Calculations**
- Stock Added: Should be 150 (100 initial + 50 added)
- Stock Distributed: Should be 50 (25+25)
- Net Change: Should be 100 (150-50)
- Transactions: Should be 3 (CREATE, UPDATE_QUANTITY, DISTRIBUTE x2 OR grouped)
- Final Quantity: Should be 150

**Step 5: Export & Verify**
- Export as XLSX
- Open in Excel
- Check all values in summary section
- Check each transaction in detail section

---

#### Scenario 3: Date Range Filtering

**Step 1: Create Historical Data**
- Add logs on different dates (manually edit in Supabase)
- OR create items at different times
- Example:
  - 04-01: Create item with 100 units
  - 04-05: Add 50 units
  - 04-10: Distribute 30 units
  - 04-15: Distribute 20 units

**Step 2: Filter by Date Range**
- Reports → Item History
- Select: TEST_Item_C
- From Date: 04-05
- To Date: 04-12
- Generate

**Step 3: Verify Range Filtering**
- Only logs 04-05 and 04-10 should appear
- Transactions: Should be 2
- Initial Quantity: Should be 150 (from before 04-05)
- Final Quantity: Should be 120 (after 04-10)

**Step 4: Export Range**
- Export and verify only selected dates in file

---

### Phase 3: Edge Case Testing

#### Test: Null/Missing Values
**Setup**:
- Manually insert log with null quantity_before/after
- Or use API directly

**Expected**:
- System doesn't crash
- Export shows "-" or empty
- Calculations skip invalid entries

#### Test: Negative Quantities
**Setup**:
- Try to distribute more than available (if possible)
- Manually insert negative final quantity

**Expected**:
- System handles gracefully
- Calculations show correct math
- Warning in logs if applicable

#### Test: Zero Quantity Changes
**Setup**:
- Add log entry with 0 change
- quantity_before = 100, quantity_after = 100

**Expected**:
- Transaction counted in total
- Not included in Added/Distributed
- Export shows 0 in Qty Changed column

---

### Phase 4: Export Format Validation

#### XLSX Export
- [ ] File downloads successfully
- [ ] File opens in Excel
- [ ] All columns present
- [ ] Numbers are numeric (not text)
- [ ] Dates are formatted correctly
- [ ] Summary section visible and correct
- [ ] All rows included
- [ ] No corruption or errors

#### CSV Export
- [ ] File downloads successfully
- [ ] Can open in Excel or text editor
- [ ] All rows present
- [ ] Commas properly escaped
- [ ] No line break issues
- [ ] Item name in filename

---

## Validation Checklist

### Math Validation
For each test scenario, verify:

```
✓ Delta Calculation Correct
  └─ For each log: delta = (after - before) OR quantity_changed
  └─ Positive delta → added to Items Added
  └─ Negative delta → absolute value added to Items Distributed

✓ Summary Totals
  └─ Items Added = SUM(positive deltas)
  └─ Items Distributed = SUM(|negative deltas|)
  └─ Net Change = Items Added - Items Distributed
  └─ Transactions = COUNT(all logs)

✓ Initial & Final
  └─ Initial Quantity = first log's quantity_before
  └─ Final Quantity = last log's quantity_after
  └─ Ideally: Initial + Net Change ≈ Final
     (May not be exact if data incomplete)

✓ Export File
  └─ All calculated values match display
  └─ Person field populated
  └─ Timestamps match database
  └─ No truncation or rounding errors
```

---

## Common Issues & Solutions

### Issue 1: Export Shows "No data found"
**Cause**: No logs in selected date range  
**Solution**: 
- Verify logs created in that date range
- Check timestamp format in database
- Try broader date range

### Issue 2: Math Doesn't Add Up
**Cause**: Null quantity values  
**Solution**:
- Check if quantity_before/after are null
- Verify quantity_changed field populated
- Ensure logs sorted chronologically

### Issue 3: Export File Corrupted
**Cause**: XLSX library issue or special characters  
**Solution**:
- Try CSV export instead
- Check item names for special characters
- Clear browser cache
- Try different browser

### Issue 4: Person Field Missing
**Cause**: Log created without person attribution  
**Solution**:
- Ensure person field populated when creating logs
- Update log manually in database
- Check JS function calling activity_logs

### Issue 5: Dates Out of Order
**Cause**: Logs not sorted before calculation  
**Solution**:
- System should sort automatically
- If not, check calculateItemHistorySummary function
- May need to add sort step

---

## Performance Testing

### Large Dataset Test
1. Create item with 500+ transactions
2. Generate report for full date range
3. Measure response time
4. Expected: < 5 seconds
5. Export time: < 10 seconds

### Multi-Item Test
1. Create 20-50 test items with histories
2. Run complete test suite
3. Verify no memory leaks
4. Check browser performance

---

## Test Results Logging

### After Each Test Scenario, Log:

**Test Case**: [Name]  
**Date**: [Date]  
**Status**: ✓ PASS / ✗ FAIL  
**Items Added**: [Actual] vs [Expected]  
**Items Distributed**: [Actual] vs [Expected]  
**Net Change**: [Actual] vs [Expected]  
**Final Quantity**: [Actual] vs [Expected]  
**Export Success**: Yes/No  
**Issues Found**: [List any issues]  
**Notes**: [Additional observations]

---

## Browser DevTools Tips

### View All Logs for Item
```javascript
// In console, after loading report:
console.table(itemHistoryLogs);
```

### Check Calculation Results
```javascript
// View summary calculations
console.log(itemHistorySummaryData);
```

### Debug Delta Calculation
```javascript
// Check delta for each log
itemHistoryLogs.forEach(log => {
    const delta = getQuantityDelta(log);
    console.log(`${log.timestamp}: ${delta} (before: ${log.quantity_before}, after: ${log.quantity_after})`);
});
```

### Verify Export Data Structure
```javascript
// Check what will be exported
historyRows = itemHistoryLogs.map(log => ({
    Date: log.timestamp ? new Date(log.timestamp).toLocaleString() : '',
    Action: log.action_type || '',
    'Qty Changed': log.quantity_changed || 0,
    'Quantity Before': log.quantity_before != null ? log.quantity_before : '',
    'Quantity After': log.quantity_after != null ? log.quantity_after : '',
    Person: log.person || '',
    Notes: log.notes || log.details?.notes || log.details?.description || ''
}));
console.table(historyRows);
```

---

## Test Report Template

```markdown
# Test Report - Item Logs Export Accuracy

**Date**: [DATE]  
**Tester**: [NAME]  
**Browser**: [BROWSER] v[VERSION]  
**Device**: [DEVICE]  
**Database**: [SUPABASE/LOCAL]

## Summary
- Total Tests: XX
- Passed: XX
- Failed: XX
- Success Rate: XX%

## Detailed Results

### Test 1.1: Item Creation
- Status: ✓ PASS
- Stock Added: 100 ✓
- Stock Distributed: 0 ✓
- Net Change: 100 ✓
- Export: ✓

### Test 1.2: Stock Addition
- Status: [PASS/FAIL]
- Results: [DETAILS]

[Continue for each test...]

## Issues Found
1. [Issue description and impact]
2. [Recommendation]

## Recommendations
- [For improvement/fix]

```

---

## Additional Resources

- **Main Test Plan**: See `ITEM_LOGS_TEST_PLAN.md`
- **Test Code**: `src/js/testItemLogs.js`
- **Report Code**: `src/js/report.js` (lines 1355-1609)
- **Database**: `src/dbms/supabase_setup_activity_logs.sql`

---

## When to Run Tests

- After modifying calculation functions
- Before deployment
- When field names change
- After database schema changes
- When export format changes
- After adding new action types
- Quarterly regression testing

