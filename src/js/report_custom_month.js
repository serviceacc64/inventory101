// Custom Month Report Implementation
// This file contains the functions for the Custom Month filter in reports

// Store selected month and summary data
let selectedCustomMonth = null;
let customMonthSummaryData = null;

function getQuantityDelta(log) {
    if (typeof log.quantity_after === 'number' && typeof log.quantity_before === 'number') {
        return log.quantity_after - log.quantity_before;
    }
    if (typeof log.quantity_changed === 'number') {
        return log.quantity_changed;
    }
    return 0;
}

// Initialize custom month selector when page loads
document.addEventListener('DOMContentLoaded', async () => {
    await populateMonthSelector();
});

// Populate the month selector with ALL months (showing data indicator)
async function populateMonthSelector() {
    const selector = document.getElementById('customMonthSelector');
    if (!selector) return;

    try {
        // Import Supabase client to check for activity data
        const { supabase } = await import('./supabase.js');
        
        // Fetch activity logs from the past 2 years to check which months have data
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        
        const { data: logs, error } = await supabase
            .from('activity_logs')
            .select('timestamp')
            .gte('timestamp', twoYearsAgo.toISOString())
            .order('timestamp', { ascending: true });

        if (error) throw error;

        // Get unique year-month combinations that have data
        const monthsWithData = new Set();
        if (logs && logs.length > 0) {
            logs.forEach(log => {
                if (log.timestamp) {
                    const date = new Date(log.timestamp);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    monthsWithData.add(`${year}-${month}`);
                }
            });
        }

        // Build options for all months (current year + previous year = 24 months)
        const now = new Date();
        const currentYear = now.getFullYear();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];

        let optionsHTML = '<option value="">-- Select Month --</option>';
        
        // Generate months for current year and previous year (24 months total)
        const monthsToShow = [];
        for (let i = 0; i < 24; i++) {
            const date = new Date(currentYear, now.getMonth() - i, 1);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            monthsToShow.push({ key: `${year}-${month}`, year, month: parseInt(month) });
        }

        // Sort by date descending (most recent first)
        monthsToShow.sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        });

        // Build HTML with all months
        monthsToShow.forEach(m => {
            const monthName = monthNames[m.month - 1];
            const hasData = monthsWithData.has(m.key);
            const label = hasData ? `${monthName} ${m.year}` : `${monthName} ${m.year} (No Data)`;
            optionsHTML += `<option value="${m.key}">${label}</option>`;
        });

        selector.innerHTML = optionsHTML;
    } catch (error) {
        console.error('Error populating month selector:', error);
        // Fallback: show all months without data indicator
        const now = new Date();
        const currentYear = now.getFullYear();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        
        let optionsHTML = '<option value="">-- Select Month --</option>';
        
        // Add current month and previous 23 months
        for (let i = 0; i < 24; i++) {
            const date = new Date(currentYear, now.getMonth() - i, 1);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const monthName = monthNames[date.getMonth()];
            optionsHTML += `<option value="${year}-${month}">${monthName} ${year} (No Data)</option>`;
        }
        
        selector.innerHTML = optionsHTML;
    }
}

// Update custom month when selection changes
async function updateCustomMonth() {
    const selector = document.getElementById('customMonthSelector');
    const exportBtn = document.getElementById('exportCustomMonthBtn');
    
    if (!selector) return;
    
    selectedCustomMonth = selector.value;
    
    // Enable/disable export button
    if (exportBtn) {
        exportBtn.disabled = !selectedCustomMonth;
    }
    
    if (selectedCustomMonth) {
        await loadCustomMonthData();
    } else {
        // Reset stats display
        resetCustomMonthStats();
    }
}

// Refresh custom month data
async function refreshCustomMonth() {
    if (selectedCustomMonth) {
        await loadCustomMonthData();
    } else {
        alert('Please select a month first');
    }
}

