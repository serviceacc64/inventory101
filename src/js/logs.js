// Import Supabase client
import { supabase } from './supabase.js';
import { showNotification, fadeIn } from './animate.js';

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
const logsSummaryGrid = document.getElementById('logsSummaryGrid');

let allLogs = [];
let currentFilter = 'all';
let isClearing = false;

function openModal(modal) {
    if (!modal) return;
    modal.classList.add('show');
    modal.style.removeProperty('display');
}

function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('show');
    modal.style.removeProperty('display');
}

function wasUpdatedAfterCreate(createdAt, updatedAt) {
    if (!createdAt || !updatedAt) return false;
    return new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 2000;
}

function buildPersonnelLogs(personnel, personnelItems) {
    const personnelMap = Object.fromEntries(personnel.map(p => [p.id, p]));
    const logs = [];

    personnel.forEach(p => {
        logs.push({
            id: `personnel-create-${p.id}`,
            source: 'personnel',
            action_type: 'PERSONNEL_CREATE',
            item_name: p.employee_name,
            person: p.employee_id,
            timestamp: p.created_at,
            details: {
                school_level: p.school_level,
                department: p.department,
                position: p.position
            }
        });

        if (wasUpdatedAfterCreate(p.created_at, p.updated_at)) {
            logs.push({
                id: `personnel-update-${p.id}`,
                source: 'personnel',
                action_type: 'PERSONNEL_UPDATE',
                item_name: p.employee_name,
                person: p.employee_id,
                timestamp: p.updated_at,
                details: {
                    school_level: p.school_level,
                    department: p.department,
                    position: p.position
                }
            });
        }
    });

    personnelItems.forEach(item => {
        const emp = personnelMap[item.personnel_id];
        const employeeLabel = emp ? `${emp.employee_name} (${emp.employee_id})` : 'Unknown employee';

        logs.push({
            id: `personnel-issue-${item.id}`,
            source: 'personnel',
            action_type: 'PERSONNEL_ISSUE',
            item_name: item.item_name,
            person: employeeLabel,
            timestamp: item.created_at,
            quantity_changed: item.quantity,
            details: {
                units: item.units,
                condition: item.condition,
                unit_value: item.unit_value,
                school_level: emp?.school_level,
                department: emp?.department
            }
        });

        if (wasUpdatedAfterCreate(item.created_at, item.updated_at)) {
            logs.push({
                id: `personnel-item-update-${item.id}`,
                source: 'personnel',
                action_type: 'PERSONNEL_ITEM_UPDATE',
                item_name: item.item_name,
                person: employeeLabel,
                timestamp: item.updated_at,
                quantity_changed: item.quantity,
                details: {
                    units: item.units,
                    condition: item.condition,
                    unit_value: item.unit_value,
                    school_level: emp?.school_level,
                    department: emp?.department
                }
            });
        }
    });

    return logs;
}

async function fetchActivityLogs() {
    showLoading(true);
    hideError();

    try {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const [logsResult, personnelResult, itemsResult] = await Promise.all([
            supabase
                .from('activity_logs')
                .select('*')
                .gte('timestamp', oneYearAgo.toISOString())
                .order('timestamp', { ascending: false })
                .limit(200),
            supabase
                .from('personnel')
                .select('*')
                .order('created_at', { ascending: false }),
            supabase
                .from('personnel_items')
                .select('*')
                .order('created_at', { ascending: false })
        ]);

        if (logsResult.error) throw logsResult.error;
        if (personnelResult.error) throw personnelResult.error;
        if (itemsResult.error) throw itemsResult.error;

        const suppliesLogs = (logsResult.data || []).map(log => ({ ...log, source: 'supplies' }));
        const personnelLogs = buildPersonnelLogs(personnelResult.data || [], itemsResult.data || []);

        allLogs = [...suppliesLogs, ...personnelLogs]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 250);

        updateSummaryCounts(allLogs);
        applyFilterAndRender();

    } catch (error) {
        console.error('Error fetching activity logs:', error);
        showError('Failed to load activity logs. Please try again.');
    } finally {
        showLoading(false);
    }
}

