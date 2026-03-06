// Import Supabase client
import { supabase } from './supabase.js';
// animation/notification helpers
import { showNotification, pulseElement, fadeIn } from './animate.js';

// DOM Elements
const logsContainer = document.getElementById('logsContainer');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const emptyState = document.getElementById('emptyState');
const logSearch = document.getElementById('logSearch');
const clearSearch = document.getElementById('clearSearch');
const filterBtn = document.getElementById('filterBtn');
const filterDropdown = document.getElementById('filterDropdown');
const exportBtn = document.getElementById('exportBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const clearAllModal = document.getElementById('clearAllModal');


// Store all logs for search/filter functionality
let allLogs = [];
let currentFilter = 'all';
let isClearing = false; // Prevent double submission


// ==========================================
// 1. FETCH ACTIVITY LOGS FROM SUPABASE
// ==========================================
async function fetchActivityLogs() {
    showLoading(true);
    hideError();
    
    try {
        const { data: logs, error } = await supabase
            .from('activity_logs')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(100); // Limit to last 100 activities
        
        if (error) throw error;
        
        allLogs = logs || [];
        renderLogs(allLogs);
        
        // Show empty state if no logs
        if (allLogs.length === 0) {
            emptyState.style.display = 'block';
            logsContainer.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            logsContainer.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        showError('Failed to load activity logs. Please try again.');
    } finally {
        showLoading(false);
    }
}

// ==========================================
// 2. RENDER LOGS TO THE PAGE
// ==========================================
function renderLogs(logs) {
    logsContainer.innerHTML = '';
    
    logs.forEach(log => {
        const logEl = document.createElement('div');
        logEl.className = 'activity-item';
        
        // Determine icon and styling based on action type
        let iconClass = 'fa-plus';
        let iconBg = 'background-color: rgba(76, 175, 80, 0.2); color: #4caf50;';
        let badgeClass = 'activity-badge';
        let badgeText = log.action_type;
        let actionDescription = '';
        
        switch (log.action_type) {
            case 'CREATE':
                iconClass = 'fa-plus';
                iconBg = 'background-color: rgba(76, 175, 80, 0.2); color: #4caf50;';
                badgeClass = 'activity-badge';
                badgeText = 'Created';
                actionDescription = `Created new item "${log.item_name}" with ${log.quantity_after} ${getUnitText(log)}`;
                break;
                

            case 'UPDATE_QUANTITY':
                iconClass = 'fa-arrow-up';
                iconBg = 'background-color: rgba(33, 150, 243, 0.2); color: #2196f3;';
                badgeClass = 'activity-badge updated';
                badgeText = 'Stock Added';
                const poNum = log.details?.po_number ? ` (PO: ${log.details.po_number})` : '';
                actionDescription = `Added ${log.quantity_changed} ${getUnitText(log)} to "${log.item_name}"${poNum} (Stock: ${log.quantity_before} → ${log.quantity_after})`;
                break;
                
            case 'DISTRIBUTE':
                iconClass = 'fa-arrow-down';
                iconBg = 'background-color: rgba(255, 152, 0, 0.2); color: #ff9800;';
                badgeClass = 'activity-badge removed';
                badgeText = 'Distributed';
                actionDescription = `${log.person} took ${Math.abs(log.quantity_changed)} ${getUnitText(log)} of "${log.item_name}" (Stock: ${log.quantity_before} → ${log.quantity_after})`;
                break;
                
            case 'EDIT':
                iconClass = 'fa-pencil';
                iconBg = 'background-color: rgba(156, 39, 176, 0.2); color: #9c27b0;';
                badgeClass = 'activity-badge updated';
                badgeText = 'Edited';
                actionDescription = `Updated details for "${log.item_name}"`;
                if (log.details) {
                    const details = log.details;
                    if (details.old_name !== details.new_name) {
                        actionDescription = `Renamed item from "${details.old_name}" to "${details.new_name}"`;
                    } else if (details.old_label !== details.new_label) {
                        actionDescription = `Changed category of "${log.item_name}" from ${details.old_label || 'None'} to ${details.new_label || 'None'}`;
                    }
                }
                break;
                
            case 'DELETE':
                iconClass = 'fa-trash';
                iconBg = 'background-color: rgba(244, 67, 54, 0.2); color: #f44336;';
                badgeClass = 'activity-badge removed';
                badgeText = 'Deleted';
                actionDescription = `Deleted item "${log.item_name}" (Final stock: ${log.quantity_before} ${getUnitText(log)})`;
                break;
                
            default:
                iconClass = 'fa-info';
                iconBg = 'background-color: rgba(158, 158, 158, 0.2); color: #9e9e9e;';
                badgeText = log.action_type;
                actionDescription = `Action on "${log.item_name}"`;
        }
        
        // Format date
        const timestamp = log.timestamp 
            ? new Date(log.timestamp).toLocaleString() 
            : 'Unknown date';
        
        // Build the log entry HTML
        logEl.innerHTML = `
            <div class="stat-icon" style="width: 50px; height: 50px; ${iconBg}">
                <i class="fa-solid ${iconClass}"></i>
            </div>
            <div class="activity-details">
                <p>${escapeHtml(actionDescription)}</p>
                <small>${escapeHtml(timestamp)}</small>
            </div>
            <span class="${badgeClass}">${badgeText}</span>
        `;
        
        logsContainer.appendChild(logEl);
        // animate entry
        fadeIn(logEl);
    });
}

// Helper function to get unit text
function getUnitText(log) {
    if (log.details && log.details.unit) {
        return log.details.unit;
    }
    return 'units';
}

// ==========================================
// 3. SEARCH FUNCTIONALITY
// ==========================================
function filterLogs() {
    const query = logSearch.value.trim().toLowerCase();
    
    let filtered = allLogs;
    
    // Apply action type filter first
    if (currentFilter !== 'all') {
        filtered = allLogs.filter(log => log.action_type === currentFilter);
    }
    
    // Then apply search filter
    if (query) {
        filtered = filtered.filter(log => {
            const searchText = (
                log.item_name + ' ' + 
                (log.person || '') + ' ' + 
                log.action_type + ' ' +
                JSON.stringify(log.details)
            ).toLowerCase();
            return searchText.includes(query);
        });
    }
    
    renderLogs(filtered);
    
    // Update empty state message
    if (filtered.length === 0) {
        const emptyState = document.getElementById('emptyState');
        if (currentFilter !== 'all') {
            emptyState.innerHTML = `
                <i class="fa-solid fa-filter"></i>
                <p>No ${formatActionType(currentFilter)} activities found</p>
                <p>Try selecting a different filter.</p>
            `;
        } else {
            emptyState.innerHTML = `
                <i class="fa-solid fa-search"></i>
                <p>No matching logs found</p>
                <p>Try a different search term.</p>
            `;
        }
    }
}

// ==========================================
// 4. FILTER DROPDOWN FUNCTIONALITY
// ==========================================
function toggleFilterDropdown() {
    if (filterDropdown.style.display === 'none' || !filterDropdown.style.display) {
        filterDropdown.style.display = 'block';
    } else {
        filterDropdown.style.display = 'none';
    }
}

function setFilter(filterValue) {
    currentFilter = filterValue;
    
    // Update active state in dropdown
    document.querySelectorAll('.filter-option').forEach(option => {
        option.classList.remove('active');
        if (option.dataset.filter === filterValue) {
            option.classList.add('active');
        }
    });
    
    // Update filter button text
    if (filterValue === 'all') {
        filterBtn.innerHTML = '<i class="fa-solid fa-filter"></i> Filter';
    } else {
        filterBtn.innerHTML = `<i class="fa-solid fa-filter"></i> ${formatActionType(filterValue)}`;
    }
    
    // Hide dropdown
    filterDropdown.style.display = 'none';
    
    // Apply filter
    filterLogs();
}

function formatActionType(actionType) {
    const formats = {
        'all': 'All Activities',
        'CREATE': 'Created',
        'UPDATE_QUANTITY': 'Stock Added',
        'DISTRIBUTE': 'Distributed',
        'EDIT': 'Edited',
        'DELETE': 'Deleted'
    };
    return formats[actionType] || actionType;
}

// ==========================================
// 5. CLEAR ALL LOGS FUNCTIONALITY
// ==========================================
function openClearAllModal() {
    if (clearAllModal) {
        clearAllModal.style.display = 'flex';
    }
}

function closeClearAllModal() {
    if (clearAllModal) {
        clearAllModal.style.display = 'none';
    }
}

async function confirmClearAllLogs() {
    if (isClearing) return; // Prevent double submission
    isClearing = true;

    try {
        showLoading(true);
        
        // Delete all logs from the activity_logs table
        const { error } = await supabase
            .from('activity_logs')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (neq matches all valid UUIDs)

        if (error) throw error;

        // Clear the local array
        allLogs = [];
        
        // Update UI
        renderLogs([]);
        emptyState.style.display = 'block';
        logsContainer.style.display = 'none';
        
        // Close modal
        closeClearAllModal();
        
        // Show success message
        showNotification('All activity logs have been cleared successfully!');
        
    } catch (error) {
        console.error('Error clearing logs:', error);
        alert('Failed to clear logs. Please try again.');
    } finally {
        isClearing = false;
        showLoading(false);
    }
}

// ==========================================
// 6. EXPORT FUNCTIONALITY
// ==========================================
function exportLogs() {

    // Prepare CSV data
    const headers = ['Date', 'Action', 'Item Name', 'Quantity Changed', 'Quantity Before', 'Quantity After', 'Person', 'Details'];
    const rows = allLogs.map(log => [
        new Date(log.timestamp).toLocaleString(),
        log.action_type,
        log.item_name,
        log.quantity_changed,
        log.quantity_before,
        log.quantity_after,
        log.person || '',
        JSON.stringify(log.details)
    ]);
    
    // Create CSV content
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `activity_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ==========================================
// 7. UI HELPER FUNCTIONS
// ==========================================
function showLoading(show) {

    loadingState.style.display = show ? 'block' : 'none';
    if (show) {
        logsContainer.style.display = 'none';
        emptyState.style.display = 'none';
    }
}

function showError(message) {
    errorState.style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
    logsContainer.style.display = 'none';
    emptyState.style.display = 'none';
}

function hideError() {
    errorState.style.display = 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


// ==========================================
// 7. EVENT LISTENERS
// ==========================================
if (logSearch) {

    logSearch.addEventListener('input', filterLogs);
}

if (clearSearch) {
    clearSearch.addEventListener('click', function() {
        logSearch.value = '';
        filterLogs();
        logSearch.focus();
    });
}

if (filterBtn) {
    filterBtn.addEventListener('click', toggleFilterDropdown);
}

if (exportBtn) {
    exportBtn.addEventListener('click', exportLogs);
}

if (clearAllBtn) {
    clearAllBtn.addEventListener('click', openClearAllModal);
}

// Close modal when clicking outside
if (clearAllModal) {
    clearAllModal.addEventListener('click', function(e) {
        if (e.target === clearAllModal) {
            closeClearAllModal();
        }
    });
}


// Close filter dropdown when clicking outside
document.addEventListener('click', function(e) {
    if (filterBtn && filterDropdown) {
        if (!filterBtn.contains(e.target) && !filterDropdown.contains(e.target)) {
            filterDropdown.style.display = 'none';
        }
    }
});

// ==========================================
// 8. INITIALIZE - LOAD LOGS ON PAGE LOAD
// ==========================================
fetchActivityLogs();

// Make functions available globally
window.fetchActivityLogs = fetchActivityLogs;
window.toggleFilterDropdown = toggleFilterDropdown;
window.setFilter = setFilter;
window.exportLogs = exportLogs;
window.openClearAllModal = openClearAllModal;
window.closeClearAllModal = closeClearAllModal;
window.confirmClearAllLogs = confirmClearAllLogs;
