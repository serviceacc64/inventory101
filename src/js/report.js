// Import Supabase client
import { supabase } from './supabase.js';
import { buildRoomWorkbook, writeWorkbook } from './exportHelpers.js';

// DOM Elements
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const emptyState = document.getElementById('emptyState');
const reportContainer = document.getElementById('reportContainer');

// Store all data
let allItems = [];
let allRooms = [];
let allRoomItems = [];
let allActivityLogs = [];
let allEquipment = [];

// Filter state for items list
let itemsCategoryFilter = '';
let itemsMonthFilter = '';
let itemsSearchQuery = '';

// Filter state for items list import view
let itemsListCategoryFilter = '';

// Filter state for logs
let logsDateFrom = '';
let logsDateTo = '';
let logsActionFilter = 'all';
let logsSearchQuery = '';

// Store selected items for Lost/Stolen/Damaged/Destroyed report
let selectedLostItems = [];
let lostItemsSearchQuery = '';

// Store selected items for Items List report
let selectedItemsList = [];
let itemsListSearchQuery = '';

// Store selected rooms for Rooms report
let selectedRooms = [];
let roomsSearchQuery = '';

// Store editable room items for the report modal
let editableRoomItems = [];

// Store selected logs for Logs report
let selectedLogs = [];

// Store selected equipment for Equipment report
let selectedEquipment = [];
let equipmentSearchQuery = '';
let equipmentDateFrom = '';
let equipmentDateTo = '';
let equipmentConsumableFilter = '';

// Store item history report state
let selectedItemHistoryItemId = '';
let selectedItemHistoryItemName = '';
let itemHistoryFromDate = '';
let itemHistoryToDate = '';
let itemHistoryLogs = [];
let itemHistorySearchQuery = '';
let itemHistorySource = [];
let itemHistorySummaryData = null;

// Store form data for equipment report
let equipmentReportFormData = null;

// Summary data storage
let weeklySummaryData = null;
let monthlySummaryData = null;
let yearlySummaryData = null;

// ==========================================
// SUMMARY CALCULATION FUNCTIONS
// ==========================================

// Helper: Get date ranges
function getDateRanges() {
    const now = new Date();
    
    // Weekly: Last 7 days
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const weekEnd = new Date(now);
    
    // Previous week for comparison
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(weekStart);
    
    // Monthly: Last 30 days
    const monthStart = new Date(now);
    monthStart.setDate(now.getDate() - 30);
    const monthEnd = new Date(now);
    
    // Previous month for comparison
    const prevMonthStart = new Date(monthStart);
    prevMonthStart.setDate(prevMonthStart.getDate() - 30);
    const prevMonthEnd = new Date(monthStart);
    
    // Yearly: Last 12 months
    const yearStart = new Date(now);
    yearStart.setFullYear(now.getFullYear() - 1);
    const yearEnd = new Date(now);
    
    // Previous year for comparison
    const prevYearStart = new Date(yearStart);
    prevYearStart.setFullYear(prevYearStart.getFullYear() - 1);
    const prevYearEnd = new Date(yearStart);
    
    return {
        weekly: { start: weekStart, end: weekEnd, prevStart: prevWeekStart, prevEnd: prevWeekEnd },
        monthly: { start: monthStart, end: monthEnd, prevStart: prevMonthStart, prevEnd: prevMonthEnd },
        yearly: { start: yearStart, end: yearEnd, prevStart: prevYearStart, prevEnd: prevYearEnd }
    };
}

function getQuantityDelta(log) {
    if (typeof log.quantity_after === 'number' && typeof log.quantity_before === 'number') {
        return log.quantity_after - log.quantity_before;
    }
    if (typeof log.quantity_changed === 'number') {
        return log.quantity_changed;
    }
    return 0;
}

// Calculate summary for a specific time period
function calculatePeriodSummary(logs, startDate, endDate, prevStartDate, prevEndDate) {
    // Filter logs for current period
    const periodLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= startDate && logDate <= endDate;
    });
    
    // Filter logs for previous period (for trends)
    const prevPeriodLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= prevStartDate && logDate <= prevEndDate;
    });
    
    // Calculate metrics for current period
    const itemsAdded = periodLogs.reduce((sum, log) => {
        const delta = getQuantityDelta(log);
        return sum + Math.max(delta, 0);
    }, 0);
    
    const itemsRemoved = periodLogs.reduce((sum, log) => {
        const delta = getQuantityDelta(log);
        return sum + Math.abs(Math.min(delta, 0));
    }, 0);
    
    const transactions = periodLogs.length;
    const netChange = itemsAdded - itemsRemoved;
    
    // Calculate metrics for previous period (for trends)
    const prevItemsAdded = prevPeriodLogs.reduce((sum, log) => {
        const delta = getQuantityDelta(log);
        return sum + Math.max(delta, 0);
    }, 0);
    
    const prevItemsRemoved = prevPeriodLogs.reduce((sum, log) => {
        const delta = getQuantityDelta(log);
        return sum + Math.abs(Math.min(delta, 0));
    }, 0);
    
    const prevTransactions = prevPeriodLogs.length;
    
    // Calculate trends (percentage change)
    const calculateTrend = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
    };
    
    // Get top items by activity
    const itemActivity = {};
    periodLogs.forEach(log => {
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
    
    // Get recent activity (last 10)
    const recentActivity = periodLogs
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10)
        .map(log => ({
            type: log.action_type === 'CREATE' || (log.action_type === 'UPDATE_QUANTITY' && log.quantity_changed > 0) ? 'added' : 
                  log.action_type === 'DISTRIBUTE' || (log.action_type === 'UPDATE_QUANTITY' && log.quantity_changed < 0) ? 'removed' : 'updated',
            itemName: log.item_name || 'Unknown',
            quantity: Math.abs(log.quantity_changed || 0),
            person: log.person || '-',
            timestamp: log.timestamp,
            action: log.action_type
        }));
    
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
        recentActivity
    };
}

// Calculate all summaries
async function calculateAllSummaries() {
    if (allActivityLogs.length === 0) {
        await fetchActivityLogs();
    }
    
    const ranges = getDateRanges();
    
    weeklySummaryData = calculatePeriodSummary(
        allActivityLogs,
        ranges.weekly.start,
        ranges.weekly.end,
        ranges.weekly.prevStart,
        ranges.weekly.prevEnd
    );
    
    monthlySummaryData = calculatePeriodSummary(
        allActivityLogs,
        ranges.monthly.start,
        ranges.monthly.end,
        ranges.monthly.prevStart,
        ranges.monthly.prevEnd
    );
    
    yearlySummaryData = calculatePeriodSummary(
        allActivityLogs,
        ranges.yearly.start,
        ranges.yearly.end,
        ranges.yearly.prevStart,
        ranges.yearly.prevEnd
    );
}

