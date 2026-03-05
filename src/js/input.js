// Import Supabase client
import { supabase } from './supabase.js';

// DOM Elements
const itemsContainer = document.getElementById('itemsContainer');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const emptyState = document.getElementById('emptyState');
const selectItemModal = document.getElementById('selectItemModal');
const editItemModal = document.getElementById('editItemModal');
const itemSearch = document.getElementById('itemSearch');
const clearSearch = document.getElementById('clearSearch');
const modalItemSearch = document.getElementById('modalItemSearch');
const clearModalSearch = document.getElementById('clearModalSearch');
const selectableItemsList = document.getElementById('selectableItemsList');
const selectedItemDetails = document.getElementById('selectedItemDetails');
const selectedItemId = document.getElementById('selectedItemId');
const selectedItemName = document.getElementById('selectedItemName');
const selectedItemCurrentStock = document.getElementById('selectedItemCurrentStock');
const addQuantity = document.getElementById('addQuantity');
const editItemLabel = document.getElementById('editItemLabel');
const editItemUnitGroup = document.getElementById('editItemUnitGroup');
const editItemUnit = document.getElementById('editItemUnit');
const createItemModal = document.getElementById('createItemModal');
const newItemLabel = document.getElementById('newItemLabel');
const newItemUnitGroup = document.getElementById('newItemUnitGroup');
const newItemUnit = document.getElementById('newItemUnit');

// Get Item Modal Elements
const getItemModal = document.getElementById('getItemModal');
const getItemSearch = document.getElementById('getItemSearch');
const clearGetItemSearch = document.getElementById('clearGetItemSearch');
const getItemSelectableList = document.getElementById('getItemSelectableList');
const getItemDetails = document.getElementById('getItemDetails');
const getItemSelectedId = document.getElementById('getItemSelectedId');
const getItemSelectedName = document.getElementById('getItemSelectedName');
const getItemSelectedStock = document.getElementById('getItemSelectedStock');
const getItemPerson = document.getElementById('getItemPerson');
const getItemQuantity = document.getElementById('getItemQuantity');
const getItemTimestamp = document.getElementById('getItemTimestamp');

// View Item Modal Elements
const viewItemModal = document.getElementById('viewItemModal');
const viewItemName = document.getElementById('viewItemName');
const viewItemLabel = document.getElementById('viewItemLabel');
const viewItemUnit = document.getElementById('viewItemUnit');
const viewItemQuantity = document.getElementById('viewItemQuantity');
const viewItemPO = document.getElementById('viewItemPO');
const viewItemUpdatedAt = document.getElementById('viewItemUpdatedAt');




// Store all items for search functionality
let allItems = [];
let currentFilter = 'all'; // Track current category filter
let isSubmitting = false; // Prevent double submission


// ==========================================
// ACTIVITY LOGGING HELPER FUNCTION
// ==========================================
// NOTE: This function is ONLY used for DISTRIBUTE actions.
// CREATE, UPDATE_QUANTITY, EDIT, and DELETE are automatically
async function logActivity(actionType, itemId, itemName, quantityChanged, quantityBefore, quantityAfter, person = null, details = null, customTimestamp = null) {
    try {
        // Use custom timestamp if provided, otherwise use current time
        const timestamp = customTimestamp ? new Date(customTimestamp).toISOString() : new Date().toISOString();
        
        const { error } = await supabase
            .from('activity_logs')
            .insert([{
                action_type: actionType,
                item_id: itemId,
                item_name: itemName,
                quantity_changed: quantityChanged,
                quantity_before: quantityBefore,
                quantity_after: quantityAfter,
                person: person,
                details: details,
                timestamp: timestamp
            }]);

        if (error) {
            console.warn('Failed to log activity:', error);
            // Don't throw - logging failures shouldn't break main operations
        }
    } catch (error) {
        console.warn('Error logging activity:', error);
    }
}



