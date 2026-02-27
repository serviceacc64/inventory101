// Import Supabase client
import { supabase } from './supabase.js';

// DOM Elements
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const emptyState = document.getElementById('emptyState');
const roomsContainer = document.getElementById('roomsContainer');
const roomSearch = document.getElementById('roomSearch');
const clearSearch = document.getElementById('clearSearch');

const createRoomModal = document.getElementById('createRoomModal');
const createRoomForm = document.getElementById('createRoomForm');
const roomNameInput = document.getElementById('roomName');
const roomAddressInput = document.getElementById('roomDescription');
const roomAccountableInput = document.getElementById('roomAccountable');
const roomAdviserInput = document.getElementById('roomAdviser');

const roomItemsModal = document.getElementById('roomItemsModal');
const roomItemsTitle = document.getElementById('roomItemsTitle');
const roomItemsList = document.getElementById('roomItemsList');
const noItemsState = document.getElementById('noItemsState');

const editRoomModal = document.getElementById('editRoomModal');
const editRoomForm = document.getElementById('editRoomForm');
const editRoomId = document.getElementById('editRoomId');
const editRoomName = document.getElementById('editRoomName');
const editRoomAddress = document.getElementById('editRoomDescription');
const editRoomAccountable = document.getElementById('editRoomAccountable');
const editRoomAdviser = document.getElementById('editRoomAdviser');

// Edit Room Item Modal Elements
const editRoomItemModal = document.getElementById('editRoomItemModal');
const editRoomItemForm = document.getElementById('editRoomItemForm');
const editRoomItemId = document.getElementById('editRoomItemId');
const editRoomItemName = document.getElementById('editRoomItemName');
const editRoomItemQuantity = document.getElementById('editRoomItemQuantity');
const editRoomItemUnits = document.getElementById('editRoomItemUnits');
const editRoomItemCondition = document.getElementById('editRoomItemCondition');
const editRoomItemDescription = document.getElementById('editRoomItemDescription');
const editRoomItemRemarks = document.getElementById('editRoomItemRemarks');

// State
let allRooms = [];
let currentRoomId = null;
let isSubmitting = false;
let isRendering = false;
let searchTimeout = null;

// ==========================================
// INITIALIZE
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    fetchRooms();
    setupEventListeners();
});

function setupEventListeners() {
    // Search with debounce
    if (roomSearch) {
        roomSearch.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const searchTerm = e.target.value.toLowerCase();
            
            searchTimeout = setTimeout(() => {
                const filtered = allRooms.filter(room =>
                    room.name.toLowerCase().includes(searchTerm) ||
                    (room.room_address && room.room_address.toLowerCase().includes(searchTerm)) ||
                    (room.accountable && room.accountable.toLowerCase().includes(searchTerm)) ||
                    (room.room_adviser && room.room_adviser.toLowerCase().includes(searchTerm))
                );
                renderRooms(filtered);
            }, 300); // 300ms debounce
        });
    }

    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            clearTimeout(searchTimeout);
            roomSearch.value = '';
            renderRooms(allRooms);
        });
    }

    // Create room form
    if (createRoomForm) {
        createRoomForm.addEventListener('submit', window.handleCreateRoom);
    }

    // Edit room form
    if (editRoomForm) {
        editRoomForm.addEventListener('submit', window.handleEditRoom);
    }

    // Edit room item form
    if (editRoomItemForm) {
        editRoomItemForm.addEventListener('submit', window.handleEditRoomItem);
    }
}

// ==========================================
// FETCH DATA
// ==========================================
async function fetchRooms() {
    showLoading(true);
    hideError();

    try {
        const { data: rooms, error } = await supabase
            .from('rooms')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allRooms = rooms || [];
        renderRooms(allRooms);

        if (allRooms.length === 0) {
            emptyState.style.display = 'block';
            roomsContainer.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            roomsContainer.style.display = 'grid';
        }
    } catch (error) {
        console.error('Error fetching rooms:', error);
        showError('Failed to load rooms. Please try again.');
    } finally {
        showLoading(false);
    }
}