// Display summary for a period
function displayPeriodSummary(period, data) {
    // Update stat values
    const itemsAddedEl = document.getElementById(`${period}ItemsAdded`);
    const itemsRemovedEl = document.getElementById(`${period}ItemsRemoved`);
    const transactionsEl = document.getElementById(`${period}Transactions`);
    const netChangeEl = document.getElementById(`${period}NetChange`);
    
    if (itemsAddedEl) itemsAddedEl.textContent = data.itemsAdded.toLocaleString();
    if (itemsRemovedEl) itemsRemovedEl.textContent = data.itemsRemoved.toLocaleString();
    if (transactionsEl) transactionsEl.textContent = data.transactions.toLocaleString();
    if (netChangeEl) {
        netChangeEl.textContent = (data.netChange >= 0 ? '+' : '') + data.netChange.toLocaleString();
        netChangeEl.className = `stat-value ${data.netChange >= 0 ? 'text-success' : 'text-danger'}`;
    }
    
    // Update trends
    const itemsAddedTrendEl = document.getElementById(`${period}ItemsAddedTrend`);
    const itemsRemovedTrendEl = document.getElementById(`${period}ItemsRemovedTrend`);
    const transactionsTrendEl = document.getElementById(`${period}TransactionsTrend`);
    
    const formatTrend = (value) => {
        if (value > 0) return `<span class="trend-up"><i class="fa-solid fa-arrow-up"></i> ${value}%</span>`;
        if (value < 0) return `<span class="trend-down"><i class="fa-solid fa-arrow-down"></i> ${Math.abs(value)}%</span>`;
        return `<span class="trend-neutral"><i class="fa-solid fa-minus"></i> 0%</span>`;
    };
    
    if (itemsAddedTrendEl) itemsAddedTrendEl.innerHTML = formatTrend(data.trends.itemsAdded);
    if (itemsRemovedTrendEl) itemsRemovedTrendEl.innerHTML = formatTrend(data.trends.itemsRemoved);
    if (transactionsTrendEl) transactionsTrendEl.innerHTML = formatTrend(data.trends.transactions);
    
    // Update activity list
    const activityListEl = document.getElementById(`${period}Activity`);
    if (activityListEl) {
        if (data.recentActivity.length === 0) {
            activityListEl.innerHTML = '<p class="small-muted">No activity in this period</p>';
        } else {
            activityListEl.innerHTML = data.recentActivity.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon ${activity.type}">
                        <i class="fa-solid ${activity.type === 'added' ? 'fa-plus' : activity.type === 'removed' ? 'fa-minus' : 'fa-pen'}"></i>
                    </div>
                    <div class="activity-details">
                        <p>${escapeHtml(activity.itemName)} ${activity.type === 'added' ? 'added' : activity.type === 'removed' ? 'removed' : 'updated'} (${activity.quantity})</p>
                        <small>${escapeHtml(activity.person)} • ${new Date(activity.timestamp).toLocaleString()}</small>
                    </div>
                </div>
            `).join('');
        }
    }
    
    // Update summary table
    const tableBody = document.querySelector(`#${period}SummaryTable tbody`);
    if (tableBody) {
        if (data.topItems.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No items in this period</td></tr>';
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

// Display weekly summary
async function displayWeeklySummary() {
    if (!weeklySummaryData) {
        await calculateAllSummaries();
    }
    displayPeriodSummary('weekly', weeklySummaryData);
}

// Display monthly summary
async function displayMonthlySummary() {
    if (!monthlySummaryData) {
        await calculateAllSummaries();
    }
    displayPeriodSummary('monthly', monthlySummaryData);
}

// Display yearly summary
async function displayYearlySummary() {
    if (!yearlySummaryData) {
        await calculateAllSummaries();
    }
    displayPeriodSummary('yearly', yearlySummaryData);
}

// Handle tab switching
function handleTabSwitch(tabName) {
    // Update active tab button
    document.querySelectorAll('.report-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Update active content
    document.querySelectorAll('.report-content').forEach(content => {
        content.classList.remove('active');
    });
    const activeContent = document.getElementById(tabName);
    if (activeContent) {
        activeContent.classList.add('active');
    }
    
    // Load summary data
    switch(tabName) {
        case 'weekly':
            displayWeeklySummary();
            break;
        case 'monthly':
            displayMonthlySummary();
            break;
        case 'yearly':
            displayYearlySummary();
            break;
        case 'custom':
            // Custom month tab - data loads when user selects a month
            // No automatic loading needed
            break;
    }
}

// ==========================================
// 1. FETCH DATA FUNCTIONS
// ==========================================

async function fetchItems() {
    try {
        const { data: items, error } = await supabase
            .from('items')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        allItems = items || [];
        return allItems;
    } catch (error) {
        console.error('Error fetching items:', error);
        return [];
    }
}

async function fetchRooms() {
    try {
        const { data: rooms, error } = await supabase
            .from('rooms')
            .select('*')
            .order('name', { ascending: true });
        
        if (error) throw error;
        allRooms = rooms || [];
        return allRooms;
    } catch (error) {
        console.error('Error fetching rooms:', error);
        return [];
    }
}

async function fetchRoomItems() {
    try {
        const { data: roomItems, error } = await supabase
            .from('room_items')
            .select('*');
        
        if (error) throw error;
        allRoomItems = roomItems || [];
        return allRoomItems;
    } catch (error) {
        console.error('Error fetching room items:', error);
        return [];
    }
}

async function fetchActivityLogs() {
    try {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        const { data: logs, error } = await supabase
            .from('activity_logs')
            .select('*')
            .gte('timestamp', oneYearAgo.toISOString())
            .order('timestamp', { ascending: false });
        
        if (error) throw error;
        allActivityLogs = logs || [];
        return allActivityLogs;
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        return [];
    }
}

async function fetchEquipment() {
    try {
        const { data: equipment, error } = await supabase
            .from('equipment')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        allEquipment = equipment || [];
        return allEquipment;
    } catch (error) {
        console.error('Error fetching equipment:', error);
        return [];
    }
}

// ==========================================
// 2. REPORT DISPLAY FUNCTIONS
// ==========================================

// Display List of Items Report
async function displayItemsListReport() {
    showLoading(true);
    hideError();
    hideEmpty();
    
    try {
        if (allItems.length === 0) {
            await fetchItems();
        }
        
        // Get unique categories for filter dropdown
        const categories = [...new Set(allItems.map(item => item.label).filter(Boolean))].sort();
        
        // Apply filters
        let filteredItems = [...allItems];
        
        // Category filter
        if (itemsCategoryFilter) {
            filteredItems = filteredItems.filter(item => item.label === itemsCategoryFilter);
        }
        
        // Month filter
        if (itemsListMonthFilter) {
            const [year, month] = itemsListMonthFilter.split('-');
            filteredItems = filteredItems.filter(item => {
                if (!item.created_at) return false;
                const itemDate = new Date(item.created_at);
                return itemDate.getFullYear() === parseInt(year) && (itemDate.getMonth() + 1) === parseInt(month);
            });
        }
        
        // Search filter
        if (itemsSearchQuery) {
            const query = itemsSearchQuery.toLowerCase();
            filteredItems = filteredItems.filter(item => 
                item.name.toLowerCase().includes(query) ||
                (item.label && item.label.toLowerCase().includes(query))
            );
        }
        
        let reportHTML = `
            <div class="report-card">
                <div class="report-header">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <button class="btn btn-ghost" onclick="window.showReportSelection()" title="Back to Reports" style="padding: 8px 12px;">
                            <i class="fa-solid fa-arrow-left"></i>
                        </button>
                        <h2><i class="fa-solid fa-boxes-stacked"></i> List of Items</h2>
                    </div>
                    <button class="btn btn-primary" onclick="window.exportCurrentReport('items_list')">
                        <i class="fa-solid fa-download"></i> Export
                    </button>
                </div>
                
                <!-- Filters Section -->
                <div style="padding: 20px 24px 0 24px;">
                    <div class="items-filters" style="display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end;">
                        <div class="filter-group" style="flex: 1; min-width: 150px;">
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase;">Category</label>
                            <select id="itemsCategoryFilter" onchange="window.updateItemsFilters()" style="width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; background: white;">
                                <option value="">All Categories</option>
                                ${categories.map(cat => `<option value="${escapeHtml(cat)}" ${itemsCategoryFilter === cat ? 'selected' : ''}>${escapeHtml(cat)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="filter-group" style="flex: 1; min-width: 150px;">
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase;">Month</label>
                            <select id="itemsMonthFilter" onchange="window.updateItemsFilters()" style="width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; background: white;">
                                <option value="">All Months</option>
                                <option value="${new Date().getFullYear()}-01" ${itemsMonthFilter === `${new Date().getFullYear()}-01` ? 'selected' : ''}>January</option>
                                <option value="${new Date().getFullYear()}-02" ${itemsMonthFilter === `${new Date().getFullYear()}-02` ? 'selected' : ''}>February</option>
                                <option value="${new Date().getFullYear()}-03" ${itemsMonthFilter === `${new Date().getFullYear()}-03` ? 'selected' : ''}>March</option>
                                <option value="${new Date().getFullYear()}-04" ${itemsMonthFilter === `${new Date().getFullYear()}-04` ? 'selected' : ''}>April</option>
                                <option value="${new Date().getFullYear()}-05" ${itemsMonthFilter === `${new Date().getFullYear()}-05` ? 'selected' : ''}>May</option>
                                <option value="${new Date().getFullYear()}-06" ${itemsMonthFilter === `${new Date().getFullYear()}-06` ? 'selected' : ''}>June</option>
                                <option value="${new Date().getFullYear()}-07" ${itemsMonthFilter === `${new Date().getFullYear()}-07` ? 'selected' : ''}>July</option>
                                <option value="${new Date().getFullYear()}-08" ${itemsMonthFilter === `${new Date().getFullYear()}-08` ? 'selected' : ''}>August</option>
                                <option value="${new Date().getFullYear()}-09" ${itemsMonthFilter === `${new Date().getFullYear()}-09` ? 'selected' : ''}>September</option>
                                <option value="${new Date().getFullYear()}-10" ${itemsMonthFilter === `${new Date().getFullYear()}-10` ? 'selected' : ''}>October</option>
                                <option value="${new Date().getFullYear()}-11" ${itemsMonthFilter === `${new Date().getFullYear()}-11` ? 'selected' : ''}>November</option>
                                <option value="${new Date().getFullYear()}-12" ${itemsMonthFilter === `${new Date().getFullYear()}-12` ? 'selected' : ''}>December</option>
                            </select>
                        </div>
                        <div class="filter-group" style="flex: 2; min-width: 200px;">
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase;">Search</label>
                            <input type="text" id="itemsSearchQuery" placeholder="Search items... (Press Enter)" value="${escapeHtml(itemsSearchQuery)}" onkeyup="if(event.key === 'Enter') window.updateItemsFilters()" style="width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
                        </div>
                    </div>
                </div>
                
                <div class="report-stats">
                    <div class="stat-box">
                        <span class="stat-number">${filteredItems.length}</span>
                        <span class="stat-label">Total Items</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${filteredItems.filter(i => i.quantity > 0).length}</span>
                        <span class="stat-label">In Stock</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${filteredItems.filter(i => i.quantity <= 0).length}</span>
                        <span class="stat-label">Out of Stock</span>
                    </div>
                </div>
                <div class="report-table-container">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>Item Name</th>
                                <th>Category</th>
                                <th>Quantity</th>
                                <th>Unit</th>
                                <th>Date Added</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        if (filteredItems.length === 0) {
            reportHTML += `<tr><td colspan="5" style="text-align: center;">No items found</td></tr>`;
        } else {
            filteredItems.forEach(item => {
                const createdAt = item.created_at ? new Date(item.created_at).toLocaleDateString() : '-';
                const quantityClass = item.quantity <= 0 ? 'out-of-stock' : (item.quantity < 20 ? 'low-stock' : 'in-stock');
                reportHTML += `
                    <tr>
                        <td>${escapeHtml(item.name)}</td>
                        <td>${escapeHtml(item.label || '-')}</td>
                        <td class="${quantityClass}">${item.quantity}</td>
                        <td>${escapeHtml(item.unit || 'units')}</td>
                        <td>${createdAt}</td>
                    </tr>
                `;
            });
        }
        
        reportHTML += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        reportContainer.innerHTML = reportHTML;
        
    } catch (error) {
        console.error('Error displaying items list report:', error);
        showError('Failed to load items report');
    } finally {
        showLoading(false);
    }
}

// Display Lost/Stolen/Damaged/Destroyed Items Report - with Import functionality
async function displayLostItemsReportWithImport() {
    showLoading(true);
    hideError();
    hideEmpty();
    
    try {
        if (allItems.length === 0) {
            await fetchItems();
        }
        
        // Filter items based on search query
        let filteredItems = allItems;
        if (lostItemsSearchQuery) {
            const query = lostItemsSearchQuery.toLowerCase();
            filteredItems = allItems.filter(item => 
                item.name.toLowerCase().includes(query) || 
                (item.label && item.label.toLowerCase().includes(query))
            );
        }
        
        let reportHTML = `
            <div class="report-card">
                <div class="report-header">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <button class="btn btn-ghost" onclick="window.showReportSelection()" title="Back to Reports" style="padding: 8px 12px;">
                            <i class="fa-solid fa-arrow-left"></i>
                        </button>
                        <h2><i class="fa-solid fa-triangle-exclamation"></i> Lost/Stolen/Damaged/Destroyed Items</h2>
                    <button class="btn btn-primary" onclick="window.openCreateLostItemsReportModal()" id="createLostItemsReportBtn">
                        <i class="fa-solid fa-file-signature"></i> Create This Report
                    </button>
                </div>
                <div class="report-info">
                    <p><i class="fa-solid fa-info-circle"></i> Search and select items from the inventory below to add to this report. Enter the quantity for each selected item.</p>
                </div>
                
                <!-- Search Bar -->
                <div class="search-container" style="margin-bottom: 20px;">
                    <input type="text" id="lostItemsSearch" placeholder="Search items..." value="${lostItemsSearchQuery}" 
                        oninput="window.updateLostItemsSearch(this.value)"
                        style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                </div>
                
                <div class="report-stats">
                    <div class="stat-box">
                        <span class="stat-number" id="selectedItemsCount">${selectedLostItems.length}</span>
                        <span class="stat-label">Selected Items</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${filteredItems.length}</span>
                        <span class="stat-label">Showing Items</span>
                    </div>
                </div>
                <div class="report-table-container">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th style="width: 40px;"><input type="checkbox" id="selectAllItems" onchange="window.toggleSelectAllItems()"></th>
                                <th>Item Name</th>
                                <th>Category</th>
                                <th>Available Qty</th>
                                <th>Quantity to Report</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        if (filteredItems.length === 0) {
            reportHTML += `<tr><td colspan="4" style="text-align: center;">No items found</td></tr>`;
        } else {
            filteredItems.forEach(item => {
                const isSelected = selectedLostItems.find(i => i.itemId === item.id);
                const quantityClass = item.quantity <= 0 ? 'out-of-stock' : (item.quantity < 20 ? 'low-stock' : 'in-stock');
                reportHTML += `
                    <tr>
                        <td><input type="checkbox" class="item-checkbox" data-item-id="${item.id}" data-item-name="${escapeHtml(item.name)}" data-item-qty="${item.quantity}" ${isSelected ? 'checked' : ''} onchange="window.toggleItemSelection(this)"></td>
                        <td>${escapeHtml(item.name)}</td>
                        <td>${escapeHtml(item.label || '-')}</td>
                        <td class="${quantityClass}">${item.quantity}</td>
                        <td>
                            <input type="number" min="0" max="${item.quantity}" value="${isSelected ? isSelected.quantity : 0}" 
                                style="width: 80px; padding: 5px; border: 1px solid #ddd; border-radius: 4px;" 
                                onchange="window.updateItemQuantity('${item.id}', this.value)" ${!isSelected ? 'disabled' : ''}>
                        </td>
                    </tr>
                `;
            });
        }
        
        reportHTML += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        reportContainer.innerHTML = reportHTML;
        
    } catch (error) {
        console.error('Error displaying lost items report with import:', error);
        showError('Failed to load lost items report');
    } finally {
        showLoading(false);
    }
}

// Toggle select all items
function toggleSelectAllItems() {
    const selectAll = document.getElementById('selectAllItems');
    const checkboxes = document.querySelectorAll('.item-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
        const itemId = checkbox.dataset.itemId;
        const itemName = checkbox.dataset.itemName;
        const maxQty = parseInt(checkbox.dataset.itemQty);
        
        if (selectAll.checked) {
            if (!selectedLostItems.find(i => i.itemId === itemId)) {
                selectedLostItems.push({ itemId: itemId, itemName: itemName, quantity: 1 });
            }
            const row = checkbox.closest('tr');
            const qtyInput = row.querySelector('input[type="number"]');
            if (qtyInput) { qtyInput.disabled = false; qtyInput.value = 1; }
        } else {
            selectedLostItems = selectedLostItems.filter(i => i.itemId !== itemId);
            const row = checkbox.closest('tr');
            const qtyInput = row.querySelector('input[type="number"]');
            if (qtyInput) { qtyInput.disabled = true; qtyInput.value = 0; }
        }
    });
    updateSelectedCount();
}

// Toggle individual item selection
function toggleItemSelection(checkbox) {
    const itemId = checkbox.dataset.itemId;
    const itemName = checkbox.dataset.itemName;
    const maxQty = parseInt(checkbox.dataset.itemQty);
    
    if (checkbox.checked) {
        selectedLostItems.push({ itemId: itemId, itemName: itemName, quantity: 1 });
        const row = checkbox.closest('tr');
        const qtyInput = row.querySelector('input[type="number"]');
        if (qtyInput) { qtyInput.disabled = false; qtyInput.value = 1; }
    } else {
        selectedLostItems = selectedLostItems.filter(i => i.itemId !== itemId);
        const row = checkbox.closest('tr');
        const qtyInput = row.querySelector('input[type="number"]');
        if (qtyInput) { qtyInput.disabled = true; qtyInput.value = 0; }
        const selectAll = document.getElementById('selectAllItems');
        if (selectAll) selectAll.checked = false;
    }
    updateSelectedCount();
}

// Update item quantity
function updateItemQuantity(itemId, quantity) {
    const item = selectedLostItems.find(i => i.itemId === itemId);
    if (item) { item.quantity = parseInt(quantity) || 0; }
    updateSelectedCount();
}

// Update selected count display
function updateSelectedCount() {
    const countEl = document.getElementById('selectedItemsCount');
    if (countEl) { countEl.textContent = selectedLostItems.length; }
}

// Store form data for lost items report
let lostItemsReportFormData = null;

// Store form data for items list report
let itemsListReportFormData = null;

// Store form data for rooms report
let roomsReportFormData = null;

// Store form data for logs report
let logsReportFormData = null;

// Open Create Lost Items Report Modal
function openCreateLostItemsReportModal() {
    if (selectedLostItems.length === 0) {
        alert('Please select at least one item to create the report');
        return;
    }
    
    const modal = document.getElementById('createLostItemsReportModal');
    if (modal) {
        // Date field is left empty for user to manually enter
        // This allows the user to set any date for the report creation
        
        // Populate selected items list
        const itemsListContainer = document.getElementById('modalSelectedItemsList');
        const itemsCountLabel = document.getElementById('modalSelectedItemsCount');
        
        if (itemsCountLabel) {
            itemsCountLabel.textContent = selectedLostItems.length;
        }
        
        if (itemsListContainer) {
            if (selectedLostItems.length === 0) {
                itemsListContainer.innerHTML = '<p style="color: #666; margin: 0;">No items selected</p>';
            } else {
                let itemsHTML = '<ul style="margin: 0; padding-left: 20px; list-style-type: disc;">';
                selectedLostItems.forEach(item => {
                    itemsHTML += `<li style="margin-bottom: 4px; color: #333;">${escapeHtml(item.itemName)} (Qty: ${item.quantity})</li>`;
                });
                itemsHTML += '</ul>';
                itemsListContainer.innerHTML = itemsHTML;
            }
        }
        
        modal.style.display = 'flex';
    }
}

// Close Create Lost Items Report Modal
function closeCreateLostItemsReportModal() {
    const modal = document.getElementById('createLostItemsReportModal');
    if (modal) modal.style.display = 'none';
    
    // Reset form
    const form = document.getElementById('createLostItemsReportForm');
    if (form) form.reset();
}

// Handle Create Lost Items Report Form Submit
function handleCreateLostItemsReportSubmit(e) {
    e.preventDefault();
    
    // Get form data
    lostItemsReportFormData = {
        reportDate: document.getElementById('reportDate')?.value,
        accountableOfficer: document.getElementById('accountableOfficer')?.value,
        immediateSupervisor: document.getElementById('immediateSupervisor')?.value,
        incidentDescription: document.getElementById('incidentDescription')?.value
    };
    
    // Close modal
    closeCreateLostItemsReportModal();
    
    // Generate the report with form data
    generateLostItemsReportWithFormData();
}

// Generate Lost Items Report with Form Data
async function generateLostItemsReportWithFormData() {
    showLoading(true);
    try {
        // Import TemplateManager
        const { default: TemplateManager } = await import('./templateManager.js');
        
        // Automatically fetch template for items_lost based on export type
        // No need to manually set template as active
        const activeTemplate = await TemplateManager.fetchTemplateByExportType('items_lost');

        // Enrich selected items with additional data from activity logs
        if (allActivityLogs.length === 0) {
            await fetchActivityLogs();
        }

        const enrichedItems = selectedLostItems.map(selectedItem => {
            const itemDetails = allItems.find(item => item.id === selectedItem.itemId);
            
            const distributionLogs = allActivityLogs.filter(log => 
                log.action_type === 'DISTRIBUTE' && 
                log.item_name === selectedItem.itemName
            );
            
            const lastDistribution = distributionLogs.length > 0 
                ? distributionLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
                : null;

            return {
                item_name: selectedItem.itemName,
                category: itemDetails?.label || lastDistribution?.details?.category || lastDistribution?.details?.label || '-',
                person: lastDistribution?.person || '-',
                quantity: selectedItem.quantity,
                last_date: lastDistribution?.timestamp || itemDetails?.updated_at || new Date().toISOString()
            };
        });

        // Try to use template pre-fill if active template exists
        if (activeTemplate) {
            const filledWorkbook = await TemplateManager.fillTemplateWithData(
                activeTemplate, 
                enrichedItems, 
                10
            );

            if (filledWorkbook) {
                // Add form data to specific cells in the template
                const sheetName = activeTemplate.template_data?.sheet_name || filledWorkbook.SheetNames[0];
                const worksheet = filledWorkbook.Sheets[sheetName];
                
                // Add form data to template at specific cell locations
                if (lostItemsReportFormData) {
                    // Date: Column D,E,F row 12 - Format as MM/DD/YYYY
                    // Label "Date" in C12
                    if (lostItemsReportFormData.reportDate) {
                        worksheet['C12'] = { v: 'Date', t: 's' };
                        
                        const dateObj = new Date(lostItemsReportFormData.reportDate);
                        const formattedDate = `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
                        
                        worksheet['D12'] = { v: formattedDate, t: 's' };
                        worksheet['E12'] = { v: formattedDate, t: 's' };
                        worksheet['F12'] = { v: formattedDate, t: 's' };
                    }
                    // Name of the Accountable Officer: Column B,C,D,E row 39
                    if (lostItemsReportFormData.accountableOfficer) {
                        worksheet['B39'] = { v: lostItemsReportFormData.accountableOfficer, t: 's' };
                        worksheet['C39'] = { v: lostItemsReportFormData.accountableOfficer, t: 's' };
                        worksheet['D39'] = { v: lostItemsReportFormData.accountableOfficer, t: 's' };
                        worksheet['E39'] = { v: lostItemsReportFormData.accountableOfficer, t: 's' };
                    }
                    // Name of the Immediate Supervisor: Column F,G,H row 39
                    if (lostItemsReportFormData.immediateSupervisor) {
                        worksheet['F39'] = { v: lostItemsReportFormData.immediateSupervisor, t: 's' };
                        worksheet['G39'] = { v: lostItemsReportFormData.immediateSupervisor, t: 's' };
                        worksheet['H39'] = { v: lostItemsReportFormData.immediateSupervisor, t: 's' };
                    }
                    // Incident Description: Only fill B30 (starting cell of the range B30-H33)
                    if (lostItemsReportFormData.incidentDescription) {
                        worksheet['B30'] = { v: lostItemsReportFormData.incidentDescription, t: 's' };
                    }
                }
                
                // Download the pre-filled template with styles preserved
                const filenameBase = `lost_items_report_${new Date().toISOString().split('T')[0]}`;
                TemplateManager.writeFileWithStyles(filledWorkbook, `${filenameBase}.xlsx`);
                alert('Report generated successfully with form data included!');
                showLoading(false);
                return;
            }
        }

        // Fallback to default export if no template or template fill failed
        const exportData = enrichedItems.map(item => ({
            'Item Name': item.item_name,
            'Category': item.category,
            'Person': item.person,
            'Quantity': item.quantity,
            'Last Distribution Date': new Date(item.last_date).toLocaleString(),
            'Report Date': lostItemsReportFormData?.reportDate || '',
            'Accountable Officer': lostItemsReportFormData?.accountableOfficer || '',
            'Immediate Supervisor': lostItemsReportFormData?.immediateSupervisor || '',
            'Incident Description': lostItemsReportFormData?.incidentDescription || ''
        }));
        
        const filenameBase = `lost_items_report_${new Date().toISOString().split('T')[0]}`;
        
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Items');
        XLSX.writeFile(wb, `${filenameBase}.xlsx`);
        
        alert('Report generated successfully!');
    } catch (error) {
        console.error('Error generating lost items report:', error);
        alert('Failed to generate report');
    } finally {
        showLoading(false);
    }
}

// Update search query and re-render
function updateLostItemsSearch(query) {
    lostItemsSearchQuery = query;
    displayLostItemsReportWithImport();
}

// Update search query for rooms and re-render
function updateRoomsSearch(query) {
    roomsSearchQuery = query;
    displayRoomsReport();
}

// Update search query for items list and re-render
function updateItemsListSearch(query) {
    itemsListSearchQuery = query;
    displayItemsListReportWithImport();
}

// Show report selection (back to main reports view)
function showReportSelection() {
    window.location.href = 'report.html';
}

// ==========================================
// ENHANCED REPORT FLOWS FOR ALL TYPES
// ==========================================

// Display Items List Report - with Import functionality
async function displayItemsListReportWithImport() {
    showLoading(true);
    hideError();
    hideEmpty();
    
    try {
        if (allItems.length === 0) {
            await fetchItems();
        }
        
        // Get unique categories for filter dropdown
        const categories = [...new Set(allItems.map(item => item.label).filter(Boolean))].sort();
        
        // Filter items based on category and search query
        let filteredItems = allItems;
        
        // Category filter
        if (itemsListCategoryFilter) {
            filteredItems = filteredItems.filter(item => item.label === itemsListCategoryFilter);
        }
        
        // Search filter
        if (itemsListSearchQuery) {
            const query = itemsListSearchQuery.toLowerCase();
            filteredItems = filteredItems.filter(item => 
                item.name.toLowerCase().includes(query) || 
                (item.label && item.label.toLowerCase().includes(query))
            );
        }
        
        let reportHTML = `
            <div class="report-card">
                <div class="report-header">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <button class="btn btn-ghost" onclick="window.showReportSelection()" title="Back to Reports" style="padding: 8px 12px;">
                            <i class="fa-solid fa-arrow-left"></i>
                        </button>
                        <h2><i class="fa-solid fa-boxes-stacked"></i> List of Items</h2>
                    </div>
                    <button class="btn btn-primary" onclick="window.openCreateItemsListReportModal()" id="createItemsListReportBtn">
                        <i class="fa-solid fa-file-signature"></i> Create This Report
                    </button>
                </div>
                <div class="report-info">
                    <p><i class="fa-solid fa-info-circle"></i> Search and select items from the inventory below to include in this report.</p>
                </div>
                
                <!-- Monthly Quantity Summary -->
                <div style="padding: 0 0 20px 0;">
                    <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                        <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #495057; text-transform: uppercase;">
                            <i class="fa-solid fa-chart-bar"></i> Items Added Per Month (Current Year)
                        </h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${generateMonthlyQuantitySummary(allItems)}
                        </div>
                    </div>
                </div>
                
                <!-- Filters Section -->
                <div style="padding: 0 0 20px 0;">
                    <div class="items-filters" style="display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end;">
                        <div class="filter-group" style="flex: 1; min-width: 150px;">
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase;">Category</label>
                            <select id="itemsListCategoryFilter" onchange="window.updateItemsListCategoryFilter(this.value)" style="width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; background: white;">
                                <option value="">All Categories</option>
                                ${categories.map(cat => `<option value="${escapeHtml(cat)}" ${itemsListCategoryFilter === cat ? 'selected' : ''}>${escapeHtml(cat)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="filter-group" style="flex: 2; min-width: 200px;">
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase;">Search</label>
                            <input type="text" id="itemsListSearch" placeholder="Search items... (Press Enter)" value="${itemsListSearchQuery}" 
                                onkeyup="if(event.key === 'Enter') window.updateItemsListSearch(this.value)"
                                style="width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
                        </div>
                    </div>
                </div>
                
                <div class="report-stats">
                    <div class="stat-box">
                        <span class="stat-number" id="selectedItemsListCount">${selectedItemsList.length}</span>
                        <span class="stat-label">Selected Items</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${filteredItems.length}</span>
                        <span class="stat-label">Showing Items</span>
                    </div>
                </div>
                <div class="report-table-container">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th style="width: 40px;"><input type="checkbox" id="selectAllItemsList" onchange="window.toggleSelectAllItemsList()"></th>
                                <th>Item Name</th>
                                <th>Category</th>
                                <th>Available Qty</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        if (filteredItems.length === 0) {
            reportHTML += `<tr><td colspan="4" style="text-align: center;">No items found</td></tr>`;
        } else {
            filteredItems.forEach(item => {
                const isSelected = selectedItemsList.find(i => i.itemId === item.id);
                const quantityClass = item.quantity <= 0 ? 'out-of-stock' : (item.quantity < 20 ? 'low-stock' : 'in-stock');
                reportHTML += `
                    <tr>
                        <td><input type="checkbox" class="items-list-checkbox" data-item-id="${item.id}" data-item-name="${escapeHtml(item.name)}" data-item-qty="${item.quantity}" ${isSelected ? 'checked' : ''} onchange="window.toggleItemsListSelection(this)"></td>
                        <td>${escapeHtml(item.name)}</td>
                        <td>${escapeHtml(item.label || '-')}</td>
                        <td class="${quantityClass}">${item.quantity}</td>
                    </tr>
                `;
            });
        }
        
        reportHTML += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        reportContainer.innerHTML = reportHTML;
        
    } catch (error) {
        console.error('Error displaying items list report with import:', error);
        showError('Failed to load items list report');
    } finally {
        showLoading(false);
    }
}

// Display item history report
async function displayItemHistoryReport() {
    showLoading(true);
    hideError();
    hideEmpty();

    try {
        if (allItems.length === 0) {
            await fetchItems();
        }

        let itemsSource = allItems;
        if (itemsSource.length === 0) {
            const logs = await fetchActivityLogs();
            const uniqueNames = new Map();
            (logs || []).forEach(log => {
                const itemName = log.item_name?.trim();
                if (itemName && !uniqueNames.has(itemName)) {
                    uniqueNames.set(itemName, itemName);
                }
            });
            itemsSource = Array.from(uniqueNames.keys()).sort().map(name => ({ id: name, name, label: '' }));
        }

        const query = itemHistorySearchQuery.trim().toLowerCase();
        itemHistorySource = itemsSource;

        reportContainer.innerHTML = `
            <div class="report-card">
                <div class="report-header">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <button class="btn btn-ghost" onclick="window.showReportSelection()" title="Back to Reports" style="padding: 8px 12px;">
                            <i class="fa-solid fa-arrow-left"></i>
                        </button>
                        <h2><i class="fa-solid fa-history"></i> Item History Report</h2>
                    </div>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                        <button class="btn btn-secondary" onclick="window.generateItemHistoryReport()"><i class="fa-solid fa-filter"></i> Generate</button>
                        
                    </div>
                </div>

                <div class="report-info">
                    <p><i class="fa-solid fa-info-circle"></i> Select an item and set a from/to date range to display stock additions and distributions for that item.</p>
                </div>

                <div style="padding: 0 0 20px 0;">
                    <div class="items-filters" style="display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end;">
                        <div class="filter-group" style="flex: 2; min-width: 220px;">
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase;">Search Item</label>
                            <input type="text" id="itemHistorySearch" value="${escapeHtml(itemHistorySearchQuery)}" oninput="window.updateItemHistorySearch(this.value)" placeholder="Search items..." style="width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; background: white;" />
                        </div>
                        <div class="filter-group" style="flex: 1; min-width: 150px;">
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase;">From</label>
                            <input type="date" id="itemHistoryFromDate" onchange="window.updateItemHistoryFromDate(this.value)" style="width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; background: white;" />
                        </div>
                        <div class="filter-group" style="flex: 1; min-width: 150px;">
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase;">To</label>
                            <input type="date" id="itemHistoryToDate" onchange="window.updateItemHistoryToDate(this.value)" style="width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; background: white;" />
                        </div>
                    </div>
                </div>

                <div style="padding: 0 0 20px 0;">
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase;">Select item</label>
                        <div id="itemHistoryList" style="max-height: 280px; overflow-y: auto; padding-right: 4px;">
                        </div>
                    </div>
                </div>

                <div id="itemHistorySummary" class="report-stats" style="margin-bottom: 20px;">
                    <div class="stat-box">
                        <span class="stat-number" id="itemHistoryAdded">-</span>
                        <span class="stat-label">Stock Added</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number" id="itemHistoryDistributed">-</span>
                        <span class="stat-label">Stock Distributed</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number" id="itemHistoryNetChange">-</span>
                        <span class="stat-label">Net Change</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number" id="itemHistoryTransactions">-</span>
                        <span class="stat-label">Transactions</span>
                    </div>
                </div>

                <div class="report-table-container">
                    <table class="report-table" id="itemHistoryTable">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Action</th>
                                <th>Qty Changed</th>
                                <th>Before</th>
                                <th>After</th>
                                <th>Person</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colspan="7" style="text-align: center; padding: 20px; color: #666;">Please select an item and date range, then click Generate.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        renderItemHistoryList();
    } catch (error) {
        console.error('Error displaying item history report:', error);
        showError('Failed to load item history report');
    } finally {
        showLoading(false);
    }
}

function updateItemHistoryItem(select) {
    selectedItemHistoryItemId = select.value;
    selectedItemHistoryItemName = select.selectedOptions?.[0]?.dataset.name || '';
}

function updateItemHistoryFromDate(value) {
    itemHistoryFromDate = value;
}

function updateItemHistoryToDate(value) {
    itemHistoryToDate = value;
}

function renderItemHistoryList() {
    const listContainer = document.getElementById('itemHistoryList');
    if (!listContainer) return;

    const query = itemHistorySearchQuery.trim().toLowerCase();
    const filteredItems = (itemHistorySource || []).filter(item => {
        return !query || item.name.toLowerCase().includes(query) || (item.label && item.label.toLowerCase().includes(query));
    });

    const itemListRows = filteredItems.length > 0 ? filteredItems.map(item => {
        const label = item.label ? ` (${escapeHtml(item.label)})` : '';
        const itemId = escapeHtml(String(item.id));
        const isChecked = selectedItemHistoryItemId && String(item.id) === String(selectedItemHistoryItemId);
        return `
            <label class="item-history-row" style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid #e8e8e8; border-radius: 8px; margin-bottom: 8px; background: white; cursor: pointer;">
                <input type="checkbox" class="item-history-checkbox" value="${itemId}" data-name="${escapeHtml(item.name)}" ${isChecked ? 'checked' : ''} onchange="window.toggleItemHistorySelection(this)" />
                <span style="font-weight: 600;">${escapeHtml(item.name)}</span>
                <span style="color: #666;">${label}</span>
            </label>
        `;
    }).join('') : '<div style="padding: 20px; color: #666;">No items match your search.</div>';

    listContainer.innerHTML = itemListRows;
}

function updateItemHistorySearch(value) {
    itemHistorySearchQuery = value;
    renderItemHistoryList();
}

function toggleItemHistorySelection(checkbox) {
    const itemId = checkbox.value;
    const itemName = checkbox.dataset.name || '';

    if (checkbox.checked) {
        selectedItemHistoryItemId = itemId;
        selectedItemHistoryItemName = itemName;
    } else {
        selectedItemHistoryItemId = '';
        selectedItemHistoryItemName = '';
    }

    // Deselect all other checkboxes
    document.querySelectorAll('.item-history-checkbox').forEach(element => {
        if (element !== checkbox) {
            element.checked = false;
        }
    });
}

async function generateItemHistoryReport() {
    if (!selectedItemHistoryItemId) {
        alert('Please select an item to generate the history report.');
        return;
    }

    if (!itemHistoryFromDate || !itemHistoryToDate) {
        alert('Please select both a from and to date for the history report.');
        return;
    }

    const fromDate = new Date(itemHistoryFromDate);
    const toDate = new Date(itemHistoryToDate);
    toDate.setHours(23, 59, 59, 999);

    if (fromDate > toDate) {
        alert('The from date must be before or equal to the to date.');
        return;
    }

    showLoading(true);
    hideError();
    hideEmpty();

    try {
        const { data: logs, error } = await supabase
            .from('activity_logs')
            .select('*')
            .gte('timestamp', fromDate.toISOString())
            .lte('timestamp', toDate.toISOString())
            .order('timestamp', { ascending: false });

        if (error) throw error;

        const normalizedItemName = selectedItemHistoryItemName.trim().toLowerCase();
        itemHistoryLogs = (logs || []).filter(log => {
            const matchesById = log.item_id && String(log.item_id) === String(selectedItemHistoryItemId);
            const matchesByName = log.item_name && log.item_name.trim().toLowerCase() === normalizedItemName;
            return matchesById || matchesByName;
        });

        itemHistorySummaryData = calculateItemHistorySummary(itemHistoryLogs);
        renderItemHistoryResults();
        renderItemHistoryPreview();
        openItemHistoryPreviewModal();
    } catch (error) {
        console.error('Error loading item history data:', error);
        alert('Failed to load item history data. Please try again.');
    } finally {
        showLoading(false);
    }
}

function getActionTypeLabel(actionType) {
    const labels = {
        'CREATE': 'CREATED',
        'UPDATE_QUANTITY': 'ADDED',
        'DISTRIBUTE': 'DISTRIBUTED',
        'EDIT': 'EDITED',
        'DELETE': 'DELETED'
    };
    return labels[actionType] || actionType;
}

function calculateItemHistorySummary(logs) {
    // CRITICAL: Sort logs chronologically FIRST to handle out-of-order receipts
    const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Calculate totals based on chronological order
    const itemsAdded = sortedLogs.reduce((sum, log) => {
        const delta = getQuantityDelta(log);
        return sum + Math.max(delta, 0);
    }, 0);

    const itemsDistributed = sortedLogs.reduce((sum, log) => {
        const delta = getQuantityDelta(log);
        return sum + Math.abs(Math.min(delta, 0));
    }, 0);

    const transactions = sortedLogs.length;
    const netChange = itemsAdded - itemsDistributed;

    // Get timestamps from chronologically ordered logs
    const initialLog = sortedLogs[0];
    const finalLog = sortedLogs[sortedLogs.length - 1];

    return {
        itemsAdded,
        itemsDistributed,
        netChange,
        transactions,
        initialQuantity: initialLog?.quantity_before ?? '-',
        finalQuantity: finalLog?.quantity_after ?? '-',
        sortedLogs: sortedLogs  // Return sorted logs for rendering
    };
}

function renderItemHistoryResults() {
    const addedEl = document.getElementById('itemHistoryAdded');
    const distributedEl = document.getElementById('itemHistoryDistributed');
    const netChangeEl = document.getElementById('itemHistoryNetChange');
    const transactionsEl = document.getElementById('itemHistoryTransactions');
    const tableBody = document.querySelector('#itemHistoryTable tbody');
    const exportBtn = document.getElementById('exportItemHistoryBtn');

    if (!itemHistorySummaryData || !tableBody) return;

    if (addedEl) addedEl.textContent = itemHistorySummaryData.itemsAdded.toLocaleString();
    if (distributedEl) distributedEl.textContent = itemHistorySummaryData.itemsDistributed.toLocaleString();
    if (transactionsEl) transactionsEl.textContent = itemHistorySummaryData.transactions.toLocaleString();
    if (netChangeEl) {
        netChangeEl.textContent = (itemHistorySummaryData.netChange >= 0 ? '+' : '') + itemHistorySummaryData.netChange.toLocaleString();
        netChangeEl.className = `stat-number ${itemHistorySummaryData.netChange >= 0 ? 'text-success' : 'text-danger'}`;
    }

    if (itemHistoryLogs.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #666;">No item history found for this date range.</td></tr>';
        if (exportBtn) exportBtn.disabled = true;
        return;
    }

    // Display in reverse chronological order (newest first) for better UX, but calculations are based on chronological order
    const displayLogs = itemHistorySummaryData.sortedLogs ? [...itemHistorySummaryData.sortedLogs].reverse() : itemHistoryLogs;
    
    tableBody.innerHTML = displayLogs.map(log => `
        <tr>
            <td>${log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}</td>
            <td>${escapeHtml(getActionTypeLabel(log.action_type) || '-')}</td>
            <td>${log.quantity_changed || 0}</td>
            <td>${log.quantity_before != null ? log.quantity_before : '-'}</td>
            <td>${log.quantity_after != null ? log.quantity_after : '-'}</td>
            <td>${escapeHtml(log.person || '-')}</td>
            <td>${escapeHtml(log.notes || log.details?.notes || log.details?.description || '')}</td>
        </tr>
    `).join('');

    if (exportBtn) exportBtn.disabled = false;
    renderItemHistoryPreview();
}

function renderItemHistoryPreview() {
    const nameEl = document.getElementById('previewItemHistoryName');
    const rangeEl = document.getElementById('previewItemHistoryRange');
    const addedEl = document.getElementById('previewItemHistoryAdded');
    const distributedEl = document.getElementById('previewItemHistoryDistributed');
    const netChangeEl = document.getElementById('previewItemHistoryNetChange');
    const transactionsEl = document.getElementById('previewItemHistoryTransactions');
    const previewBody = document.getElementById('itemHistoryPreviewBody');
    const exportBtn = document.getElementById('itemHistoryPreviewExportBtn');

    if (nameEl) nameEl.textContent = selectedItemHistoryItemName || '-';
    if (rangeEl) rangeEl.textContent = `${itemHistoryFromDate || '-'} → ${itemHistoryToDate || '-'}`;
    if (addedEl) addedEl.textContent = itemHistorySummaryData?.itemsAdded?.toLocaleString() || '0';
    if (distributedEl) distributedEl.textContent = itemHistorySummaryData?.itemsDistributed?.toLocaleString() || '0';
    if (netChangeEl) netChangeEl.textContent = (itemHistorySummaryData?.netChange >= 0 ? '+' : '') + (itemHistorySummaryData?.netChange?.toLocaleString() || '0');
    if (transactionsEl) transactionsEl.textContent = itemHistorySummaryData?.transactions?.toLocaleString() || '0';

    if (!previewBody) return;

    if (!itemHistoryLogs || itemHistoryLogs.length === 0) {
        previewBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #666;">No item updates found for the selected range.</td></tr>';
        if (exportBtn) exportBtn.disabled = true;
        return;
    }

    previewBody.innerHTML = itemHistoryLogs.map(log => `
        <tr>
            <td>${log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}</td>
            <td>${escapeHtml(getActionTypeLabel(log.action_type) || '-')}</td>
            <td>${log.quantity_changed || 0}</td>
            <td>${log.quantity_before != null ? log.quantity_before : '-'}</td>
            <td>${log.quantity_after != null ? log.quantity_after : '-'}</td>
            <td>${escapeHtml(log.person || '-')}</td>
            <td>${escapeHtml(log.notes || log.details?.notes || log.details?.description || '')}</td>
        </tr>
    `).join('');

    if (exportBtn) exportBtn.disabled = false;
}

function openItemHistoryPreviewModal() {
    const modal = document.getElementById('itemHistoryPreviewModal');
    if (!modal) return;
    modal.style.display = 'flex';
}

function closeItemHistoryPreviewModal() {
    const modal = document.getElementById('itemHistoryPreviewModal');
    if (!modal) return;
    modal.style.display = 'none';
}

async function exportItemHistoryReport(format) {
    if (!itemHistorySummaryData || itemHistoryLogs.length === 0) {
        alert('Please generate the item history report first.');
        return;
    }

    const selectedFormat = format || document.getElementById('reportFormat')?.value || 'xlsx';

    showLoading(true);
    try {
        // Use sorted logs (newest first) for export, same as display
        const logsForExport = itemHistorySummaryData.sortedLogs ? [...itemHistorySummaryData.sortedLogs].reverse() : itemHistoryLogs;
        const historyRows = logsForExport.map(log => ({
            Date: log.timestamp ? new Date(log.timestamp).toLocaleString() : '',
            Action: log.action_type || '',
            'Qty Changed': log.quantity_changed || 0,
            'Quantity Before': log.quantity_before != null ? log.quantity_before : '',
            'Quantity After': log.quantity_after != null ? log.quantity_after : '',
            Person: log.person || '',
            Notes: log.notes || log.details?.notes || log.details?.description || ''
        }));

        const summarySheetData = [
            { A: 'Report', B: `Item History - ${selectedItemHistoryItemName}` },
            { A: 'Date Range', B: `${itemHistoryFromDate} to ${itemHistoryToDate}` },
            {},
            {
                A: 'Stock Added',
                B: itemHistorySummaryData.itemsAdded,
                C: 'Stock Distributed',
                D: itemHistorySummaryData.itemsDistributed,
                E: 'Net Change',
                F: itemHistorySummaryData.netChange,
                G: 'Transactions',
                H: itemHistorySummaryData.transactions
            },
            {},
            {
                A: 'Date',
                B: 'Action',
                C: 'Qty Changed',
                D: 'Quantity Before',
                E: 'Quantity After',
                F: 'Person',
                G: 'Notes'
            },
            ...historyRows.map(row => ({
                A: row.Date,
                B: row.Action,
                C: row['Qty Changed'],
                D: row['Quantity Before'],
                E: row['Quantity After'],
                F: row.Person,
                G: row.Notes
            }))
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(summarySheetData, { skipHeader: true });
        XLSX.utils.book_append_sheet(wb, ws, 'Item History');

        const safeItemName = selectedItemHistoryItemName.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
        const filenameBase = `item_history_${safeItemName}_${itemHistoryFromDate}_${itemHistoryToDate}`;

        if (selectedFormat === 'csv') {
            const csv = XLSX.utils.sheet_to_csv(ws);
            downloadCSV(csv, `${filenameBase}.csv`);
        } else {
            XLSX.writeFile(wb, `${filenameBase}.xlsx`);
        }
    } catch (error) {
        console.error('Error exporting item history report:', error);
        alert('Failed to export item history report.');
    } finally {
        showLoading(false);
    }
}

// Toggle select all items for items list
function toggleSelectAllItemsList() {
    const selectAll = document.getElementById('selectAllItemsList');
    const checkboxes = document.querySelectorAll('.items-list-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
        const itemId = checkbox.dataset.itemId;
        const itemName = checkbox.dataset.itemName;
        
        if (selectAll.checked) {
            if (!selectedItemsList.find(i => i.itemId === itemId)) {
                selectedItemsList.push({ itemId: itemId, itemName: itemName });
            }
        } else {
            selectedItemsList = selectedItemsList.filter(i => i.itemId !== itemId);
        }
    });
    updateItemsListSelectedCount();
}

// Toggle individual item selection for items list
function toggleItemsListSelection(checkbox) {
    const itemId = checkbox.dataset.itemId;
    const itemName = checkbox.dataset.itemName;
    
    if (checkbox.checked) {
        selectedItemsList.push({ itemId: itemId, itemName: itemName });
    } else {
        selectedItemsList = selectedItemsList.filter(i => i.itemId !== itemId);
        const selectAll = document.getElementById('selectAllItemsList');
        if (selectAll) selectAll.checked = false;
    }
    updateItemsListSelectedCount();
}

// Update selected count display for items list
function updateItemsListSelectedCount() {
    const countEl = document.getElementById('selectedItemsListCount');
    if (countEl) { countEl.textContent = selectedItemsList.length; }
}

// Open Create Items List Report Modal
function openCreateItemsListReportModal() {
    if (selectedItemsList.length === 0) {
        alert('Please select at least one item to create the report');
        return;
    }
    
    const modal = document.getElementById('createItemsListReportModal');
    if (modal) {
        const itemsListContainer = document.getElementById('modalItemsListSelectedItemsList');
        const itemsCountLabel = document.getElementById('modalItemsListSelectedItemsCount');
        
        if (itemsCountLabel) {
            itemsCountLabel.textContent = selectedItemsList.length;
        }
        
        if (itemsListContainer) {
            if (selectedItemsList.length === 0) {
                itemsListContainer.innerHTML = '<p style="color: #666; margin: 0;">No items selected</p>';
            } else {
                let itemsHTML = '<ul style="margin: 0; padding-left: 20px; list-style-type: disc;">';
                selectedItemsList.forEach(item => {
                    const itemDetails = allItems.find(i => i.id === item.itemId);
                    const qty = itemDetails?.quantity || 0;
                    itemsHTML += `<li style="margin-bottom: 4px; color: #333;">${escapeHtml(item.itemName)} (Qty: ${qty})</li>`;
                });
                itemsHTML += '</ul>';
                itemsListContainer.innerHTML = itemsHTML;
            }
        }
        
        modal.style.display = 'flex';
    }
}

// Close Create Items List Report Modal
function closeCreateItemsListReportModal() {
    const modal = document.getElementById('createItemsListReportModal');
    if (modal) modal.style.display = 'none';
    
    const form = document.getElementById('createItemsListReportForm');
    if (form) form.reset();
}

// Handle Create Items List Report Form Submit
function handleCreateItemsListReportSubmit(e) {
    e.preventDefault();
    
    itemsListReportFormData = {
        reportDate: document.getElementById('itemsListReportDate')?.value,
        selectedMonth: document.getElementById('itemsListReportMonth')?.value || ''
    };
    
    closeCreateItemsListReportModal();
    generateItemsListReportWithFormData();
}

// Generate Items List Report with Form Data
async function generateItemsListReportWithFormData() {
    showLoading(true);
    try {
        const { default: TemplateManager } = await import('./templateManager.js');
        const activeTemplate = await TemplateManager.fetchTemplateByExportType('items_list');

        // Get the selected month from form data
        const currentYear = new Date().getFullYear();
        const selectedMonth = itemsListReportFormData?.selectedMonth || '';
        
        // Map selected items to enriched items with details
        let enrichedItems = selectedItemsList.map(selectedItem => {
            const itemDetails = allItems.find(item => item.id === selectedItem.itemId);
            return {
                name: selectedItem.itemName,
                label: itemDetails?.label || '-',
                quantity: itemDetails?.quantity || 0,
                unit: itemDetails?.unit || 'units',
                created_at: itemDetails?.created_at || new Date().toISOString()
            };
        });

        if (activeTemplate) {
            const filledWorkbook = await TemplateManager.fillTemplateWithData(
                activeTemplate, 
                enrichedItems, 
                10
            );

            if (filledWorkbook) {
                const sheetName = activeTemplate.template_data?.sheet_name || filledWorkbook.SheetNames[0];
                const worksheet = filledWorkbook.Sheets[sheetName];

                if (itemsListReportFormData?.reportDate) {
                    worksheet['C8'] = { v: new Date(itemsListReportFormData.reportDate).toLocaleDateString(), t: 's' };
                }
                
                // Add month label if selected
                if (selectedMonth) {
                    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                    worksheet['B5'] = { v: 'Month: ' + monthNames[parseInt(selectedMonth)] + ' ' + currentYear, t: 's' };
                }
                
                const filenameBase = `items_list_report_${new Date().toISOString().split('T')[0]}`;
                TemplateManager.writeFileWithStyles(filledWorkbook, `${filenameBase}.xlsx`);
                alert('Report generated successfully with form data included!');
                showLoading(false);
                return;
            }
        }

        // Calculate monthly quantity totals for all selected items
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const monthTotals = new Array(12).fill(0);
        
        // Calculate totals from all selected items
        selectedItemsList.forEach(selectedItem => {
            const itemDetails = allItems.find(item => item.id === selectedItem.itemId);
            if (itemDetails?.created_at) {
                const itemDate = new Date(itemDetails.created_at);
                if (itemDate.getFullYear() === currentYear) {
                    monthTotals[itemDate.getMonth()] += itemDetails.quantity || 0;
                }
            }
        });

        // Build export data with items
        const exportData = enrichedItems.map(item => ({
            'Item Name': item.name,
            'Category': item.label,
            'Quantity': item.quantity,
            'Unit': item.unit,
            'Date Added': new Date(item.created_at).toLocaleString(),
            'Report Date': itemsListReportFormData?.reportDate || ''
        }));
        
        // Add monthly summary section
        if (selectedMonth) {
            const monthIndex = parseInt(selectedMonth) - 1;
            exportData.push({ 'Item Name': '', 'Category': '', 'Quantity': '', 'Unit': '', 'Date Added': '', 'Report Date': '' });
            exportData.push({ 'Item Name': 'MONTHLY TOTAL (' + months[monthIndex] + ')', 'Category': '', 'Quantity': monthTotals[monthIndex], 'Unit': '', 'Date Added': '', 'Report Date': '' });
        } else {
            exportData.push({ 'Item Name': '', 'Category': '', 'Quantity': '', 'Unit': '', 'Date Added': '', 'Report Date': '' });
            exportData.push({ 'Item Name': 'MONTHLY SUMMARY (' + currentYear + ')', 'Category': '', 'Quantity': '', 'Unit': '', 'Date Added': '', 'Report Date': '' });
            months.forEach((month, index) => {
                if (monthTotals[index] > 0) {
                    exportData.push({ 'Item Name': month, 'Category': '', 'Quantity': monthTotals[index], 'Unit': '', 'Date Added': '', 'Report Date': '' });
                }
            });
            const grandTotal = monthTotals.reduce((sum, qty) => sum + qty, 0);
            exportData.push({ 'Item Name': 'GRAND TOTAL', 'Category': '', 'Quantity': grandTotal, 'Unit': '', 'Date Added': '', 'Report Date': '' });
        }
        
        const filenameBase = `items_list_report_${new Date().toISOString().split('T')[0]}`;
        
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Items');
        XLSX.writeFile(wb, `${filenameBase}.xlsx`);
        
        alert('Report generated successfully!');
    } catch (error) {
        console.error('Error generating items list report:', error);
        alert('Failed to generate report');
    } finally {
        showLoading(false);
    }
}

// ==========================================
// ROOMS REPORT WITH IMPORT FUNCTIONALITY
// ==========================================

// Display Rooms Report - with Import functionality
async function displayRoomsReportWithImport() {
    showLoading(true);
    hideError();
    hideEmpty();
    
    try {
        if (allRooms.length === 0) {
            await fetchRooms();
        }
        if (allRoomItems.length === 0) {
            await fetchRoomItems();
        }
        
        // Filter rooms based on search query
        let filteredRooms = allRooms;
        if (roomsSearchQuery) {
            const query = roomsSearchQuery.toLowerCase();
            filteredRooms = allRooms.filter(room => 
                room.name.toLowerCase().includes(query) || 
                (room.description && room.description.toLowerCase().includes(query))
            );
        }
        
        let reportHTML = `
            <div class="report-card">
                <div class="report-header">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <button class="btn btn-ghost" onclick="window.showReportSelection()" title="Back to Reports" style="padding: 8px 12px;">
                            <i class="fa-solid fa-arrow-left"></i>
                        </button>
                        <h2><i class="fa-solid fa-door-open"></i> Classroom Inventory</h2>
                    </div>
                    <button class="btn btn-primary" onclick="window.openCreateRoomsReportModal()" id="createRoomsReportBtn">
                        <i class="fa-solid fa-file-signature"></i> Create This Report
                    </button>
                </div>
                <div class="report-info">
                    <p><i class="fa-solid fa-info-circle"></i> Search and select rooms from the inventory below to include in this report.</p>
                </div>
                
                <!-- Search Bar -->
                <div class="search-container" style="margin-bottom: 20px;">
                    <input type="text" id="roomsSearchInput" placeholder="Search rooms..." value="${roomsSearchQuery}" 
                        oninput="window.updateRoomsSearchInput(this.value)"
                        style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                </div>
                
                <div class="report-stats">
                    <div class="stat-box">
                        <span class="stat-number" id="selectedRoomsCount">${selectedRooms.length}</span>
                        <span class="stat-label">Selected Rooms</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${filteredRooms.length}</span>
                        <span class="stat-label">Showing Rooms</span>
                    </div>
                </div>
                <div class="report-table-container">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th style="width: 40px;"><input type="checkbox" id="selectAllRooms" onchange="window.toggleSelectAllRooms()"></th>
                                <th>Room Name</th>
                                <th>Description</th>
                                <th>Items Count</th>
                                <th>Total Quantity</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        if (allRooms.length === 0) {
            reportHTML += `<tr><td colspan="5" style="text-align: center;">No rooms found</td></tr>`;
        } else {
            allRooms.forEach(room => {
                const roomItems = allRoomItems.filter(item => item.room_id === room.id);
                const totalQuantity = roomItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
                const isSelected = selectedRooms.find(r => r.roomId === room.id);
                
                reportHTML += `
                    <tr>
                        <td><input type="checkbox" class="room-checkbox" data-room-id="${room.id}" data-room-name="${escapeHtml(room.name)}" ${isSelected ? 'checked' : ''} onchange="window.toggleRoomSelection(this)"></td>
                        <td>${escapeHtml(room.name)}</td>
                        <td>${escapeHtml(room.description || '-')}</td>
                        <td>${roomItems.length}</td>
                        <td>${totalQuantity}</td>
                    </tr>
                `;
            });
        }
        
        reportHTML += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        reportContainer.innerHTML = reportHTML;
        
    } catch (error) {
        console.error('Error displaying rooms report with import:', error);
        showError('Failed to load rooms report');
    } finally {
        showLoading(false);
    }
}

// Toggle select all rooms
function toggleSelectAllRooms() {
    const selectAll = document.getElementById('selectAllRooms');
    const checkboxes = document.querySelectorAll('.room-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
        const roomId = checkbox.dataset.roomId;
        const roomName = checkbox.dataset.roomName;
        
        if (selectAll.checked) {
            if (!selectedRooms.find(r => r.roomId === roomId)) {
                selectedRooms.push({ roomId: roomId, roomName: roomName });
            }
        } else {
            selectedRooms = selectedRooms.filter(r => r.roomId !== roomId);
        }
    });
    updateRoomsSelectedCount();
}

// Toggle individual room selection
function toggleRoomSelection(checkbox) {
    const roomId = checkbox.dataset.roomId;
    const roomName = checkbox.dataset.roomName;
    
    if (checkbox.checked) {
        selectedRooms.push({ roomId: roomId, roomName: roomName });
    } else {
        selectedRooms = selectedRooms.filter(r => r.roomId !== roomId);
        const selectAll = document.getElementById('selectAllRooms');
        if (selectAll) selectAll.checked = false;
    }
    updateRoomsSelectedCount();
}

// Update selected count display for rooms
function updateRoomsSelectedCount() {
    const countEl = document.getElementById('selectedRoomsCount');
    if (countEl) { countEl.textContent = selectedRooms.length; }
}

// Update search query for rooms input and re-render
function updateRoomsSearchInput(query) {
    roomsSearchQuery = query;
    displayRoomsReportWithImport();
}

// Open Create Rooms Report Modal
async function openCreateRoomsReportModal() {
    if (selectedRooms.length === 0) {
        alert('Please select at least one room to create the report');
        return;
    }
    
    const modal = document.getElementById('createRoomsReportModal');
    if (modal) {
        const roomsListContainer = document.getElementById('modalRoomsSelectedList');
        const roomsCountLabel = document.getElementById('modalRoomsSelectedCount');
        
        if (roomsCountLabel) {
            roomsCountLabel.textContent = selectedRooms.length;
        }
        
        if (roomsListContainer) {
            if (selectedRooms.length === 0) {
                roomsListContainer.innerHTML = '<p style="color: #666; margin: 0;">No rooms selected</p>';
            } else {
                let roomsHTML = '';
                selectedRooms.forEach(room => {
                    roomsHTML += `<span style="display: inline-block; background: #fff; padding: 4px 12px; border-radius: 20px; margin: 2px; font-size: 13px; border: 1px solid #ddd;">${escapeHtml(room.roomName)}</span>`;
                });
                roomsListContainer.innerHTML = roomsHTML;
            }
        }
        
        // Populate editable items table (now async)
        await populateEditableRoomItems();
        
        modal.style.display = 'flex';
    }
}

// Populate editable room items in the modal
async function populateEditableRoomItems() {
    const itemsListContainer = document.getElementById('modalRoomsItemsList');
    if (!itemsListContainer) return;
    
    // Ensure we have the latest data
    if (allItems.length === 0) {
        await fetchItems();
    }
    if (allRoomItems.length === 0) {
        await fetchRoomItems();
    }
    
    // Build list of editable items from selected rooms
    editableRoomItems = [];
    selectedRooms.forEach(selectedRoom => {
        const roomItems = allRoomItems.filter(ri => ri.room_id === selectedRoom.roomId);
        roomItems.forEach(roomItem => {
            // Use item_name from room_items table (stored directly), fallback to allItems lookup
            const itemName = roomItem.item_name || 
                           allItems.find(item => item.id === roomItem.item_id)?.name || 
                           'Unknown Item';
            
            editableRoomItems.push({
                id: roomItem.id,
                room_id: roomItem.room_id,
                roomName: selectedRoom.roomName,
                item_id: roomItem.item_id,
                name: itemName,
                description: roomItem.description || '',
                quantity: roomItem.quantity || 0,
                unit: roomItem.units || roomItem.unit || 'pcs',
                condition: roomItem.condition || 'Good',
                remarks: roomItem.remarks || '',
                created_at: roomItem.created_at
            });
        });
    });
    
    // Render the table
    if (editableRoomItems.length === 0) {
        itemsListContainer.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #666;">No items in selected rooms</td></tr>';
    } else {
        let rowsHTML = '';
        editableRoomItems.forEach((item, index) => {
            rowsHTML += `
                <tr>
                    <td>${escapeHtml(item.roomName)}</td>
                    <td><input type="text" class="room-item-name" data-index="${index}" value="${escapeHtml(item.name)}" style="width: 100%; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;"></td>
                    <td><input type="text" class="room-item-description" data-index="${index}" value="${escapeHtml(item.description || '')}" style="width: 100%; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;"></td>
                    <td><input type="number" class="room-item-quantity" data-index="${index}" value="${item.quantity}" min="0" style="width: 80px; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;"></td>
                    <td><input type="text" class="room-item-unit" data-index="${index}" value="${escapeHtml(item.unit)}" style="width: 80px; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;"></td>
                    <td><select class="room-item-condition" data-index="${index}" style="width: 100px; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
                        <option value="New" ${item.condition === 'New' ? 'selected' : ''}>New</option>
                        <option value="Good" ${item.condition === 'Good' ? 'selected' : ''}>Good</option>
                        <option value="Fair" ${item.condition === 'Fair' ? 'selected' : ''}>Fair</option>
                        <option value="Poor" ${item.condition === 'Poor' ? 'selected' : ''}>Poor</option>
                        <option value="Damaged" ${item.condition === 'Damaged' ? 'selected' : ''}>Damaged</option>
                    </select></td>
                    <td><input type="text" class="room-item-remarks" data-index="${index}" value="${escapeHtml(item.remarks || '')}" style="width: 120px; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;"></td>
                </tr>
            `;
        });
        itemsListContainer.innerHTML = rowsHTML;
    }
}

// Close Create Rooms Report Modal
function closeCreateRoomsReportModal() {
    const modal = document.getElementById('createRoomsReportModal');
    if (modal) modal.style.display = 'none';
    
    const form = document.getElementById('createRoomsReportForm');
    if (form) form.reset();
}

// Handle Create Rooms Report Form Submit
function handleCreateRoomsReportSubmit(e) {
    e.preventDefault();
    
    // Collect edited data from the modal inputs
    const nameInputs = document.querySelectorAll('.room-item-name');
    const descriptionInputs = document.querySelectorAll('.room-item-description');
    const quantityInputs = document.querySelectorAll('.room-item-quantity');
    const unitInputs = document.querySelectorAll('.room-item-unit');
    const conditionInputs = document.querySelectorAll('.room-item-condition');
    const remarksInputs = document.querySelectorAll('.room-item-remarks');
    
    // Update editableRoomItems with edited values
    nameInputs.forEach(input => {
        const index = parseInt(input.dataset.index);
        if (editableRoomItems[index]) {
            editableRoomItems[index].name = input.value;
        }
    });
    
    descriptionInputs.forEach(input => {
        const index = parseInt(input.dataset.index);
        if (editableRoomItems[index]) {
            editableRoomItems[index].description = input.value;
        }
    });
    
    quantityInputs.forEach(input => {
        const index = parseInt(input.dataset.index);
        if (editableRoomItems[index]) {
            editableRoomItems[index].quantity = parseInt(input.value) || 0;
        }
    });
    
    unitInputs.forEach(input => {
        const index = parseInt(input.dataset.index);
        if (editableRoomItems[index]) {
            editableRoomItems[index].unit = input.value;
        }
    });
    
    conditionInputs.forEach(input => {
        const index = parseInt(input.dataset.index);
        if (editableRoomItems[index]) {
            editableRoomItems[index].condition = input.value;
        }
    });
    
    remarksInputs.forEach(input => {
        const index = parseInt(input.dataset.index);
        if (editableRoomItems[index]) {
            editableRoomItems[index].remarks = input.value;
        }
    });
    
    closeCreateRoomsReportModal();
    generateRoomsReportWithFormData();
}

// Generate Rooms Report with Form Data
async function generateRoomsReportWithFormData() {
    showLoading(true);
    try {
        const { default: TemplateManager } = await import('./templateManager.js');
        // First try to find template by name "CLASSROOM INVENTORY"
        let activeTemplate = await TemplateManager.fetchTemplateByName('CLASSROOM INVENTORY');
        
        // If not found by name, fall back to export type search
        if (!activeTemplate) {
            console.log('No template named "CLASSROOM INVENTORY" found, trying export type...');
            activeTemplate = await TemplateManager.fetchTemplateByExportType('rooms');
        }

        // Use the edited items from the modal (editableRoomItems is already updated in handleCreateRoomsReportSubmit)
        const enrichedRoomItems = editableRoomItems.map(item => ({
            name: item.name,
            description: item.description || '',
            room_name: item.roomName,
            quantity: item.quantity,
            unit: item.unit || 'pcs',
            condition: item.condition || 'Good',
            remarks: item.remarks || '',
            created_at: item.created_at || new Date().toISOString()
        }));

        if (activeTemplate) {
            const filledWorkbook = await TemplateManager.fillTemplateWithData(
                activeTemplate, 
                enrichedRoomItems, 
                10
            );

            if (filledWorkbook) {
                const sheetName = activeTemplate.template_data?.sheet_name || filledWorkbook.SheetNames[0];
                const worksheet = filledWorkbook.Sheets[sheetName];
                
                if (roomsReportFormData) {
                    if (roomsReportFormData.reportDate) {
                        worksheet['C8'] = { v: new Date(roomsReportFormData.reportDate).toLocaleDateString(), t: 's' };
                    }
                    if (roomsReportFormData.preparedBy) {
                        worksheet['B35'] = { v: roomsReportFormData.preparedBy, t: 's' };
                    }
                    if (roomsReportFormData.department) {
                        worksheet['F35'] = { v: roomsReportFormData.department, t: 's' };
                    }
                    if (roomsReportFormData.notes) {
                        worksheet['B30'] = { v: roomsReportFormData.notes, t: 's' };
                    }
                }
                
                const filenameBase = `rooms_inventory_report_${new Date().toISOString().split('T')[0]}`;
                TemplateManager.writeFileWithStyles(filledWorkbook, `${filenameBase}.xlsx`);
                alert('Report generated successfully with form data included!');
                showLoading(false);
                return;
            }
        }

        // Fallback to default export – use shared helper so the layout matches rooms.html
        const workbook = buildRoomWorkbook(enrichedRoomItems, 'Rooms Report');

        // optionally add report-specific metadata cells (these were earlier
        // written directly to the sheet in the template branch); we can
        // re‑apply them if present in roomsReportFormData
        if (!roomsReportFormData) {
            roomsReportFormData = {};
        }
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        if (roomsReportFormData.reportDate) {
            worksheet['C8'] = { v: new Date(roomsReportFormData.reportDate).toLocaleDateString(), t: 's' };
        }
        if (roomsReportFormData.preparedBy) {
            worksheet['B35'] = { v: roomsReportFormData.preparedBy, t: 's' };
        }
        if (roomsReportFormData.department) {
            worksheet['F35'] = { v: roomsReportFormData.department, t: 's' };
        }
        if (roomsReportFormData.notes) {
            worksheet['B30'] = { v: roomsReportFormData.notes, t: 's' };
        }

        // Write workbook using helper; helper appends current date automatically
        writeWorkbook(workbook, 'rooms_inventory_report');

        alert('Report generated successfully!');
    } catch (error) {
        console.error('Error generating rooms report:', error);
        alert('Failed to generate report');
    } finally {
        showLoading(false);
    }
}

// ==========================================
// LOGS REPORT WITH IMPORT FUNCTIONALITY
// ==========================================

// Display Logs Report - with Import functionality
async function displayLogsReportWithImport() {
    showLoading(true);
    hideError();
    hideEmpty();
    
    try {
        if (allActivityLogs.length === 0) {
            await fetchActivityLogs();
        }
        
        // Apply filters
        let filteredLogs = [...allActivityLogs];
        
        // Date filter
        if (logsDateFrom) {
            filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= new Date(logsDateFrom));
        }
        if (logsDateTo) {
            filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= new Date(logsDateTo + 'T23:59:59'));
        }
        
        // Action filter
        if (logsActionFilter !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.action_type === logsActionFilter);
        }
        
        // Search filter
        if (logsSearchQuery) {
            const query = logsSearchQuery.toLowerCase();
            filteredLogs = filteredLogs.filter(log => 
                (log.item_name && log.item_name.toLowerCase().includes(query)) ||
                (log.person && log.person.toLowerCase().includes(query)) ||
                (log.action_type && log.action_type.toLowerCase().includes(query))
            );
        }
        
        // Get unique action types for filter dropdown
        const actionTypes = [...new Set(allActivityLogs.map(log => log.action_type))];
        
        let reportHTML = `
            <div class="report-card">
                <div class="report-header">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <button class="btn btn-ghost" onclick="window.showReportSelection()" title="Back to Reports" style="padding: 8px 12px;">
                            <i class="fa-solid fa-arrow-left"></i>
                        </button>
                        <h2><i class="fa-solid fa-clock-rotate-left"></i> Activity Logs</h2>
                    </div>
                    <button class="btn btn-primary" onclick="window.openCreateLogsReportModal()" id="createLogsReportBtn">
                        <i class="fa-solid fa-file-signature"></i> Create This Report
                    </button>
                </div>
                <div class="report-info">
                    <p><i class="fa-solid fa-info-circle"></i> Search and select log entries from the list below to include in this report.</p>
                </div>
                
                <!-- Filters Section -->
                <div style="padding: 20px 24px 0 24px;">
                    <div class="logs-filters" style="display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end;">
                        <div class="filter-group" style="flex: 1; min-width: 150px;">
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase;">Date From</label>
                            <input type="date" id="logsDateFrom" value="${logsDateFrom}" onchange="window.updateLogsFilters()" style="width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
                        </div>
                        <div class="filter-group" style="flex: 1; min-width: 150px;">
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase;">Date To</label>
                            <input type="date" id="logsDateTo" value="${logsDateTo}" onchange="window.updateLogsFilters()" style="width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
                        </div>
                        <div class="filter-group" style="flex: 1; min-width: 150px;">
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase;">Action Type</label>
                            <select id="logsActionFilter" onchange="window.updateLogsFilters()" style="width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; background: white;">
                                <option value="all">All Actions</option>
                                ${actionTypes.map(type => `<option value="${type}" ${logsActionFilter === type ? 'selected' : ''}>${type}</option>`).join('')}
                            </select>
                        </div>
                        <div class="filter-group" style="flex: 2; min-width: 200px;">
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase;">Search</label>
                            <input type="text" id="logsSearchQuery" placeholder="Search logs... (Press Enter)" value="${logsSearchQuery}" onkeyup="if(event.key === 'Enter') window.updateLogsFilters()" style="width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
                        </div>
                    </div>
                </div>
                
                <div class="report-stats">
                    <div class="stat-box">
                        <span class="stat-number" id="selectedLogsCount">${selectedLogs.length}</span>
                        <span class="stat-label">Selected Logs</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${filteredLogs.length}</span>
                        <span class="stat-label">Showing Logs</span>
                    </div>
                </div>
                
                <div class="report-table-container">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th style="width: 40px;"><input type="checkbox" id="selectAllLogs" onchange="window.toggleSelectAllLogs()"></th>
                                <th>Timestamp</th>
                                <th>Action</th>
                                <th>Item Name</th>
                                <th>Quantity Changed</th>
                                <th>Person</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        if (filteredLogs.length === 0) {
            reportHTML += `<tr><td colspan="6" style="text-align: center;">No logs found</td></tr>`;
        } else {
            filteredLogs.forEach(log => {
                const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleString() : '-';
                const quantityClass = log.quantity_changed > 0 ? 'positive' : (log.quantity_changed < 0 ? 'negative' : '');
                const quantityDisplay = log.quantity_changed > 0 ? `+${log.quantity_changed}` : log.quantity_changed;
                const isSelected = selectedLogs.find(l => l.logId === log.id);
                
                reportHTML += `
                    <tr>
                        <td><input type="checkbox" class="log-checkbox" data-log-id="${log.id}" data-log-timestamp="${escapeHtml(timestamp)}" data-log-action="${escapeHtml(log.action_type)}" data-log-item="${escapeHtml(log.item_name || '-')}" ${isSelected ? 'checked' : ''} onchange="window.toggleLogSelection(this)"></td>
                        <td>${timestamp}</td>
                        <td><span class="action-badge action-${log.action_type.toLowerCase()}">${log.action_type}</span></td>
                        <td>${escapeHtml(log.item_name || '-')}</td>
                        <td class="${quantityClass}">${quantityDisplay}</td>
                        <td>${escapeHtml(log.person || '-')}</td>
                    </tr>
                `;
            });
        }
        
        reportHTML += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        reportContainer.innerHTML = reportHTML;
        
    } catch (error) {
        console.error('Error displaying logs report with import:', error);
        showError('Failed to load logs report');
    } finally {
        showLoading(false);
    }
}

// Toggle select all logs
function toggleSelectAllLogs() {
    const selectAll = document.getElementById('selectAllLogs');
    const checkboxes = document.querySelectorAll('.log-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
        const logId = checkbox.dataset.logId;
        const logTimestamp = checkbox.dataset.logTimestamp;
        const logAction = checkbox.dataset.logAction;
        const logItem = checkbox.dataset.logItem;
        
        if (selectAll.checked) {
            if (!selectedLogs.find(l => l.logId === logId)) {
                selectedLogs.push({ logId: logId, timestamp: logTimestamp, action: logAction, item: logItem });
            }
        } else {
            selectedLogs = selectedLogs.filter(l => l.logId !== logId);
        }
    });
    updateLogsSelectedCount();
}

// Toggle individual log selection
function toggleLogSelection(checkbox) {
    const logId = checkbox.dataset.logId;
    const logTimestamp = checkbox.dataset.logTimestamp;
    const logAction = checkbox.dataset.logAction;
    const logItem = checkbox.dataset.logItem;
    
    if (checkbox.checked) {
        selectedLogs.push({ logId: logId, timestamp: logTimestamp, action: logAction, item: logItem });
    } else {
        selectedLogs = selectedLogs.filter(l => l.logId !== logId);
        const selectAll = document.getElementById('selectAllLogs');
        if (selectAll) selectAll.checked = false;
    }
    updateLogsSelectedCount();
}

// Update selected count display for logs
function updateLogsSelectedCount() {
    const countEl = document.getElementById('selectedLogsCount');
    if (countEl) { countEl.textContent = selectedLogs.length; }
}

// Open Create Logs Report Modal
function openCreateLogsReportModal() {
    if (selectedLogs.length === 0) {
        alert('Please select at least one log entry to create the report');
        return;
    }
    
    const modal = document.getElementById('createLogsReportModal');
    if (modal) {
        const logsListContainer = document.getElementById('modalLogsSelectedList');
        const logsCountLabel = document.getElementById('modalLogsSelectedCount');
        
        if (logsCountLabel) {
            logsCountLabel.textContent = selectedLogs.length;
        }
        
        if (logsListContainer) {
            if (selectedLogs.length === 0) {
                logsListContainer.innerHTML = '<p style="color: #666; margin: 0;">No logs selected</p>';
            } else {
                let logsHTML = '<ul style="margin: 0; padding-left: 20px; list-style-type: disc;">';
                selectedLogs.forEach(log => {
                    logsHTML += `<li style="margin-bottom: 4px; color: #333;">${escapeHtml(log.timestamp)} - ${escapeHtml(log.action)} - ${escapeHtml(log.item)}</li>`;
                });
                logsHTML += '</ul>';
                logsListContainer.innerHTML = logsHTML;
            }
        }
        
        modal.style.display = 'flex';
    }
}

// Close Create Logs Report Modal
function closeCreateLogsReportModal() {
    const modal = document.getElementById('createLogsReportModal');
    if (modal) modal.style.display = 'none';
    
    const form = document.getElementById('createLogsReportForm');
    if (form) form.reset();
}

// Handle Create Logs Report Form Submit
function handleCreateLogsReportSubmit(e) {
    e.preventDefault();
    
    logsReportFormData = {
        reportDate: document.getElementById('logsReportDate')?.value,
        preparedBy: document.getElementById('logsPreparedBy')?.value,
        department: document.getElementById('logsDepartment')?.value,
        notes: document.getElementById('logsNotes')?.value
    };
    
    closeCreateLogsReportModal();
    generateLogsReportWithFormData();
}

// Generate Logs Report with Form Data
async function generateLogsReportWithFormData() {
    showLoading(true);
    try {
        const { default: TemplateManager } = await import('./templateManager.js');
        const activeTemplate = await TemplateManager.fetchTemplateByExportType('logs');

        // Get full log details for selected logs
        const enrichedLogs = selectedLogs.map(selectedLog => {
            const logDetails = allActivityLogs.find(log => log.id === selectedLog.logId);
            return {
                timestamp: logDetails?.timestamp || new Date().toISOString(),
                action_type: logDetails?.action_type || '-',
                item_name: logDetails?.item_name || '-',
                quantity_changed: logDetails?.quantity_changed || 0,
                person: logDetails?.person || '-',
                details: logDetails?.details || {}
            };
        });

        if (activeTemplate) {
            const filledWorkbook = await TemplateManager.fillTemplateWithData(
                activeTemplate, 
                enrichedLogs, 
                10
            );

            if (filledWorkbook) {
                const sheetName = activeTemplate.template_data?.sheet_name || filledWorkbook.SheetNames[0];
                const worksheet = filledWorkbook.Sheets[sheetName];
                
                if (logsReportFormData) {
                    if (logsReportFormData.reportDate) {
                        worksheet['C8'] = { v: new Date(logsReportFormData.reportDate).toLocaleDateString(), t: 's' };
                    }
                    if (logsReportFormData.preparedBy) {
                        worksheet['B35'] = { v: logsReportFormData.preparedBy, t: 's' };
                    }
                    if (logsReportFormData.department) {
                        worksheet['F35'] = { v: logsReportFormData.department, t: 's' };
                    }
                    if (logsReportFormData.notes) {
                        worksheet['B30'] = { v: logsReportFormData.notes, t: 's' };
                    }
                }
                
                const filenameBase = `activity_logs_report_${new Date().toISOString().split('T')[0]}`;
                TemplateManager.writeFileWithStyles(filledWorkbook, `${filenameBase}.xlsx`);
                alert('Report generated successfully with form data included!');
                showLoading(false);
                return;
            }
        }

        // Fallback to default export
        const exportData = enrichedLogs.map(log => ({
            'Timestamp': new Date(log.timestamp).toLocaleString(),
            'Action Type': log.action_type,
            'Item Name': log.item_name,
            'Quantity Changed': log.quantity_changed,
            'Person': log.person,
            'Category': log.details?.category || log.details?.label || '-',
            'Report Date': logsReportFormData?.reportDate || '',
            'Prepared By': logsReportFormData?.preparedBy || '',
            'Department': logsReportFormData?.department || '',
            'Notes': logsReportFormData?.notes || ''
        }));
        
        const filenameBase = `activity_logs_report_${new Date().toISOString().split('T')[0]}`;
        
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Logs');
        XLSX.writeFile(wb, `${filenameBase}.xlsx`);
        
        alert('Report generated successfully!');
    } catch (error) {
        console.error('Error generating logs report:', error);
        alert('Failed to generate report');
    } finally {
        showLoading(false);
    }
}

// ==========================================
// EQUIPMENT REPORT WITH IMPORT FUNCTIONALITY
// ==========================================

// Display Equipment Report - with Import functionality
async function displayEquipmentReportWithImport() {
    showLoading(true);
    hideError();
    hideEmpty();
    
    try {
        if (allEquipment.length === 0) {
            await fetchEquipment();
        }
        
        // Filter equipment based on search query and date range
        let filteredEquipment = allEquipment;
        
        // Search filter
        if (equipmentSearchQuery) {
            const query = equipmentSearchQuery.toLowerCase();
            filteredEquipment = filteredEquipment.filter(item => 
                item.item_name.toLowerCase().includes(query) || 
                (item.item_description && item.item_description.toLowerCase().includes(query))
            );
        }
        
        // Consumable filter
        if (equipmentConsumableFilter === 'consumable') {
            filteredEquipment = filteredEquipment.filter(item => item.is_consumable === true);
        } else if (equipmentConsumableFilter === 'non_consumable') {
            filteredEquipment = filteredEquipment.filter(item => item.is_consumable !== true);
        }
        
        // Date range filter
        if (equipmentDateFrom) {
            filteredEquipment = filteredEquipment.filter(item => {
                if (!item.created_at) return false;
                return new Date(item.created_at) >= new Date(equipmentDateFrom);
            });
        }
        if (equipmentDateTo) {
            filteredEquipment = filteredEquipment.filter(item => {
                if (!item.created_at) return false;
                return new Date(item.created_at) <= new Date(equipmentDateTo + 'T23:59:59');
            });
        }
        
        let reportHTML = `
            <div class="report-card">
                <div class="report-header">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <button class="btn btn-ghost" onclick="window.showReportSelection()" title="Back to Reports" style="padding: 8px 12px;">
                            <i class="fa-solid fa-arrow-left"></i>
                        </button>
                        <h2><i class="fa-solid fa-tools"></i> Equipment Inventory</h2>
                    </div>
                    <button class="btn btn-primary" onclick="window.openCreateEquipmentReportModal()" id="createEquipmentReportBtn">
                        <i class="fa-solid fa-file-signature"></i> Create This Report
                    </button>
                </div>
                <div class="report-info">
                    <p><i class="fa-solid fa-info-circle"></i> Search and select equipment from the inventory below to include in this report.</p>
                </div>
                
                <!-- Filters Section -->
                <div style="padding: 0 0 20px 0;">
                    <div class="equipment-filters" style="display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end;">
                        <div class="filter-group" style="flex: 2; min-width: 200px;">
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase;">Search</label>
                            <input type="text" id="equipmentSearchInput" placeholder="Search equipment..." value="${equipmentSearchQuery}" 
                                oninput="window.updateEquipmentSearchInput(this.value)"
                                style="width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
                        </div>
                        <div class="filter-group" style="flex: 1; min-width: 150px;">
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase;">Type</label>
                            <select id="equipmentConsumableFilter" onchange="window.updateEquipmentFilters()" style="width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; background: white;">
                                <option value="">All Equipment</option>
                                <option value="consumable" ${equipmentConsumableFilter === 'consumable' ? 'selected' : ''}>Consumable</option>
                                <option value="non_consumable" ${equipmentConsumableFilter === 'non_consumable' ? 'selected' : ''}>Non-Consumable</option>
                            </select>
                        </div>
                        <div class="filter-group" style="flex: 1; min-width: 150px;">
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase;">Date From</label>
                            <input type="date" id="equipmentDateFrom" value="${equipmentDateFrom}" onchange="window.updateEquipmentFilters()" style="width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
                        </div>
                        <div class="filter-group" style="flex: 1; min-width: 150px;">
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase;">Date To</label>
                            <input type="date" id="equipmentDateTo" value="${equipmentDateTo}" onchange="window.updateEquipmentFilters()" style="width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
                        </div>
                    </div>
                </div>
                
                <div class="report-stats">
                    <div class="stat-box">
                        <span class="stat-number" id="selectedEquipmentCount">${selectedEquipment.length}</span>
                        <span class="stat-label">Selected Equipment</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${filteredEquipment.length}</span>
                        <span class="stat-label">Showing Equipment</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number" id="selectedEquipmentQuantity">${selectedEquipment.reduce((sum, item) => {
                            const equipment = allEquipment.find(e => e.id === item.equipmentId);
                            return sum + (equipment?.quantity || 0);
                        }, 0)}</span>
                        <span class="stat-label">Selected Quantity</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number" id="selectedEquipmentAmount">₱${parseInt(selectedEquipment.reduce((sum, item) => {
                            const equipment = allEquipment.find(e => e.id === item.equipmentId);
                            return sum + (equipment?.amount || 0);
                        }, 0))}</span>
                        <span class="stat-label">Selected Amount</span>
                    </div>
                </div>
                <div class="report-table-container">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th style="width: 40px;"><input type="checkbox" id="selectAllEquipment" onchange="window.toggleSelectAllEquipment()"></th>
                                <th>Item Name</th>
                                <th>Description</th>
                                <th>Quantity</th>
                                <th>Unit Cost</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        if (filteredEquipment.length === 0) {
            reportHTML += `<tr><td colspan="6" style="text-align: center;">No equipment found</td></tr>`;
        } else {
            filteredEquipment.forEach(item => {
                const isSelected = selectedEquipment.find(e => e.equipmentId === item.id);
                const unitCost = item.unit_cost ? `₱${parseInt(item.unit_cost)}` : '-';
                const amount = item.amount ? `₱${parseInt(item.amount)}` : '-';
                
                reportHTML += `
                    <tr>
                        <td><input type="checkbox" class="equipment-checkbox" data-equipment-id="${item.id}" data-equipment-name="${escapeHtml(item.item_name)}" data-equipment-qty="${item.quantity}" ${isSelected ? 'checked' : ''} onchange="window.toggleEquipmentSelection(this)"></td>
                        <td>${escapeHtml(item.item_name)}</td>
                        <td>${escapeHtml(item.item_description || '-')}</td>
                        <td>${item.quantity}</td>
                        <td>${unitCost}</td>
                        <td>${amount}</td>
                    </tr>
                `;
            });
        }
        
        reportHTML += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        reportContainer.innerHTML = reportHTML;
        
    } catch (error) {
        console.error('Error displaying equipment report with import:', error);
        showError('Failed to load equipment report');
    } finally {
        showLoading(false);
    }
}