function updateSummaryCounts(logs) {
    const suppliesCount = logs.filter(l => l.source === 'supplies').length;
    const personnelCount = logs.filter(l => l.source === 'personnel').length;

    const totalEl = document.getElementById('logsTotalCount');
    const suppliesEl = document.getElementById('logsSuppliesCount');
    const personnelEl = document.getElementById('logsPersonnelCount');

    if (totalEl) totalEl.textContent = logs.length.toLocaleString();
    if (suppliesEl) suppliesEl.textContent = suppliesCount.toLocaleString();
    if (personnelEl) personnelEl.textContent = personnelCount.toLocaleString();

    if (logsSummaryGrid) {
        logsSummaryGrid.style.display = logs.length > 0 ? 'grid' : 'none';
    }
}

function applyFilterAndRender() {
    const filtered = getFilteredLogs();
    renderLogs(filtered);
    updateEmptyState(filtered);
}

function getFilteredLogs() {
    let filtered = allLogs;
    const query = logSearch ? logSearch.value.trim().toLowerCase() : '';

    if (currentFilter === 'supplies') {
        filtered = filtered.filter(log => log.source === 'supplies');
    } else if (currentFilter === 'personnel') {
        filtered = filtered.filter(log => log.source === 'personnel');
    } else if (currentFilter !== 'all') {
        filtered = filtered.filter(log => log.action_type === currentFilter);
    }

    if (query) {
        filtered = filtered.filter(log => {
            const searchText = (
                (log.item_name || '') + ' ' +
                (log.person || '') + ' ' +
                log.action_type + ' ' +
                (log.source || '') + ' ' +
                JSON.stringify(log.details || {})
            ).toLowerCase();
            return searchText.includes(query);
        });
    }

    return filtered;
}

function updateEmptyState(filtered) {
    if (!emptyState) return;

    if (allLogs.length === 0) {
        emptyState.style.display = 'block';
        logsContainer.style.display = 'none';
        emptyState.innerHTML = `
            <i class="fa-solid fa-clipboard-list"></i>
            <p>No activity logs found</p>
            <p>Supplies changes and personnel events (new employees, issued equipment) will appear here.</p>
        `;
        if (logsSummaryGrid) logsSummaryGrid.style.display = 'none';
        return;
    }

    if (filtered.length === 0) {
        emptyState.style.display = 'block';
        logsContainer.style.display = 'none';
        if (currentFilter !== 'all' || (logSearch && logSearch.value.trim())) {
            emptyState.innerHTML = `
                <i class="fa-solid fa-filter"></i>
                <p>No ${escapeHtml(formatActionType(currentFilter))} activities found</p>
                <p>Try a different filter or search term.</p>
            `;
        }
        return;
    }

    emptyState.style.display = 'none';
    logsContainer.style.display = 'block';
}

