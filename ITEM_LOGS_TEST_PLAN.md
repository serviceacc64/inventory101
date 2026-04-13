# Comprehensive Item Logs Testing Plan

**Purpose**: Ensure all math calculations are correct when exporting individual item history/logs.

**Date Created**: April 8, 2026  
**Status**: Active Testing

---

## Overview of Math Calculations

The system performs the following calculations for item history reports:

### Core Calculation Functions
1. **getQuantityDelta(log)**: Calculates change amount
   - Primary: `quantity_after - quantity_before`
   - Fallback: `quantity_changed`
   - Default: 0 if both null

2. **calculateItemHistorySummary(logs)**:
   - **Items Added**: Sum of all positive deltas
   - **Items Distributed**: Sum of absolute values of negative deltas
   - **Net Change**: Items Added - Items Distributed
   - **Transactions**: Count of all logs
   - **Initial Quantity**: quantity_before from first log (chronological)
   - **Final Quantity**: quantity_after from last log (chronological)

3. **Export Data**:
   - Creates spreadsheet with summary + detailed logs
   - Exports: Date, Action, Qty Changed, Quantity Before, Quantity After, Person, Notes

---

## Test Scenarios

### Test Group 1: Basic Actions (Single Item)

#### Test 1.1: Item Creation
**Setup**: New item created with initial stock
- Action: CREATE
- Expected: quantity_after = created quantity, quantity_before = null or 0
- Export Check:
  - Items Added: should equal created quantity
  - Items Distributed: 0
  - Net Change: should equal created quantity
  - Transactions: 1
  - Initial Quantity: created quantity
  - Final Quantity: created quantity

**Test Data**:
```json
{
  "action_type": "CREATE",
  "item_id": "item-001",
  "item_name": "Test Item A",
  "quantity_changed": 100,
  "quantity_before": null,
  "quantity_after": 100,
  "timestamp": "2026-04-01T10:00:00Z",
  "person": "Admin"
}
```

**Verification Checklist**:
- [ ] Items Added = 100
- [ ] Items Distributed = 0
- [ ] Net Change = 100
- [ ] Transactions = 1
- [ ] Initial Quantity = 100
- [ ] Final Quantity = 100
- [ ] Export shows correct values

---

#### Test 1.2: Single Stock Addition (UPDATE_QUANTITY)
**Setup**: Add stock to existing item
- Action: UPDATE_QUANTITY (positive)
- Expected: quantity_before = current, quantity_after = current + added
- Export Check:
  - Items Added: should equal quantity_changed
  - Items Distributed: 0
  - Net Change: should equal quantity_changed

**Test Data**:
```json
{
  "action_type": "UPDATE_QUANTITY",
  "item_id": "item-001",
  "item_name": "Test Item A",
  "quantity_changed": 50,
  "quantity_before": 100,
  "quantity_after": 150,
  "timestamp": "2026-04-02T10:00:00Z",
  "person": "Admin"
}
```

**Verification Checklist**:
- [ ] quantity_changed = 50
- [ ] Delta calculation: 150 - 100 = 50 ✓
- [ ] Items Added = 50
- [ ] Items Distributed = 0
- [ ] Net Change = 50

---

#### Test 1.3: Single Stock Distribution (DISTRIBUTE)
**Setup**: Distribute stock from item
- Action: DISTRIBUTE
- Expected: quantity_before = current, quantity_after = current - distributed, quantity_changed = negative
- Export Check:
  - Items Added: 0
  - Items Distributed: should equal absolute(quantity_changed)
  - Net Change: should be negative

**Test Data**:
```json
{
  "action_type": "DISTRIBUTE",
  "item_id": "item-001",
  "item_name": "Test Item A",
  "quantity_changed": -25,
  "quantity_before": 150,
  "quantity_after": 125,
  "timestamp": "2026-04-03T10:00:00Z",
  "person": "User1"
}
```

**Verification Checklist**:
- [ ] quantity_changed = -25
- [ ] Delta calculation: 125 - 150 = -25 ✓
- [ ] Math.min(-25, 0) = -25, abs = 25
- [ ] Items Added = 0
- [ ] Items Distributed = 25
- [ ] Net Change = -25

---

### Test Group 2: Complex Scenarios (Multiple Transactions)