// Toggle select all equipment
function toggleSelectAllEquipment() {
    const selectAll = document.getElementById('selectAllEquipment');
    const checkboxes = document.querySelectorAll('.equipment-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
        const equipmentId = checkbox.dataset.equipmentId;
        const equipmentName = checkbox.dataset.equipmentName;
        const equipmentQty = checkbox.dataset.equipmentQty;
        
        if (selectAll.checked) {
            if (!selectedEquipment.find(e => e.equipmentId === equipmentId)) {
                selectedEquipment.push({ equipmentId: equipmentId, equipmentName: equipmentName, quantity: equipmentQty });
            }
        } else {
            selectedEquipment = selectedEquipment.filter(e => e.equipmentId !== equipmentId);
        }
    });
    updateEquipmentSelectedCount();
}

// Toggle individual equipment selection
function toggleEquipmentSelection(checkbox) {
    const equipmentId = checkbox.dataset.equipmentId;
    const equipmentName = checkbox.dataset.equipmentName;
    const equipmentQty = checkbox.dataset.equipmentQty;
    
    if (checkbox.checked) {
        selectedEquipment.push({ equipmentId: equipmentId, equipmentName: equipmentName, quantity: equipmentQty });
    } else {
        selectedEquipment = selectedEquipment.filter(e => e.equipmentId !== equipmentId);
        const selectAll = document.getElementById('selectAllEquipment');
        if (selectAll) selectAll.checked = false;
    }
    updateEquipmentSelectedCount();
}

