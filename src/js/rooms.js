// Import Supabase client
import { supabase } from './supabase.js';
import { buildRoomWorkbook, writeWorkbook } from './exportHelpers.js';
// animation helpers
import { showNotification, pulseElement, fadeIn } from './animate.js';

// DOM Elements
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const emptyState = document.getElementById('emptyState');
const roomsContainer = document.getElementById('roomsContainer');
const roomSearch = document.getElementById('roomSearch');
const clearSearch = document.getElementById('clearSearch');
const gradeFilter = document.getElementById('gradeFilter');


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
const editRoomItemUnitValue = document.getElementById('editRoomItemUnitValue');

// View Room Item Modal elements
const viewRoomItemModal = document.getElementById('viewRoomItemModal');
const viewRoomItemName = document.getElementById('viewRoomItemName');
const viewRoomItemQuantity = document.getElementById('viewRoomItemQuantity');
const viewRoomItemUnits = document.getElementById('viewRoomItemUnits');
const viewRoomItemCondition = document.getElementById('viewRoomItemCondition');
const viewRoomItemDescription = document.getElementById('viewRoomItemDescription');
const viewRoomItemRemarks = document.getElementById('viewRoomItemRemarks');
const viewRoomEditBtn = document.getElementById('viewRoomEditBtn');
const viewRoomDeleteBtn = document.getElementById('viewRoomDeleteBtn');


// State
let allRooms = [];
let currentRoomId = null;
let isSubmitting = false;
let isRendering = false;
let searchTimeout = null;
let filterTimeout = null;

// Pagination state
let currentPage = 1;
const itemsPerPage = 16; // 16 items per page for the grid layout
let filteredRooms = [];
let totalPages = 1;


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
            
            searchTimeout = setTimeout(() => {
                applyFiltersAndSort();
            }, 300); // 300ms debounce
        });
    }

    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            clearTimeout(searchTimeout);
            roomSearch.value = '';
            applyFiltersAndSort();
        });
    }

    // Grade filter with debounce
    if (gradeFilter) {
        gradeFilter.addEventListener('change', (e) => {
            clearTimeout(filterTimeout);
            
            filterTimeout = setTimeout(() => {
                applyFiltersAndSort();
            }, 100);
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
// FILTER AND SORT FUNCTIONS
// ==========================================
function applyFiltersAndSort() {
    const searchTerm = roomSearch ? roomSearch.value.toLowerCase().trim() : '';
    const selectedGrade = gradeFilter ? gradeFilter.value : '';

    // Start with all rooms
    let filtered = [...allRooms];

    // Apply grade filter
    if (selectedGrade) {
        filtered = filtered.filter(room => 
            room.name.toLowerCase().startsWith(selectedGrade.toLowerCase())
        );
    }

    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(room =>
            room.name.toLowerCase().includes(searchTerm) ||
            (room.room_address && room.room_address.toLowerCase().includes(searchTerm)) ||
            (room.accountable && room.accountable.toLowerCase().includes(searchTerm)) ||
            (room.room_adviser && room.room_adviser.toLowerCase().includes(searchTerm))
        );
    }

    // Sort by room name (alphabetically A-Z)
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    // Update filtered rooms and reset pagination
    filteredRooms = filtered;
    currentPage = 1;
    totalPages = Math.ceil(filteredRooms.length / itemsPerPage);

    renderRooms(filteredRooms);
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
        
        // Apply filters and sort on initial load
        applyFiltersAndSort();

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
        // Calculate pagination
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedRooms = rooms.slice(startIndex, endIndex);

        // Show/hide pagination controls
        const paginationContainer = document.getElementById('paginationContainer');
        if (rooms.length > itemsPerPage) {
            paginationContainer.style.display = 'flex';
            updatePaginationControls();
        } else {
            paginationContainer.style.display = 'none';
        }

        roomsContainer.innerHTML = '';

        for (const room of paginatedRooms) {
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
            fadeIn(roomEl);
        }
    } finally {
        isRendering = false;
    }
}

// ==========================================
// PAGINATION FUNCTIONS
// ==========================================
function updatePaginationControls() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageIndicator = document.getElementById('pageIndicator');

    // Update page indicator
    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;

    // Disable/enable buttons
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

window.previousPage = function() {
    if (currentPage > 1) {
        currentPage--;
        renderRooms(filteredRooms);
        // Scroll to top of rooms container
        roomsContainer.scrollIntoView({ behavior: 'smooth' });
    }
}

window.nextPage = function() {
    if (currentPage < totalPages) {
        currentPage++;
        renderRooms(filteredRooms);
        // Scroll to top of rooms container
        roomsContainer.scrollIntoView({ behavior: 'smooth' });
    }
}

// ==========================================
// MODAL FUNCTIONS
// ==========================================
window.openCreateRoomModal = function() {
    createRoomForm.reset();
    createRoomModal.classList.add('show');
}

window.closeCreateRoomModal = function() {
    createRoomModal.classList.remove('show');
}

window.openRoomItemsModal = async function(roomId) {
    currentRoomId = roomId;
    const room = allRooms.find(r => r.id === roomId);
    if (room) {
        roomItemsTitle.textContent = `${room.name} - Items`;
    }

    roomItemsModal.classList.add('show');
    await loadRoomItems(roomId);
};

window.closeRoomItemsModal = function() {
    roomItemsModal.classList.remove('show');
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
        editRoomModal.classList.add('show');
    }
};