#### Test 2.1: Linear Growth Scenario
**Setup**: Item created, then multiple additions
- Expected: Items Added = sum of all additions, Final > Initial
- Calculation: All deltas should be positive

**Test Sequence**:
| Date | Action | Before | After | Changed | Expected |
|------|--------|--------|-------|---------|----------|
| 04-01 | CREATE | - | 100 | 100 | ✓ |
| 04-02 | UPDATE_QUANTITY | 100 | 150 | 50 | ✓ |
| 04-04 | UPDATE_QUANTITY | 150 | 200 | 50 | ✓ |
| 04-06 | UPDATE_QUANTITY | 200 | 250 | 50 | ✓ |

**Verification Checklist**:
- [ ] Initial Quantity = 100
- [ ] Final Quantity = 250
- [ ] Items Added = 100 + 50 + 50 + 50 = 250
- [ ] Items Distributed = 0
- [ ] Net Change = 250
- [ ] Transactions = 4

---

#### Test 2.2: Linear Depletion Scenario
**Setup**: Item with stock, then multiple distributions
- Expected: Items Distributed = sum of all distributions, Final < Initial

**Test Sequence**:
| Date | Action | Before | After | Changed | Expected |
|------|--------|--------|-------|---------|----------|
| 04-01 | CREATE | - | 100 | 100 | ✓ |
| 04-02 | DISTRIBUTE | 100 | 80 | -20 | ✓ |
| 04-04 | DISTRIBUTE | 80 | 60 | -20 | ✓ |
| 04-06 | DISTRIBUTE | 60 | 40 | -20 | ✓ |

**Verification Checklist**:
- [ ] Initial Quantity = 100
- [ ] Final Quantity = 40
- [ ] Items Added = 100 (only from CREATE)
- [ ] Items Distributed = 20 + 20 + 20 = 60
- [ ] Net Change = 100 - 60 = 40
- [ ] Transactions = 4

---

#### Test 2.3: Mixed Add/Remove Scenario
**Setup**: Item with additions and distributions mixed
- Expected: Net Change = Final - Initial

**Test Sequence**:
| Date | Action | Before | After | Changed | Type |
|------|--------|--------|-------|---------|------|
| 04-01 | CREATE | - | 100 | 100 | START |
| 04-02 | UPDATE_QUANTITY | 100 | 150 | 50 | ADD |
| 04-03 | DISTRIBUTE | 150 | 120 | -30 | REMOVE |
| 04-04 | UPDATE_QUANTITY | 120 | 180 | 60 | ADD |
| 04-05 | DISTRIBUTE | 180 | 140 | -40 | REMOVE |
| 04-06 | DISTRIBUTE | 140 | 100 | -40 | REMOVE |

**Verification Checklist**:
- [ ] Initial Quantity = 100
- [ ] Final Quantity = 100
- [ ] Items Added = 100 (CREATE) + 50 + 60 = 210
- [ ] Items Distributed = 30 + 40 + 40 = 110
- [ ] Net Change = 210 - 110 = 100 ✓
- [ ] Transactions = 6
- [ ] Final = Initial + Net Change: 100 + 100 = 200? NO! Should be 100.
  - Recalculation: Initial is 100, we ADD 50+60=110, we DISTRIBUTE 30+40+40=110, so Final = 100+110-110 = 100 ✓

---

### Test Group 3: Edge Cases

#### Test 3.1: Item with NULL Quantity Before/After
**Setup**: Logs with missing quantity tracking
- Expected: System should handle gracefully, use available data

**Test Data**:
```json
{
  "action_type": "EDIT",
  "item_id": "item-001",
  "item_name": "Test Item A",
  "quantity_changed": 0,
  "quantity_before": null,
  "quantity_after": null,
  "timestamp": "2026-04-02T10:00:00Z",
  "person": "Admin"
}
```

**Verification Checklist**:
- [ ] Delta = 0 (both null)
- [ ] Calculation doesn't fail
- [ ] Export shows "-" or empty for quantity columns
- [ ] Summary excludes from calculations

---

#### Test 3.2: Item Deletion
**Setup**: Item deleted after being used
- Action: DELETE
- Expected: quantity_before = final stock, quantity_after = null or 0