// Update selected count display for equipment
function updateEquipmentSelectedCount() {
    const countEl = document.getElementById('selectedEquipmentCount');
    if (countEl) { countEl.textContent = selectedEquipment.length; }
    
    // Update selected quantity
    const qtyEl = document.getElementById('selectedEquipmentQuantity');
    if (qtyEl) {
        const totalQty = selectedEquipment.reduce((sum, item) => {
            const equipment = allEquipment.find(e => e.id === item.equipmentId);
            return sum + (equipment?.quantity || 0);
        }, 0);
        qtyEl.textContent = totalQty;
    }
    
    // Update selected amount
    const amountEl = document.getElementById('selectedEquipmentAmount');
    if (amountEl) {
        const totalAmount = selectedEquipment.reduce((sum, item) => {
            const equipment = allEquipment.find(e => e.id === item.equipmentId);
            return sum + (equipment?.amount || 0);
        }, 0);
        amountEl.textContent = `₱${parseInt(totalAmount)}`;
    }
}

// Update search query for equipment input and re-render
function updateEquipmentSearchInput(query) {
    equipmentSearchQuery = query;
    displayEquipmentReportWithImport();
}

// Update equipment filters (search + date range + consumable)
function updateEquipmentFilters() {
    equipmentDateFrom = document.getElementById('equipmentDateFrom')?.value || '';
    equipmentDateTo = document.getElementById('equipmentDateTo')?.value || '';
    equipmentConsumableFilter = document.getElementById('equipmentConsumableFilter')?.value || '';
    displayEquipmentReportWithImport();
}