// ==========================================
// 1. FETCH ITEMS FROM SUPABASE
// ==========================================
async function fetchItems() {
    showLoading(true);
    hideError();
    
    try {
        const { data: items, error } = await supabase
            .from('items')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allItems = items || [];
        renderItems(allItems);
        
        // Show empty state if no items
        if (allItems.length === 0) {
            emptyState.style.display = 'block';
            itemsContainer.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            itemsContainer.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error fetching items:', error);
        showError('Failed to load items. Please try again.');
    } finally {
        showLoading(false);
    }
}

// ==========================================
// 2. RENDER ITEMS TO THE PAGE
// ==========================================
function renderItems(items) {
    itemsContainer.innerHTML = '';
    
    items.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'activity-item';
        itemEl.dataset.itemId = item.id;
        
        // Determine stock status
        let statusClass = 'activity-badge';
        let statusText = 'In Stock';
        let iconBg = 'background-color: rgba(76, 175, 80, 0.2); color: #4caf50;';
        
        if (item.quantity <= 0) {
            statusClass = 'activity-badge removed';
            statusText = 'Out of Stock';
            iconBg = 'background-color: rgba(244, 67, 54, 0.2); color: #f44336;';
        } else if (item.quantity < 20) {
            statusClass = 'activity-badge low';
            statusText = 'Low Stock';
            iconBg = 'background-color: rgba(255, 152, 0, 0.2); color: #ff9800;';
        }


        
        // Format date
        const updatedAt = item.updated_at 
            ? new Date(item.updated_at).toLocaleDateString() 
            : 'Recently';
        
        // Build display text with unit for Janitorial and Office Supplies items
        let stockText = `Stock: <span class="quantity-display">${item.quantity}</span>`;
        if ((item.label === 'Janitorial' || item.label === 'Office Supplies') && item.unit) {
            stockText += ` ${escapeHtml(item.unit)}`;
        } else {
            stockText += ' units';
        }
        
        itemEl.innerHTML = `
            <div class="stat-icon" style="width: 50px; height: 50px; ${iconBg}">
                <i class="fa-solid fa-box"></i>
            </div>
            <div class="activity-details">
                <p>${escapeHtml(item.name)} ${item.label ? '- ' + escapeHtml(item.label) : ''}</p>
                <small>${stockText} | Last updated: ${updatedAt}</small>
            </div>

            <div style="display: flex; gap: 10px; align-items: center;">
                <span class="${statusClass}">${statusText}</span>
                <button onclick="window.openEditModal('${item.id}')" class="btn btn-secondary" style="padding: 5px 10px; font-size: 12px;" title="Edit Item">
                    <i class="fa-solid fa-edit"></i>
                </button>
                <button onclick="window.deleteItem('${item.id}')" class="btn btn-secondary" style="padding: 5px 10px; font-size: 12px; color: #f44336;" title="Delete Item">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;

        // Clicking the card (except on action buttons) opens the view modal
        itemEl.addEventListener('click', function(e) {
            if (e.target.closest('button') || e.target.closest('.btn')) {
                return; // let buttons handle their own onclicks
            }
            openViewItemModal(item.id);
        });

        itemsContainer.appendChild(itemEl);
    });
}

// ==========================================
// 3. SELECT ITEM MODAL FUNCTIONS
// ==========================================
function openSelectItemModal() {
    selectItemModal.style.display = 'flex';
    renderSelectableItems(allItems);
    // Reset selection view
    selectedItemDetails.style.display = 'none';
    selectableItemsList.style.display = 'block';
    if (modalItemSearch) modalItemSearch.value = '';
}

function closeSelectItemModal() {
    selectItemModal.style.display = 'none';
    // Reset form
    if (addQuantity) addQuantity.value = '';
    if (document.getElementById('addPO')) document.getElementById('addPO').value = '';
    cancelSelection();
}

function renderSelectableItems(items) {
    if (!selectableItemsList) return;
    
    selectableItemsList.innerHTML = '';
    
    if (items.length === 0) {
        selectableItemsList.innerHTML = `
            <div class="empty-state" style="padding: 20px;">
                <i class="fa-solid fa-box-open"></i>
                <p>No items found</p>
            </div>
        `;
        return;
    }
    
    
    items.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'selectable-item';
        itemEl.dataset.itemId = item.id;
        itemEl.onclick = () => selectItem(item);
        
        // Format stock text
        let stockText = `Stock: ${item.quantity}`;
        if ((item.label === 'Janitorial' || item.label === 'Office Supplies') && item.unit) {
            stockText += ` ${escapeHtml(item.unit)}`;
        } else {
            stockText += ' units';
        }
        
        itemEl.innerHTML = `
            <div class="selectable-item-icon">
                <i class="fa-solid fa-box"></i>
            </div>
            <div class="selectable-item-info">
                <h4>${escapeHtml(item.name)}</h4>
                <p>${escapeHtml(item.label || 'No Category')} | ${stockText}</p>
            </div>
            <div class="selectable-item-action">
                <i class="fa-solid fa-chevron-right"></i>
            </div>
        `;
        
        selectableItemsList.appendChild(itemEl);
    });
}

function filterSelectableItems() {
    const query = modalItemSearch.value.trim().toLowerCase();
    
    let filtered = allItems;
    
    if (query) {
        filtered = allItems.filter(item => {
            const searchText = (item.name + ' ' + (item.label || '')).toLowerCase();
            return searchText.includes(query);
        });
    }
    
    renderSelectableItems(filtered);
}

function selectItem(item) {
    // Hide list, show details
    selectableItemsList.style.display = 'none';
    selectedItemDetails.style.display = 'block';

    // Populate details
    selectedItemId.value = item.id;
    selectedItemName.textContent = item.name;

    let stockText = `Current Stock: ${item.quantity}`;
    if ((item.label === 'Janitorial' || item.label === 'Office Supplies') && item.unit) {
        stockText += ` ${item.unit}`;
    } else {
        stockText += ' units';
    }
    selectedItemCurrentStock.textContent = stockText;

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('addDate').value = today;
    
    // Reset P.O. Number field
    document.getElementById('addPO').value = '';

    // Focus on quantity input
    setTimeout(() => {
        if (addQuantity) addQuantity.focus();
    }, 100);
}

function cancelSelection() {
    selectedItemDetails.style.display = 'none';
    selectableItemsList.style.display = 'block';
    if (addQuantity) addQuantity.value = '';
    if (selectedItemId) selectedItemId.value = '';
}

// ==========================================
// VIEW ITEM MODAL
// ==========================================
function openViewItemModal(itemId) {
    const item = allItems.find(i => i.id === itemId);
    if (!item) return;

    if (viewItemName) viewItemName.textContent = item.name;
    if (viewItemLabel) viewItemLabel.textContent = item.label || 'No Category';
    if (viewItemUnit) viewItemUnit.textContent = item.unit || '-';
    if (viewItemQuantity) viewItemQuantity.textContent = `${item.quantity}${item.unit ? ' ' + item.unit : ' units'}`;
    if (viewItemPO) viewItemPO.textContent = item.po_number || '-';
    const updated = item.updated_at || item.created_at || null;
    if (viewItemUpdatedAt) viewItemUpdatedAt.textContent = updated ? new Date(updated).toLocaleString() : 'N/A';

    // store current viewed item id for action buttons
    if (viewItemModal) {
        viewItemModal.style.display = 'flex';
        viewItemModal.dataset.itemId = item.id;
    }

    // Fetch and display item history
    fetchItemHistory(itemId);

    // wire action buttons
    const editBtn = document.getElementById('viewEditBtn');
    const addStockBtn = document.getElementById('viewAddStockBtn');
    const getBtn = document.getElementById('viewGetBtn');

    if (editBtn) {
        editBtn.onclick = () => {
            closeViewItemModal();
            openEditModal(item.id);
        };
    }

    if (addStockBtn) {
        addStockBtn.onclick = () => {
            closeViewItemModal();
            // Open select modal and directly show selected item details
            openSelectItemModal();
            // small delay to ensure modal elements rendered
            setTimeout(() => {
                selectItem(item);
            }, 120);
        };
    }

    if (getBtn) {
        getBtn.onclick = () => {
            closeViewItemModal();
            openGetItemModal();
            setTimeout(() => {
                selectGetItem(item);
            }, 120);
        };
    }
}

function closeViewItemModal() {
    if (viewItemModal) viewItemModal.style.display = 'none';
}

// ==========================================
// VIEW ITEM HISTORY
// ==========================================
async function fetchItemHistory(itemId) {
    const historyList = document.getElementById('viewItemHistoryList');
    if (!historyList) return;
    
    try {
        // Fetch UPDATE_QUANTITY and CREATE activities for this specific item
        const { data: logs, error } = await supabase
            .from('activity_logs')
            .select('*')
            .eq('item_id', itemId)
            .in('action_type', ['UPDATE_QUANTITY', 'CREATE'])
            .order('timestamp', { ascending: false });
        
        if (error) throw error;
        
        if (!logs || logs.length === 0) {
            historyList.innerHTML = '<p class="history-empty">No stock history available</p>';
            return;
        }
        
        // Get today's date at midnight for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Filter out entries with automatic date selection (1999 only)
        // Keep entries where user selected a date (after 1999-12-31)
        const userSelectedLogs = logs.filter(log => {
            if (!log.timestamp) return false;
            const logDate = new Date(log.timestamp);
            logDate.setHours(0, 0, 0, 0);
            // Keep entries where date is after 1999 (user selected a valid past date)
            const year1999 = new Date('1999-12-31');
            return logDate > year1999;
        });
        
        // If no user-selected date entries, fall back to showing auto-dated entries
        const displayLogs = userSelectedLogs.length > 0 ? userSelectedLogs : logs;
        
        // Group by date (YYYY-MM-DD) and action_type to show unique entries per day
        const groupedLogs = {};
        displayLogs.forEach(log => {
            const dateKey = log.timestamp ? new Date(log.timestamp).toISOString().split('T')[0] : 'unknown';
            const key = `${dateKey}_${log.action_type}`;
            
            // Only keep the first (most recent) entry for each date + action_type combination
            if (!groupedLogs[key]) {
                groupedLogs[key] = log;
            }
        });
        
        // Convert back to array and sort by timestamp
        const uniqueLogs = Object.values(groupedLogs).sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        if (uniqueLogs.length === 0) {
            historyList.innerHTML = '<p class="history-empty">No stock history with user-selected dates</p>';
            return;
        }
        
        // Build the history HTML
        let historyHtml = '<div class="history-table-wrapper"><table class="history-table"><thead><tr><th>Date</th><th>P.O. Number</th><th>Qty Added</th><th>Type</th></tr></thead><tbody>';
        
        uniqueLogs.forEach(log => {
            const date = log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A';
            const poNumber = log.details?.po_number || '-';
            const isCreate = log.action_type === 'CREATE';
            const quantityAdded = isCreate ? `+${log.quantity_after}` : (log.quantity_changed > 0 ? `+${log.quantity_changed}` : log.quantity_changed);
            const typeLabel = isCreate ? 'Created' : 'Added';
            
            historyHtml += `
                <tr>
                    <td>${escapeHtml(date)}</td>
                    <td>${escapeHtml(poNumber)}</td>
                    <td class="quantity-added">${escapeHtml(String(quantityAdded))}</td>
                    <td><span class="activity-badge">${escapeHtml(typeLabel)}</span></td>
                </tr>
            `;
        });
        
        historyHtml += '</tbody></table></div>';
        historyList.innerHTML = historyHtml;
        
    } catch (error) {
        console.error('Error fetching item history:', error);
        historyList.innerHTML = '<p class="history-error">Failed to load history</p>';
    }
}

async function handleUpdateQuantity(event) {
    event.preventDefault();
    
    // Get form element immediately
    const form = event.target;
    
    // Prevent double submission - check both flag and form class
    if (isSubmitting || form.classList.contains('submitting')) {
        console.log('Submission blocked - already in progress');
        return false;
    }
    
    // Set submission lock IMMEDIATELY (before validation to prevent race conditions)
    isSubmitting = true;
    form.classList.add('submitting');
    
    // Get the submit button and disable it immediately
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';
    }
    
    const allFormInputs = form.querySelectorAll('input, button, textarea, select');
    
    // Disable all form inputs except submit button (already disabled)
    allFormInputs.forEach(input => {
        if (input !== submitBtn) {
            input.disabled = true;
        }
    });
    
    // Now do validation
    const itemId = selectedItemId.value;
    const quantityToAdd = parseInt(addQuantity.value);
    const selectedDate = document.getElementById('addDate').value;
    const poNumber = document.getElementById('addPO').value.trim();
    
    if (!itemId || isNaN(quantityToAdd) || quantityToAdd < 1 || !selectedDate) {
        alert('Please fill in all required fields');
        // Reset submission lock on validation failure
        isSubmitting = false;
        form.classList.remove('submitting');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
        allFormInputs.forEach(input => {
            input.disabled = false;
        });
        return false;
    }

    
    try {
        // Get current item data
        const item = allItems.find(i => i.id === itemId);
        if (!item) {
            alert('Item not found');
            return false;
        }

        
        const oldQuantity = item.quantity;
        // Calculate new quantity (backend handles the math)
        const newQuantity = item.quantity + quantityToAdd;
        
        const updateData = { 
            quantity: newQuantity,
            updated_at: new Date(selectedDate).toISOString()
        };
        
        // Add P.O. Number if provided
        if (poNumber) {
            updateData.po_number = poNumber;
        }
        
        const { error } = await supabase
            .from('items')
            .update(updateData)
            .eq('id', itemId);
        
        if (error) throw error;
        
        // Close modal and refresh
        closeSelectItemModal();
        await fetchItems();
        alert(`Successfully added ${quantityToAdd} units to ${item.name}. New stock: ${newQuantity}`);
        
    } catch (error) {
        console.error('Error updating quantity:', error);
        alert('Failed to update quantity. Please try again.');
    } finally {
        // Reset submission lock and button state
        isSubmitting = false;
        form.classList.remove('submitting');
        
        // Re-enable form inputs
        allFormInputs.forEach(input => {
            input.disabled = false;
        });
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText || '<i class="fa-solid fa-plus"></i> Add to Stock';
        }
    }
    
    return false;
}




// ==========================================
// 3b. CREATE NEW ITEM FUNCTIONS
// ==========================================
function openCreateItemModal() {
    // Close the select item modal first
    closeSelectItemModal();
    createItemModal.style.display = 'flex';
}

function closeCreateItemModal() {
    createItemModal.style.display = 'none';
    document.getElementById('createItemForm').reset();
    // Reset unit field visibility
    if (newItemUnitGroup) {
        newItemUnitGroup.style.display = 'none';
        newItemUnit.required = false;
    }
    // Reset date field
    document.getElementById('newItemDate').value = '';
}

async function handleCreateItem(event) {
    event.preventDefault();
    
    const name = document.getElementById('newItemName').value.trim();
    const label = document.getElementById('newItemLabel').value.trim();
    const quantity = parseInt(document.getElementById('newItemQuantity').value);
    const unit = document.getElementById('newItemUnit').value.trim();
    const poNumber = document.getElementById('newItemPO').value.trim();
    const itemDate = document.getElementById('newItemDate').value;
    
    if (!name || isNaN(quantity)) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Validate unit is provided for Janitorial and Office Supplies items
    if ((label === 'Janitorial' || label === 'Office Supplies') && !unit) {
        alert('Please specify the unit for ' + label + ' items');
        return;
    }
    
    try {
        const insertData = { 
            name: name, 
            label: label, 
            quantity: quantity 
        };
        
        // Add unit for Janitorial and Office Supplies items
        if (label === 'Janitorial' || label === 'Office Supplies') {
            insertData.unit = unit;
        }
        
        // Add P.O. Number if provided
        if (poNumber) {
            insertData.po_number = poNumber;
        }
        
        // Use custom date if provided, otherwise use current date
        if (itemDate) {
            const dateStr = new Date(itemDate).toISOString();
            insertData.created_at = dateStr;
            insertData.updated_at = dateStr;
        }
        
        const { data, error } = await supabase
            .from('items')
            .insert([insertData])
            .select();
        
        if (error) throw error;
        
        // Log the item creation activity
        if (data && data.length > 0) {
            const newItem = data[0];
            await logActivity(
                'CREATE',
                newItem.id,
                newItem.name,
                newItem.quantity,
                0,
                newItem.quantity,
                null,
                { label: newItem.label, unit: newItem.unit, po_number: poNumber || null },
                itemDate
            );
        }
        
        // Close modal and reset form
        closeCreateItemModal();
        document.getElementById('createItemForm').reset();
        
        // Refresh items list
        await fetchItems();
        
        alert('Item created successfully!');
        
    } catch (error) {
        console.error('Error creating item:', error);
        alert('Failed to create item. Please try again.');
    }
}


function toggleNewItemUnitField() {
    if (newItemLabel && newItemUnitGroup) {
        if (newItemLabel.value === 'Janitorial' || newItemLabel.value === 'Office Supplies') {
            newItemUnitGroup.style.display = 'block';
            newItemUnit.required = true;
        } else {
            newItemUnitGroup.style.display = 'none';
            newItemUnit.required = false;
            newItemUnit.value = '';
        }
    }
}



// ==========================================
// 4. EDIT ITEM
// ==========================================
function openEditModal(itemId) {
    const item = allItems.find(i => i.id === itemId);
    if (!item) return;
    
    document.getElementById('editItemId').value = item.id;
    document.getElementById('editItemName').value = item.name;
    document.getElementById('editItemLabel').value = item.label || '';
    document.getElementById('editItemQuantity').value = item.quantity;
    
    // Handle unit field visibility and value for Janitorial and Office Supplies items
    const editItemUnitGroup = document.getElementById('editItemUnitGroup');
    const editItemUnit = document.getElementById('editItemUnit');
    
    if (item.label === 'Janitorial' || item.label === 'Office Supplies') {
        editItemUnitGroup.style.display = 'block';
        editItemUnit.value = item.unit || '';
    } else {
        editItemUnitGroup.style.display = 'none';
        editItemUnit.value = '';
    }
    
    // Populate the date field with the item's existing date (if available)
    const editItemDate = document.getElementById('editItemDate');
    if (item.created_at) {
        const itemDate = new Date(item.created_at);
        editItemDate.value = itemDate.toISOString().split('T')[0];
    } else {
        editItemDate.value = '';
    }
    
    editItemModal.style.display = 'flex';
}


function closeEditModal() {
    editItemModal.style.display = 'none';
    // Reset date field
    document.getElementById('editItemDate').value = '';
}

async function handleEditItem(event) {
    event.preventDefault();
    
    const itemId = document.getElementById('editItemId').value;
    const name = document.getElementById('editItemName').value.trim();
    const label = document.getElementById('editItemLabel').value.trim();
    const quantity = parseInt(document.getElementById('editItemQuantity').value);
    const unit = document.getElementById('editItemUnit').value.trim();
    const editItemDate = document.getElementById('editItemDate').value;
    
    if (!name || isNaN(quantity)) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Validate unit is provided for Janitorial and Office Supplies items
    if ((label === 'Janitorial' || label === 'Office Supplies') && !unit) {
        alert('Please specify the unit for ' + label + ' items');
        return;
    }
    
    try {
        // Get current item data before update
        const currentItem = allItems.find(i => i.id === itemId);
        if (!currentItem) {
            alert('Item not found');
            return;
        }
        
        const updateData = { 
            name: name,
            label: label,
            quantity: quantity
        };
        
        // Add or remove unit based on category
        if (label === 'Janitorial' || label === 'Office Supplies') {
            updateData.unit = unit;
        } else {
            updateData.unit = null;
        }
        
        // Use custom date if provided, otherwise use current date
        if (editItemDate) {
            const dateStr = new Date(editItemDate).toISOString();
            updateData.created_at = dateStr;
            updateData.updated_at = dateStr;
        } else {
            updateData.updated_at = new Date().toISOString();
        }
        
        const { error } = await supabase
            .from('items')
            .update(updateData)
            .eq('id', itemId);

        
        if (error) throw error;
        
        closeEditModal();
        await fetchItems();
        alert('Item updated successfully!');
        
    } catch (error) {
        console.error('Error updating item:', error);
        alert('Failed to update item. Please try again.');
    }
}


// ==========================================
// 5b. GET ITEM FUNCTIONS
// ==========================================
function openGetItemModal() {
    getItemModal.style.display = 'flex';
    renderGetItemSelectableItems(allItems);
    // Reset selection view
    getItemDetails.style.display = 'none';
    getItemSelectableList.style.display = 'block';
    if (getItemSearch) getItemSearch.value = '';
    
    // Set default timestamp to current date/time
    if (getItemTimestamp) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        getItemTimestamp.value = now.toISOString().slice(0, 16);
    }
}

function closeGetItemModal() {
    getItemModal.style.display = 'none';
    // Reset form
    if (getItemPerson) getItemPerson.value = '';
    if (getItemQuantity) getItemQuantity.value = '';
    cancelGetItemSelection();
}

function renderGetItemSelectableItems(items) {
    if (!getItemSelectableList) return;
    
    getItemSelectableList.innerHTML = '';
    
    // Only show items with quantity > 0
    const availableItems = items.filter(item => item.quantity > 0);
    
    if (availableItems.length === 0) {
        getItemSelectableList.innerHTML = `
            <div class="empty-state" style="padding: 20px;">
                <i class="fa-solid fa-box-open"></i>
                <p>No available items in stock</p>
            </div>
        `;
        return;
    }
    
    availableItems.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'selectable-item';
        itemEl.dataset.itemId = item.id;
        itemEl.onclick = () => selectGetItem(item);
        
        // Format stock text
        let stockText = `Stock: ${item.quantity}`;
        if ((item.label === 'Janitorial' || item.label === 'Office Supplies') && item.unit) {
            stockText += ` ${escapeHtml(item.unit)}`;
        } else {
            stockText += ' units';
        }
        
        itemEl.innerHTML = `
            <div class="selectable-item-icon">
                <i class="fa-solid fa-box"></i>
            </div>
            <div class="selectable-item-info">
                <h4>${escapeHtml(item.name)}</h4>
                <p>${escapeHtml(item.label || 'No Category')} | ${stockText}</p>
            </div>
            <div class="selectable-item-action">
                <i class="fa-solid fa-chevron-right"></i>
            </div>
        `;
        
        getItemSelectableList.appendChild(itemEl);
    });
}

function filterGetItemSelectableItems() {
    const query = getItemSearch.value.trim().toLowerCase();
    
    let filtered = allItems.filter(item => item.quantity > 0);
    
    if (query) {
        filtered = filtered.filter(item => {
            const searchText = (item.name + ' ' + (item.label || '')).toLowerCase();
            return searchText.includes(query);
        });
    }
    
    renderGetItemSelectableItems(filtered);
}

function selectGetItem(item) {
    // Hide list, show details
    getItemSelectableList.style.display = 'none';
    getItemDetails.style.display = 'block';
    
    // Populate details
    getItemSelectedId.value = item.id;
    getItemSelectedName.textContent = item.name;
    
    let stockText = `Available Stock: ${item.quantity}`;
    if ((item.label === 'Janitorial' || item.label === 'Office Supplies') && item.unit) {
        stockText += ` ${item.unit}`;
    } else {
        stockText += ' units';
    }
    getItemSelectedStock.textContent = stockText;
    
    // Set max attribute for quantity input
    if (getItemQuantity) {
        getItemQuantity.max = item.quantity;
    }
    
    // Focus on person input
    setTimeout(() => {
        if (getItemPerson) getItemPerson.focus();
    }, 100);
}

function cancelGetItemSelection() {
    getItemDetails.style.display = 'none';
    getItemSelectableList.style.display = 'block';
    if (getItemPerson) getItemPerson.value = '';
    if (getItemQuantity) getItemQuantity.value = '';
    if (getItemSelectedId) getItemSelectedId.value = '';
}

async function handleGetItemSubmit(event) {
    event.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) {
        console.log('Submission blocked - already in progress');
        return false;
    }
    
    const form = event.target;
    if (form.classList.contains('submitting')) {
        console.log('Submission blocked - form marked as submitting');
        return false;
    }
    
    const itemId = getItemSelectedId.value;
    const person = getItemPerson.value.trim();
    const quantity = parseInt(getItemQuantity.value);
    const timestamp = getItemTimestamp.value;
    
    if (!itemId || !person || isNaN(quantity) || quantity < 1 || !timestamp) {
        alert('Please fill in all required fields');
        return false;
    }
    
    // Get current item data
    const item = allItems.find(i => i.id === itemId);
    if (!item) {
        alert('Item not found');
        return false;
    }
    
    // Validate quantity doesn't exceed available stock
    if (quantity > item.quantity) {
        alert(`Cannot get ${quantity} units. Only ${item.quantity} units available in stock.`);
        return false;
    }
    
    // Set submission lock
    isSubmitting = true;
    form.classList.add('submitting');
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
    const allFormInputs = form.querySelectorAll('input, button, textarea, select');
    
    // Disable all form inputs
    allFormInputs.forEach(input => {
        if (input !== submitBtn) {
            input.disabled = true;
        }
    });
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    }
    
    try {
        const oldQuantity = item.quantity;
        // Step 1: Update item quantity (decrease by taken amount)
        const newQuantity = item.quantity - quantity;
        const { error: updateError } = await supabase
            .from('items')
            .update({ 
                quantity: newQuantity,
                updated_at: new Date().toISOString()
            })
            .eq('id', itemId);
        
        if (updateError) {
            console.error('Error updating item quantity:', updateError);
            alert('Failed to update item stock. Please try again.');
            return false;
        }
        
        // Step 2: Try to create distribution record (legacy table)

        // Note: This requires the item_distributions table to exist

        try {
            const { error: distError } = await supabase
                .from('item_distributions')
                .insert([{
                    item_id: itemId,
                    item_name: item.name,
                    person: person,
                    quantity: quantity,
                    timestamp: timestamp,
                    created_at: new Date().toISOString()
                }]);
            
            if (distError) {
                // If table doesn't exist, log warning but don't fail the operation
                console.warn('Could not create distribution record (table may not exist):', distError);
                console.log('To enable distribution tracking, create the item_distributions table in Supabase.');
            }
        } catch (distCatchError) {
            // Distribution table likely doesn't exist - log but don't fail
            console.warn('Distribution table not available:', distCatchError);
        }

        // Step 3: Log the activity to activity_logs table for logs page display
        await logActivity(
            'DISTRIBUTE',
            itemId,
            item.name,
            -quantity,  // Negative quantity to indicate removal
            oldQuantity,
            newQuantity,
            person,
            { label: item.label, unit: item.unit }
        );

        // Close modal and refresh

        closeGetItemModal();
        await fetchItems();
        alert(`Successfully recorded: ${person} got ${quantity} ${item.unit || 'units'} of ${item.name}`);
        
    } catch (error) {
        console.error('Error distributing item:', error);
        alert('Failed to process item distribution. Please try again.');
    } finally {
        // Reset submission lock and button state
        isSubmitting = false;
        form.classList.remove('submitting');
        
        // Re-enable form inputs
        allFormInputs.forEach(input => {
            input.disabled = false;
        });
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText || '<i class="fa-solid fa-check"></i> Confirm Get Item';
        }
    }
    
    return false;
}


// ==========================================
// 5. DELETE ITEM
// ==========================================
async function deleteItem(itemId) {
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }
    
    try {
        // Get item data before deletion for logging
        const item = allItems.find(i => i.id === itemId);
        
        const { error } = await supabase
            .from('items')
            .delete()
            .eq('id', itemId);
        
        if (error) throw error;
        
        await fetchItems();

        alert('Item deleted successfully!');
        
    } catch (error) {
        console.error('Error deleting item:', error);
        alert('Failed to delete item. Please try again.');
    }
}


// ==========================================
// 6. UI HELPER FUNCTIONS
// ==========================================


function showLoading(show) {
    loadingState.style.display = show ? 'block' : 'none';
    if (show) {
        itemsContainer.style.display = 'none';
        emptyState.style.display = 'none';
    }
}

function showError(message) {
    errorState.style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
    itemsContainer.style.display = 'none';
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
// 7. SEARCH FUNCTIONALITY
// ==========================================
function filterItems() {
    const query = itemSearch.value.trim().toLowerCase();
    
    let filtered = allItems;
    
    // Apply category filter first
    if (currentFilter !== 'all') {
        filtered = allItems.filter(item => item.label === currentFilter);
    }
    
    // Then apply search filter
    if (query) {
        filtered = filtered.filter(item => {
            const searchText = (item.name + ' ' + (item.label || '')).toLowerCase();
            return searchText.includes(query);
        });
    }
    
    renderItems(filtered);
    
    // Update empty state message based on filter
    if (filtered.length === 0) {
        const emptyState = document.getElementById('emptyState');
        if (currentFilter !== 'all') {
            emptyState.innerHTML = `
                <i class="fa-solid fa-box-open"></i>
                <p>No ${currentFilter} items found</p>
                <p>Try selecting a different category or add a new item.</p>
            `;
        } else {
            emptyState.innerHTML = `
                <i class="fa-solid fa-box-open"></i>
                <p>No items found</p>
                <p>Click "Add Item" to create your first item.</p>
            `;
        }
    }
}

// ==========================================
// FILTER DROPDOWN FUNCTIONALITY
// ==========================================
function toggleFilterDropdown() {
    const dropdown = document.getElementById('filterDropdown');
    if (dropdown.style.display === 'none') {
        dropdown.style.display = 'block';
    } else {
        dropdown.style.display = 'none';
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
    const filterBtn = document.getElementById('filterBtn');
    if (filterValue === 'all') {
        filterBtn.innerHTML = '<i class="fa-solid fa-filter"></i> Filter';
    } else {
        filterBtn.innerHTML = `<i class="fa-solid fa-filter"></i> ${filterValue}`;
    }
    
    // Hide dropdown
    document.getElementById('filterDropdown').style.display = 'none';
    
    // Apply filter
    filterItems();
}

// Close filter dropdown when clicking outside
document.addEventListener('click', function(e) {
    const filterBtn = document.getElementById('filterBtn');
    const filterDropdown = document.getElementById('filterDropdown');
    
    if (filterBtn && filterDropdown) {
        if (!filterBtn.contains(e.target) && !filterDropdown.contains(e.target)) {
            filterDropdown.style.display = 'none';
        }
    }
});


// ==========================================
// 8. EVENT LISTENERS
// ==========================================
if (itemSearch) {
    itemSearch.addEventListener('input', filterItems);
}

if (clearSearch) {
    clearSearch.addEventListener('click', function() {
        itemSearch.value = '';
        filterItems();
        itemSearch.focus();
    });
}

// Close modals when clicking outside
selectItemModal.addEventListener('click', function(e) {
    if (e.target === selectItemModal) {
        closeSelectItemModal();
    }
});

createItemModal.addEventListener('click', function(e) {
    if (e.target === createItemModal) {
        closeCreateItemModal();
    }
});

editItemModal.addEventListener('click', function(e) {
    if (e.target === editItemModal) {
        closeEditModal();
    }
});

// View Item Modal outside click handler
if (viewItemModal) {
    viewItemModal.addEventListener('click', function(e) {
        if (e.target === viewItemModal) {
            closeViewItemModal();
        }
    });
}

// Get Item Modal Event Listeners
if (getItemModal) {
    getItemModal.addEventListener('click', function(e) {
        if (e.target === getItemModal) {
            closeGetItemModal();
        }
    });
}

if (getItemSearch) {
    getItemSearch.addEventListener('input', filterGetItemSelectableItems);
}

if (clearGetItemSearch) {
    clearGetItemSearch.addEventListener('click', function() {
        getItemSearch.value = '';
        filterGetItemSelectableItems();
        getItemSearch.focus();
    });
}


// ==========================================
// 10. MODAL SEARCH EVENT LISTENERS
// ==========================================
if (modalItemSearch) {
    modalItemSearch.addEventListener('input', filterSelectableItems);
}

if (clearModalSearch) {
    clearModalSearch.addEventListener('click', function() {
        modalItemSearch.value = '';
        filterSelectableItems();
        modalItemSearch.focus();
    });
}

// ==========================================
// 11. CREATE ITEM EVENT LISTENERS
// ==========================================
if (newItemLabel) {
    newItemLabel.addEventListener('change', toggleNewItemUnitField);
}




// ==========================================
// 9. INITIALIZE - LOAD ITEMS ON PAGE LOAD
// ==========================================
fetchItems();

// Make functions available globally for onclick handlers
window.openSelectItemModal = openSelectItemModal;
window.closeSelectItemModal = closeSelectItemModal;
window.openCreateItemModal = openCreateItemModal;
window.closeCreateItemModal = closeCreateItemModal;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.handleUpdateQuantity = handleUpdateQuantity;
window.handleCreateItem = handleCreateItem;
window.handleEditItem = handleEditItem;
window.deleteItem = deleteItem;
window.fetchItems = fetchItems;
window.toggleFilterDropdown = toggleFilterDropdown;
window.setFilter = setFilter;
window.cancelSelection = cancelSelection;

// Get Item global functions
window.openGetItemModal = openGetItemModal;
window.closeGetItemModal = closeGetItemModal;
window.handleGetItemSubmit = handleGetItemSubmit;
window.cancelGetItemSelection = cancelGetItemSelection;
// View Item modal globals
window.openViewItemModal = openViewItemModal;
window.closeViewItemModal = closeViewItemModal;
window.fetchItemHistory = fetchItemHistory;