**Test Data**:
```json
{
  "action_type": "DELETE",
  "item_id": "item-001",
  "item_name": "Test Item A",
  "quantity_changed": 0,
  "quantity_before": 50,
  "quantity_after": 0,
  "timestamp": "2026-04-10T10:00:00Z",
  "person": "Admin"
}
```

**Verification Checklist**:
- [ ] Items Distributed should include this deletion in count
- [ ] Final Quantity = 0
- [ ] Transactions includes delete action

---

#### Test 3.3: Duplicate Creation Attempts
**Setup**: Same item created multiple times
- Expected: Each creation counted separately

**Test Sequence**:
| Date | Action | Before | After | Item |
|------|--------|--------|-------|------|
| 04-01 | CREATE | - | 50 | Item A |
| 04-02 | CREATE | - | 50 | Item A |

**Verification Checklist**:
- [ ] Items Added = 50 + 50 = 100
- [ ] Transactions = 2
- [ ] Net Change = 100

---

#### Test 3.4: Zero Quantity Changes
**Setup**: Log entries with zero quantity changed
- Expected: Should not affect calculations

**Test Data**:
```json
{
  "action_type": "UPDATE_QUANTITY",
  "item_id": "item-001",
  "item_name": "Test Item A",
  "quantity_changed": 0,
  "quantity_before": 100,
  "quantity_after": 100,
  "timestamp": "2026-04-05T10:00:00Z",
  "person": "Admin"
}
```

**Verification Checklist**:
- [ ] Delta = 0
- [ ] Does not affect Items Added or Distributed
- [ ] Still counted in Transactions

---

### Test Group 4: Date Range & Timeline Tests

#### Test 4.1: Date Range Filtering
**Setup**: Multiple items in logs, filter by date range
- Expected: Only logs within range are included

**Test Data**:
- Logs from 04-01 to 04-10
- Query range: 04-03 to 04-07
- Expected: Only logs 04-03 through 04-07 included

**Verification Checklist**:
- [ ] fromDate filtering works (>= fromDate)
- [ ] toDate filtering works (<= toDate)
- [ ] Logs outside range excluded
- [ ] Calculations based only on filtered logs
- [ ] Initial Quantity from first log in range
- [ ] Final Quantity from last log in range

---

#### Test 4.2: Chronological Ordering
**Setup**: Logs not in chronological order in database
- Expected: System sorts by timestamp before calculating

**Test Data** (unsorted in DB):
- 04-05 UPDATE_QUANTITY: 100 → 120
- 04-02 CREATE: null → 100
- 04-08 DISTRIBUTE: 120 → 90
- 04-04 UPDATE_QUANTITY: 100 → 100

**Verification Checklist**:
- [ ] Logs sorted by timestamp ascending
- [ ] Initial Quantity from earliest (04-02)
- [ ] Final Quantity from latest (04-08)
- [ ] Calculations correct despite DB order

---

### Test Group 5: Export Format Tests

#### Test 5.1: XLSX Export Validation
**Setup**: Export item history as XLSX
- Expected: File contains all correct values

**Verification Checklist**:
- [ ] File creates successfully
- [ ] Summary sheet section populated
- [ ] All logs included in detail section
- [ ] Headers correct: Date, Action, Qty Changed, Quantity Before, Quantity After, Person, Notes
- [ ] Numbers not formatted as text
- [ ] Dates readable/formatted
- [ ] Item name in filename

---

#### Test 5.2: CSV Export Validation
**Setup**: Export item history as CSV
- Expected: Comma-separated values with correct escaping

**Verification Checklist**:
- [ ] File creates successfully
- [ ] Summary section included
- [ ] All logs in detail section
- [ ] Commas within values properly escaped
- [ ] Quotes handled correctly
- [ ] Line breaks preserved
- [ ] Item name in filename

---

#### Test 5.3: Export Filename Accuracy
**Setup**: Multiple items with special characters
- Expected: Filenames sanitized but identifiable

**Test Cases**:
| Item Name | Expected Filename |
|-----------|------------------|
| Test Item A | item_history_test_item_a_*.xlsx |
| Item (Units) | item_history_item_units_*.xlsx |
| Item @ Home | item_history_item_home_*.xlsx |
| 123 Item / Test | item_history_123_item_test_*.xlsx |