// Open Create Equipment Report Modal
function openCreateEquipmentReportModal() {
    if (selectedEquipment.length === 0) {
        alert('Please select at least one equipment item to create the report');
        return;
    }
    
    const modal = document.getElementById('createEquipmentReportModal');
    if (modal) {
        const equipmentListContainer = document.getElementById('modalEquipmentSelectedList');
        const equipmentCountLabel = document.getElementById('modalEquipmentSelectedCount');
        
        if (equipmentCountLabel) {
            equipmentCountLabel.textContent = selectedEquipment.length;
        }
        
        if (equipmentListContainer) {
            if (selectedEquipment.length === 0) {
                equipmentListContainer.innerHTML = '<p style="color: #666; margin: 0;">No equipment selected</p>';
            } else {
                let equipmentHTML = '<ul style="margin: 0; padding-left: 20px; list-style-type: disc;">';
                selectedEquipment.forEach(item => {
                    equipmentHTML += `<li style="margin-bottom: 4px; color: #333;">${escapeHtml(item.equipmentName)} (Qty: ${item.quantity})</li>`;
                });
                equipmentHTML += '</ul>';
                equipmentListContainer.innerHTML = equipmentHTML;
            }
        }
        
        modal.style.display = 'flex';
    }
}

// Close Create Equipment Report Modal
function closeCreateEquipmentReportModal() {
    const modal = document.getElementById('createEquipmentReportModal');
    if (modal) modal.style.display = 'none';
    
    const form = document.getElementById('createEquipmentReportForm');
    if (form) form.reset();
}

