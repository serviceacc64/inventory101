  // Import Supabase client
import { supabase } from './supabase.js';
// animation utilities
import { showNotification, pulseElement, fadeIn } from './animate.js';

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
const getEquipmentSearch = document.getElementById('getEquipmentSearch');
const clearGetEquipmentSearch = document.getElementById('clearGetEquipmentSearch');
const itemsSearchBox = document.getElementById('itemsSearchBox');
const equipmentSearchBox = document.getElementById('equipmentSearchBox');
const getItemSelectableList = document.getElementById('getItemSelectableList');
const getItemDetails = document.getElementById('getItemDetails');
const getItemSelectedId = document.getElementById('getItemSelectedId');
const getItemSelectedName = document.getElementById('getItemSelectedName');
const getItemSelectedStock = document.getElementById('getItemSelectedStock');
const getItemQuantity = document.getElementById('getItemQuantity');

// View Item Modal Elements
const viewItemModal = document.getElementById('viewItemModal');
const viewItemName = document.getElementById('viewItemName');
const viewItemLabel = document.getElementById('viewItemLabel');
const viewItemUnit = document.getElementById('viewItemUnit');
const viewItemQuantity = document.getElementById('viewItemQuantity');
const viewItemPO = document.getElementById('viewItemPO');
const viewItemSupplier = document.getElementById('viewItemSupplier');
const viewItemUpdatedAt = document.getElementById('viewItemUpdatedAt');

// Purchase Order Modal Elements
const poModal = document.getElementById('poModal');
const poStep1 = document.getElementById('poStep1');
const poStep2 = document.getElementById('poStep2');
const poStep3 = document.getElementById('poStep3');
const poStep1Indicator = document.getElementById('poStep1Indicator');
const poStep2Indicator = document.getElementById('poStep2Indicator');
const poStep3Indicator = document.getElementById('poStep3Indicator');
const poSelectableItemsList = document.getElementById('poSelectableItemsList');
const poItemQuantityForm = document.getElementById('poItemQuantityForm');
const poAddedItemsBody = document.getElementById('poAddedItemsBody');
const poNoItemsMessage = document.getElementById('poNoItemsMessage');
const poProceedToReviewBtn = document.getElementById('poProceedToReviewBtn');
const poProcessBtn = document.getElementById('poProcessBtn');

// PO Create Item Modal Elements
const poCreateItemModal = document.getElementById('poCreateItemModal');
const poNewItemLabel = document.getElementById('poNewItemLabel');
const poNewItemUnitGroup = document.getElementById('poNewItemUnitGroup');
const poNewItemUnit = document.getElementById('poNewItemUnit');

// PO Workflow State
let poReceiptData = {
    date: '',
    poNumber: '',
    supplierId: '',
    supplierName: ''
};
let poAddedItems = []; // Array to store items added to the receipt
let selectedPOItem = null; // Currently selected item for quantity entry
let poIsSubmitting = false; // Prevent double submission


// Store all items for search functionality
let allItems = [];
let allSuppliers = []; // Store suppliers for dropdown
let currentFilter = 'all'; // Track current category filter
let isSubmitting = false; // Prevent double submission

// Get Item Flow - Requester Info State
import { fetchEquipmentForGet, getEquipmentForGet, isEquipmentLoadingState } from './equipmentForGet.js';

let requesterName = '';
let requesterTimestamp = '';
let selectedGetItem = null; // Store selected item object for confirmation
let preSelectedItem = null; // For when item is pre-selected from view modal
let cartItems = []; // Cart array for multi-item support
let currentGetTab = 'items'; // Track current tab: 'items' or 'equipment'
let allEquipmentForGet = []; // Store equipment for get item modal (populated by equipmentForGet.js)



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
// 1b. FETCH SUPPLIERS FROM SUPABASE
// ==========================================
async function fetchSuppliers() {
    try {
        const { data: suppliers, error } = await supabase
            .from('suppliers')
            .select('id, supplier_name')
            .order('supplier_name', { ascending: true });
        
        if (error) throw error;
        
        // Filter out duplicate supplier names (case-insensitive)
        const uniqueSupplierMap = new Map();
        suppliers.forEach(supplier => {
            const normalizedName = supplier.supplier_name.toLowerCase().trim();
            if (!uniqueSupplierMap.has(normalizedName)) {
                uniqueSupplierMap.set(normalizedName, supplier);
            }
        });
        
        allSuppliers = Array.from(uniqueSupplierMap.values());
        populateSupplierDropdowns();
        
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        // Non-critical error, don't show error to user
    }
}

// ==========================================
// 1c. POPULATE SUPPLIER DROPDOWNS
// ==========================================
function populateSupplierDropdowns() {
    // Get the dropdown elements
    const newItemSupplier = document.getElementById('newItemSupplier');
    const addSupplier = document.getElementById('addSupplier');
    const editItemSupplier = document.getElementById('editItemSupplier');
    
    // Build options HTML
    const defaultOption = '<option value="">Select Supplier (Optional)</option>';
    const supplierOptions = allSuppliers.map(supplier => 
        `<option value="${supplier.id}">${escapeHtml(supplier.supplier_name)}</option>`
    ).join('');
    
    // Populate Create New Item dropdown
    if (newItemSupplier) {
        newItemSupplier.innerHTML = defaultOption + supplierOptions;
    }
    
    // Populate Add Stock dropdown
    if (addSupplier) {
        addSupplier.innerHTML = defaultOption + supplierOptions;
    }
    
    // Populate Edit Item dropdown
    if (editItemSupplier) {
        editItemSupplier.innerHTML = defaultOption + supplierOptions;
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
        // animate appearance
        fadeIn(itemEl);

        itemsContainer.appendChild(itemEl);
    });
}

// ==========================================
// 3. SELECT ITEM MODAL FUNCTIONS
// ==========================================
function openSelectItemModal() {
    selectItemModal.classList.add('show');
    selectItemModal.style.display = '';
    renderSelectableItems(allItems);
    // Reset selection view
    selectedItemDetails.style.display = 'none';
    selectableItemsList.style.display = 'block';
    if (modalItemSearch) modalItemSearch.value = '';
}

function closeSelectItemModal() {
    selectItemModal.classList.remove('show');
    selectItemModal.style.display = '';
    // Reset form
    if (addQuantity) addQuantity.value = '';
    if (document.getElementById('addPO')) document.getElementById('addPO').value = '';
    if (document.getElementById('addSupplier')) document.getElementById('addSupplier').value = '';
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
    
    // Display supplier name if available
    if (viewItemSupplier) {
        if (item.supplier_id) {
            const supplier = allSuppliers.find(s => s.id === item.supplier_id);
            viewItemSupplier.textContent = supplier ? supplier.supplier_name : 'Unknown Supplier';
        } else {
            viewItemSupplier.textContent = '-';
        }
    }
    
    const updated = item.updated_at || item.created_at || null;
    if (viewItemUpdatedAt) viewItemUpdatedAt.textContent = updated ? new Date(updated).toLocaleString() : 'N/A';

    // store current viewed item id for action buttons
    if (viewItemModal) {
        viewItemModal.classList.add('show');
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
            // Pass the current item to be pre-selected after requester info is filled
            openGetItemModal(item);
        };
    }
}