function getLogPresentation(log) {
    let iconClass = 'fa-info';
    let iconBg = 'background-color: rgba(158, 158, 158, 0.2); color: #9e9e9e;';
    let badgeClass = 'activity-badge';
    let badgeText = log.action_type;
    let actionDescription = '';

    switch (log.action_type) {
        case 'CREATE':
            iconClass = 'fa-plus';
            iconBg = 'background-color: rgba(76, 175, 80, 0.2); color: #4caf50;';
            badgeText = 'Created';
            actionDescription = `Created new item "${log.item_name}" with ${log.quantity_after} ${getUnitText(log)}`;
            break;

        case 'UPDATE_QUANTITY':
            iconClass = 'fa-arrow-up';
            iconBg = 'background-color: rgba(33, 150, 243, 0.2); color: #2196f3;';
            badgeClass = 'activity-badge updated';
            badgeText = 'Stock Added';
            {
                const poNum = log.details?.po_number ? ` (PO: ${log.details.po_number})` : '';
                actionDescription = `Added ${log.quantity_changed} ${getUnitText(log)} to "${log.item_name}"${poNum} (Stock: ${log.quantity_before} → ${log.quantity_after})`;
            }
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

        case 'PERSONNEL_CREATE':
            iconClass = 'fa-user-plus';
            iconBg = 'background-color: rgba(33, 150, 243, 0.2); color: #1565c0;';
            badgeClass = 'activity-badge';
            badgeText = 'New Employee';
            actionDescription = `Added employee "${log.item_name}" — ${log.details?.position || 'N/A'} (${log.details?.school_level || 'N/A'}, ${log.details?.department || 'N/A'})`;
            break;

        case 'PERSONNEL_UPDATE':
            iconClass = 'fa-user-pen';
            iconBg = 'background-color: rgba(33, 150, 243, 0.15); color: #1565c0;';
            badgeClass = 'activity-badge updated';
            badgeText = 'Employee Updated';
            actionDescription = `Updated profile for "${log.item_name}" (${log.details?.school_level || 'N/A'}, ${log.details?.department || 'N/A'})`;
            break;

        case 'PERSONNEL_ISSUE':
            iconClass = 'fa-box';
            iconBg = 'background-color: rgba(156, 39, 176, 0.2); color: #7b1fa2;';
            badgeClass = 'activity-badge';
            badgeText = 'Equipment Issued';
            actionDescription = `Issued ${log.quantity_changed || 0} ${log.details?.units || 'units'} of "${log.item_name}" to ${log.person}`;
            if (log.details?.condition) {
                actionDescription += ` (${log.details.condition})`;
            }
            break;

        case 'PERSONNEL_ITEM_UPDATE':
            iconClass = 'fa-pen-to-square';
            iconBg = 'background-color: rgba(156, 39, 176, 0.15); color: #7b1fa2;';
            badgeClass = 'activity-badge updated';
            badgeText = 'Equipment Updated';
            actionDescription = `Updated issued item "${log.item_name}" for ${log.person} (Qty: ${log.quantity_changed || 0} ${log.details?.units || 'units'})`;
            break;

        default:
            actionDescription = `Action on "${log.item_name || 'Unknown'}"`;
    }

    return { iconClass, iconBg, badgeClass, badgeText, actionDescription };
}

function renderLogs(logs) {
    logsContainer.innerHTML = '';

    logs.forEach(log => {
        const logEl = document.createElement('div');
        logEl.className = 'activity-item';

        const { iconClass, iconBg, badgeClass, badgeText, actionDescription } = getLogPresentation(log);
        const timestamp = log.timestamp
            ? new Date(log.timestamp).toLocaleString()
            : 'Unknown date';
        const sourceLabel = log.source === 'personnel' ? 'Personnel' : 'Supplies';
        const sourceClass = log.source === 'personnel' ? 'personnel' : 'supplies';

        logEl.innerHTML = `
            <div class="stat-icon" style="width: 50px; height: 50px; ${iconBg}">
                <i class="fa-solid ${iconClass}"></i>
            </div>
            <div class="activity-details">
                <p>${escapeHtml(actionDescription)}</p>
                <small>${escapeHtml(timestamp)}</small>
            </div>
            <div class="activity-meta">
                <span class="activity-source-badge ${sourceClass}">${sourceLabel}</span>
                <span class="${badgeClass}">${badgeText}</span>
            </div>
        `;

        logsContainer.appendChild(logEl);
        fadeIn(logEl);
    });
}

function getUnitText(log) {
    if (log.details && log.details.unit) {
        return log.details.unit;
    }
    return 'units';
}

function filterLogs() {
    applyFilterAndRender();
}

function toggleFilterDropdown() {
    if (filterDropdown.style.display === 'none' || !filterDropdown.style.display) {
        filterDropdown.style.display = 'block';
    } else {
        filterDropdown.style.display = 'none';
    }
}