// Reset custom month stats to default
function resetCustomMonthStats() {
    const statsElements = [
        { id: 'customItemsAdded', value: '-', trend: 'Select a month' },
        { id: 'customItemsRemoved', value: '-', trend: 'to view stats' },
        { id: 'customTransactions', value: '-', trend: '' },
        { id: 'customNetChange', value: '-', trend: '' }
    ];
    
    statsElements.forEach(el => {
        const valueEl = document.getElementById(el.id);
        if (valueEl) valueEl.textContent = el.value;
        
        const trendEl = document.getElementById(el.id + 'Trend');
        if (trendEl) trendEl.textContent = el.trend;
    });
    
    // Reset activity list
    const activityEl = document.getElementById('customActivity');
    if (activityEl) {
        activityEl.innerHTML = '<p class="small-muted" style="padding: 20px; text-align: center;">Please select a month from the dropdown above to view activity.</p>';
    }
    
    // Reset table
    const tableBody = document.querySelector('#customSummaryTable tbody');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Select a month to view data</td></tr>';
    }

    if (typeof window.displayPersonnelSummarySection === 'function') {
        window.displayPersonnelSummarySection('custom', {
            totalEmployees: 0,
            juniorHigh: 0,
            seniorHigh: 0,
            newEmployees: 0,
            equipmentIssued: 0,
            equipmentAssignments: 0,
            equipmentValue: 0,
            trends: { newEmployees: 0, equipmentIssued: 0 },
            topPersonnelEquipment: []
        });
    }
}

// Load custom month data from database
async function loadCustomMonthData() {
    if (!selectedCustomMonth) return;
    
    showCustomMonthLoading(true);
    
    try {
        const { supabase } = await import('./supabase.js');
        
        const [year, month] = selectedCustomMonth.split('-');
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
        
        // Get previous month for trend calculation
        const prevMonthStart = new Date(parseInt(year), parseInt(month) - 2, 1);
        const prevMonthEnd = new Date(parseInt(year), parseInt(month) - 1, 0, 23, 59, 59);
        
        // Fetch logs for selected month
        const { data: logs, error } = await supabase
            .from('activity_logs')
            .select('*')
            .gte('timestamp', startDate.toISOString())
            .lte('timestamp', endDate.toISOString())
            .order('timestamp', { ascending: false });
        
        if (error) throw error;
        
        // Fetch logs for previous month (for trend calculation)
        const { data: prevLogs } = await supabase
            .from('activity_logs')
            .select('*')
            .gte('timestamp', prevMonthStart.toISOString())
            .lte('timestamp', prevMonthEnd.toISOString());

        const { data: personnel } = await supabase.from('personnel').select('*');
        const { data: personnelItems } = await supabase.from('personnel_items').select('*');
        
        // Calculate summary
        customMonthSummaryData = calculateCustomMonthSummary(
            logs || [],
            prevLogs || [],
            personnel || [],
            personnelItems || [],
            startDate,
            endDate,
            prevMonthStart,
            prevMonthEnd
        );
        
        // Display the summary
        displayCustomMonthSummary();
        
    } catch (error) {
        console.error('Error loading custom month data:', error);
        alert('Failed to load data for the selected month');
    } finally {
        showCustomMonthLoading(false);
    }
}