// Handle Create Equipment Report Form Submit
function handleCreateEquipmentReportSubmit(e) {
    e.preventDefault();
    
    equipmentReportFormData = {
        reportDate: document.getElementById('equipmentReportDate')?.value,
        preparedBy: document.getElementById('equipmentPreparedBy')?.value,
        department: document.getElementById('equipmentDepartment')?.value,
        notes: document.getElementById('equipmentNotes')?.value
    };
    
    closeCreateEquipmentReportModal();
    generateEquipmentReportWithFormData();
}

// Generate Equipment Report with Form Data
async function generateEquipmentReportWithFormData() {
    showLoading(true);
    try {
        const { default: TemplateManager } = await import('./templateManager.js');
        const activeTemplate = await TemplateManager.fetchTemplateByExportType('equipment');

        // Map selected equipment to enriched items with details
        const enrichedEquipment = selectedEquipment.map(selectedItem => {
            const equipmentDetails = allEquipment.find(item => item.id === selectedItem.equipmentId);
            return {
                item_name: selectedItem.equipmentName,
                item_description: equipmentDetails?.item_description || '',
                quantity: equipmentDetails?.quantity || 0,
                unit_cost: equipmentDetails?.unit_cost || 0,
                amount: equipmentDetails?.amount || 0,
                created_at: equipmentDetails?.created_at || new Date().toISOString()
            };
        });

        if (activeTemplate) {
            const filledWorkbook = await TemplateManager.fillTemplateWithData(
                activeTemplate, 
                enrichedEquipment, 
                10
            );

            if (filledWorkbook) {
                const sheetName = activeTemplate.template_data?.sheet_name || filledWorkbook.SheetNames[0];
                const worksheet = filledWorkbook.Sheets[sheetName];
                
                if (equipmentReportFormData) {
                    if (equipmentReportFormData.reportDate) {
                        worksheet['C8'] = { v: new Date(equipmentReportFormData.reportDate).toLocaleDateString(), t: 's' };
                    }
                    if (equipmentReportFormData.preparedBy) {
                        worksheet['B35'] = { v: equipmentReportFormData.preparedBy, t: 's' };
                    }
                    if (equipmentReportFormData.department) {
                        worksheet['F35'] = { v: equipmentReportFormData.department, t: 's' };
                    }
                    if (equipmentReportFormData.notes) {
                        worksheet['B30'] = { v: equipmentReportFormData.notes, t: 's' };
                    }
                }
                
                const filenameBase = `equipment_inventory_report_${new Date().toISOString().split('T')[0]}`;
                TemplateManager.writeFileWithStyles(filledWorkbook, `${filenameBase}.xlsx`);
                alert('Report generated successfully with form data included!');
                showLoading(false);
                return;
            }
        }

        // Fallback to default export
        const exportData = enrichedEquipment.map(item => ({
            'Item Name': item.item_name,
            'Description': item.item_description,
            'Quantity': item.quantity,
            'Unit Cost': parseInt(item.unit_cost || 0),
            'Amount': parseInt(item.amount || 0),
            'Date Added': new Date(item.created_at).toLocaleString(),
            'Report Date': equipmentReportFormData?.reportDate || '',
            'Prepared By': equipmentReportFormData?.preparedBy || '',
            'Department': equipmentReportFormData?.department || '',
            'Notes': equipmentReportFormData?.notes || ''
        }));
        
        const filenameBase = `equipment_inventory_report_${new Date().toISOString().split('T')[0]}`;
        
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Equipment');
        XLSX.writeFile(wb, `${filenameBase}.xlsx`);
        
        alert('Report generated successfully!');
    } catch (error) {
        console.error('Error generating equipment report:', error);
        alert('Failed to generate report');
    } finally {
        showLoading(false);
    }
}

// Original display function for Lost Items
async function displayLostItemsReport() {
    showLoading(true);
    hideError();
    hideEmpty();
    
    try {
        if (allActivityLogs.length === 0) {
            await fetchActivityLogs();
        }
        
        const distributedItems = {};
        allActivityLogs.forEach(log => {
            if (log.action_type === 'DISTRIBUTE' && log.person) {
                const key = `${log.item_name}-${log.person}`;
                if (!distributedItems[key]) {
                    distributedItems[key] = { itemName: log.item_name, person: log.person, quantity: 0, lastDate: log.timestamp, category: log.details?.category || log.details?.label || '-' };
                }
                distributedItems[key].quantity += Math.abs(log.quantity_changed);
                if (new Date(log.timestamp) > new Date(distributedItems[key].lastDate)) {
                    distributedItems[key].lastDate = log.timestamp;
                }
            }
        });
        
        const distributedList = Object.values(distributedItems);
        
        let reportHTML = `
            <div class="report-card">
                <div class="report-header">
                    <h2><i class="fa-solid fa-triangle-exclamation"></i> Lost/Stolen/Damaged/Destroyed Items</h2>
                    <button class="btn btn-primary" onclick="window.exportCurrentReport('items_lost')">
                        <i class="fa-solid fa-download"></i> Export
                    </button>
                </div>
                <div class="report-info">
                    <p><i class="fa-solid fa-info-circle"></i> This report shows items that have been distributed to persons. 
                    Use this to track items that may be lost, stolen, damaged, or destroyed.</p>
                </div>
                <div class="report-stats">
                    <div class="stat-box">
                        <span class="stat-number">${distributedList.length}</span>
                        <span class="stat-label">Total Distributions</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${distributedList.reduce((sum, d) => sum + d.quantity, 0)}</span>
                        <span class="stat-label">Total Items Distributed</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${new Set(distributedList.map(d => d.person)).size}</span>
                        <span class="stat-label">Unique Persons</span>
                    </div>
                </div>
                <div class="report-table-container">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>Item Name</th>
                                <th>Category</th>
                                <th>Person</th>
                                <th>Quantity</th>
                                <th>Last Distribution Date</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        if (distributedList.length === 0) {
            reportHTML += `<tr><td colspan="5" style="text-align: center;">No distributed items found</td></tr>`;
        } else {
            distributedList.sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));
            distributedList.forEach(item => {
                const lastDate = new Date(item.lastDate).toLocaleDateString();
                reportHTML += `
                    <tr>
                        <td>${escapeHtml(item.itemName)}</td>
                        <td>${escapeHtml(item.category)}</td>
                        <td>${escapeHtml(item.person)}</td>
                        <td>${item.quantity}</td>
                        <td>${lastDate}</td>
                    </tr>
                `;
            });
        }
        
        reportHTML += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        reportContainer.innerHTML = reportHTML;
        
    } catch (error) {
        console.error('Error displaying lost items report:', error);
        showError('Failed to load lost items report');
    } finally {
        showLoading(false);
    }
}

// Display Room Inventory Report - Redesigned with Search
async function displayRoomsReport() {
    showLoading(true);
    hideError();
    hideEmpty();
    
    try {
        if (allRooms.length === 0) {
            await fetchRooms();
        }
        if (allRoomItems.length === 0) {
            await fetchRoomItems();
        }
        
        // Filter rooms based on search query
        let filteredRooms = allRooms;
        if (roomsSearchQuery) {
            const query = roomsSearchQuery.toLowerCase();
            filteredRooms = allRooms.filter(room => 
                room.name.toLowerCase().includes(query) || 
                (room.description && room.description.toLowerCase().includes(query))
            );
        }
        
        // Calculate total quantities for filtered rooms
        const filteredRoomIds = filteredRooms.map(r => r.id);
        const filteredRoomItems = allRoomItems.filter(item => filteredRoomIds.includes(item.room_id));
        const totalItemsInRooms = filteredRoomItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
        
        let reportHTML = `
            <div class="report-card">
                <div class="report-header">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <button class="btn btn-ghost" onclick="window.showReportSelection()" title="Back to Reports" style="padding: 8px 12px;">
                            <i class="fa-solid fa-arrow-left"></i>
                        </button>
                        <h2><i class="fa-solid fa-door-open"></i> Classroom Inventory</h2>
                    </div>
                    <button class="btn btn-primary" onclick="window.exportCurrentReport('rooms')">
                        <i class="fa-solid fa-download"></i> Export
                    </button>
                </div>
                
                <!-- Search Bar for Rooms -->
                <div class="search-container" style="padding: 20px 24px 0 24px;">
                    <input type="text" id="roomsSearch" placeholder="Search rooms... (Press Enter)" value="${roomsSearchQuery}" 
                        onkeyup="if(event.key === 'Enter') window.updateRoomsSearch(this.value)"
                        style="width: 100%; padding: 12px 16px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
                </div>
                
                <div class="report-stats">
                    <div class="stat-box">
                        <span class="stat-number">${filteredRooms.length}</span>
                        <span class="stat-label">Rooms Found</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${filteredRoomItems.length}</span>
                        <span class="stat-label">Unique Items</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${totalItemsInRooms}</span>
                        <span class="stat-label">Total Quantity</span>
                    </div>
                </div>
        `;
        
        if (filteredRooms.length === 0) {
            reportHTML += `<p style="text-align: center; padding: 20px;">${roomsSearchQuery ? 'No rooms match your search' : 'No rooms found'}</p>`;
        } else {
            // Add a container for rooms list with independent scrolling
            reportHTML += `<div class="rooms-list-container" style="max-height: calc(100vh - 400px); overflow-y: auto; padding: 0 24px 24px 24px;">`;
            
            filteredRooms.forEach(room => {
                const roomItems = allRoomItems.filter(item => item.room_id === room.id);
                const totalQuantity = roomItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
                
                reportHTML += `
                    <div class="classroom-card">
                        <div class="classroom-card-header">
                            <div class="classroom-info">
                                <h3><i class="fa-solid fa-school"></i> ${escapeHtml(room.name)}</h3>
                                ${room.description ? `<p class="classroom-description">${escapeHtml(room.description)}</p>` : ''}
                            </div>
                            <div class="classroom-summary">
                                <div class="classroom-stat">
                                    <span class="classroom-stat-value">${roomItems.length}</span>
                                    <span class="classroom-stat-label">items</span>
                                </div>
                                <div class="classroom-stat">
                                    <span class="classroom-stat-value">${totalQuantity}</span>
                                    <span class="classroom-stat-label">total qty</span>
                                </div>
                            </div>
                        </div>
                        <div class="classroom-table-wrapper">
                            <table class="report-table">
                                <thead>
                                    <tr>
                                        <th><i class="fa-solid fa-box"></i> Item Name</th>
                                        <th><i class="fa-solid fa-hashtag"></i> Quantity</th>
                                        <th><i class="fa-solid fa-calendar"></i> Date Added</th>
                                    </tr>
                                </thead>
                                <tbody>
                `;
                
                if (roomItems.length === 0) {
                    reportHTML += `<tr><td colspan="3" class="empty-cell"><i class="fa-solid fa-inbox"></i> No items in this room</td></tr>`;
                } else {
                    roomItems.forEach(item => {
                        const dateAdded = item.created_at ? new Date(item.created_at).toLocaleDateString() : '-';
                        reportHTML += `
                            <tr>
                                <td class="item-name-cell"><i class="fa-solid fa-arrow-right"></i> ${escapeHtml(item.name)}</td>
                                <td class="item-quantity-cell"><span class="quantity-badge">${item.quantity}</span></td>
                                <td class="item-date-cell">${dateAdded}</td>
                            </tr>
                        `;
                    });
                }
                
                reportHTML += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            });
            
            reportHTML += `</div>`;
        }
        
        reportHTML += `</div>`;
        reportContainer.innerHTML = reportHTML;
        
    } catch (error) {
        console.error('Error displaying rooms report:', error);
        showError('Failed to load rooms report');
    } finally {
        showLoading(false);
    }
}

// Display Activity Logs Report with Filters
async function displayLogsReport() {
    showLoading(true);
    hideError();
    hideEmpty();
    
    try {
        if (allActivityLogs.length === 0) {
            await fetchActivityLogs();
        }
        
        // Apply filters
        let filteredLogs = [...allActivityLogs];
        
        // Date filter
        if (logsDateFrom) {
            filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= new Date(logsDateFrom));
        }
        if (logsDateTo) {
            filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= new Date(logsDateTo + 'T23:59:59'));
        }
        
        // Action filter
        if (logsActionFilter !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.action_type === logsActionFilter);
        }
        
        // Search filter
        if (logsSearchQuery) {
            const query = logsSearchQuery.toLowerCase();
            filteredLogs = filteredLogs.filter(log => 
                (log.item_name && log.item_name.toLowerCase().includes(query)) ||
                (log.person && log.person.toLowerCase().includes(query)) ||
                (log.action_type && log.action_type.toLowerCase().includes(query))
            );
        }
        
        // Get unique action types for filter dropdown
        const actionTypes = [...new Set(allActivityLogs.map(log => log.action_type))];
        
        let reportHTML = `
            <div class="report-card">
                <div class="report-header">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <button class="btn btn-ghost" onclick="window.showReportSelection()" title="Back to Reports" style="padding: 8px 12px;">
                            <i class="fa-solid fa-arrow-left"></i>
                        </button>
                        <h2><i class="fa-solid fa-clock-rotate-left"></i> Activity Logs</h2>
                    </div>
                    <button class="btn btn-primary" onclick="window.exportCurrentReport('logs')">
                        <i class="fa-solid fa-download"></i> Export
                    </button>
                </div>
                
                <!-- Filters Section -->
                <div style="padding: 20px 24px 0 24px;">
                    <div class="logs-filters" style="display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end;">
                        <div class="filter-group" style="flex: 1; min-width: 150px;">
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase;">Date From</label>
                            <input type="date" id="logsDateFrom" value="${logsDateFrom}" onchange="window.updateLogsFilters()" style="width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
                        </div>
                        <div class="filter-group" style="flex: 1; min-width: 150px;">
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase;">Date To</label>
                            <input type="date" id="logsDateTo" value="${logsDateTo}" onchange="window.updateLogsFilters()" style="width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
                        </div>
                        <div class="filter-group" style="flex: 1; min-width: 150px;">
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase;">Action Type</label>
                            <select id="logsActionFilter" onchange="window.updateLogsFilters()" style="width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; background: white;">
                                <option value="all">All Actions</option>
                                ${actionTypes.map(type => `<option value="${type}" ${logsActionFilter === type ? 'selected' : ''}>${type}</option>`).join('')}
                            </select>
                        </div>
                        <div class="filter-group" style="flex: 2; min-width: 200px;">
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase;">Search</label>
                            <input type="text" id="logsSearchQuery" placeholder="Search logs... (Press Enter)" value="${logsSearchQuery}" onkeyup="if(event.key === 'Enter') window.updateLogsFilters()" style="width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
                        </div>
                    </div>
                </div>
                
                <div class="report-stats">
                    <div class="stat-box">
                        <span class="stat-number">${filteredLogs.length}</span>
                        <span class="stat-label">Total Logs</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${filteredLogs.filter(l => l.action_type === 'CREATE').length}</span>
                        <span class="stat-label">Created</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${filteredLogs.filter(l => l.action_type === 'DISTRIBUTE').length}</span>
                        <span class="stat-label">Distributed</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${filteredLogs.filter(l => l.action_type === 'ADDED').length}</span>
                        <span class="stat-label">Updated</span>
                    </div>
                </div>
                
                <div class="report-table-container">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Action</th>
                                <th>Item Name</th>
                                <th>Quantity Changed</th>
                                <th>Person</th>
                                <th>Category</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        if (filteredLogs.length === 0) {
            reportHTML += `<tr><td colspan="6" style="text-align: center;">No logs found</td></tr>`;
        } else {
            filteredLogs.forEach(log => {
                const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleString() : '-';
                const quantityClass = log.quantity_changed > 0 ? 'positive' : (log.quantity_changed < 0 ? 'negative' : '');
                const quantityDisplay = log.quantity_changed > 0 ? `+${log.quantity_changed}` : log.quantity_changed;
                reportHTML += `
                    <tr>
                        <td>${timestamp}</td>
                        <td><span class="action-badge action-${log.action_type.toLowerCase()}">${log.action_type}</span></td>
                        <td>${escapeHtml(log.item_name || '-')}</td>
                        <td class="${quantityClass}">${quantityDisplay}</td>
                        <td>${escapeHtml(log.person || '-')}</td>
                        <td>${escapeHtml(log.details?.category || log.details?.label || '-')}</td>
                    </tr>
                `;
            });
        }
        
        reportHTML += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        reportContainer.innerHTML = reportHTML;
        
    } catch (error) {
        console.error('Error displaying logs report:', error);
        showError('Failed to load logs report');
    } finally {
        showLoading(false);
    }
}