window.closeEditRoomModal = function() {
    editRoomModal.classList.remove('show');
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
        editRoomItemUnitValue.value = item.unit_value || '';
        editRoomItemCondition.value = item.condition || 'Good';
        editRoomItemDescription.value = item.description || '';
        editRoomItemRemarks.value = item.remarks || '';

        // Show the modal

        editRoomItemModal.classList.add('show');
    } catch (error) {
        console.error('Error loading item for edit:', error);
        showError('Failed to load item details');
    }
};

window.closeEditRoomItemModal = function() {
    editRoomItemModal.classList.remove('show');
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
        const unitValue = parseFloat(editRoomItemUnitValue.value) || null;
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
                unit_value: unitValue,
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
        showNotification('Item updated successfully!');
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
        showNotification('Item deleted successfully!');
    } catch (error) {
        console.error('Error deleting item:', error);
        showError('Failed to delete item. Please try again.');
    } finally {
        isSubmitting = false;
    }
};

// ==========================================
// VIEW ROOM ITEM
// ==========================================
function openViewRoomItemModal(itemId) {
    // fetch item details
    const item = document.querySelector(`[data-room-item-id]`) && null; // placeholder
    // prefer to find from currently loaded list by making a query
    (async () => {
        try {
            const { data: item, error } = await supabase
                .from('room_items')
                .select('*')
                .eq('id', itemId)
                .single();

            if (error || !item) {
                console.error('Room item not found', error);
                return;
            }

            if (viewRoomItemName) viewRoomItemName.textContent = item.item_name;
            if (viewRoomItemQuantity) viewRoomItemQuantity.textContent = `${item.quantity} ${item.units || 'pcs'}`;
            if (viewRoomItemUnits) viewRoomItemUnits.textContent = item.units || '-';
            if (viewRoomItemCondition) viewRoomItemCondition.textContent = item.condition || '-';
            if (viewRoomItemDescription) viewRoomItemDescription.textContent = item.description || '-';
            if (viewRoomItemRemarks) viewRoomItemRemarks.textContent = item.remarks || '-';

            if (viewRoomItemModal) {
                viewRoomItemModal.classList.add('show');
                viewRoomItemModal.dataset.itemId = item.id;
            }

            if (viewRoomEditBtn) {
                viewRoomEditBtn.onclick = () => {
                    window.closeViewRoomItemModal();
                    window.openEditRoomItemModal(item.id);
                };
            }

            if (viewRoomDeleteBtn) {
                viewRoomDeleteBtn.onclick = () => {
                    if (!confirm('Delete this item from room?')) return;
                    // open edit modal with id then call delete
                    window.openEditRoomItemModal(item.id);
                    setTimeout(() => {
                        window.handleDeleteRoomItem();
                        window.closeViewRoomItemModal();
                    }, 200);
                };
            }
        } catch (err) {
            console.error('Error opening room item modal', err);
        }
    })();
}