// ==========================================
// RENDER ROOMS
// ==========================================
async function renderRooms(rooms) {
    // Prevent concurrent renders
    if (isRendering) return;
    isRendering = true;

    try {
        roomsContainer.innerHTML = '';

        for (const room of rooms) {
            // Fetch room items
            const { data: roomItems, error } = await supabase
                .from('room_items')
                .select('*')
                .eq('room_id', room.id);

            const items = roomItems || [];
            const totalItems = items.length;
            const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

            const roomEl = document.createElement('div');
            roomEl.className = `room-card ${totalItems === 0 ? 'empty' : ''}`;
            roomEl.dataset.roomId = room.id;

            let itemsPreview = '';
            if (totalItems > 0) {
                itemsPreview = `
                    <div class="room-items-preview">
                        <h4>Items Preview</h4>
                        <div class="items-list-compact">
                            ${items.slice(0, 3).map(item => `
                                <div class="item-badge">
                                    <span class="item-name">${escapeHtml(item.item_name)}</span>
                                    <span class="item-qty">${item.quantity} ${item.units || 'pcs'}</span>
                                </div>
                            `).join('')}
                            ${totalItems > 3 ? `<div class="item-badge"><em style="color: #999;">+${totalItems - 3} more items</em></div>` : ''}
                        </div>
                    </div>
                `;
            }

            // Build room info section
            let roomInfo = '';
            if (room.room_address || room.accountable || room.room_adviser) {
                roomInfo = '<div class="room-info">';
                if (room.room_address) {
                    roomInfo += `<p class="room-address"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(room.room_address)}</p>`;
                }
                if (room.accountable) {
                    roomInfo += `<p class="room-accountable"><i class="fa-solid fa-user"></i> Accountable: ${escapeHtml(room.accountable)}</p>`;
                }
                if (room.room_adviser) {
                    roomInfo += `<p class="room-adviser"><i class="fa-solid fa-user-tie"></i> Adviser: ${escapeHtml(room.room_adviser)}</p>`;
                }
                roomInfo += '</div>';
            }

            roomEl.innerHTML = `
                <div class="room-header">
                    <h3 class="room-name">${escapeHtml(room.name)}</h3>
                    <div class="room-actions">
                        <button onclick="window.openEditRoomModal('${room.id}')" title="Edit Room">
                            <i class="fa-solid fa-edit"></i>
                        </button>
                    </div>
                </div>

                ${roomInfo}

                <div class="room-stats">
                    <div class="room-stat">
                        <span class="room-stat-value">${totalItems}</span>
                        <span class="room-stat-label">Item Types</span>
                    </div>
                    <div class="room-stat">
                        <span class="room-stat-value">${totalQuantity}</span>
                        <span class="room-stat-label">Total Items</span>
                    </div>
                </div>

                ${itemsPreview}

                <button onclick="window.openRoomItemsModal('${room.id}')" class="view-room-btn">
                    <i class="fa-solid fa-eye"></i> View Items
                </button>
            `;

            roomsContainer.appendChild(roomEl);
        }
    } finally {
        isRendering = false;
    }
}

// ==========================================
// MODAL FUNCTIONS
// ==========================================
window.openCreateRoomModal = function() {
    createRoomForm.reset();
    createRoomModal.style.display = 'flex';
}

window.closeCreateRoomModal = function() {
    createRoomModal.style.display = 'none';
}

window.openRoomItemsModal = async function(roomId) {
    currentRoomId = roomId;
    const room = allRooms.find(r => r.id === roomId);
    if (room) {
        roomItemsTitle.textContent = `${room.name} - Items`;
    }

    roomItemsModal.style.display = 'flex';
    await loadRoomItems(roomId);
};

window.closeRoomItemsModal = function() {
    roomItemsModal.style.display = 'none';
    currentRoomId = null;
}

// Show custom item form
window.showCustomItemForm = function() {
    const form = document.getElementById('addCustomItemForm');
    const btn = document.getElementById('showCustomItemBtn');
    
    if (form) {
        form.style.display = 'block';
    }
    if (btn) {
        btn.style.display = 'none';
    }
}

// Hide custom item form
window.hideCustomItemForm = function() {
    const form = document.getElementById('addCustomItemForm');
    const btn = document.getElementById('showCustomItemBtn');
    
    if (form) {
        form.style.display = 'none';
        // Clear form inputs
        document.getElementById('customItemName').value = '';
        document.getElementById('customItemQuantity').value = '1';
        document.getElementById('customItemDescription').value = '';
        const unitsInput = document.getElementById('customItemUnits');
        const conditionInput = document.getElementById('customItemCondition');
        const remarksInput = document.getElementById('customItemRemarks');
        if (unitsInput) unitsInput.value = 'pcs';
        if (conditionInput) conditionInput.value = 'Good';
        if (remarksInput) remarksInput.value = '';
    }
    if (btn) {
        btn.style.display = 'block';
    }
}

