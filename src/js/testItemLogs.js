/**
 * Item Logs Test Helper - Automated Testing Utilities
 * ====================================================
 * Run these functions in the browser console to test item log calculations
 * Usage: Copy this file to src/js/testItemLogs.js
 * Then in browser console: import('./src/js/testItemLogs.js').then(m => m.runAllTests())
 */

// Test configuration
const TEST_CONFIG = {
    verbose: true,
    stopOnFirstFailure: false,
    logToConsole: true
};

// Color codes for console output
const COLORS = {
    RESET: '\x1b[0m',
    GREEN: '\x1b[32m',
    RED: '\x1b[31m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    CYAN: '\x1b[36m'
};

// ========================================
// TEST DATA GENERATORS
// ========================================

/**
 * Generate test log for a single CREATE action
 */
export function generateCreateLog(itemId, itemName, initialQuantity, timestamp = new Date()) {
    return {
        id: `log-${Math.random()}`,
        action_type: 'CREATE',
        item_id: itemId,
        item_name: itemName,
        quantity_changed: initialQuantity,
        quantity_before: null,
        quantity_after: initialQuantity,
        person: 'Admin',
        timestamp: timestamp.toISOString(),
        details: { label: 'Test Category', unit: 'pcs' }
    };
}

/**
 * Generate test log for UPDATE_QUANTITY (adding stock)
 */
export function generateAddStockLog(itemId, itemName, beforeQty, addQty, person = 'Admin', timestamp = new Date()) {
    return {
        id: `log-${Math.random()}`,
        action_type: 'UPDATE_QUANTITY',
        item_id: itemId,
        item_name: itemName,
        quantity_changed: addQty,
        quantity_before: beforeQty,
        quantity_after: beforeQty + addQty,
        person: person,
        timestamp: timestamp.toISOString(),
        details: { po_number: 'PO-001' }
    };
}

/**
 * Generate test log for DISTRIBUTE action
 */
export function generateDistributeLog(itemId, itemName, beforeQty, distributeQty, person = 'User1', timestamp = new Date()) {
    return {
        id: `log-${Math.random()}`,
        action_type: 'DISTRIBUTE',
        item_id: itemId,
        item_name: itemName,
        quantity_changed: -distributeQty,
        quantity_before: beforeQty,
        quantity_after: beforeQty - distributeQty,
        person: person,
        timestamp: timestamp.toISOString(),
        details: {}
    };
}

/**
 * Generate test log for DELETE action
 */
export function generateDeleteLog(itemId, itemName, finalQuantity, person = 'Admin', timestamp = new Date()) {
    return {
        id: `log-${Math.random()}`,
        action_type: 'DELETE',
        item_id: itemId,
        item_name: itemName,
        quantity_changed: 0,
        quantity_before: finalQuantity,
        quantity_after: 0,
        person: person,
        timestamp: timestamp.toISOString(),
        details: {}
    };
}

// ========================================
// CALCULATION FUNCTIONS (Mirror from report.js)
// ========================================

/**
 * Get quantity delta from a log entry
 */
export function getQuantityDelta(log) {
    if (typeof log.quantity_after === 'number' && typeof log.quantity_before === 'number') {
        return log.quantity_after - log.quantity_before;
    }
    if (typeof log.quantity_changed === 'number') {
        return log.quantity_changed;
    }
    return 0;
}

/**
 * Calculate summary statistics for item history
 */ 
export function calculateItemHistorySummary(logs) {
    const itemsAdded = logs.reduce((sum, log) => {
        const delta = getQuantityDelta(log);
        return sum + Math.max(delta, 0);
    }, 0);

    const itemsDistributed = logs.reduce((sum, log) => {
        const delta = getQuantityDelta(log);
        return sum + Math.abs(Math.min(delta, 0));
    }, 0);

    const transactions = logs.length;
    const netChange = itemsAdded - itemsDistributed;

    const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const initialLog = sortedLogs[0];
    const finalLog = sortedLogs[sortedLogs.length - 1];

    return {
        itemsAdded,
        itemsDistributed,
        netChange,
        transactions,
        initialQuantity: initialLog?.quantity_before ?? initialLog?.quantity_after ?? '-',
        finalQuantity: finalLog?.quantity_after ?? finalLog?.quantity_before ?? '-'
    };
}

// ========================================
// ASSERTION & VALIDATION FUNCTIONS
// ========================================

export class TestAssertion {
    constructor(testName) {
        this.testName = testName;
        this.passed = true;
        this.failures = [];
    }

    assertEqual(actual, expected, message = '') {
        if (actual !== expected) {
            this.passed = false;
            const msg = `FAIL: Expected ${expected}, got ${actual}. ${message}`;
            this.failures.push(msg);
            if (TEST_CONFIG.logToConsole) {
                console.log(`${COLORS.RED}✗ ${msg}${COLORS.RESET}`);
            }
            if (TEST_CONFIG.stopOnFirstFailure) throw new Error(msg);
        }
        return this;
    }

    assertGreater(actual, min, message = '') {
        if (actual <= min) {
            this.passed = false;
            const msg = `FAIL: Expected > ${min}, got ${actual}. ${message}`;
            this.failures.push(msg);
            if (TEST_CONFIG.logToConsole) {
                console.log(`${COLORS.RED}✗ ${msg}${COLORS.RESET}`);
            }
            if (TEST_CONFIG.stopOnFirstFailure) throw new Error(msg);
        }
        return this;
    }

    assertLess(actual, max, message = '') {
        if (actual >= max) {
            this.passed = false;
            const msg = `FAIL: Expected < ${max}, got ${actual}. ${message}`;
            this.failures.push(msg);
            if (TEST_CONFIG.logToConsole) {
                console.log(`${COLORS.RED}✗ ${msg}${COLORS.RESET}`);
            }
            if (TEST_CONFIG.stopOnFirstFailure) throw new Error(msg);
        }
        return this;
    }

    assertTrue(condition, message = '') {
        if (!condition) {
            this.passed = false;
            const msg = `FAIL: Condition false. ${message}`;
            this.failures.push(msg);
            if (TEST_CONFIG.logToConsole) {
                console.log(`${COLORS.RED}✗ ${msg}${COLORS.RESET}`);
            }
            if (TEST_CONFIG.stopOnFirstFailure) throw new Error(msg);
        }
        return this;
    }

    assertArrayEquals(actual, expected, message = '') {
        const match = JSON.stringify(actual) === JSON.stringify(expected);
        if (!match) {
            this.passed = false;
            const msg = `FAIL: Arrays not equal. Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}. ${message}`;
            this.failures.push(msg);
            if (TEST_CONFIG.logToConsole) {
                console.log(`${COLORS.RED}✗ ${msg}${COLORS.RESET}`);
            }
            if (TEST_CONFIG.stopOnFirstFailure) throw new Error(msg);
        }
        return this;
    }

    report() {
        if (this.passed) {
            console.log(`${COLORS.GREEN}✓ PASS: ${this.testName}${COLORS.RESET}`);
        } else {
            console.log(`${COLORS.RED}✗ FAIL: ${this.testName}${COLORS.RESET}`);
            this.failures.forEach(f => console.log(`  ${COLORS.RED}${f}${COLORS.RESET}`));
        }
        return this.passed;
    }
}

// ========================================
// TEST SCENARIOS
// ========================================

/**
 * Test Group 1: Basic Actions (Single Item)
 */
export function test1_1_CreatedItem() {
    const test = new TestAssertion('1.1: Item Creation');
    
    const log = generateCreateLog('item-001', 'Test Item A', 100);
    const summary = calculateItemHistorySummary([log]);

    test.assertEqual(summary.itemsAdded, 100, 'Items Added should be 100');
    test.assertEqual(summary.itemsDistributed, 0, 'Items Distributed should be 0');
    test.assertEqual(summary.netChange, 100, 'Net Change should be 100');
    test.assertEqual(summary.transactions, 1, 'Transactions should be 1');
    test.assertEqual(summary.initialQuantity, 100, 'Initial Quantity should be 100');
    test.assertEqual(summary.finalQuantity, 100, 'Final Quantity should be 100');

    return test.report();
}

export function test1_2_SingleStockAddition() {
    const test = new TestAssertion('1.2: Single Stock Addition');
    
    const logs = [
        generateCreateLog('item-001', 'Test Item A', 100),
        generateAddStockLog('item-001', 'Test Item A', 100, 50)
    ];
    const summary = calculateItemHistorySummary(logs);

    test.assertEqual(summary.itemsAdded, 150, 'Items Added should be 150 (100+50)');
    test.assertEqual(summary.itemsDistributed, 0, 'Items Distributed should be 0');
    test.assertEqual(summary.netChange, 150, 'Net Change should be 150');
    test.assertEqual(summary.transactions, 2, 'Transactions should be 2');
    test.assertEqual(summary.finalQuantity, 150, 'Final Quantity should be 150');

    return test.report();
}

export function test1_3_SingleDistribution() {
    const test = new TestAssertion('1.3: Single Stock Distribution');
    
    const logs = [
        generateCreateLog('item-001', 'Test Item A', 100),
        generateDistributeLog('item-001', 'Test Item A', 100, 25)
    ];
    const summary = calculateItemHistorySummary(logs);

    test.assertEqual(summary.itemsAdded, 100, 'Items Added should be 100');
    test.assertEqual(summary.itemsDistributed, 25, 'Items Distributed should be 25');
    test.assertEqual(summary.netChange, 75, 'Net Change should be 75');
    test.assertEqual(summary.transactions, 2, 'Transactions should be 2');
    test.assertEqual(summary.finalQuantity, 75, 'Final Quantity should be 75');

    return test.report();
}

/**
 * Test Group 2: Complex Scenarios
 */
export function test2_1_LinearGrowth() {
    const test = new TestAssertion('2.1: Linear Growth Scenario');
    
    const now = new Date('2026-04-01');
    const logs = [
        generateCreateLog('item-001', 'Test Item A', 100, new Date(now.getTime() + 0)),
        generateAddStockLog('item-001', 'Test Item A', 100, 50, 'Admin', new Date(now.getTime() + 1*24*60*60*1000)),
        generateAddStockLog('item-001', 'Test Item A', 150, 50, 'Admin', new Date(now.getTime() + 3*24*60*60*1000)),
        generateAddStockLog('item-001', 'Test Item A', 200, 50, 'Admin', new Date(now.getTime() + 5*24*60*60*1000))
    ];
    const summary = calculateItemHistorySummary(logs);

    test.assertEqual(summary.initialQuantity, 100, 'Initial Quantity should be 100');
    test.assertEqual(summary.finalQuantity, 250, 'Final Quantity should be 250');
    test.assertEqual(summary.itemsAdded, 250, 'Items Added should be 250 (100+50+50+50)');
    test.assertEqual(summary.itemsDistributed, 0, 'Items Distributed should be 0');
    test.assertEqual(summary.netChange, 250, 'Net Change should be 250');
    test.assertEqual(summary.transactions, 4, 'Transactions should be 4');

    return test.report();
}

export function test2_2_LinearDepletion() {
    const test = new TestAssertion('2.2: Linear Depletion Scenario');
    
    const now = new Date('2026-04-01');
    const logs = [
        generateCreateLog('item-001', 'Test Item A', 100, new Date(now.getTime() + 0)),
        generateDistributeLog('item-001', 'Test Item A', 100, 20, 'User1', new Date(now.getTime() + 1*24*60*60*1000)),
        generateDistributeLog('item-001', 'Test Item A', 80, 20, 'User1', new Date(now.getTime() + 3*24*60*60*1000)),
        generateDistributeLog('item-001', 'Test Item A', 60, 20, 'User1', new Date(now.getTime() + 5*24*60*60*1000))
    ];
    const summary = calculateItemHistorySummary(logs);

    test.assertEqual(summary.initialQuantity, 100, 'Initial Quantity should be 100');
    test.assertEqual(summary.finalQuantity, 40, 'Final Quantity should be 40');
    test.assertEqual(summary.itemsAdded, 100, 'Items Added should be 100 (only from CREATE)');
    test.assertEqual(summary.itemsDistributed, 60, 'Items Distributed should be 60 (20+20+20)');
    test.assertEqual(summary.netChange, 40, 'Net Change should be 40');
    test.assertEqual(summary.transactions, 4, 'Transactions should be 4');

    return test.report();
}

export function test2_3_MixedAddRemove() {
    const test = new TestAssertion('2.3: Mixed Add/Remove Scenario');
    
    const now = new Date('2026-04-01');
    const logs = [
        generateCreateLog('item-001', 'Test Item A', 100, new Date(now.getTime() + 0*24*60*60*1000)),
        generateAddStockLog('item-001', 'Test Item A', 100, 50, 'Admin', new Date(now.getTime() + 1*24*60*60*1000)),
        generateDistributeLog('item-001', 'Test Item A', 150, 30, 'User1', new Date(now.getTime() + 2*24*60*60*1000)),
        generateAddStockLog('item-001', 'Test Item A', 120, 60, 'Admin', new Date(now.getTime() + 3*24*60*60*1000)),
        generateDistributeLog('item-001', 'Test Item A', 180, 40, 'User1', new Date(now.getTime() + 4*24*60*60*1000)),
        generateDistributeLog('item-001', 'Test Item A', 140, 40, 'User1', new Date(now.getTime() + 5*24*60*60*1000))
    ];
    const summary = calculateItemHistorySummary(logs);

    test.assertEqual(summary.initialQuantity, 100, 'Initial Quantity should be 100');
    test.assertEqual(summary.finalQuantity, 100, 'Final Quantity should be 100 (100 + (50+60) - (30+40+40))');
    test.assertEqual(summary.itemsAdded, 210, 'Items Added should be 210 (100+50+60)');
    test.assertEqual(summary.itemsDistributed, 110, 'Items Distributed should be 110 (30+40+40)');
    test.assertEqual(summary.netChange, 100, 'Net Change should be 100');
    test.assertEqual(summary.transactions, 6, 'Transactions should be 6');

    return test.report();
}

/**
 * Test Group 3: Edge Cases
 */
export function test3_1_DeltaCalculation() {
    const test = new TestAssertion('3.1: Delta Calculation Methods');
    
    // Test with quantity_after and quantity_before
    const log1 = generateAddStockLog('item-001', 'Test Item', 100, 50);
    let delta = getQuantityDelta(log1);
    test.assertEqual(delta, 50, 'Delta from before/after should be 50');

    // Test with quantity_changed
    const log2 = { quantity_changed: 75, quantity_before: null, quantity_after: null };
    delta = getQuantityDelta(log2);
    test.assertEqual(delta, 75, 'Delta from quantity_changed should be 75');

    // Test with null values
    const log3 = { quantity_changed: null, quantity_before: null, quantity_after: null };
    delta = getQuantityDelta(log3);
    test.assertEqual(delta, 0, 'Delta with all null should be 0');

    return test.report();
}

export function test3_2_ZeroQuantityChanges() {
    const test = new TestAssertion('3.2: Zero Quantity Changes');
    
    const logs = [
        generateCreateLog('item-001', 'Test Item A', 100),
        { 
            action_type: 'UPDATE_QUANTITY',
            quantity_changed: 0,
            quantity_before: 100,
            quantity_after: 100
        }
    ];
    const summary = calculateItemHistorySummary(logs);

    test.assertEqual(summary.itemsAdded, 100, 'Items Added should be 100 (zero change excluded)');
    test.assertEqual(summary.itemsDistributed, 0, 'Items Distributed should be 0');
    test.assertEqual(summary.netChange, 100, 'Net Change should be 100');
    test.assertEqual(summary.transactions, 2, 'Transactions should be 2');

    return test.report();
}

export function test3_3_DeleteAction() {
    const test = new TestAssertion('3.3: Item Deletion');
    
    const logs = [
        generateCreateLog('item-001', 'Test Item A', 100),
        generateDistributeLog('item-001', 'Test Item A', 100, 50),
        generateDeleteLog('item-001', 'Test Item A', 50)
    ];
    const summary = calculateItemHistorySummary(logs);

    test.assertEqual(summary.itemsAdded, 100, 'Items Added should be 100');
    test.assertEqual(summary.itemsDistributed, 100, 'Items Distributed should be 100 (50+50)');
    test.assertEqual(summary.netChange, 0, 'Net Change should be 0');
    test.assertEqual(summary.finalQuantity, 0, 'Final Quantity should be 0');
    test.assertEqual(summary.transactions, 3, 'Transactions should be 3');

    return test.report();
}

/**
 * Test Group 4: Date Range & Timeline
 */
export function test4_1_ChronologicalOrdering() {
    const test = new TestAssertion('4.1: Chronological Ordering');
    
    const now = new Date('2026-04-01');
    // Create logs out of order
    const unsortedLogs = [
        generateAddStockLog('item-001', 'Test Item', 100, 20, 'Admin', new Date(now.getTime() + 5*24*60*60*1000)),
        generateCreateLog('item-001', 'Test Item A', 100, new Date(now.getTime() + 0*24*60*60*1000)),
        generateDistributeLog('item-001', 'Test Item', 120, 30, 'User1', new Date(now.getTime() + 8*24*60*60*1000)),
        generateAddStockLog('item-001', 'Test Item', 100, 10, 'Admin', new Date(now.getTime() + 3*24*60*60*1000))
    ];
    
    const summary = calculateItemHistorySummary(unsortedLogs);

    test.assertEqual(summary.initialQuantity, 100, 'Initial should be from first chronological log');
    test.assertEqual(summary.finalQuantity, 90, 'Final should be from last chronological log (100+10+20-30)');
    test.assertEqual(summary.transactions, 4, 'All 4 transactions counted');

    return test.report();
}

/**
 * Test Group 5: Person & Details  
 */
export function test5_1_PersonAttribution() {
    const test = new TestAssertion('5.1: Person Attribution');
    
    const logs = [
        generateCreateLog('item-001', 'Test Item A', 100),
        generateDistributeLog('item-001', 'Test Item A', 100, 20, 'User1'),
        generateAddStockLog('item-001', 'Test Item A', 80, 50, 'Admin')
    ];

    test.assertTrue(logs[0].person === 'Admin', 'First log person should be Admin');
    test.assertTrue(logs[1].person === 'User1', 'Second log person should be User1');
    test.assertTrue(logs[2].person === 'Admin', 'Third log person should be Admin');

    return test.report();
}

// ========================================
// TEST RUNNER
// ========================================

export async function runAllTests() {
    console.log(`${COLORS.CYAN}${'='.repeat(60)}${COLORS.RESET}`);
    console.log(`${COLORS.CYAN}Item Logs Math Testing Suite${COLORS.RESET}`);
    console.log(`${COLORS.CYAN}${'='.repeat(60)}${COLORS.RESET}\n`);

    const results = {
        passed: 0,
        failed: 0,
        tests: []
    };

    // Group 1: Basic Actions
    console.log(`${COLORS.BLUE}Group 1: Basic Actions${COLORS.RESET}`);
    results.tests.push({ name: '1.1', passed: test1_1_CreatedItem() });
    results.tests.push({ name: '1.2', passed: test1_2_SingleStockAddition() });
    results.tests.push({ name: '1.3', passed: test1_3_SingleDistribution() });
    
    // Group 2: Complex Scenarios
    console.log(`\n${COLORS.BLUE}Group 2: Complex Scenarios${COLORS.RESET}`);
    results.tests.push({ name: '2.1', passed: test2_1_LinearGrowth() });
    results.tests.push({ name: '2.2', passed: test2_2_LinearDepletion() });
    results.tests.push({ name: '2.3', passed: test2_3_MixedAddRemove() });

    // Group 3: Edge Cases
    console.log(`\n${COLORS.BLUE}Group 3: Edge Cases${COLORS.RESET}`);
    results.tests.push({ name: '3.1', passed: test3_1_DeltaCalculation() });
    results.tests.push({ name: '3.2', passed: test3_2_ZeroQuantityChanges() });
    results.tests.push({ name: '3.3', passed: test3_3_DeleteAction() });

    // Group 4: Date Range & Timeline
    console.log(`\n${COLORS.BLUE}Group 4: Date Range & Timeline${COLORS.RESET}`);
    results.tests.push({ name: '4.1', passed: test4_1_ChronologicalOrdering() });

    // Group 5: Person & Details
    console.log(`\n${COLORS.BLUE}Group 5: Person & Details${COLORS.RESET}`);
    results.tests.push({ name: '5.1', passed: test5_1_PersonAttribution() });

    // Calculate results
    results.passed = results.tests.filter(t => t.passed).length;
    results.failed = results.tests.filter(t => !t.passed).length;

    // Print summary
    console.log(`\n${COLORS.CYAN}${'='.repeat(60)}${COLORS.RESET}`);
    console.log(`${COLORS.CYAN}Test Summary${COLORS.RESET}`);
    console.log(`${COLORS.CYAN}${'='.repeat(60)}${COLORS.RESET}`);
    console.log(`${COLORS.GREEN}Total: ${results.tests.length} | Passed: ${results.passed}${COLORS.RESET}`);
    if (results.failed > 0) {
        console.log(`${COLORS.RED}Failed: ${results.failed}${COLORS.RESET}`);
    }
    
    return results;
}

// Export for convenience
export const Tests = {
    run: runAllTests,
    generateCreateLog,
    generateAddStockLog,
    generateDistributeLog,
    generateDeleteLog,
    calculateItemHistorySummary,
    getQuantityDelta
};

console.log(`${COLORS.CYAN}Test Helper Loaded. Run: Tests.run() to execute all tests${COLORS.RESET}`);