function setFilter(filterValue) {
    currentFilter = filterValue;

    document.querySelectorAll('.filter-option').forEach(option => {
        option.classList.remove('active');
        if (option.dataset.filter === filterValue) {
            option.classList.add('active');
        }
    });

    if (filterValue === 'all') {
        filterBtn.innerHTML = '<i class="fa-solid fa-filter"></i> Filter';
    } else {
        filterBtn.innerHTML = `<i class="fa-solid fa-filter"></i> ${formatActionType(filterValue)}`;
    }

    filterDropdown.style.display = 'none';
    filterLogs();
}

function formatActionType(actionType) {
    const formats = {
        all: 'All Activities',
        supplies: 'All Supplies',
        personnel: 'All Personnel',
        CREATE: 'Created',
        UPDATE_QUANTITY: 'Stock Added',
        DISTRIBUTE: 'Distributed',
        EDIT: 'Edited',
        DELETE: 'Deleted',
        PERSONNEL_CREATE: 'New Employees',
        PERSONNEL_UPDATE: 'Updated Employees',
        PERSONNEL_ISSUE: 'Equipment Issued',
        PERSONNEL_ITEM_UPDATE: 'Equipment Updated'
    };
    return formats[actionType] || actionType;
}

function openClearAllModal() {
    openModal(clearAllModal);
}

function closeClearAllModal() {
    closeModal(clearAllModal);
}

async function confirmClearAllLogs() {
    if (isClearing) return;
    isClearing = true;

    try {
        showLoading(true);

        const { error } = await supabase
            .from('activity_logs')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        if (error) throw error;

        const personnelLogs = allLogs.filter(log => log.source === 'personnel');
        allLogs = personnelLogs;

        updateSummaryCounts(allLogs);
        applyFilterAndRender();
        closeClearAllModal();
        showNotification('Supplies activity logs cleared. Personnel activity remains.', 'success');

    } catch (error) {
        console.error('Error clearing logs:', error);
        showNotification('Failed to clear supplies logs. Please try again.', 'error');
    } finally {
        isClearing = false;
        showLoading(false);
    }
}

function exportLogs() {
    const logsToExport = getFilteredLogs();

    if (logsToExport.length === 0) {
        showNotification('No logs to export for the current filter.', 'warning');
        return;
    }

    const headers = ['Date', 'Source', 'Action', 'Name / Item', 'Quantity', 'Person / Employee', 'Details'];
    const rows = logsToExport.map(log => [
        new Date(log.timestamp).toLocaleString(),
        log.source === 'personnel' ? 'Personnel' : 'Supplies',
        formatActionType(log.action_type),
        log.item_name || '',
        log.quantity_changed ?? '',
        log.person || '',
        JSON.stringify(log.details || {})
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `activity_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification(`Exported ${logsToExport.length} log entries.`, 'success');
}

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
    if (logsSummaryGrid) logsSummaryGrid.style.display = 'none';
}

function hideError() {
    errorState.style.display = 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

if (logSearch) {
    logSearch.addEventListener('input', filterLogs);
}

if (clearSearch) {
    clearSearch.addEventListener('click', () => {
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

if (clearAllModal) {
    clearAllModal.addEventListener('click', (e) => {
        if (e.target === clearAllModal) {
            closeClearAllModal();
        }
    });
}

document.addEventListener('click', (e) => {
    if (filterBtn && filterDropdown) {
        if (!filterBtn.contains(e.target) && !filterDropdown.contains(e.target)) {
            filterDropdown.style.display = 'none';
        }
    }
});

fetchActivityLogs();

window.fetchActivityLogs = fetchActivityLogs;
window.toggleFilterDropdown = toggleFilterDropdown;
window.setFilter = setFilter;
window.exportLogs = exportLogs;
window.openClearAllModal = openClearAllModal;
window.closeClearAllModal = closeClearAllModal;
window.confirmClearAllLogs = confirmClearAllLogs;