window.openEditRoomModal = async function(roomId) {
    const room = allRooms.find(r => r.id === roomId);
    if (room) {
        editRoomId.value = room.id;
        editRoomName.value = room.name;
        editRoomAddress.value = room.room_address || '';
        editRoomAccountable.value = room.accountable || '';
        editRoomAdviser.value = room.room_adviser || '';
        editRoomModal.style.display = 'flex';
    }
};

window.closeEditRoomModal = function() {
    editRoomModal.style.display = 'none';
}

// Edit Room Item Modal Functions
window.openEditRoomItemModal = async function(itemId) {
    try {
        // Fetch the item details
        const { data: item, error } = await supabase
            .from('room_items')
            .select('*')
            .eq('id', itemId)
            .single();

        if (error) throw error;
        if (!item) {
            showError('Item not found');
            return;
        }

        // Populate the form
        editRoomItemId.value = item.id;
        editRoomItemName.value = item.item_name;
        editRoomItemQuantity.value = item.quantity;
        editRoomItemUnits.value = item.units || 'pcs';
        editRoomItemCondition.value = item.condition || 'Good';
        editRoomItemDescription.value = item.description || '';
        editRoomItemRemarks.value = item.remarks || '';

        // Show the modal
        editRoomItemModal.style.display = 'flex';
    } catch (error) {
        console.error('Error loading item for edit:', error);
        showError('Failed to load item details');
    }
};

window.closeEditRoomItemModal = function() {
    editRoomItemModal.style.display = 'none';
};

window.handleEditRoomItem = async function(event) {
    event.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;

    try {
        const itemId = editRoomItemId.value;
        const itemName = editRoomItemName.value.trim();
        const quantity = parseInt(editRoomItemQuantity.value);
        const units = editRoomItemUnits.value;
        const condition = editRoomItemCondition.value;
        const description = editRoomItemDescription.value.trim() || null;
        const remarks = editRoomItemRemarks.value.trim() || null;

        if (!itemName || isNaN(quantity) || quantity < 1) {
            showError('Please enter a valid item name and quantity');
            return;
        }

        const { error } = await supabase
            .from('room_items')
            .update({
                item_name: itemName,
                quantity: quantity,
                units: units,
                condition: condition,
                description: description,
                remarks: remarks,
                updated_at: new Date().toISOString()
            })
            .eq('id', itemId);

        if (error) throw error;

        closeEditRoomItemModal();
        await loadRoomItems(currentRoomId);
        await fetchRooms();
        showSuccessMessage('Item updated successfully!');
    } catch (error) {
        console.error('Error updating item:', error);
        showError('Failed to update item. Please try again.');
    } finally {
        isSubmitting = false;
    }
};

window.handleDeleteRoomItem = async function() {
    const itemId = editRoomItemId.value;
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }

    if (isSubmitting) return;
    isSubmitting = true;

    try {
        const { error } = await supabase
            .from('room_items')
            .delete()
            .eq('id', itemId);

        if (error) throw error;

        closeEditRoomItemModal();
        await loadRoomItems(currentRoomId);
        await fetchRooms();
        showSuccessMessage('Item deleted successfully!');
    } catch (error) {
        console.error('Error deleting item:', error);
        showError('Failed to delete item. Please try again.');
    } finally {
        isSubmitting = false;
    }
};

// Close modals when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === createRoomModal) window.closeCreateRoomModal();
    if (event.target === roomItemsModal) window.closeRoomItemsModal();
    if (event.target === editRoomModal) window.closeEditRoomModal();
    if (event.target === editRoomItemModal) window.closeEditRoomItemModal();
});

// ==========================================
// CREATE ROOM
// ==========================================
window.handleCreateRoom = async function(event) {
    event.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;

    try {
        const { data, error } = await supabase
            .from('rooms')
            .insert([{
                name: roomNameInput.value.trim(),
                room_address: roomAddressInput.value.trim() || null,
                accountable: roomAccountableInput.value.trim() || null,
                room_adviser: roomAdviserInput.value.trim() || null,
                created_at: new Date().toISOString()
            }])
            .select();

        if (error) throw error;

        closeCreateRoomModal();
        await fetchRooms();
        showSuccessMessage('Room created successfully!');
    } catch (error) {
        console.error('Error creating room:', error);
        showError('Failed to create room. Please try again.');
    } finally {
        isSubmitting = false;
    }
}