// Calculate summary for custom month
function calculateCustomMonthSummary(logs, prevLogs, personnelRecords = [], personnelItems = [], startDate = null, endDate = null, prevStartDate = null, prevEndDate = null) {
    // Calculate metrics for current month
    const itemsAdded = logs.reduce((sum, log) => {
        const delta = getQuantityDelta(log);
        return sum + Math.max(delta, 0);
    }, 0);
    
    const itemsRemoved = logs.reduce((sum, log) => {
        const delta = getQuantityDelta(log);
        return sum + Math.abs(Math.min(delta, 0));
    }, 0);
    
    const transactions = logs.length;
    const netChange = itemsAdded - itemsRemoved;
    
    // Calculate metrics for previous month (for trends)
    const prevItemsAdded = prevLogs.reduce((sum, log) => {
        const delta = getQuantityDelta(log);
        return sum + Math.max(delta, 0);
    }, 0);
    
    const prevItemsRemoved = prevLogs.reduce((sum, log) => {
        const delta = getQuantityDelta(log);
        return sum + Math.abs(Math.min(delta, 0));
    }, 0);
    
    const prevTransactions = prevLogs.length;
    
    // Calculate trends (percentage change)
    const calculateTrend = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
    };
    
    // Get top items by activity
    const itemActivity = {};
    logs.forEach(log => {
        const itemName = log.item_name || 'Unknown';
        if (!itemActivity[itemName]) {
            itemActivity[itemName] = { 
                name: itemName, 
                category: log.details?.category || log.details?.label || '-',
                added: 0, 
                removed: 0 
            };
        }
        const delta = getQuantityDelta(log);
        if (delta > 0) {
            itemActivity[itemName].added += delta;
        } else if (delta < 0) {
            itemActivity[itemName].removed += Math.abs(delta);
        }
    });
    
    const topItems = Object.values(itemActivity)
        .sort((a, b) => (b.added + b.removed) - (a.added + a.removed))
        .slice(0, 10);
    
    const inventoryActivity = logs
        .slice(0, 10)
        .map(log => {
            const delta = getQuantityDelta(log);
            return {
                type: delta > 0 ? 'added' : delta < 0 ? 'removed' : 'updated',
                itemName: log.item_name || 'Unknown',
                quantity: Math.abs(delta),
                person: log.person || '-',
                timestamp: log.timestamp,
                action: log.action_type
            };
        });

    let personnel = {
        totalEmployees: personnelRecords.length,
        juniorHigh: 0,
        seniorHigh: 0,
        newEmployees: 0,
        equipmentIssued: 0,
        equipmentAssignments: 0,
        equipmentValue: 0,
        trends: { newEmployees: 0, equipmentIssued: 0 },
        topPersonnelEquipment: [],
        personnelActivity: []
    };

    if (typeof window.calculatePersonnelPeriodSummary === 'function' && startDate && endDate) {
        personnel = window.calculatePersonnelPeriodSummary(
            personnelRecords,
            personnelItems,
            startDate,
            endDate,
            prevStartDate,
            prevEndDate
        );
    }

    const recentActivity = typeof window.mergeRecentActivity === 'function'
        ? window.mergeRecentActivity(inventoryActivity, personnel.personnelActivity)
        : inventoryActivity;
    
    return {
        itemsAdded,
        itemsRemoved,
        transactions,
        netChange,
        trends: {
            itemsAdded: calculateTrend(itemsAdded, prevItemsAdded),
            itemsRemoved: calculateTrend(itemsRemoved, prevItemsRemoved),
            transactions: calculateTrend(transactions, prevTransactions)
        },
        topItems,
        recentActivity,
        personnel
    };
}