window.closeViewRoomItemModal = function() {
    if (viewRoomItemModal) viewRoomItemModal.classList.remove('show');
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
        showNotification('Room created successfully!');
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
        showNotification('Room updated successfully!');
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
        showNotification('Room deleted successfully!');
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
        fadeIn(row);
    });

    // Attach click handlers to open view modal for each row (delegation alternative)
    roomItemsList.querySelectorAll('.room-item-row').forEach(row => {
        row.addEventListener('click', function(e) {
            // ignore clicks on buttons inside row
            if (e.target.closest('button') || e.target.closest('.room-item-actions')) return;
            const id = this.dataset.roomItemId;
            openViewRoomItemModal(id);
        });
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
        console.log(`Fetched ${items.length} items for room "${room.name}"`);
        if (items.length === 0) {
            showNotification('No items to export (empty room)', 'warning');
            return;
        }

        // Try to use template-based export first
        let workbook = null;
        let usedTemplate = false;
        
        try {
            // Check if TemplateManager is available
            if (window.TemplateManager) {
                console.log('Looking for CLASSROOM INVENTORY template...');
                
                // Fetch the CLASSROOM INVENTORY template
                const template = await window.TemplateManager.fetchTemplateByName('CLASSROOM INVENTORY');
                
                if (template) {
                    console.log('Found template, filling with data...');
                    
                    // Prepare data with room name included
                    const exportData = items.map(item => ({
                        name: item.item_name,
                        description: item.description || '',
                        unit: item.units || 'pcs',
                        quantity: item.quantity,
                        room_name: room.name,
                        condition: item.condition || 'Good',
                        remarks: item.remarks || ''
                    }));
                    
                    // Fill template with data (handles dynamic row extension)
                    workbook = await window.TemplateManager.fillTemplateWithData(template, exportData);
                    
                    if (workbook) {
                        usedTemplate = true;
                        console.log('Template filled successfully with dynamic row extension');
                    }
                } else {
                    console.log('No CLASSROOM INVENTORY template found, using default export');
                }
            }
        } catch (templateError) {
            console.warn('Template-based export failed, falling back to default:', templateError);
        }

        // If template export failed or wasn't available, use default export
        if (!workbook) {
            console.log('Using default JSON-to-sheet export (shared helper)');

            // Build using shared helper so report page can reuse identical layout
            const exportData = items.map(item => ({
                item_name: item.item_name,
                quantity: item.quantity,
                units: item.units,
                condition: item.condition,
                description: item.description,
                remarks: item.remarks,
                item_id: item.item_id,
                created_at: item.created_at
            }));

            workbook = buildRoomWorkbook(exportData, room.name);
        }

        // Generate filename with room name and timestamp
        const timestamp = new Date().toISOString().split('T')[0];
        let filename = `${room.name}_items_${timestamp}.xlsx`;
        // Sanitize filename for FS
        filename = filename.replace(/[<>:"/\\|?*]/g, '_');
        console.log('Export filename:', filename);
        console.log('Used template:', usedTemplate);

        // Write the file
        try {
            XLSX.writeFile(workbook, filename);
        } catch (writeError) {
            console.error('XLSX.writeFile failed:', writeError);
            throw new Error(`Download failed: ${writeError.message}`);
        }

        console.log('Export successful:', filename);
        showNotification(`Exported ${items.length} item(s) to ${filename}${usedTemplate ? ' (using template)' : ''}`);
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
// Only combine items if they have the same name+description+condition+remarks
        const normalizedDescription = description ? description.trim().toLowerCase() : '';
        const normalizedRemarks = remarks ? remarks.trim().toLowerCase() : '';
        const existing = existingItems && existingItems.length > 0 
            ? existingItems.find(item => {
                // Only match custom items (item_id is null)
                if (item.item_id !== null) return false;
                
                // Compare descriptions - treat null and empty as equivalent
                const existingDesc = item.description ? item.description.trim().toLowerCase() : '';
                const existingRemarks = item.remarks ? item.remarks.trim().toLowerCase() : '';
                return (
                    existingDesc === normalizedDescription &&
                    item.condition === condition &&
                    existingRemarks === normalizedRemarks
                );
            })
            : null;

        if (existing) {
            // Update quantity of existing custom item (same name AND same description)
            const newTotal = existing.quantity + quantity;
            
            const { error } = await supabase
                .from('room_items')
                .update({ 
                    quantity: newTotal,
                    // Preserve existing values except quantity
                    units: units || existing.units
                })
                .eq('id', existing.id);

            if (error) throw error;
            showNotification(`Added ${quantity} "${units}" to existing "${itemName}" (total: ${newTotal})`);
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
            showNotification(`Created new "${itemName}" (${quantity} ${units}, ${condition}) in room`);
        }

        // Clear inputs
        itemNameInput.value = '';
        quantityInput.value = '1';
        descriptionInput.value = '';
        if (unitsInput) unitsInput.value = 'pcs';
        if (conditionInput) conditionInput.value = 'Good';
        if (remarksInput) remarksInput.value = '';
        const unitValueInput = document.getElementById('customItemUnitValue');
        if (unitValueInput) unitValueInput.value = '';

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

        showNotification('Item removed from room!');
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