**Verification Checklist**:
- [ ] Special characters removed/replaced
- [ ] Lowercase conversion
- [ ] Date range in filename
- [ ] No spaces in filename

---

### Test Group 6: Person & Details Tracking

#### Test 6.1: Person Attribution
**Setup**: Different people performing actions
- Expected: Each action attributed to correct person

**Test Sequence**:
| Person | Date | Action | Item |
|--------|------|--------|------|
| Admin | 04-01 | CREATE | 100 |
| User1 | 04-02 | DISTRIBUTE | -20 |
| User2 | 04-03 | UPDATE_QUANTITY | +50 |
| Admin | 04-04 | DISTRIBUTE | -30 |

**Verification Checklist**:
- [ ] Each log shows correct person
- [ ] Export includes person names
- [ ] Person field populated for all actions
- [ ] "-" or empty shown if person missing

---

#### Test 6.2: Notes/Details in Export
**Setup**: Logs with notes/details/description
- Expected: Notes correctly exported

**Test Data**:
```json
{
  "notes": "Restocking from Warehouse",
  "details": {
    "notes": "Emergency supplies",
    "description": "Added during stock check",
    "po_number": "PO-2026-001"
  }
}
```

**Verification Checklist**:
- [ ] Notes field populated in export
- [ ] Falls back to details.notes if no notes
- [ ] Falls back to details.description if needed
- [ ] Special characters properly escaped

---

## Test Execution Checklist

### Pre-Testing
- [ ] Database clean/reset with test data
- [ ] All test items created in items table
- [ ] Activity logs populated per test scenarios
- [ ] Test date range set (e.g., 04-01 to 04-15)
- [ ] Browser console monitored for errors
- [ ] XLSX library available

### During Testing
- [ ] Execute each test scenario
- [ ] Record actual vs expected results
- [ ] Take screenshots of exports
- [ ] Monitor for console errors or warnings
- [ ] Check for SQL errors in network logs
- [ ] Verify export files download correctly

### Post-Testing
- [ ] Document any failures
- [ ] Create bug reports for discrepancies
- [ ] Re-test fixes
- [ ] Update this document with findings
- [ ] Performance test with large datasets (100+ logs)
- [ ] Test on different browsers (Chrome, Firefox, Edge, Safari)

---

## Expected Math Formulas

### Summary Calculation
```
Initial Quantity = first_log.quantity_before (or quantity_after if before is null)
Final Quantity = last_log.quantity_after (or quantity_before if after is null)

Items Added = SUM(delta where delta > 0)
Items Distributed = SUM(abs(delta) where delta < 0)
Net Change = Items Added - Items Distributed
Transactions = COUNT(logs)

VALIDATION: Initial Quantity + Net Change ≈ Final Quantity
(Note: May not be exact if timeline is incomplete)
```

### Delta Calculation
```
For each log:
  delta = (quantity_after - quantity_before) || quantity_changed || 0
```

---

## Test Results Summary

**Test Date**: [TO BE FILLED]  
**Tester**: [TO BE FILLED]  
**Browser**: [TO BE FILLED]  
**Database**: [Supabase/Local]

| Test Group | Tests | Passed | Failed | Notes |
|------------|-------|--------|--------|-------|
| Group 1: Basic Actions | 3 | _ | _ | |
| Group 2: Complex | 3 | _ | _ | |
| Group 3: Edge Cases | 4 | _ | _ | |
| Group 4: Date/Timeline | 2 | _ | _ | |
| Group 5: Export Formats | 3 | _ | _ | |
| Group 6: Person/Details | 2 | _ | _ | |
| **TOTAL** | **17** | **_** | **_** | |

---

## Known Issues & Resolutions

| Issue | Status | Solution | Date |
|-------|--------|----------|------|
| [Add findings here] | - | - | - |

---

## Recommendations

1. Add unit tests for `getQuantityDelta()` and `calculateItemHistorySummary()`
2. Add validation to prevent negative quantities unless intentional
3. Ensure all logs have quantity_before and quantity_after values
4. Add data integrity checks in database triggers
5. Log calculation steps for debugging
6. Add export validation tests to CI/CD pipeline