// Update logs filters
function updateLogsFilters() {
    logsDateFrom = document.getElementById('logsDateFrom')?.value || '';
    logsDateTo = document.getElementById('logsDateTo')?.value || '';
    logsActionFilter = document.getElementById('logsActionFilter')?.value || 'all';
    logsSearchQuery = document.getElementById('logsSearchQuery')?.value || '';
    displayLogsReport();
}

// Update items list filters
function updateItemsFilters() {
    itemsCategoryFilter = document.getElementById('itemsCategoryFilter')?.value || '';
    itemsMonthFilter = document.getElementById('itemsMonthFilter')?.value || '';
    itemsSearchQuery = document.getElementById('itemsSearchQuery')?.value || '';
    displayItemsListReport();
}

// Update items list category filter (for import view)
function updateItemsListCategoryFilter(category) {
    itemsListCategoryFilter = category;
    displayItemsListReportWithImport();
}

// Generate monthly quantity summary HTML - only counts items from CREATE (Add Stock) actions
async function generateMonthlyQuantitySummary(items) {
    const currentYear = new Date().getFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Calculate total quantity per month from CREATE (Add Stock) actions only
    const monthlyTotals = new Array(12).fill(0);
    
    // Get activity logs to find only CREATE actions (Add Stock)
    if (allActivityLogs.length === 0) {
        await fetchActivityLogs();
    }
    
    // Filter logs to only CREATE actions in current year
    const createLogs = allActivityLogs.filter(log => {
        if (log.action_type !== 'CREATE') return false;
        if (!log.timestamp) return false;
        const logDate = new Date(log.timestamp);
        return logDate.getFullYear() === currentYear;
    });
    
    // Calculate totals by month from CREATE logs
    createLogs.forEach(log => {
        const logDate = new Date(log.timestamp);
        const monthIndex = logDate.getMonth(); // 0-11
        monthlyTotals[monthIndex] += Math.abs(log.quantity_changed || 0);
    });
    
    // Generate HTML for each month (clickable)
    return months.map((monthName, index) => {
        const total = monthlyTotals[index];
        const hasItems = total > 0;
        const bgColor = hasItems ? '#e3f2fd' : '#f8f9fa';
        const borderColor = hasItems ? '#2196f3' : '#dee2e6';
        const textColor = hasItems ? '#1976d2' : '#6c757d';
        
        return `
            <div onclick="${hasItems ? `window.selectItemsByMonth(${index})` : ''}" 
                 style="flex: 1; min-width: 80px; text-align: center; padding: 8px; background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 6px; ${hasItems ? 'cursor: pointer;' : 'cursor: default;'}">
                <div style="font-weight: 600; font-size: 13px; color: ${textColor};">${monthName}</div>
                <div style="font-size: 18px; font-weight: 700; color: ${textColor};">${total}</div>
            </div>
        `;
    });
}
 
// Store selected month for export
let selectedExportMonth = null;

// Select all items from a specific month for export
function selectItemsByMonth(monthIndex) {
    const currentYear = new Date().getFullYear();
    
    // Find all items from this month
    const itemsFromMonth = allItems.filter(item => {
        if (!item.created_at) return false;
        const itemDate = new Date(item.created_at);
        return itemDate.getFullYear() === currentYear && itemDate.getMonth() === monthIndex;
    });
    
    if (itemsFromMonth.length === 0) {
        return;
    }
    
    // Add items from this month to selectedItemsList
    let addedCount = 0;
    itemsFromMonth.forEach(item => {
        const isAlreadySelected = selectedItemsList.find(i => i.itemId === item.id);
        if (!isAlreadySelected) {
            selectedItemsList.push({ itemId: item.id, itemName: item.name });
            addedCount++;
        }
    });
    
    // Store the selected month for export
    selectedExportMonth = {
        index: monthIndex,
        name: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][monthIndex]
    };
    
    // Update the display
    displayItemsListReportWithImport();
    
    // Show feedback
    alert(`Added ${addedCount} item(s) from ${selectedExportMonth.name} to selected items for export.`);
}


// ==========================================
// 3. EXPORT FUNCTIONS
// ==========================================

// Export current displayed report
async function exportCurrentReport(reportType) {
    const format = document.getElementById('reportFormat')?.value || 'xlsx';
    
    if (reportType === 'items_list') {
        await exportItemsList(format);
    } else if (reportType === 'items_lost') {
        await exportLostItems(format);
    } else if (reportType === 'rooms') {
        await exportRooms(format);
    } else if (reportType === 'logs') {
        await exportLogsFiltered(format);
    }
}

// Export Items List
async function exportItemsList(format = 'xlsx') {
    showLoading(true);
    try {
        if (allItems.length === 0) {
            await fetchItems();
        }
        
        // Apply the same filters as display
        let filteredItems = [...allItems];
        
        // Category filter
        if (itemsCategoryFilter) {
            filteredItems = filteredItems.filter(item => item.label === itemsCategoryFilter);
        }
        
        // Month filter
        if (itemsMonthFilter) {
            const [year, month] = itemsMonthFilter.split('-');
            filteredItems = filteredItems.filter(item => {
                if (!item.created_at) return false;
                const itemDate = new Date(item.created_at);
                return itemDate.getFullYear() === parseInt(year) && (itemDate.getMonth() + 1) === parseInt(month);
            });
        }
        
        // Search filter
        if (itemsSearchQuery) {
            const query = itemsSearchQuery.toLowerCase();
            filteredItems = filteredItems.filter(item => 
                item.name.toLowerCase().includes(query) ||
                (item.label && item.label.toLowerCase().includes(query))
            );
        }
        
        const exportData = filteredItems.map(item => ({
            'Item Name': item.name,
            'Category': item.label || '',
            'Quantity': item.quantity,
            'Unit': item.unit || '',
            'Created At': item.created_at ? new Date(item.created_at).toLocaleString() : '',
            'Updated At': item.updated_at ? new Date(item.updated_at).toLocaleString() : ''
        }));
        
        const filenameBase = `list_of_items_${new Date().toISOString().split('T')[0]}`;
        
        if (format === 'xlsx') {
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Items');
            XLSX.writeFile(wb, `${filenameBase}.xlsx`);
        } else {
            const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(exportData));
            downloadCSV(csv, `${filenameBase}.csv`);
        }
    } catch (error) {
        console.error('Error exporting items list:', error);
        alert('Failed to export items list');
    } finally {
        showLoading(false);
    }
}

// Export Lost/Stolen/Damaged/Destroyed Items with Template Pre-fill
async function exportLostItems(format = 'xlsx') {
    showLoading(true);
    try {
        // Check if user has selected items
        if (selectedLostItems.length === 0) {
            alert('Please select at least one item to export');
            showLoading(false);
            return;
        }

        // Import TemplateManager
        const { default: TemplateManager } = await import('./templateManager.js');
        
        // Automatically fetch template for items_lost based on export type
        // No need to manually set template as active
        const activeTemplate = await TemplateManager.fetchTemplateByExportType('items_lost');

        // Enrich selected items with additional data from activity logs
        if (allActivityLogs.length === 0) {
            await fetchActivityLogs();
        }

        const enrichedItems = selectedLostItems.map(selectedItem => {
            // Find the item details from allItems
            const itemDetails = allItems.find(item => item.id === selectedItem.itemId);
            
            // Find last distribution info from activity logs
            const distributionLogs = allActivityLogs.filter(log => 
                log.action_type === 'DISTRIBUTE' && 
                log.item_name === selectedItem.itemName
            );
            
            const lastDistribution = distributionLogs.length > 0 
                ? distributionLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
                : null;

            return {
                item_name: selectedItem.itemName,
                category: itemDetails?.label || lastDistribution?.details?.category || lastDistribution?.details?.label || '-',
                person: lastDistribution?.person || '-',
                quantity: selectedItem.quantity,
                last_date: lastDistribution?.timestamp || itemDetails?.updated_at || new Date().toISOString()
            };
        });

        // Try to use template pre-fill if active template exists
        if (activeTemplate && format === 'xlsx') {
            const filledWorkbook = await TemplateManager.fillTemplateWithData(
                activeTemplate, 
                enrichedItems, 
                10 // Add 10 empty rows for manual entries
            );

            if (filledWorkbook) {
                // Download the pre-filled template with styles preserved
                const filenameBase = `lost_items_template_${new Date().toISOString().split('T')[0]}`;
                TemplateManager.writeFileWithStyles(filledWorkbook, `${filenameBase}.xlsx`);
                alert('Template downloaded with pre-filled data. You can now add more information before finalizing.');
                showLoading(false);
                return;
            }
        }

        // Fallback to default export if no template or template fill failed
        const exportData = enrichedItems.map(item => ({
            'Item Name': item.item_name,
            'Category': item.category,
            'Person': item.person,
            'Quantity': item.quantity,
            'Last Distribution Date': new Date(item.last_date).toLocaleString()
        }));
        
        const filenameBase = `lost_stolen_damaged_items_${new Date().toISOString().split('T')[0]}`;
        
        if (format === 'xlsx') {
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Items');
            XLSX.writeFile(wb, `${filenameBase}.xlsx`);
        } else {
            const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(exportData));
            downloadCSV(csv, `${filenameBase}.csv`);
        }
    } catch (error) {
        console.error('Error exporting lost items:', error);
        alert('Failed to export lost items report');
    } finally {
        showLoading(false);
    }
}

// Export Rooms
async function exportRooms(format = 'xlsx') {
    showLoading(true);
    try {
        if (allRooms.length === 0) {
            await fetchRooms();
        }
        if (allRoomItems.length === 0) {
            await fetchRoomItems();
        }
        
        const exportData = [];
        allRooms.forEach(room => {
            const roomItems = allRoomItems.filter(item => item.room_id === room.id);
            if (roomItems.length === 0) {
                exportData.push({
                    'Room Name': room.name,
                    'Room Description': room.description || '',
                    'Item Name': '-',
                    'Quantity': 0,
                    'Date Added': '-'
                });
            } else {
                roomItems.forEach(item => {
                    exportData.push({
                        'Room Name': room.name,
                        'Room Description': room.description || '',
                        'Item Name': item.name,
                        'Quantity': item.quantity,
                        'Date Added': item.created_at ? new Date(item.created_at).toLocaleString() : ''
                    });
                });
            }
        });
        
        const filenameBase = `classroom_inventory_${new Date().toISOString().split('T')[0]}`;
        
        if (format === 'xlsx') {
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Rooms');
            XLSX.writeFile(wb, `${filenameBase}.xlsx`);
        } else {
            const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(exportData));
            downloadCSV(csv, `${filenameBase}.csv`);
        }
    } catch (error) {
        console.error('Error exporting rooms:', error);
        alert('Failed to export rooms report');
    } finally {
        showLoading(false);
    }
}

// Export Logs (filtered)
async function exportLogsFiltered(format = 'xlsx') {
    showLoading(true);
    try {
        if (allActivityLogs.length === 0) {
            await fetchActivityLogs();
        }
        
        // Apply current filters
        let filteredLogs = [...allActivityLogs];
        
        if (logsDateFrom) {
            filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= new Date(logsDateFrom));
        }
        if (logsDateTo) {
            filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= new Date(logsDateTo + 'T23:59:59'));
        }
        if (logsActionFilter !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.action_type === logsActionFilter);
        }
        if (logsSearchQuery) {
            const query = logsSearchQuery.toLowerCase();
            filteredLogs = filteredLogs.filter(log => 
                (log.item_name && log.item_name.toLowerCase().includes(query)) ||
                (log.person && log.person.toLowerCase().includes(query)) ||
                (log.action_type && log.action_type.toLowerCase().includes(query))
            );
        }
        
        const exportData = filteredLogs.map(log => ({
            'Timestamp': log.timestamp ? new Date(log.timestamp).toLocaleString() : '',
            'Action Type': log.action_type || '',
            'Item Name': log.item_name || '',
            'Quantity Changed': log.quantity_changed || '',
            'Quantity Before': log.quantity_before || '',
            'Quantity After': log.quantity_after || '',
            'Person': log.person || '',
            'Category': log.details?.category || log.details?.label || ''
        }));
        
        const filenameBase = `activity_logs_${new Date().toISOString().split('T')[0]}`;
        
        if (format === 'xlsx') {
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Logs');
            XLSX.writeFile(wb, `${filenameBase}.xlsx`);
        } else {
            const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(exportData));
            downloadCSV(csv, `${filenameBase}.csv`);
        }
    } catch (error) {
        console.error('Error exporting logs:', error);
        alert('Failed to export logs');
    } finally {
        showLoading(false);
    }
}