// ==========================================
// EDIT ROOM
// ==========================================
window.handleEditRoom = async function(event) {
    event.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;

    try {
        const roomId = editRoomId.value;

        const { error } = await supabase
            .from('rooms')
            .update({
                name: editRoomName.value.trim(),
                room_address: editRoomAddress.value.trim() || null,
                accountable: editRoomAccountable.value.trim() || null,
                room_adviser: editRoomAdviser.value.trim() || null
            })
            .eq('id', roomId);

        if (error) throw error;

        closeEditRoomModal();
        await fetchRooms();
        showSuccessMessage('Room updated successfully!');
    } catch (error) {
        console.error('Error updating room:', error);
        showError('Failed to update room. Please try again.');
    } finally {
        isSubmitting = false;
    }
}

// ==========================================
// DELETE ROOM
// ==========================================
window.handleDeleteRoom = async function() {
    const roomId = editRoomId.value;
    if (!confirm('Are you sure you want to delete this room and all its items? This cannot be undone.')) {
        return;
    }

    if (isSubmitting) return;
    isSubmitting = true;

    try {
        // Delete room items first
        await supabase.from('room_items').delete().eq('room_id', roomId);

        // Delete room
        const { error } = await supabase
            .from('rooms')
            .delete()
            .eq('id', roomId);

        if (error) throw error;

        closeEditRoomModal();
        await fetchRooms();
        showSuccessMessage('Room deleted successfully!');
    } catch (error) {
        console.error('Error deleting room:', error);
        showError('Failed to delete room. Please try again.');
    } finally {
        isSubmitting = false;
    }
};

// ==========================================
// ROOM ITEMS MANAGEMENT
// ==========================================
window.fetchRooms = fetchRooms;

async function loadRoomItems(roomId) {
    try {
        const { data: roomItems, error } = await supabase
            .from('room_items')
            .select('*')
            .eq('room_id', roomId)
            .order('item_name', { ascending: true });

        if (error) throw error;

        const items = roomItems || [];
        renderRoomItems(items);
    } catch (error) {
        console.error('Error loading room items:', error);
        showError('Failed to load items.');
    }
}