// Display custom month summary
function displayCustomMonthSummary() {
    if (!customMonthSummaryData) return;
    
    const data = customMonthSummaryData;
    
    // Update stat values
    const itemsAddedEl = document.getElementById('customItemsAdded');
    const itemsRemovedEl = document.getElementById('customItemsRemoved');
    const transactionsEl = document.getElementById('customTransactions');
    const netChangeEl = document.getElementById('customNetChange');
    
    if (itemsAddedEl) itemsAddedEl.textContent = data.itemsAdded.toLocaleString();
    if (itemsRemovedEl) itemsRemovedEl.textContent = data.itemsRemoved.toLocaleString();
    if (transactionsEl) transactionsEl.textContent = data.transactions.toLocaleString();
    if (netChangeEl) {
        netChangeEl.textContent = (data.netChange >= 0 ? '+' : '') + data.netChange.toLocaleString();
        netChangeEl.className = `stat-value ${data.netChange >= 0 ? 'text-success' : 'text-danger'}`;
    }
    
    // Update trends
    const itemsAddedTrendEl = document.getElementById('customItemsAddedTrend');
    const itemsRemovedTrendEl = document.getElementById('customItemsRemovedTrend');
    const transactionsTrendEl = document.getElementById('customTransactionsTrend');
    
    const formatTrend = typeof window.formatTrendHtml === 'function'
        ? window.formatTrendHtml
        : (value) => {
            if (value > 0) return `<span class="trend-up"><i class="fa-solid fa-arrow-up"></i> ${value}%</span>`;
            if (value < 0) return `<span class="trend-down"><i class="fa-solid fa-arrow-down"></i> ${Math.abs(value)}%</span>`;
            return `<span class="trend-neutral"><i class="fa-solid fa-minus"></i> 0%</span>`;
        };
    
    if (itemsAddedTrendEl) itemsAddedTrendEl.innerHTML = formatTrend(data.trends.itemsAdded);
    if (itemsRemovedTrendEl) itemsRemovedTrendEl.innerHTML = formatTrend(data.trends.itemsRemoved);
    if (transactionsTrendEl) transactionsTrendEl.innerHTML = formatTrend(data.trends.transactions);

    if (typeof window.displayPersonnelSummarySection === 'function') {
        window.displayPersonnelSummarySection('custom', data.personnel);
    }
    
    // Update activity list
    const activityListEl = document.getElementById('customActivity');
    if (activityListEl) {
        if (data.recentActivity.length === 0) {
            activityListEl.innerHTML = '<p class="small-muted">No activity in this month</p>';
        } else {
            activityListEl.innerHTML = data.recentActivity.map(activity => {
                const isPersonnel = activity.source === 'personnel';
                const iconClass = isPersonnel
                    ? (activity.type === 'employee' ? 'personnel' : 'personnel-equipment')
                    : activity.type;
                const icon = isPersonnel
                    ? (activity.type === 'employee' ? 'fa-user-plus' : 'fa-box')
                    : (activity.type === 'added' ? 'fa-plus' : activity.type === 'removed' ? 'fa-minus' : 'fa-pen');
                const actionText = isPersonnel
                    ? (activity.type === 'employee' ? 'new employee' : `issued (${activity.quantity})`)
                    : `${activity.type === 'added' ? 'added' : activity.type === 'removed' ? 'removed' : 'updated'} (${activity.quantity})`;

                return `
                <div class="activity-item">
                    <div class="activity-icon ${iconClass}">
                        <i class="fa-solid ${icon}"></i>
                    </div>
                    <div class="activity-details">
                        <p>${escapeHtml(activity.itemName)} ${actionText}</p>
                        <small>${escapeHtml(activity.person)} • ${new Date(activity.timestamp).toLocaleString()}</small>
                    </div>
                </div>
            `;
            }).join('');
        }
    }
    
    // Update summary table
    const tableBody = document.querySelector('#customSummaryTable tbody');
    if (tableBody) {
        if (data.topItems.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No items in this month</td></tr>';
        } else {
            tableBody.innerHTML = data.topItems.map(item => `
                <tr>
                    <td>${escapeHtml(item.name)}</td>
                    <td>${escapeHtml(item.category)}</td>
                    <td>${item.added}</td>
                    <td>${item.removed}</td>
                    <td>${item.added - item.removed >= 0 ? '+' : ''}${item.added - item.removed}</td>
                </tr>
            `).join('');
        }
    }
}