function closeViewItemModal() {
    if (viewItemModal) {
        viewItemModal.classList.remove('show');
        viewItemModal.style.display = '';
    }
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
    const supplierId = document.getElementById('addSupplier').value;
    
    if (!itemId || isNaN(quantityToAdd) || quantityToAdd < 1 || !selectedDate) {
        showNotification('Please fill in all required fields', 'error');
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
            showNotification('Item not found', 'error');
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
        
        // Add Supplier if provided
        if (supplierId) {
            updateData.supplier_id = supplierId;
        }
        
        const { error } = await supabase
            .from('items')
            .update(updateData)
            .eq('id', itemId);
        
        if (error) throw error;
        
        // Close modal and refresh
        closeSelectItemModal();
        await fetchItems();
        showNotification(`Successfully added ${quantityToAdd} units to ${item.name}. New stock: ${newQuantity}`);
        
    } catch (error) {
        console.error('Error updating quantity:', error);
        showNotification('Failed to update quantity. Please try again.', 'error');
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
    createItemModal.classList.add('show');
}

function closeCreateItemModal() {
    createItemModal.classList.remove('show');
    document.getElementById('createItemForm').reset();
    // Reset unit field visibility
    if (newItemUnitGroup) {
        newItemUnitGroup.style.display = 'none';
        newItemUnit.required = false;
    }
    // Reset date field
    document.getElementById('newItemDate').value = '';
    // Reset supplier dropdown
    document.getElementById('newItemSupplier').value = '';
}

async function handleCreateItem(event) {
    event.preventDefault();
    
    const name = document.getElementById('newItemName').value.trim();
    const label = document.getElementById('newItemLabel').value.trim();
    const quantity = parseInt(document.getElementById('newItemQuantity').value);
    const unit = document.getElementById('newItemUnit').value.trim();
    const poNumber = document.getElementById('newItemPO').value.trim();
    const supplierId = document.getElementById('newItemSupplier').value;
    const itemDate = document.getElementById('newItemDate').value;
    
    if (!name || isNaN(quantity)) {
        showNotification('Please fill in all required fields', 'error');
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
        
        // Add Supplier if provided
        if (supplierId) {
            insertData.supplier_id = supplierId;
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
        
        showNotification('Item created successfully!');
        
    } catch (error) {
        console.error('Error creating item:', error);
        showNotification('Failed to create item. Please try again.', 'error');
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
    
    // Set the supplier dropdown to the item's current supplier
    const editItemSupplier = document.getElementById('editItemSupplier');
    if (editItemSupplier && item.supplier_id) {
        editItemSupplier.value = item.supplier_id;
    } else if (editItemSupplier) {
        editItemSupplier.value = '';
    }
    
    editItemModal.classList.add('show');
}


function closeEditModal() {
    editItemModal.classList.remove('show');
    // Reset date field
    document.getElementById('editItemDate').value = '';
    // Reset supplier dropdown
    document.getElementById('editItemSupplier').value = '';
}

async function handleEditItem(event) {
    event.preventDefault();
    
    const itemId = document.getElementById('editItemId').value;
    const name = document.getElementById('editItemName').value.trim();
    const label = document.getElementById('editItemLabel').value.trim();
    const quantity = parseInt(document.getElementById('editItemQuantity').value);
    const unit = document.getElementById('editItemUnit').value.trim();
    const editItemDate = document.getElementById('editItemDate').value;
    const editItemSupplier = document.getElementById('editItemSupplier').value;
    
    if (!name || isNaN(quantity)) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    // Validate unit is provided for Janitorial and Office Supplies items
    if ((label === 'Janitorial' || label === 'Office Supplies') && !unit) {
        showNotification('Please specify the unit for ' + label + ' items', 'error');
        return;
    }
    
    try {
        // Get current item data before update
        const currentItem = allItems.find(i => i.id === itemId);
        if (!currentItem) {
            showNotification('Item not found', 'error');
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
        
        // Update supplier if selected
        if (editItemSupplier) {
            updateData.supplier_id = editItemSupplier;
        } else {
            updateData.supplier_id = null;
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
        showNotification('Item updated successfully!');
        
    } catch (error) {
        console.error('Error updating item:', error);
        showNotification('Failed to update item. Please try again.', 'error');
    }
}


// ==========================================
// 5b. GET ITEM FUNCTIONS
// ==========================================
async function openGetItemModal(preSelectedItemFromView = null) {
    getItemModal.classList.add('show');
    
    // Reset all states for new flow
    requesterName = '';
    requesterTimestamp = '';
    selectedGetItem = null;
    preSelectedItem = preSelectedItemFromView;
    
    // PRE-FETCH EQUIPMENT DATA IMMEDIATELY (Fix #1)
    try {
        await fetchEquipmentForGet();
        allEquipmentForGet = getEquipmentForGet();
    } catch (error) {
        console.warn('Equipment pre-fetch failed:', error);
        allEquipmentForGet = [];
    }
    
    // Show Step 1: Requester Info Form (always show first)
    document.getElementById('requesterInfoSection').style.display = 'block';
    document.getElementById('getItemSearchContainer').style.display = 'none';
    getItemSelectableList.style.display = 'none';
    getItemDetails.style.display = 'none';
    document.getElementById('confirmationSection').style.display = 'none';
    
    // Reset form fields
    if (document.getElementById('requesterName')) document.getElementById('requesterName').value = '';
    if (document.getElementById('requesterTimestamp')) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('requesterTimestamp').value = now.toISOString().slice(0, 16);
    }
    if (getItemSearch) getItemSearch.value = '';
    if (getItemQuantity) getItemQuantity.value = '';
    
    // Focus on requester name input
    setTimeout(() => {
        document.getElementById('requesterName').focus();
    }, 100);
}

function closeGetItemModal() {
    getItemModal.classList.remove('show');
    // Reset all flow states
    requesterName = '';
    requesterTimestamp = '';
    selectedGetItem = null;
    preSelectedItem = null;
    cartItems = []; // Reset cart
    // Reset form
    if (getItemQuantity) getItemQuantity.value = '';
    cancelGetItemSelection();
}

// Step 1 -> Step 2: Proceed from requester info to item selection
function proceedToItemSelection(event) {
    event.preventDefault();
    
    const nameInput = document.getElementById('requesterName');
    const timestampInput = document.getElementById('requesterTimestamp');
    
    if (!nameInput.value.trim()) {
        showNotification('Please enter who gets it', 'error');
        nameInput.focus();
        return false;
    }
    
    if (!timestampInput.value) {
        showNotification('Please select a timestamp', 'error');
        timestampInput.focus();
        return false;
    }
    
    // Store requester info
    requesterName = nameInput.value.trim();
    requesterTimestamp = timestampInput.value;
    
    // Hide requester form, show item selection
    document.getElementById('requesterInfoSection').style.display = 'none';
    document.getElementById('getItemSearchContainer').style.display = 'block';
    getItemSelectableList.style.display = 'block';
    
    // Render available items
    renderGetItemSelectableItems(allItems);
    
    // If there was a pre-selected item from view modal, auto-select it
    if (preSelectedItem) {
        // Find the item in the rendered list
        const item = allItems.find(i => i.id === preSelectedItem.id);
        if (item) {
            selectGetItem(item);
        }
        preSelectedItem = null; // Clear after use
    }
    
    return false;
}

// Back from item details to item selection
function backToItemSelection() {
    // If cart has items, go to confirmation section instead
    if (cartItems.length > 0) {
        getItemDetails.style.display = 'none';
        document.getElementById('confirmationSection').style.display = 'block';
        return;
    }
    
    getItemDetails.style.display = 'none';
    getItemSelectableList.style.display = 'block';
    if (getItemQuantity) getItemQuantity.value = '';
    selectedGetItem = null;
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

// ==========================================
// EQUIPMENT TAB FUNCTIONS
// ==========================================

// Switch to Items tab
function switchToItemsTab() {
    currentGetTab = 'items';
    
    // Update tab button styles
    document.getElementById('tabItems').style.background = 'var(--primary-color)';
    document.getElementById('tabItems').style.color = 'white';
    document.getElementById('tabEquipment').style.background = '#f5f5f5';
    document.getElementById('tabEquipment').style.color = '#666';
    
    // Show Items search box, hide Equipment search
    if (itemsSearchBox) itemsSearchBox.style.display = 'block';
    if (equipmentSearchBox) equipmentSearchBox.style.display = 'none';
    
    // Show/hide lists
    document.getElementById('getItemSelectableList').style.display = 'block';
    document.getElementById('getEquipmentSelectableList').style.display = 'none';
    
    // Clear equipment search value
    if (getEquipmentSearch) getEquipmentSearch.value = '';
    
    // Re-render items
    filterGetItemSelectableItems();
}

// Switch to Equipment tab
function switchToEquipmentTab() {
    currentGetTab = 'equipment';
    
    // Update tab button styles
    document.getElementById('tabItems').style.background = '#f5f5f5';
    document.getElementById('tabItems').style.color = '#666';
    document.getElementById('tabEquipment').style.background = 'var(--primary-color)';
    document.getElementById('tabEquipment').style.color = 'white';
    
    // Show Equipment search box, hide Items search
    if (itemsSearchBox) itemsSearchBox.style.display = 'none';
    if (equipmentSearchBox) equipmentSearchBox.style.display = 'block';
    
    // Show/hide lists
    document.getElementById('getItemSelectableList').style.display = 'none';
    document.getElementById('getEquipmentSelectableList').style.display = 'block';
    
    // Clear items search value
    if (getItemSearch) getItemSearch.value = '';
    
    // INSTANT RENDER - data already pre-fetched in openGetItemModal()
    // Show loading if still fetching
    const equipmentList = document.getElementById('getEquipmentSelectableList');
    if (isEquipmentLoadingState() && equipmentList) {
        equipmentList.innerHTML = '<div class="loading-state" style="padding: 40px; text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading equipment...</p></div>';
    }
    
    renderGetEquipmentSelectableItems(allEquipmentForGet);
    
    // Focus equipment search
    setTimeout(() => {
        if (getEquipmentSearch) getEquipmentSearch.focus();
    }, 100);
}

// Render equipment selectable list
function renderGetEquipmentSelectableItems(equipment) {
    const equipmentList = document.getElementById('getEquipmentSelectableList');
    if (!equipmentList) return;
    
    equipmentList.innerHTML = '';
    
    // Only show equipment with quantity > 0
    const availableEquipment = equipment.filter(item => item.quantity > 0);
    
    if (availableEquipment.length === 0) {
        equipmentList.innerHTML = `
            <div class="empty-state" style="padding: 20px;">
                <i class="fa-solid fa-tools"></i>
                <p>No available equipment in stock</p>
            </div>
        `;
        return;
    }
    
    availableEquipment.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'selectable-item';
        itemEl.dataset.equipmentId = item.id;
        itemEl.onclick = () => selectGetEquipment(item);
        
        // Format stock text
        const stockText = `Qty: ${item.quantity}`;
        
        itemEl.innerHTML = `
            <div class="selectable-item-icon">
                <i class="fa-solid fa-tools"></i>
            </div>
            <div class="selectable-item-info">
                <h4>${escapeHtml(item.item_name)}</h4>
                <p>${stockText}</p>
            </div>
            <div class="selectable-item-action">
                <i class="fa-solid fa-chevron-right"></i>
            </div>
        `;
        
        equipmentList.appendChild(itemEl);
    });
}

// Filter equipment selectable items
function filterGetEquipmentSelectableItems() {
    const query = getEquipmentSearch ? getEquipmentSearch.value.trim().toLowerCase() : '';
    
    let filtered = allEquipmentForGet.filter(item => item.quantity > 0);
    
    if (query) {
        filtered = filtered.filter(item => {
            const searchText = (item.item_name + ' ' + (item.item_description || '')).toLowerCase();
            return searchText.includes(query);
        });
    }
    
    renderGetEquipmentSelectableItems(filtered);
}

// Select equipment
function selectGetEquipment(equipment) {
    // Store selected equipment for confirmation (mark as equipment type)
    selectedGetItem = { ...equipment, isEquipment: true };
    
    // Hide list, show details
    document.getElementById('getEquipmentSelectableList').style.display = 'none';
    getItemDetails.style.display = 'block';
    
    // Populate details
    getItemSelectedId.value = equipment.id;
    getItemSelectedName.textContent = equipment.item_name;
    
    const stockText = `Available Qty: ${equipment.quantity}`;
    getItemSelectedStock.textContent = stockText;
    
    // Set max attribute for quantity input
    if (getItemQuantity) {
        getItemQuantity.max = equipment.quantity;
        getItemQuantity.value = ''; // Reset quantity for new selection
    }
    
    // Focus on quantity input
    setTimeout(() => {
        if (getItemQuantity) getItemQuantity.focus();
    }, 100);
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
    // Store selected item for confirmation (mark as NOT equipment)
    selectedGetItem = { ...item, isEquipment: false };
    
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
        getItemQuantity.value = ''; // Reset quantity for new selection
    }
    
    // Focus on quantity input
    setTimeout(() => {
        if (getItemQuantity) getItemQuantity.focus();
    }, 100);
}

function cancelGetItemSelection() {
    getItemDetails.style.display = 'none';
    getItemSelectableList.style.display = 'block';
    if (getItemQuantity) getItemQuantity.value = '';
    if (getItemSelectedId) getItemSelectedId.value = '';
    selectedGetItem = null;
}

// Step 3 -> Step 4: Show confirmation table with cart
function showConfirmationStep(event) {
    event.preventDefault();
    
    const quantity = parseInt(getItemQuantity.value);
    const itemId = getItemSelectedId.value;
    
    // Validation
    if (!itemId || !selectedGetItem) {
        showNotification('Please select an item first', 'error');
        return false;
    }
    
    if (isNaN(quantity) || quantity < 1) {
        showNotification('Please enter a valid quantity', 'error');
        getItemQuantity.focus();
        return false;
    }
    
    // Validate quantity doesn't exceed available stock
    if (quantity > selectedGetItem.quantity) {
        showNotification(`Cannot get ${quantity} units. Only ${selectedGetItem.quantity} units available in stock.`, 'error');
        getItemQuantity.focus();
        return false;
    }
    
    // Add item to cart (include isEquipment flag)
    const cartItem = {
        itemId: selectedGetItem.id,
        itemName: selectedGetItem.name || selectedGetItem.item_name,
        category: selectedGetItem.label || selectedGetItem.item_description || 'Equipment',
        unit: selectedGetItem.unit || 'unit',
        quantity: quantity,
        availableStock: selectedGetItem.quantity,
        isEquipment: selectedGetItem.isEquipment || false
    };
    
    // Check if item already in cart (consider type)
    const existingIndex = cartItems.findIndex(item => item.itemId === cartItem.itemId && item.isEquipment === cartItem.isEquipment);
    if (existingIndex >= 0) {
        // Update quantity if already in cart
        cartItems[existingIndex].quantity += quantity;
    } else {
        cartItems.push(cartItem);
    }
    
    // Update confirmation section
    document.getElementById('confirmPerson').textContent = requesterName;
    
    // Format timestamp for display
    const timestampDate = new Date(requesterTimestamp);
    document.getElementById('confirmTimestamp').textContent = timestampDate.toLocaleString();
    
    // Render cart items table
    renderCartItems();
    
    // Hide item details, show confirmation
    getItemDetails.style.display = 'none';
    document.getElementById('confirmationSection').style.display = 'block';
    
    return false;
}

// Render cart items table
function renderCartItems() {
    const tbody = document.getElementById('cartItemsBody');
    if (!tbody) return;
    
    if (cartItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #666;">No items in cart</td></tr>';
        return;
    }
    
    tbody.innerHTML = cartItems.map((item, index) => `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">
                <i class="fa-solid ${item.isEquipment ? 'fa-tools' : 'fa-box'}" style="margin-right: 8px; color: ${item.isEquipment ? '#ff9800' : '#4caf50'};"></i>
                ${escapeHtml(item.itemName)}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">${escapeHtml(item.category)}</td>
            <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">${item.quantity} ${escapeHtml(item.unit)}</td>
            <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">
                <button type="button" onclick="removeFromCart(${index})" style="background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Remove item from cart
function removeFromCart(index) {
    if (index >= 0 && index < cartItems.length) {
        cartItems.splice(index, 1);
        renderCartItems();
    }
}

// Get another item - go back to item selection
function getAnotherItem() {
    // Hide confirmation, show item selection
    document.getElementById('confirmationSection').style.display = 'none';
    document.getElementById('getItemSearchContainer').style.display = 'block';
    getItemDetails.style.display = 'none';
    
    // Reset selected item
    selectedGetItem = null;
    if (getItemQuantity) getItemQuantity.value = '';
    
    // Switch to the current tab (items or equipment)
    if (currentGetTab === 'equipment') {
        switchToEquipmentTab();
    } else {
        switchToItemsTab();
    }
}

// Back from confirmation to item details
function backToGetItemDetails() {
    document.getElementById('confirmationSection').style.display = 'none';
    getItemDetails.style.display = 'block';
}

// Process all items in cart
async function processAllItems() {
    // Prevent double submission
    if (isSubmitting) {
        console.log('Submission blocked - already in progress');
        return;
    }
    
    if (cartItems.length === 0) {
        showNotification('No items to process', 'error');
        return;
    }
    
    // Validate all items have valid quantities
    for (const cartItem of cartItems) {
        let item;
        if (cartItem.isEquipment) {
            item = allEquipmentForGet.find(i => i.id === cartItem.itemId);
        } else {
            item = allItems.find(i => i.id === cartItem.itemId);
        }
        
        if (!item) {
            showNotification(`Item not found: ${cartItem.itemName}`, 'error');
            return;
        }
        if (cartItem.quantity > item.quantity) {
            showNotification(`Cannot get ${cartItem.quantity} units of ${cartItem.itemName}. Only ${item.quantity} available.`, 'error');
            return;
        }
    }
    
    // Set submission lock
    isSubmitting = true;
    
    // Disable buttons
    const processBtn = document.querySelector('#confirmationSection .btn-primary');
    const getAnotherBtn = document.querySelector('#confirmationSection .btn-secondary');
    if (processBtn) {
        processBtn.disabled = true;
        processBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    }
    if (getAnotherBtn) getAnotherBtn.disabled = true;
    
    let successCount = 0;
    let failedItems = [];
    
    try {
        // Process each item in cart
        for (const cartItem of cartItems) {
            let item;
            let tableName;
            
            if (cartItem.isEquipment) {
                item = allEquipmentForGet.find(i => i.id === cartItem.itemId);
                tableName = 'equipment';
            } else {
                item = allItems.find(i => i.id === cartItem.itemId);
                tableName = 'items';
            }
            
            if (!item) {
                failedItems.push(cartItem.itemName);
                continue;
            }
            
            const oldQuantity = item.quantity;
            const newQuantity = item.quantity - cartItem.quantity;
            
            // Update quantity in appropriate table
            const { error: updateError } = await supabase
                .from(tableName)
                .update({ 
                    quantity: newQuantity,
                    updated_at: new Date().toISOString()
                })
                .eq('id', cartItem.itemId);
            
            if (updateError) {
                console.error('Error updating quantity:', updateError);
                failedItems.push(cartItem.itemName);
                continue;
            }
            
            // Log activity for DISTRIBUTE action
            // For equipment, item_id is NULL (since equipment is in a different table)
            // and the equipment ID is stored in details.equipment_id
            const activityItemId = cartItem.isEquipment ? null : cartItem.itemId;
            const activityDetails = cartItem.isEquipment 
                ? { label: cartItem.category, unit: cartItem.unit, equipment_id: cartItem.itemId }
                : { label: cartItem.category, unit: cartItem.unit };
            
            await logActivity(
                'DISTRIBUTE',
                activityItemId,
                cartItem.itemName,
                -cartItem.quantity,
                oldQuantity,
                newQuantity,
                requesterName,
                activityDetails,
                requesterTimestamp
            );
            
            successCount++;
        }
        
        // Close modal and refresh
        closeGetItemModal();
        await fetchItems();
        
        if (failedItems.length > 0) {
            showNotification(`Processed ${successCount} items. Failed: ${failedItems.join(', ')}`, 'warning');
        } else {
            const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
            showNotification(`Successfully distributed ${totalItems} items to ${requesterName}`);
        }
        
    } catch (error) {
        console.error('Error processing items:', error);
        showNotification('Failed to process items. Please try again.', 'error');
    } finally {
        // Reset submission lock and button state
        isSubmitting = false;
        
        if (processBtn) {
            processBtn.disabled = false;
            processBtn.innerHTML = '<i class="fa-solid fa-check"></i> Process All';
        }
        if (getAnotherBtn) getAnotherBtn.disabled = false;
    }
}

// Step 4: Actually process the confirmed request
async function confirmGetItem() {
    // Prevent double submission
    if (isSubmitting) {
        console.log('Submission blocked - already in progress');
        return;
    }
    
    const itemId = getItemSelectedId.value;
    const quantity = parseInt(getItemQuantity.value);
    
    if (!itemId || !selectedGetItem || isNaN(quantity) || quantity < 1) {
        showNotification('Invalid request data', 'error');
        return;
    }
    
    // Get the item from allItems (current state)
    const item = allItems.find(i => i.id === itemId);
    if (!item) {
        showNotification('Item not found', 'error');
        return;
    }
    
    // Validate quantity doesn't exceed available stock (re-check)
    if (quantity > item.quantity) {
        showNotification(`Cannot get ${quantity} units. Only ${item.quantity} units available in stock.`, 'error');
        return;
    }
    
    // Set submission lock
    isSubmitting = true;
    
    // Disable the confirm button
    const confirmBtn = document.querySelector('#confirmationSection .btn-primary');
    const originalBtnText = confirmBtn ? confirmBtn.innerHTML : '';
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
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
            showNotification('Failed to update item stock. Please try again.', 'error');
            return;
        }
        
        // Step 2: Try to create distribution record (legacy table)
        try {
            const { error: distError } = await supabase
                .from('item_distributions')
                .insert([{
                    item_id: itemId,
                    item_name: item.name,
                    person: requesterName,
                    quantity: quantity,
                    timestamp: requesterTimestamp,
                    created_at: new Date().toISOString()
                }]);
            
            if (distError) {
                console.warn('Could not create distribution record (table may not exist):', distError);
            }
        } catch (distCatchError) {
            console.warn('Distribution table not available:', distCatchError);
        }

        // Step 3: Log the activity to activity_logs table using the custom timestamp
        await logActivity(
            'DISTRIBUTE',
            itemId,
            item.name,
            -quantity,  // Negative quantity to indicate removal
            oldQuantity,
            newQuantity,
            requesterName,
            { label: item.label, unit: item.unit },
            requesterTimestamp
        );

        // Close modal and refresh
        closeGetItemModal();
        await fetchItems();
        showNotification(`Successfully recorded: ${requesterName} got ${quantity} ${item.unit || 'units'} of ${item.name}`);
        
    } catch (error) {
        console.error('Error distributing item:', error);
        showNotification('Failed to process item distribution. Please try again.', 'error');
    } finally {
        // Reset submission lock and button state
        isSubmitting = false;
        
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = originalBtnText || '<i class="fa-solid fa-check"></i> Confirm & Process';
        }
    }
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

        showNotification('Item deleted successfully!');
        
    } catch (error) {
        console.error('Error deleting item:', error);
        showNotification('Failed to delete item. Please try again.', 'error');
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

// Add Supplier Modal outside click handler
const addSupplierModal = document.getElementById('addSupplierModal');
if (addSupplierModal) {
    addSupplierModal.addEventListener('click', function(e) {
        if (e.target === addSupplierModal) {
            closeAddSupplierModal();
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

// Shared search input handlers - will be updated by tab functions
if (getItemSearch) {
    getItemSearch.addEventListener('input', debounce(filterGetItemSelectableItems, 300));
}

if (getEquipmentSearch) {
    getEquipmentSearch.addEventListener('input', debounce(filterGetEquipmentSelectableItems, 300));
}

if (clearGetItemSearch) {
    clearGetItemSearch.addEventListener('click', function() {
        getItemSearch.value = '';
        filterGetItemSelectableItems();
        getItemSearch.focus();
    });
}

if (clearGetEquipmentSearch) {
    clearGetEquipmentSearch.addEventListener('click', function() {
        getEquipmentSearch.value = '';
        filterGetEquipmentSelectableItems();
        getEquipmentSearch.focus();
    });
}

// Debounce utility for search inputs
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
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
// PO MODAL EVENT LISTENERS
// ==========================================
const poItemSearch = document.getElementById('poItemSearch');
const clearPOSearch = document.getElementById('clearPOSearch');

if (poItemSearch) {
    poItemSearch.addEventListener('input', filterPOSelectableItems);
}

if (clearPOSearch) {
    clearPOSearch.addEventListener('click', function() {
        poItemSearch.value = '';
        filterPOSelectableItems();
        poItemSearch.focus();
    });
}

// PO Create Item Modal Event Listeners
if (poNewItemLabel) {
    poNewItemLabel.addEventListener('change', togglePONewItemUnitField);
}

// PO Modal outside click handler
if (poModal) {
    poModal.addEventListener('click', function(e) {
        if (e.target === poModal) {
            closePOModal();
        }
    });
}

// PO Create Item Modal outside click handler
if (poCreateItemModal) {
    poCreateItemModal.addEventListener('click', function(e) {
        if (e.target === poCreateItemModal) {
            closePOCreateItemModal();
        }
    });
}

// ==========================================
// 11. CREATE ITEM EVENT LISTENERS
// ==========================================
if (newItemLabel) {
    newItemLabel.addEventListener('change', toggleNewItemUnitField);
}


// ==========================================
// 12. ADD SUPPLIER FUNCTIONS
// ==========================================
function openAddSupplierModal(targetDropdownId) {
    const modal = document.getElementById('addSupplierModal');
    const targetDropdown = document.getElementById('targetSupplierDropdown');
    const nameInput = document.getElementById('newSupplierName');
    const contactInput = document.getElementById('newSupplierContact');
    
    // Store which dropdown this is for
    targetDropdown.value = targetDropdownId;
    
    // Reset form
    if (nameInput) nameInput.value = '';
    if (contactInput) contactInput.value = '';
    
    modal.classList.add('show');
    
    // Focus on name input
    setTimeout(() => {
        if (nameInput) nameInput.focus();
    }, 100);
}

function closeAddSupplierModal() {
    const modal = document.getElementById('addSupplierModal');
    modal.classList.remove('show');
    modal.style.display = '';
    
    // Reset form
    const nameInput = document.getElementById('newSupplierName');
    const contactInput = document.getElementById('newSupplierContact');
    if (nameInput) nameInput.value = '';
    if (contactInput) contactInput.value = '';
}

async function handleAddSupplier(event) {
    event.preventDefault();
    
    const nameInput = document.getElementById('newSupplierName');
    const contactInput = document.getElementById('newSupplierContact');
    const targetDropdown = document.getElementById('targetSupplierDropdown');
    
    const supplierName = nameInput.value.trim();
    const contactInfo = contactInput.value.trim();
    const targetDropdownId = targetDropdown.value;
    
    if (!supplierName) {
        showNotification('Please enter a supplier name', 'error');
        return;
    }
    
    // Check for duplicate (case-insensitive)
    const isDuplicate = allSuppliers.some(s => 
        s.supplier_name.toLowerCase().trim() === supplierName.toLowerCase()
    );
    
    if (isDuplicate) {
        showNotification('A supplier with this name already exists. Please use a different name or select the existing supplier.', 'error');
        return;
    }
    
    try {
        // Insert new supplier
        const { data, error } = await supabase
            .from('suppliers')
            .insert([{
                supplier_name: supplierName,
                contact_info: contactInfo || null
            }])
            .select();
        
        if (error) throw error;
        
        // Refresh suppliers list
        await fetchSuppliers();
        
        // Close modal
        closeAddSupplierModal();
        
        // If a target dropdown was specified, select the newly created supplier
        if (targetDropdownId) {
            const dropdown = document.getElementById(targetDropdownId);
            if (dropdown && data && data.length > 0) {
                dropdown.value = data[0].id;
            }
        }
        
        showNotification('Supplier added successfully!');
        
    } catch (error) {
        console.error('Error adding supplier:', error);
        showNotification('Failed to add supplier. Please try again.', 'error');
    }
}




// ==========================================
// 9. INITIALIZE - LOAD ITEMS ON PAGE LOAD
// ==========================================
fetchItems();
fetchSuppliers(); // Load suppliers for dropdowns

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
window.proceedToItemSelection = proceedToItemSelection;
window.backToItemSelection = backToItemSelection;
window.showConfirmationStep = showConfirmationStep;
window.backToGetItemDetails = backToGetItemDetails;
window.confirmGetItem = confirmGetItem;
window.processAllItems = processAllItems;
window.getAnotherItem = getAnotherItem;
window.removeFromCart = removeFromCart;
window.cancelGetItemSelection = cancelGetItemSelection;
window.switchToItemsTab = switchToItemsTab;
window.switchToEquipmentTab = switchToEquipmentTab;

// View Item modal globals
window.openViewItemModal = openViewItemModal;
window.closeViewItemModal = closeViewItemModal;
window.fetchItemHistory = fetchItemHistory;

// Add Supplier modal globals
window.openAddSupplierModal = openAddSupplierModal;
window.closeAddSupplierModal = closeAddSupplierModal;
window.handleAddSupplier = handleAddSupplier;

// ==========================================
// PURCHASE ORDER (RECEIPT) WORKFLOW FUNCTIONS
// ==========================================

// Open PO Modal
function openPOModal() {
    // Reset PO workflow state
    poReceiptData = {
        date: '',
        poNumber: '',
        supplierId: '',
        supplierName: ''
    };
    poAddedItems = [];
    selectedPOItem = null;
    poIsSubmitting = false;
    
    // Reset form fields
    document.getElementById('poDate').value = '';
    document.getElementById('poNumber').value = '';
    document.getElementById('poSupplier').value = '';
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('poDate').value = today;
    
    // Populate supplier dropdown
    populatePOSupplierDropdown();
    
    // Show step 1
    showPOStep(1);
    
    // Show modal
    poModal.classList.add('show');
    
    // Focus on date input
    setTimeout(() => {
        document.getElementById('poDate').focus();
    }, 100);
}

// Close PO Modal
function closePOModal() {
    poModal.classList.remove('show');
    
    // Reset PO workflow state
    poReceiptData = {
        date: '',
        poNumber: '',
        supplierId: '',
        supplierName: ''
    };
    poAddedItems = [];
    selectedPOItem = null;
    poIsSubmitting = false;
    
    // Reset form fields
    document.getElementById('poDate').value = '';
    document.getElementById('poNumber').value = '';
    document.getElementById('poSupplier').value = '';
    document.getElementById('poItemSearch').value = '';
}

// Populate PO Supplier Dropdown
function populatePOSupplierDropdown() {
    const poSupplier = document.getElementById('poSupplier');
    if (!poSupplier) return;
    
    const defaultOption = '<option value="">Select Supplier (Optional)</option>';
    const supplierOptions = allSuppliers.map(supplier => 
        `<option value="${supplier.id}">${escapeHtml(supplier.supplier_name)}</option>`
    ).join('');
    
    poSupplier.innerHTML = defaultOption + supplierOptions;
}

// Show PO Step
function showPOStep(step) {
    // Hide all steps
    poStep1.style.display = 'none';
    poStep2.style.display = 'none';
    poStep3.style.display = 'none';
    document.getElementById('poSuccessMessage').style.display = 'none';
    
    // Reset indicators
    poStep1Indicator.classList.remove('active', 'completed');
    poStep2Indicator.classList.remove('active', 'completed');
    poStep3Indicator.classList.remove('active', 'completed');
    
    if (step === 1) {
        poStep1.style.display = 'block';
        poStep1Indicator.classList.add('active');
    } else if (step === 2) {
        poStep2.style.display = 'block';
        poStep1Indicator.classList.add('completed');
        poStep2Indicator.classList.add('active');
    } else if (step === 3) {
        poStep3.style.display = 'block';
        poStep1Indicator.classList.add('completed');
        poStep2Indicator.classList.add('completed');
        poStep3Indicator.classList.add('active');
    }
}

// Proceed from Step 1 to Step 2
function proceedToPOStep2(event) {
    event.preventDefault();
    
    const date = document.getElementById('poDate').value;
    const poNumber = document.getElementById('poNumber').value.trim();
    const supplierId = document.getElementById('poSupplier').value;
    
    if (!date) {
        showNotification('Please select a date', 'error');
        return false;
    }
    
    // Get supplier name if selected
    let supplierName = '';
    if (supplierId) {
        const supplier = allSuppliers.find(s => s.id === supplierId);
        if (supplier) supplierName = supplier.supplier_name;
    }
    
    // Store receipt data
    poReceiptData = {
        date: date,
        poNumber: poNumber,
        supplierId: supplierId,
        supplierName: supplierName
    };
    
    // Update receipt summary
    document.getElementById('poSummaryDate').textContent = date;
    document.getElementById('poSummaryPO').textContent = poNumber || '(Not specified)';
    document.getElementById('poSummarySupplier').textContent = supplierName || '(Not specified)';
    
    // Reset items list
    poAddedItems = [];
    renderPOAddedItems();
    
    // Reset item search
    document.getElementById('poItemSearch').value = '';
    renderPOSelectableItems(allItems);
    
    // Show step 2
    showPOStep(2);
    
    return false;
}

// Back from Step 2 to Step 1
function backToPOStep1() {
    showPOStep(1);
}

// Proceed from Step 2 to Step 3 (Review)
function proceedToPOStep3() {
    if (poAddedItems.length === 0) {
        showNotification('Please add at least one item to the receipt', 'error');
        return;
    }
    
    // Populate review section
    document.getElementById('reviewDate').textContent = poReceiptData.date;
    document.getElementById('reviewPONumber').textContent = poReceiptData.poNumber || '(Not specified)';
    document.getElementById('reviewSupplier').textContent = poReceiptData.supplierName || '(Not specified)';
    document.getElementById('reviewTotalItems').textContent = poAddedItems.length;
    
    // Render review table
    renderPOReviewTable();
    
    // Show step 3
    showPOStep(3);
}

// Back from Step 3 to Step 2
function backToPOStep2() {
    showPOStep(2);
}

// Render selectable items in PO workflow
function renderPOSelectableItems(items) {
    if (!poSelectableItemsList) return;
    
    poSelectableItemsList.innerHTML = '';
    
    // Filter out items already added to the receipt
    const addedItemIds = poAddedItems.map(item => item.itemId);
    const availableItems = items.filter(item => !addedItemIds.includes(item.id));
    
    if (availableItems.length === 0) {
        poSelectableItemsList.innerHTML = `
            <div class="empty-state" style="padding: 20px;">
                <i class="fa-solid fa-box-open"></i>
                <p>No more items available</p>
                <p style="font-size: 12px;">All items have been added to this receipt</p>
            </div>
        `;
        return;
    }
    
    availableItems.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'selectable-item';
        itemEl.dataset.itemId = item.id;
        itemEl.onclick = () => selectPOItem(item);
        
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
                <i class="fa-solid fa-plus"></i>
            </div>
        `;
        
        poSelectableItemsList.appendChild(itemEl);
    });
}

// Filter PO selectable items
function filterPOSelectableItems() {
    const query = document.getElementById('poItemSearch').value.trim().toLowerCase();
    
    let filtered = allItems;
    
    // Filter out items already added
    const addedItemIds = poAddedItems.map(item => item.itemId);
    filtered = filtered.filter(item => !addedItemIds.includes(item.id));
    
    if (query) {
        filtered = filtered.filter(item => {
            const searchText = (item.name + ' ' + (item.label || '')).toLowerCase();
            return searchText.includes(query);
        });
    }
    
    renderPOSelectableItems(filtered);
}

// Select item in PO workflow
function selectPOItem(item) {
    selectedPOItem = item;
    
    // Hide list, show quantity form
    poSelectableItemsList.style.display = 'none';
    poItemQuantityForm.style.display = 'block';
    
    // Populate details
    document.getElementById('poSelectedItemId').value = item.id;
    document.getElementById('poSelectedItemName').textContent = item.name;
    
    let stockText = `Current Stock: ${item.quantity}`;
    if ((item.label === 'Janitorial' || item.label === 'Office Supplies') && item.unit) {
        stockText += ` ${item.unit}`;
    } else {
        stockText += ' units';
    }
    document.getElementById('poSelectedItemCurrentStock').textContent = stockText;
    
    // Reset and focus quantity input
    document.getElementById('poItemQuantity').value = '';
    setTimeout(() => {
        document.getElementById('poItemQuantity').focus();
    }, 100);
}

// Cancel PO item selection
function cancelPOSelection() {
    poItemQuantityForm.style.display = 'none';
    poSelectableItemsList.style.display = 'block';
    selectedPOItem = null;
}

// Add item to PO receipt
function addItemToPO(event) {
    event.preventDefault();
    
    if (!selectedPOItem) {
        showNotification('No item selected', 'error');
        return false;
    }
    
    const quantity = parseInt(document.getElementById('poItemQuantity').value);
    
    if (isNaN(quantity) || quantity < 1) {
        showNotification('Please enter a valid quantity', 'error');
        document.getElementById('poItemQuantity').focus();
        return false;
    }
    
    // Add item to receipt
    const poItem = {
        itemId: selectedPOItem.id,
        itemName: selectedPOItem.name,
        category: selectedPOItem.label || 'No Category',
        unit: selectedPOItem.unit || 'unit',
        currentStock: selectedPOItem.quantity,
        quantityAdded: quantity,
        newStock: selectedPOItem.quantity + quantity
    };
    
    poAddedItems.push(poItem);
    
    // Reset selection
    cancelPOSelection();
    
    // Re-render selectable items list (to exclude already added items)
    filterPOSelectableItems();
    
    // Update added items table
    renderPOAddedItems();
    
    // Update proceed button state
    poProceedToReviewBtn.disabled = poAddedItems.length === 0;
    
    return false;
}

// Render items added to receipt
function renderPOAddedItems() {
    if (!poAddedItemsBody) return;
    
    if (poAddedItems.length === 0) {
        poAddedItemsBody.innerHTML = '';
        if (poNoItemsMessage) poNoItemsMessage.style.display = 'block';
        if (poProceedToReviewBtn) poProceedToReviewBtn.disabled = true;
        return;
    }
    
    if (poNoItemsMessage) poNoItemsMessage.style.display = 'none';
    
    poAddedItemsBody.innerHTML = poAddedItems.map((item, index) => `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">
                <i class="fa-solid fa-box" style="margin-right: 8px; color: #4caf50;"></i>
                ${escapeHtml(item.itemName)}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">${escapeHtml(item.category)}</td>
            <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">${item.quantityAdded} ${escapeHtml(item.unit)}</td>
            <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">
                <button type="button" onclick="removePOItem(${index})" style="background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    if (poProceedToReviewBtn) poProceedToReviewBtn.disabled = false;
}

// Remove item from PO receipt
function removePOItem(index) {
    if (index >= 0 && index < poAddedItems.length) {
        poAddedItems.splice(index, 1);
        renderPOAddedItems();
        filterPOSelectableItems();
        
        // Update button state
        if (poProceedToReviewBtn) {
            poProceedToReviewBtn.disabled = poAddedItems.length === 0;
        }
    }
}

// Render review table
function renderPOReviewTable() {
    const reviewBody = document.getElementById('poReviewBody');
    if (!reviewBody) return;
    
    reviewBody.innerHTML = poAddedItems.map(item => `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">
                <i class="fa-solid fa-box" style="margin-right: 8px; color: #4caf50;"></i>
                ${escapeHtml(item.itemName)}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">${escapeHtml(item.category)}</td>
            <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">${item.currentStock}</td>
            <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;" class="quantity-added">+${item.quantityAdded}</td>
            <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0; font-weight: 600;">${item.newStock}</td>
        </tr>
    `).join('');
}

// Process all PO items
async function processPOItems() {
    if (poAddedItems.length === 0) {
        showNotification('No items to process', 'error');
        return;
    }
    
    // Prevent double submission
    if (poIsSubmitting) {
        console.log('Submission blocked - already in progress');
        return;
    }
    
    // Set submission lock
    poIsSubmitting = true;
    
    // Disable process button
    if (poProcessBtn) {
        poProcessBtn.disabled = true;
        poProcessBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    }
    
    try {
        // Process each item
        for (const poItem of poAddedItems) {
            // Get current item data
            const item = allItems.find(i => i.id === poItem.itemId);
            if (!item) {
                console.warn(`Item not found: ${poItem.itemName}`);
                continue;
            }
            
            const oldQuantity = item.quantity;
            const newQuantity = oldQuantity + poItem.quantityAdded;
            
            // Update item quantity
            const updateData = {
                quantity: newQuantity,
                updated_at: new Date(poReceiptData.date).toISOString()
            };
            
            // Add P.O. Number if provided
            if (poReceiptData.poNumber) {
                updateData.po_number = poReceiptData.poNumber;
            }
            
            // Add Supplier if provided
            if (poReceiptData.supplierId) {
                updateData.supplier_id = poReceiptData.supplierId;
            }
            
            const { error } = await supabase
                .from('items')
                .update(updateData)
                .eq('id', poItem.itemId);
            
            if (error) {
                console.error('Error updating item:', error);
                continue;
            }
            
            // Log activity
            await logActivity(
                'UPDATE_QUANTITY',
                poItem.itemId,
                poItem.itemName,
                poItem.quantityAdded,
                oldQuantity,
                newQuantity,
                null,
                { 
                    label: poItem.category, 
                    unit: poItem.unit, 
                    po_number: poReceiptData.poNumber || null,
                    supplier: poReceiptData.supplierName || null,
                    receipt_date: poReceiptData.date
                },
                poReceiptData.date
            );
        }
        
        // Refresh items list
        await fetchItems();
        
        // Show success message
        showPOSuccessMessage();
        
    } catch (error) {
        console.error('Error processing PO items:', error);
        showNotification('Failed to process items. Please try again.', 'error');
    } finally {
        // Reset submission lock
        poIsSubmitting = false;
        
        if (poProcessBtn) {
            poProcessBtn.disabled = false;
            poProcessBtn.innerHTML = '<i class="fa-solid fa-check"></i> Process All Items';
        }
    }
}

// Show PO success message
function showPOSuccessMessage() {
    // Hide all steps
    poStep1.style.display = 'none';
    poStep2.style.display = 'none';
    poStep3.style.display = 'none';
    
    // Update indicators
    poStep1Indicator.classList.add('completed');
    poStep2Indicator.classList.add('completed');
    poStep3Indicator.classList.add('completed');
    
    // Calculate totals
    const totalItems = poAddedItems.length;
    const totalQuantity = poAddedItems.reduce((sum, item) => sum + item.quantityAdded, 0);
    
    // Populate success summary
    const successSummary = document.getElementById('poSuccessSummary');
    if (successSummary) {
        successSummary.innerHTML = `
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                    <td style="padding: 5px 0; color: #666; width: 40%;">Date:</td>
                    <td style="padding: 5px 0; font-weight: 500;">${escapeHtml(poReceiptData.date)}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 0; color: #666;">P.O. Number:</td>
                    <td style="padding: 5px 0; font-weight: 500;">${escapeHtml(poReceiptData.poNumber) || '(Not specified)'}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 0; color: #666;">Supplier:</td>
                    <td style="padding: 5px 0; font-weight: 500;">${escapeHtml(poReceiptData.supplierName) || '(Not specified)'}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 0; color: #666;">Items Added:</td>
                    <td style="padding: 5px 0; font-weight: 500;">${totalItems} items</td>
                </tr>
                <tr>
                    <td style="padding: 5px 0; color: #666;">Total Quantity:</td>
                    <td style="padding: 5px 0; font-weight: 500;">${totalQuantity} units</td>
                </tr>
            </table>
        `;
    }
    
    // Show success message
    document.getElementById('poSuccessMessage').style.display = 'block';
}

// ==========================================
// PO CREATE NEW ITEM FUNCTIONS
// ==========================================

// Open PO Create Item Modal
function openPOCreateItemModal() {
    // Close the PO item selection first
    cancelPOSelection();
    
    // Reset form
    document.getElementById('poNewItemName').value = '';
    document.getElementById('poNewItemLabel').value = '';
    document.getElementById('poNewItemUnit').value = '';
    document.getElementById('poNewItemQuantity').value = '';
    
    // Reset unit field visibility
    if (poNewItemUnitGroup) {
        poNewItemUnitGroup.style.display = 'none';
        poNewItemUnit.required = false;
    }
    
    poCreateItemModal.classList.add('show');
}

// Close PO Create Item Modal
function closePOCreateItemModal() {
    poCreateItemModal.classList.remove('show');
    document.getElementById('poCreateItemForm').reset();
    
    if (poNewItemUnitGroup) {
        poNewItemUnitGroup.style.display = 'none';
    }
}

// Toggle PO New Item Unit Field
function togglePONewItemUnitField() {
    if (poNewItemLabel && poNewItemUnitGroup) {
        if (poNewItemLabel.value === 'Janitorial' || poNewItemLabel.value === 'Office Supplies') {
            poNewItemUnitGroup.style.display = 'block';
            poNewItemUnit.required = true;
        } else {
            poNewItemUnitGroup.style.display = 'none';
            poNewItemUnit.required = false;
            poNewItemUnit.value = '';
        }
    }
}

// Handle PO Create Item
async function handlePOCreateItem(event) {
    event.preventDefault();
    
    const name = document.getElementById('poNewItemName').value.trim();
    const label = document.getElementById('poNewItemLabel').value.trim();
    const quantity = parseInt(document.getElementById('poNewItemQuantity').value);
    const unit = document.getElementById('poNewItemUnit').value.trim();
    
    if (!name || isNaN(quantity)) {
        showNotification('Please fill in all required fields', 'error');
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
        if (poReceiptData.poNumber) {
            insertData.po_number = poReceiptData.poNumber;
        }
        
        // Add Supplier if provided
        if (poReceiptData.supplierId) {
            insertData.supplier_id = poReceiptData.supplierId;
        }
        
        // Use receipt date
        if (poReceiptData.date) {
            const dateStr = new Date(poReceiptData.date).toISOString();
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
                { 
                    label: newItem.label, 
                    unit: newItem.unit, 
                    po_number: poReceiptData.poNumber || null,
                    supplier: poReceiptData.supplierName || null,
                    receipt_date: poReceiptData.date
                },
                poReceiptData.date
            );
            
            // Add the new item to the receipt
            const poItem = {
                itemId: newItem.id,
                itemName: newItem.name,
                category: newItem.label || 'No Category',
                unit: newItem.unit || 'unit',
                currentStock: 0,
                quantityAdded: newItem.quantity,
                newStock: newItem.quantity
            };
            
            poAddedItems.push(poItem);
            
            // Refresh items list
            await fetchItems();
        }
        
        // Close modal
        closePOCreateItemModal();
        
        // Update added items table
        renderPOAddedItems();
        
        // Update proceed button state
        poProceedToReviewBtn.disabled = poAddedItems.length === 0;
        
        showNotification('Item created and added to receipt!');
        
    } catch (error) {
        console.error('Error creating item:', error);
        showNotification('Failed to create item. Please try again.', 'error');
    }
}

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
window.proceedToItemSelection = proceedToItemSelection;
window.backToItemSelection = backToItemSelection;
window.showConfirmationStep = showConfirmationStep;
window.backToGetItemDetails = backToGetItemDetails;
window.confirmGetItem = confirmGetItem;
window.processAllItems = processAllItems;
window.getAnotherItem = getAnotherItem;
window.removeFromCart = removeFromCart;
window.cancelGetItemSelection = cancelGetItemSelection;
window.switchToItemsTab = switchToItemsTab;
window.switchToEquipmentTab = switchToEquipmentTab;

// View Item modal globals
window.openViewItemModal = openViewItemModal;
window.closeViewItemModal = closeViewItemModal;
window.fetchItemHistory = fetchItemHistory;

// Add Supplier modal globals
window.openAddSupplierModal = openAddSupplierModal;
window.closeAddSupplierModal = closeAddSupplierModal;
window.handleAddSupplier = handleAddSupplier;

// PO Workflow global functions
window.openPOModal = openPOModal;
window.closePOModal = closePOModal;
window.proceedToPOStep2 = proceedToPOStep2;
window.backToPOStep1 = backToPOStep1;
window.proceedToPOStep3 = proceedToPOStep3;
window.backToPOStep2 = backToPOStep2;
window.selectPOItem = selectPOItem;
window.cancelPOSelection = cancelPOSelection;
window.addItemToPO = addItemToPO;
window.removePOItem = removePOItem;
window.processPOItems = processPOItems;
window.openPOCreateItemModal = openPOCreateItemModal;
window.closePOCreateItemModal = closePOCreateItemModal;
window.handlePOCreateItem = handlePOCreateItem;
window.filterPOSelectableItems = filterPOSelectableItems;