function renderRoomItems(items) {
    roomItemsList.innerHTML = '';

    if (items.length === 0) {
        noItemsState.style.display = 'block';
        roomItemsList.style.display = 'none';
        return;
    }

    noItemsState.style.display = 'none';
    roomItemsList.style.display = 'flex';

    items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'room-item-row';
        row.dataset.roomItemId = item.id;

        // Determine if this is a custom item or from inventory
        const isCustom = !item.item_id;
        const badge = isCustom 
            ? '<span class="item-type-badge custom">Custom</span>' 
            : '<span class="item-type-badge inventory">Inventory</span>';

        // Get condition class for styling
        const conditionClass = getConditionClass(item.condition);

        row.innerHTML = `
            <div class="room-item-info">
                <p class="room-item-name">${escapeHtml(item.item_name)}</p>
                ${item.description ? `<p class="room-item-description">${escapeHtml(item.description)}</p>` : ''}
                <div class="room-item-meta">
                    <span class="condition-badge ${conditionClass}">${item.condition || 'Good'}</span>
                    <span class="unit-badge">${item.units || 'pcs'}</span>
                    ${isCustom ? '<span class="item-type-badge custom">Custom</span>' : '<span class="item-type-badge inventory">Inventory</span>'}
                </div>
                ${item.remarks ? `<p class="room-item-remarks"><i class="fa-solid fa-sticky-note"></i> ${escapeHtml(item.remarks)}</p>` : ''}
            </div>
            <div class="room-item-qty-control">
                <span class="qty-display">${item.quantity} ${item.units || 'pcs'}</span>
                <div class="room-item-actions">
                    <button class="edit" onclick="window.openEditRoomItemModal('${item.id}')" title="Edit Item">
                        <i class="fa-solid fa-edit"></i>
                    </button>
                    <button class="remove" onclick="window.handleRemoveItemFromRoom('${item.id}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

        roomItemsList.appendChild(row);
    });
}

// Helper function to get condition badge class
function getConditionClass(condition) {
    switch(condition) {
        case 'New': return 'condition-new';
        case 'Good': return 'condition-good';
        case 'Fair': return 'condition-fair';
        case 'Poor': return 'condition-poor';
        case 'Damaged': return 'condition-damaged';
        default: return 'condition-good';
    }
}

// ==========================================
// EXPORT ROOM ITEMS TO EXCEL
// ==========================================
window.exportRoomItemsToExcel = async function() {
    if (!currentRoomId) {
        console.log('No room selected');
        return;
    }

    // Check if XLSX library is available
    if (typeof XLSX === 'undefined') {
        console.log('XLSX library not loaded. Waiting...');
        // Wait a moment and try again
        setTimeout(() => {
            if (typeof XLSX === 'undefined') {
                console.log('XLSX library still not available');
                showError('Excel export library not loaded. Please refresh the page.');
            }
        }, 1000);
        return;
    }

    try {
        // Get current room info
        const room = allRooms.find(r => r.id === currentRoomId);
        if (!room) {
            console.log('Room information not found');
            return;
        }

        // Fetch all items for this room
        const { data: roomItems, error } = await supabase
            .from('room_items')
            .select('*')
            .eq('room_id', currentRoomId)
            .order('item_name', { ascending: true });

        if (error) throw error;

        const items = roomItems || [];

        // Prepare data for Excel with room name as title
        const exportData = [
            { 'No.': '', 'Item Name': `Room: ${room.name}`, 'Quantity': '', 'Units': '', 'Condition': '', 'Description': '', 'Remarks': '', 'Type': '', 'Date Added': '' },
            { 'No.': '', 'Item Name': '', 'Quantity': '', 'Units': '', 'Condition': '', 'Description': '', 'Remarks': '', 'Type': '', 'Date Added': '' },
            ...items.map((item, index) => ({
                'No.': index + 1,
                'Item Name': item.item_name,
                'Quantity': item.quantity,
                'Units': item.units || 'pcs',
                'Condition': item.condition || 'Good',
                'Description': item.description || '-',
                'Remarks': item.remarks || '-',
                'Type': item.item_id ? 'Inventory' : 'Custom',
                'Date Added': item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'
            }))
        ];

        console.log('Export data:', exportData);
        console.log('XLSX available:', typeof XLSX !== 'undefined');

        // Create workbook and worksheet
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, room.name);

        // Style the header row (optional - basic styling)
        ws['!cols'] = [
            { wch: 6 },  // No.
            { wch: 25 }, // Item Name
            { wch: 10 }, // Quantity
            { wch: 10 }, // Units
            { wch: 12 }, // Condition
            { wch: 30 }, // Description
            { wch: 30 }, // Remarks
            { wch: 12 }, // Type
            { wch: 15 }  // Date Added
        ];

        // Generate filename with room name and timestamp
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `${room.name}_items_${timestamp}.xlsx`;

        console.log('Attempting to export file:', filename);

        // Write the file
        XLSX.writeFile(wb, filename);

        console.log('Export successful:', filename);
        showSuccessMessage(`Exported ${items.length} item(s) to ${filename}`);
    } catch (error) {
        console.error('Error exporting items:', error);
        console.log('Full error object:', error);
        showError('Failed to export items to Excel');
    }
}

// ==========================================
// ADD CUSTOM ITEM TO ROOM
// ==========================================
window.handleAddCustomItemToRoom = async function(event) {
    // Prevent any default form submission and stop event propagation
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // Get input values with strict validation
    const itemNameInput = document.getElementById('customItemName');
    const quantityInput = document.getElementById('customItemQuantity');
    const descriptionInput = document.getElementById('customItemDescription');
    const unitsInput = document.getElementById('customItemUnits');
    const conditionInput = document.getElementById('customItemCondition');
    const remarksInput = document.getElementById('customItemRemarks');
    
    const itemName = itemNameInput.value.trim();
    const description = descriptionInput.value.trim() || null;
    const units = unitsInput ? unitsInput.value : 'pcs';
    const condition = conditionInput ? conditionInput.value : 'Good';
    const remarks = remarksInput ? remarksInput.value.trim() || null : null;
    
    // Strict quantity validation - ensure it's a valid number greater than 0
    let quantity = parseInt(quantityInput.value);
    if (isNaN(quantity) || quantity < 1) {
        quantity = 1; // Default to 1 if invalid
    }

    if (!itemName) {
        showError('Please enter an item name');
        return;
    }

    if (!currentRoomId) {
        showError('Room not selected');
        return;
    }

    if (isSubmitting) return;
    isSubmitting = true;

    try {
        // Check if custom item with same name AND same description already exists in this room
        // Fetch all items with this name in this room, then filter for custom items (item_id is null)
        const { data: existingItems, error: fetchError } = await supabase
            .from('room_items')
            .select('*')
            .eq('room_id', currentRoomId)
            .eq('item_name', itemName);

        if (fetchError) throw fetchError;

        // Find custom item (no item_id) with matching name AND description
        // Only combine items if they have the same description (or both have no description)
        const normalizedDescription = description ? description.trim().toLowerCase() : '';
        const existing = existingItems && existingItems.length > 0 
            ? existingItems.find(item => {
                // Only match custom items (item_id is null)
                if (item.item_id !== null) return false;
                
                // Compare descriptions - treat null and empty as equivalent
                const existingDesc = item.description ? item.description.trim().toLowerCase() : '';
                return existingDesc === normalizedDescription;
            })
            : null;

        if (existing) {
            // Update quantity of existing custom item (same name AND same description)
            const newTotal = existing.quantity + quantity;
            
            const { error } = await supabase
                .from('room_items')
                .update({ 
                    quantity: newTotal,
                    description: description || existing.description,
                    units: units || existing.units,
                    condition: condition || existing.condition,
                    remarks: remarks || existing.remarks
                })
                .eq('id', existing.id);

            if (error) throw error;
            showSuccessMessage(`Updated "${itemName}" quantity to ${newTotal}`);
        } else {
            // Insert new custom room item (item_id is null)
            const { error } = await supabase
                .from('room_items')
                .insert([{
                    room_id: currentRoomId,
                    item_id: null, // No inventory item linked
                    item_name: itemName,
                    description: description,
                    units: units,
                    condition: condition,
                    remarks: remarks,
                    quantity: quantity,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }]);

            if (error) throw error;
            showSuccessMessage(`Created custom item "${itemName}" (${quantity} ${units}) in room`);
        }

        // Clear inputs
        itemNameInput.value = '';
        quantityInput.value = '1';
        descriptionInput.value = '';
        if (unitsInput) unitsInput.value = 'pcs';
        if (conditionInput) conditionInput.value = 'Good';
        if (remarksInput) remarksInput.value = '';
        await loadRoomItems(currentRoomId);
        await fetchRooms(); // Refresh room card
    } catch (error) {
        console.error('Error adding custom item to room:', error);
        showError('Failed to create custom item. Please try again.');
    } finally {
        isSubmitting = false;
    }
};

// ==========================================
// UPDATE ITEM QUANTITY
// ==========================================
window.handleUpdateItemQuantity = async function(roomItemId, newQuantity) {
    const quantity = parseInt(newQuantity) || 1;

    if (quantity <= 0) {
        showError('Quantity must be at least 1');
        return;
    }

    try {
        const { error } = await supabase
            .from('room_items')
            .update({ quantity })
            .eq('id', roomItemId);

        if (error) throw error;

        if (currentRoomId) {
            await loadRoomItems(currentRoomId);
            await fetchRooms();
        }
    } catch (error) {
        console.error('Error updating quantity:', error);
        showError('Failed to update quantity.');
    }
};

// ==========================================
// REMOVE ITEM FROM ROOM
// ==========================================
window.handleRemoveItemFromRoom = async function(roomItemId) {
    if (!confirm('Remove this item from the room?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('room_items')
            .delete()
            .eq('id', roomItemId);

        if (error) throw error;

        showSuccessMessage('Item removed from room!');
        if (currentRoomId) {
            await loadRoomItems(currentRoomId);
            await fetchRooms();
        }
    } catch (error) {
        console.error('Error removing item:', error);
        showError('Failed to remove item.');
    }
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function showLoading(show) {
    loadingState.style.display = show ? 'block' : 'none';
}

function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    errorState.style.display = 'block';
}

function hideError() {
    errorState.style.display = 'none';
}

function showSuccessMessage(message) {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