// Show/hide loading state for custom month
function showCustomMonthLoading(show) {
    // You can add a loading indicator specific to custom month if needed
    // For now, we'll use the main loading state
    if (typeof showLoading === 'function') {
        showLoading(show);
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export custom month report to Excel
async function exportCustomMonthReport() {
    if (!customMonthSummaryData || !selectedCustomMonth) {
        alert('Please select a month first before exporting.');
        return;
    }
    
    showLoading(true);
    try {
        const [year, month] = selectedCustomMonth.split('-');
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const monthName = monthNames[parseInt(month) - 1];
        
        // Prepare summary data
        const p = customMonthSummaryData.personnel || {};
        const summaryData = [
            { 'Metric': 'Items Added', 'Value': customMonthSummaryData.itemsAdded, 'Trend': (customMonthSummaryData.trends.itemsAdded > 0 ? '+' : '') + customMonthSummaryData.trends.itemsAdded + '%' },
            { 'Metric': 'Items Removed', 'Value': customMonthSummaryData.itemsRemoved, 'Trend': (customMonthSummaryData.trends.itemsRemoved > 0 ? '+' : '') + customMonthSummaryData.trends.itemsRemoved + '%' },
            { 'Metric': 'Transactions', 'Value': customMonthSummaryData.transactions, 'Trend': (customMonthSummaryData.trends.transactions > 0 ? '+' : '') + customMonthSummaryData.trends.transactions + '%' },
            { 'Metric': 'Net Change', 'Value': customMonthSummaryData.netChange, 'Trend': '-' },
            { 'Metric': 'Total Employees', 'Value': p.totalEmployees || 0, 'Trend': `JH: ${p.juniorHigh || 0} · SH: ${p.seniorHigh || 0}` },
            { 'Metric': 'New Employees', 'Value': p.newEmployees || 0, 'Trend': (p.trends?.newEmployees > 0 ? '+' : '') + (p.trends?.newEmployees || 0) + '%' },
            { 'Metric': 'Equipment Issued (Qty)', 'Value': p.equipmentIssued || 0, 'Trend': (p.trends?.equipmentIssued > 0 ? '+' : '') + (p.trends?.equipmentIssued || 0) + '%' },
            { 'Metric': 'Issued Value', 'Value': p.equipmentValue || 0, 'Trend': `${p.equipmentAssignments || 0} assignments` }
        ];
        
        // Prepare top items data
        const topItemsData = customMonthSummaryData.topItems.map(item => ({
            'Item Name': item.name,
            'Category': item.category,
            'Added': item.added,
            'Removed': item.removed,
            'Net': item.added - item.removed
        }));
        
        // Prepare activity data
        const activityData = customMonthSummaryData.recentActivity.map(activity => ({
            'Date': new Date(activity.timestamp).toLocaleString(),
            'Action': activity.action,
            'Item': activity.itemName,
            'Quantity': activity.quantity,
            'Person': activity.person || '-'
        }));
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        
        // Add Summary sheet
        const summaryWs = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
        
        // Add Top Items sheet if data exists
        if (topItemsData.length > 0) {
            const topItemsWs = XLSX.utils.json_to_sheet(topItemsData);
            XLSX.utils.book_append_sheet(wb, topItemsWs, 'Top Items');
        }

        const topPersonnelData = (p.topPersonnelEquipment || []).map(item => ({
            'Item': item.name,
            'Qty Issued': item.qty,
            'Assignments': item.assignments
        }));
        if (topPersonnelData.length > 0) {
            const topPersonnelWs = XLSX.utils.json_to_sheet(topPersonnelData);
            XLSX.utils.book_append_sheet(wb, topPersonnelWs, 'Personnel Equipment');
        }
        
        // Add Activity sheet if data exists
        if (activityData.length > 0) {
            const activityWs = XLSX.utils.json_to_sheet(activityData);
            XLSX.utils.book_append_sheet(wb, activityWs, 'Activity');
        }
        
        // Generate filename and download
        const filename = 'monthly_report_' + monthName + '_' + year + '.xlsx';
        XLSX.writeFile(wb, filename);
        
        alert('Report for ' + monthName + ' ' + year + ' exported successfully!');
    } catch (error) {
        console.error('Error exporting custom month report:', error);
        alert('Failed to export report. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Make functions available globally
window.updateCustomMonth = updateCustomMonth;
window.refreshCustomMonth = refreshCustomMonth;
window.exportCustomMonthReport = exportCustomMonthReport;