// Helper function to download CSV
function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ==========================================
// 4. MODAL FUNCTIONS
// ==========================================

function openCreateReportModal() {
    const modal = document.getElementById('createReportModal');
    if (modal) modal.style.display = 'flex';
}

function closeCreateReportModal() {
    const modal = document.getElementById('createReportModal');
    if (modal) modal.style.display = 'none';
    // Reset form
    const form = document.getElementById('createReportForm');
    if (form) form.reset();
}

function handleCategoryChange() {
    // This can be used to show/hide additional fields based on category
    const category = document.getElementById('reportCategory')?.value;
    // Future: Add dynamic fields based on selection
}

// ==========================================
// 5. FORM SUBMIT HANDLER
// ==========================================

function handleCreateReportSubmit(e) {
    e.preventDefault();
    
    const category = document.getElementById('reportCategory')?.value;
    
    closeCreateReportModal();
    
    if (!category) {
        alert('Please select a report type');
        return;
    }
    
    // Show loading
    showLoading(true);
    
    // Route to appropriate display function (NO auto-export)
    switch(category) {
        case 'items_list':
            displayItemsListReportWithImport();
            break;
        case 'items_lost':
            displayLostItemsReportWithImport();
            break;
        case 'rooms':
            displayRoomsReportWithImport();
            break;
        case 'equipment':
            displayEquipmentReportWithImport();
            break;
        case 'item_history':
            displayItemHistoryReport();
            break;
        case 'logs':
            displayLogsReportWithImport();
            break;
        default:
            showLoading(false);
            alert('Invalid report type selected');
    }
}

// ==========================================
// 6. UI HELPER FUNCTIONS
// ==========================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading(show) {
    if (loadingState) {
        loadingState.style.display = show ? 'block' : 'none';
    }
    if (reportContainer) {
        reportContainer.style.display = show ? 'none' : 'block';
    }
}

function showError(message) {
    if (errorState) {
        errorState.style.display = 'block';
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) errorMessage.textContent = message;
    }
    if (reportContainer) {
        reportContainer.style.display = 'none';
    }
}

function hideError() {
    if (errorState) {
        errorState.style.display = 'none';
    }
    if (reportContainer) {
        reportContainer.style.display = 'block';
    }
}

function showEmpty() {
    if (emptyState) {
        emptyState.style.display = 'block';
    }
    if (reportContainer) {
        reportContainer.style.display = 'none';
    }
}

function hideEmpty() {
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    if (reportContainer) {
        reportContainer.style.display = 'block';
    }
}

// ==========================================
// 7. EVENT LISTENERS
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Create report button
    const createBtn = document.getElementById('createReportBtn');
    if (createBtn) {
        createBtn.addEventListener('click', openCreateReportModal);
    }

    // Create form submit
    const createForm = document.getElementById('createReportForm');
    if (createForm) {
        createForm.addEventListener('submit', handleCreateReportSubmit);
    }
    
    // Close modal when clicking outside
    const modal = document.getElementById('createReportModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeCreateReportModal();
            }
        });
    }
});

// ==========================================
// 8. TEMPLATE MANAGEMENT FUNCTIONS
// ==========================================

let allTemplates = [];
let selectedTemplateFile = null;

function openTemplatesModal() {
    const modal = document.getElementById('templatesModal');
    if (modal) {
        modal.style.display = 'flex';
        loadTemplates();
    }
}

function closeTemplatesModal() {
    const modal = document.getElementById('templatesModal');
    if (modal) modal.style.display = 'none';
}

function openUploadTemplateModal() {
    const modal = document.getElementById('uploadTemplateModal');
    if (modal) {
        modal.style.display = 'flex';
        // Reset form
        const form = document.getElementById('uploadTemplateForm');
        if (form) form.reset();
        selectedTemplateFile = null;
        const preview = document.getElementById('templatePreview');
        if (preview) preview.style.display = 'none';
    }
}

function closeUploadTemplateModal() {
    const modal = document.getElementById('uploadTemplateModal');
    if (modal) modal.style.display = 'none';
}

async function loadTemplates() {
    try {
        const { default: TemplateManager } = await import('./templateManager.js');
        allTemplates = await TemplateManager.fetchTemplates();
        renderTemplateList();
    } catch (error) {
        console.error('Error loading templates:', error);
        const container = document.getElementById('templateListContainer');
        if (container) {
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: #999;">Failed to load templates.</p>';
        }
    }
}

function renderTemplateList() {
    const container = document.getElementById('templateListContainer');
    if (!container) return;

    if (allTemplates.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #999;">No templates uploaded yet. Click "Upload New Template" to add one.</p>';
        return;
    }

    let html = '';
    allTemplates.forEach(template => {
        const isActive = template.is_active;
        const exportType = template.template_data?.export_type || 'items';
        const typeLabel = {
            'items_list': 'Items - List of Items',
            'items_lost': 'Items - Lost/Stolen/Damaged/Destroyed',
            'rooms': 'Rooms - Classroom Inventory',
            'logs': 'Logs - Activity Logs'
        }[exportType] || exportType;

        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #eee; background: ${isActive ? '#f0f9ff' : 'white'};">
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 4px 0; font-size: 16px;">${escapeHtml(template.name)} ${isActive ? '<span style="color: #10b981; font-size: 12px;">(Active)</span>' : ''}</h4>
                    <p style="margin: 0; font-size: 12px; color: #666;">${escapeHtml(template.description || 'No description')}</p>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #999;">Type: ${typeLabel} | Created: ${new Date(template.created_at).toLocaleDateString()}</p>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="window.setActiveTemplateHandler('${template.id}')" 
                            class="btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}" 
                            ${isActive ? 'disabled' : ''}>
                        <i class="fa-solid fa-check"></i> ${isActive ? 'Active' : 'Set Active'}
                    </button>
                    <button onclick="window.deleteTemplateHandler('${template.id}')" class="btn btn-sm btn-danger">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

async function handleTemplateFileSelect(input) {
    const file = input.files[0];
    if (!file) return;

    selectedTemplateFile = file;

    // Parse Excel to preview headers
    try {
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const headers = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })[0] || [];

            const preview = document.getElementById('templatePreview');
            const headersList = document.getElementById('templateHeadersList');
            
            if (preview && headersList) {
                preview.style.display = 'block';
                headersList.innerHTML = headers.map(h => 
                    `<span style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${escapeHtml(String(h))}</span>`
                ).join('');
            }
        };
        reader.readAsArrayBuffer(file);
    } catch (error) {
        console.error('Error parsing Excel file:', error);
        alert('Could not parse Excel file. Please ensure it is a valid .xlsx file.');
    }
}

async function uploadNewTemplate(e) {
    e.preventDefault();

    const name = document.getElementById('templateName')?.value;
    const description = document.getElementById('templateDescription')?.value;
    const exportType = document.getElementById('templateExportType')?.value;

    if (!name || !exportType || !selectedTemplateFile) {
        alert('Please fill in all required fields and select a file.');
        return;
    }

    try {
        showLoading(true);
        const { default: TemplateManager } = await import('./templateManager.js');
        const result = await TemplateManager.uploadTemplate(selectedTemplateFile, name, description, exportType);
        
        if (result.success) {
            alert('Template uploaded successfully!');
            closeUploadTemplateModal();
            loadTemplates(); // Refresh list
        } else {
            alert('Failed to upload template: ' + result.error);
        }
    } catch (error) {
        console.error('Error uploading template:', error);
        alert('Failed to upload template. Please try again.');
    } finally {
        showLoading(false);
    }
}

async function setActiveTemplateHandler(templateId) {
    try {
        const { default: TemplateManager } = await import('./templateManager.js');
        const result = await TemplateManager.setActiveTemplate(templateId);
        
        if (result.success) {
            loadTemplates(); // Refresh to show active status
        } else {
            alert('Failed to set active template: ' + result.error);
        }
    } catch (error) {
        console.error('Error setting active template:', error);
        alert('Failed to set active template.');
    }
}
  
async function deleteTemplateHandler(templateId) {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
        return;
    }

    try {
        const { default: TemplateManager } = await import('./templateManager.js');
        const result = await TemplateManager.deleteTemplate(templateId);
        
          if (result.success) {
            loadTemplates(); // Refresh list
        } else {
            alert('Failed to delete template: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting template:', error);
        alert('Failed to delete template.');
    }
}

// ==========================================
// 9. UPDATED EVENT LISTENERS
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Create report button
    const createBtn = document.getElementById('createReportBtn');
    if (createBtn) {
        createBtn.addEventListener('click', openCreateReportModal);
    }

    // Create form submit
    const createForm = document.getElementById('createReportForm');
    if (createForm) {
        createForm.addEventListener('submit', handleCreateReportSubmit);
    }
    
    // Close modal when clicking outside
    const modal = document.getElementById('createReportModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeCreateReportModal();
            }
        });
    }

    // Template management button
    const manageTemplatesBtn = document.getElementById('manageTemplatesBtn');
    if (manageTemplatesBtn) {
        manageTemplatesBtn.addEventListener('click', openTemplatesModal);
    }

    // Templates modal close on outside click
    const templatesModal = document.getElementById('templatesModal');
    if (templatesModal) {
        templatesModal.addEventListener('click', function(e) {
            if (e.target === templatesModal) {
                closeTemplatesModal();
            }
        });
    }

    // Upload template form
    const uploadTemplateForm = document.getElementById('uploadTemplateForm');
    if (uploadTemplateForm) {
        uploadTemplateForm.addEventListener('submit', uploadNewTemplate);
    }

    // Upload template modal close on outside click
    const uploadTemplateModal = document.getElementById('uploadTemplateModal');
    if (uploadTemplateModal) {
        uploadTemplateModal.addEventListener('click', function(e) {
            if (e.target === uploadTemplateModal) {
                closeUploadTemplateModal();
            }
        });
    }

    // Create Lost Items Report modal close on outside click
    const createLostItemsReportModal = document.getElementById('createLostItemsReportModal');
    if (createLostItemsReportModal) {
        createLostItemsReportModal.addEventListener('click', function(e) {
            if (e.target === createLostItemsReportModal) {
                closeCreateLostItemsReportModal();
            }
        });
    }

    // Create Lost Items Report form submit
    const createLostItemsReportForm = document.getElementById('createLostItemsReportForm');
    if (createLostItemsReportForm) {
        createLostItemsReportForm.addEventListener('submit', handleCreateLostItemsReportSubmit);
    }

    // Create Items List Report modal close on outside click
    const createItemsListReportModal = document.getElementById('createItemsListReportModal');
    if (createItemsListReportModal) {
        createItemsListReportModal.addEventListener('click', function(e) {
            if (e.target === createItemsListReportModal) {
                closeCreateItemsListReportModal();
            }
        });
    }

    // Create Items List Report form submit
    const createItemsListReportForm = document.getElementById('createItemsListReportForm');
    if (createItemsListReportForm) {
        createItemsListReportForm.addEventListener('submit', handleCreateItemsListReportSubmit);
    }

    // Create Rooms Report modal close on outside click
    const createRoomsReportModal = document.getElementById('createRoomsReportModal');
    if (createRoomsReportModal) {
        createRoomsReportModal.addEventListener('click', function(e) {
            if (e.target === createRoomsReportModal) {
                closeCreateRoomsReportModal();
            }
        });
    }

    // Create Rooms Report form submit
    const createRoomsReportForm = document.getElementById('createRoomsReportForm');
    if (createRoomsReportForm) {
        createRoomsReportForm.addEventListener('submit', handleCreateRoomsReportSubmit);
    }

    // Create Logs Report modal close on outside click
    const createLogsReportModal = document.getElementById('createLogsReportModal');
    if (createLogsReportModal) {
        createLogsReportModal.addEventListener('click', function(e) {
            if (e.target === createLogsReportModal) {
                closeCreateLogsReportModal();
            }
        });
    }

    // Create Logs Report form submit
    const createLogsReportForm = document.getElementById('createLogsReportForm');
    if (createLogsReportForm) {
        createLogsReportForm.addEventListener('submit', handleCreateLogsReportSubmit);
    }
    
    // Equipment report form
    const createEquipmentReportForm = document.getElementById('createEquipmentReportForm');
    if (createEquipmentReportForm) {
        createEquipmentReportForm.addEventListener('submit', handleCreateEquipmentReportSubmit);
    }
    
    // Tab switching
    document.querySelectorAll('.report-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            handleTabSwitch(tabName);
        });
    });
    
    // Initialize summaries
    initializeSummaries();
});

// Initialize summaries on page load
async function initializeSummaries() {
    // Check if we're on the main reports page (not a specific report view)
    if (document.getElementById('weekly') && document.getElementById('monthly') && document.getElementById('yearly')) {
        showLoading(true);
        try {
            await calculateAllSummaries();
            await displayWeeklySummary();
        } catch (error) {
            console.error('Error initializing summaries:', error);
            showError('Failed to load report summaries');
        } finally {
            showLoading(false);
        }
    }
}

// Make functions available globally
window.openCreateReportModal = openCreateReportModal;
window.closeCreateReportModal = closeCreateReportModal;
window.handleCategoryChange = handleCategoryChange;
window.handleCreateReportSubmit = handleCreateReportSubmit;
window.updateLogsFilters = updateLogsFilters;
window.updateItemsFilters = updateItemsFilters;
window.exportCurrentReport = exportCurrentReport;
window.displayItemsListReport = displayItemsListReport;
window.displayLostItemsReport = displayLostItemsReport;
window.displayLostItemsReportWithImport = displayLostItemsReportWithImport;
window.displayRoomsReport = displayRoomsReport;
window.displayLogsReport = displayLogsReport;
window.toggleSelectAllItems = toggleSelectAllItems;
window.toggleItemSelection = toggleItemSelection;
window.updateItemQuantity = updateItemQuantity;
window.openCreateLostItemsReportModal = openCreateLostItemsReportModal;
window.closeCreateLostItemsReportModal = closeCreateLostItemsReportModal;
window.handleCreateLostItemsReportSubmit = handleCreateLostItemsReportSubmit;
window.updateLostItemsSearch = updateLostItemsSearch;
window.updateRoomsSearch = updateRoomsSearch;
window.showReportSelection = showReportSelection;

// Items List report globals
window.displayItemsListReportWithImport = displayItemsListReportWithImport;
window.toggleSelectAllItemsList = toggleSelectAllItemsList;
window.toggleItemsListSelection = toggleItemsListSelection;
window.openCreateItemsListReportModal = openCreateItemsListReportModal;
window.closeCreateItemsListReportModal = closeCreateItemsListReportModal;
window.handleCreateItemsListReportSubmit = handleCreateItemsListReportSubmit;
window.updateItemsListSearch = updateItemsListSearch;
window.updateItemsListCategoryFilter = updateItemsListCategoryFilter;
window.selectItemsByMonth = selectItemsByMonth;
window.displayItemHistoryReport = displayItemHistoryReport;
window.updateItemHistoryItem = updateItemHistoryItem;
window.updateItemHistorySearch = updateItemHistorySearch;
window.toggleItemHistorySelection = toggleItemHistorySelection;
window.updateItemHistoryFromDate = updateItemHistoryFromDate;
window.updateItemHistoryToDate = updateItemHistoryToDate;
window.generateItemHistoryReport = generateItemHistoryReport;
window.exportItemHistoryReport = exportItemHistoryReport;
window.openItemHistoryPreviewModal = openItemHistoryPreviewModal;
window.closeItemHistoryPreviewModal = closeItemHistoryPreviewModal;

// Rooms report globals
window.displayRoomsReportWithImport = displayRoomsReportWithImport;
window.toggleSelectAllRooms = toggleSelectAllRooms;
window.toggleRoomSelection = toggleRoomSelection;
window.openCreateRoomsReportModal = openCreateRoomsReportModal;
window.closeCreateRoomsReportModal = closeCreateRoomsReportModal;
window.handleCreateRoomsReportSubmit = handleCreateRoomsReportSubmit;
window.updateRoomsSearchInput = updateRoomsSearchInput;

// Logs report globals
window.displayLogsReportWithImport = displayLogsReportWithImport;
window.toggleSelectAllLogs = toggleSelectAllLogs;
window.toggleLogSelection = toggleLogSelection;
window.openCreateLogsReportModal = openCreateLogsReportModal;
window.closeCreateLogsReportModal = closeCreateLogsReportModal;
window.handleCreateLogsReportSubmit = handleCreateLogsReportSubmit;

// Equipment report globals
window.displayEquipmentReportWithImport = displayEquipmentReportWithImport;
window.toggleSelectAllEquipment = toggleSelectAllEquipment;
window.toggleEquipmentSelection = toggleEquipmentSelection;
window.openCreateEquipmentReportModal = openCreateEquipmentReportModal;
window.closeCreateEquipmentReportModal = closeCreateEquipmentReportModal;
window.handleCreateEquipmentReportSubmit = handleCreateEquipmentReportSubmit;
window.updateEquipmentSearchInput = updateEquipmentSearchInput;
window.updateEquipmentFilters = updateEquipmentFilters;

// Template management globals
window.openTemplatesModal = openTemplatesModal;
window.closeTemplatesModal = closeTemplatesModal;
window.openUploadTemplateModal = openUploadTemplateModal;
window.closeUploadTemplateModal = closeUploadTemplateModal;
window.handleTemplateFileSelect = handleTemplateFileSelect;
window.uploadNewTemplate = uploadNewTemplate;
window.setActiveTemplateHandler = setActiveTemplateHandler;
window.deleteTemplateHandler = deleteTemplateHandler;
window.handleTabSwitch = handleTabSwitch;
window.displayWeeklySummary = displayWeeklySummary;
window.displayMonthlySummary = displayMonthlySummary;
window.displayYearlySummary = displayYearlySummary;
window.showLoading = showLoading;
