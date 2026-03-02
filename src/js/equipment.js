// Import Supabase client
import { supabase } from './supabase.js';

// DOM Elements
const equipmentContainer = document.getElementById('equipmentContainer');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const emptyState = document.getElementById('emptyState');
const createEquipmentModal = document.getElementById('createEquipmentModal');
const editEquipmentModal = document.getElementById('editEquipmentModal');
const addSupplierModal = document.getElementById('addSupplierModal');
const equipmentSearch = document.getElementById('equipmentSearch');
const searchFilter = document.getElementById('searchFilter');
const clearSearch = document.getElementById('clearSearch');

// View Equipment Modal elements
const viewEquipmentModal = document.getElementById('viewEquipmentModal');
const viewEquipmentName = document.getElementById('viewEquipmentName');
const viewEquipmentReceipt = document.getElementById('viewEquipmentReceipt');
const viewEquipmentQuantity = document.getElementById('viewEquipmentQuantity');
const viewEquipmentUnitCost = document.getElementById('viewEquipmentUnitCost');
const viewEquipmentSupplier = document.getElementById('viewEquipmentSupplier');
const viewEquipmentAccountable = document.getElementById('viewEquipmentAccountable');
const viewEquipmentReceivedBy = document.getElementById('viewEquipmentReceivedBy');
const viewEquipmentDate = document.getElementById('viewEquipmentDate');
const viewEquipmentEditBtn = document.getElementById('viewEquipmentEditBtn');
const viewEquipmentDeleteBtn = document.getElementById('viewEquipmentDeleteBtn');

// Store all equipment for search functionality
let allEquipment = [];

// Store all suppliers
let allSuppliers = [];
let isFetchingSuppliers = false; // Flag to prevent duplicate fetches

// Store unique suppliers (for deduplication)
function getUniqueSuppliers(suppliers) {
    const seen = new Set();
    return suppliers.filter(supplier => {
        const name = supplier.supplier_name.toLowerCase().trim();
        if (seen.has(name)) {
            return false;
        }
        seen.add(name);
        return true;
    });
}


// ==========================================
// 0. FETCH SUPPLIERS
// ==========================================
async function fetchSuppliers(forceRefresh = false) {
    // Prevent duplicate fetches unless force refresh is requested
    if (isFetchingSuppliers && !forceRefresh) {
        // If suppliers already exist and not forcing refresh, just render
        if (allSuppliers.length > 0) {
            renderSupplierDropdowns();
            return;
        }
    }
    
    isFetchingSuppliers = true;
    
    try {
        const { data: suppliers, error } = await supabase
            .from('suppliers')
            .select('*')
            .order('supplier_name', { ascending: true });
        
        if (error) throw error;
        
        allSuppliers = suppliers || [];
        renderSupplierDropdowns();
        
    } catch (error) {
        console.error('Error fetching suppliers:', error);
    } finally {
        isFetchingSuppliers = false;
    }
}


function renderSupplierDropdowns() {
    const createSupplierSelect = document.getElementById('supplier');
    const editSupplierSelect = document.getElementById('editSupplier');
    
    // Get unique suppliers to prevent duplicates in dropdown
    const uniqueSuppliers = getUniqueSuppliers(allSuppliers);
    
    // Options HTML
    let optionsHTML = '<option value="">Select a supplier</option>';
    uniqueSuppliers.forEach(supplier => {
        optionsHTML += `<option value="${supplier.id}">${escapeHtml(supplier.supplier_name)}</option>`;
    });
    
    if (createSupplierSelect) {
        createSupplierSelect.innerHTML = optionsHTML;
    }
    
    if (editSupplierSelect) {
        editSupplierSelect.innerHTML = optionsHTML;
    }
}


// ==========================================
// 1. FETCH EQUIPMENT FROM SUPABASE
// ==========================================
async function fetchEquipment() {
    showLoading(true);
    hideError();
    
    try {
        const { data: equipment, error } = await supabase
            .from('equipment')
            .select('*, suppliers(supplier_name)')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allEquipment = equipment || [];
        renderEquipment(allEquipment);
        
        // Show empty state if no equipment
        if (allEquipment.length === 0) {
            emptyState.style.display = 'block';
            equipmentContainer.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            equipmentContainer.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error fetching equipment:', error);
        showError('Failed to load equipment. Please try again.');
    } finally {
        showLoading(false);
    }
}

// ==========================================
// 2. RENDER EQUIPMENT (card-based uniform view)
// ==========================================
function renderEquipment(equipment) {
    const equipmentList = document.getElementById('equipmentList');
    if (!equipmentList) return;
    equipmentList.innerHTML = '';

    if (equipment.length === 0) {
        equipmentList.innerHTML = `
            <div class="empty-state" style="padding: 30px; text-align: center;">
                <i class="fa-solid fa-box-open"></i>
                <p>No equipment found</p>
            </div>
        `;
        return;
    }

    equipment.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'equipment-card';
        itemEl.dataset.equipmentId = item.id;

        const amount = (item.quantity || 0) * (item.unit_cost || 0);
        const supplierName = item.suppliers ? item.suppliers.supplier_name : '-';
        const receiptNumber = item.receipt_number || '-';
        const updatedAt = item.updated_at || item.created_at || null;
        const updatedDisplay = updatedAt ? new Date(updatedAt).toLocaleDateString() : 'Recently';

        itemEl.innerHTML = `
            <div class="stat-icon" style="width:50px; height:50px; border-radius:8px; background: var(--hover); color: #fff; display:flex; align-items:center; justify-content:center;">
                <i class="fa-solid fa-tools"></i>
            </div>

            <div class="equipment-header">
                <h3 class="equipment-name"><span class="equipment-badge">${escapeHtml(receiptNumber)}</span>${escapeHtml(item.item_name)}</h3>
                <div class="equipment-actions">
                    <button onclick="window.openEditEquipmentModal('${item.id}')" title="Edit">
                        <i class="fa-solid fa-edit"></i>
                    </button>
                    <button onclick="window.deleteEquipment('${item.id}')" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
            ${item.item_description ? `<p class="equipment-description">${escapeHtml(item.item_description)}</p>` : ''}
            <div class="equipment-meta">
                <p>Qty: ${item.quantity} | Unit Cost: ${formatCurrency(item.unit_cost || 0)} | Amount: ${formatCurrency(amount)}</p>
                <p>Supplier: ${escapeHtml(supplierName)}</p>
                <p>Delivered: ${item.date_delivered ? formatDate(item.date_delivered) : '-'}</p>
                <p>Last updated: ${escapeHtml(updatedDisplay)}</p>
            </div>

        `;

        // Open view modal when clicking the card (ignore clicks on buttons)
        itemEl.addEventListener('click', function(e) {
            if (e.target.closest('button') || e.target.closest('.btn') || e.target.closest('.action-btn')) return;
            openViewEquipmentModal(item.id);
        });

        equipmentList.appendChild(itemEl);
    });
}

// ==========================================
// 3. CREATE EQUIPMENT MODAL FUNCTIONS
// ==========================================
function openCreateEquipmentModal() {
    createEquipmentModal.style.display = 'flex';
    document.getElementById('createEquipmentForm').reset();
    // Refresh suppliers dropdown
    fetchSuppliers();
}

function closeCreateEquipmentModal() {
    createEquipmentModal.style.display = 'none';
}

async function handleCreateEquipment(event) {
    event.preventDefault();
    
    const receiptNumber = document.getElementById('receiptNumber').value.trim();
    const itemName = document.getElementById('itemName').value.trim();
    const itemDescription = document.getElementById('itemDescription').value.trim();
    const quantity = parseInt(document.getElementById('quantity').value);
    const unitCost = parseFloat(document.getElementById('unitCost').value) || 0;
    const supplierId = document.getElementById('supplier').value;
    const accountable = document.getElementById('accountable').value.trim();
    const receivedBy = document.getElementById('receivedBy').value.trim();
    const dateDelivered = document.getElementById('dateDelivered').value;
    
    if (!itemName || isNaN(quantity)) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Calculate amount
    const amount = quantity * unitCost;
    
    try {
        const equipmentData = {
            receipt_number: receiptNumber,
            item_name: itemName,
            item_description: itemDescription,
            quantity: quantity,
            unit_cost: unitCost,
            amount: amount,
            accountable: accountable,
            received_by: receivedBy,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Add supplier_id if selected
        if (supplierId) {
            equipmentData.supplier_id = supplierId;
        }
        
        // Add date_delivered if provided
        if (dateDelivered) {
            equipmentData.date_delivered = dateDelivered;
        }
        
        const { data, error } = await supabase
            .from('equipment')
            .insert([equipmentData])
            .select();
        
        if (error) throw error;
        
        closeCreateEquipmentModal();
        await fetchEquipment();
        alert('Equipment created successfully!');
        
    } catch (error) {
        console.error('Error creating equipment:', error);
        alert('Failed to create equipment. Please try again.');
    }
}

// ==========================================
// 4. EDIT EQUIPMENT MODAL FUNCTIONS
// ==========================================
function openEditEquipmentModal(equipmentId) {
    const item = allEquipment.find(e => e.id === equipmentId);
    if (!item) return;
    
    // Refresh suppliers before opening
    fetchSuppliers();
    
    document.getElementById('editEquipmentId').value = item.id;
    document.getElementById('editReceiptNumber').value = item.receipt_number || '';
    document.getElementById('editItemName').value = item.item_name;
    document.getElementById('editItemDescription').value = item.item_description || '';
    document.getElementById('editQuantity').value = item.quantity;
    document.getElementById('editUnitCost').value = item.unit_cost;
    document.getElementById('editAccountable').value = item.accountable || '';
    document.getElementById('editReceivedBy').value = item.received_by || '';
    document.getElementById('editDateDelivered').value = item.date_delivered || '';
    
    // Set supplier dropdown after a short delay to allow suppliers to load
    setTimeout(() => {
        const editSupplierSelect = document.getElementById('editSupplier');
        if (editSupplierSelect) {
            editSupplierSelect.value = item.supplier_id || '';
        }
    }, 100);
    
    // Calculate and display current amount
    const currentAmount = item.quantity * item.unit_cost;
    document.getElementById('editAmountDisplay').textContent = formatCurrency(currentAmount);
    
    editEquipmentModal.style.display = 'flex';
}

function closeEditEquipmentModal() {
    editEquipmentModal.style.display = 'none';
}

// ==========================================
// VIEW EQUIPMENT ITEM
// ==========================================
function openViewEquipmentModal(equipmentId) {
    const item = allEquipment.find(e => e.id === equipmentId);
    if (!item) return;

    if (viewEquipmentName) viewEquipmentName.textContent = item.item_name;
    if (viewEquipmentReceipt) viewEquipmentReceipt.textContent = item.receipt_number || '-';
    if (viewEquipmentQuantity) viewEquipmentQuantity.textContent = `${item.quantity}`;
    if (viewEquipmentUnitCost) viewEquipmentUnitCost.textContent = formatCurrency(item.unit_cost || 0);
    if (viewEquipmentSupplier) viewEquipmentSupplier.textContent = item.suppliers ? item.suppliers.supplier_name : '-';
    if (viewEquipmentAccountable) viewEquipmentAccountable.textContent = item.accountable || '-';
    if (viewEquipmentReceivedBy) viewEquipmentReceivedBy.textContent = item.received_by || '-';
    if (viewEquipmentDate) viewEquipmentDate.textContent = item.date_delivered ? formatDate(item.date_delivered) : '-';

    if (viewEquipmentModal) {
        viewEquipmentModal.style.display = 'flex';
        viewEquipmentModal.dataset.itemId = item.id;
    }

    if (viewEquipmentEditBtn) {
        viewEquipmentEditBtn.onclick = () => {
            window.closeViewEquipmentModal();
            openEditEquipmentModal(item.id);
        };
    }

    if (viewEquipmentDeleteBtn) {
        viewEquipmentDeleteBtn.onclick = () => {
            if (!confirm('Delete this equipment item?')) return;
            window.deleteEquipment(item.id);
            window.closeViewEquipmentModal();
        };
    }
}

window.closeViewEquipmentModal = function() {
    if (viewEquipmentModal) viewEquipmentModal.style.display = 'none';
};

async function handleEditEquipment(event) {
    event.preventDefault();
    
    const equipmentId = document.getElementById('editEquipmentId').value;
    const receiptNumber = document.getElementById('editReceiptNumber').value.trim();
    const itemName = document.getElementById('editItemName').value.trim();
    const itemDescription = document.getElementById('editItemDescription').value.trim();
    const quantity = parseInt(document.getElementById('editQuantity').value);
    const unitCost = parseFloat(document.getElementById('editUnitCost').value) || 0;
    const supplierId = document.getElementById('editSupplier').value;
    const accountable = document.getElementById('editAccountable').value.trim();
    const receivedBy = document.getElementById('editReceivedBy').value.trim();
    const dateDelivered = document.getElementById('editDateDelivered').value;
    
    if (!itemName || isNaN(quantity)) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Calculate amount
    const amount = quantity * unitCost;
    
    try {
        const updateData = {
            receipt_number: receiptNumber,
            item_name: itemName,
            item_description: itemDescription,
            quantity: quantity,
            unit_cost: unitCost,
            amount: amount,
            accountable: accountable,
            received_by: receivedBy,
            updated_at: new Date().toISOString()
        };
        
        // Add supplier_id if selected
        if (supplierId) {
            updateData.supplier_id = supplierId;
        } else {
            updateData.supplier_id = null;
        }
        
        // Add date_delivered if provided
        if (dateDelivered) {
            updateData.date_delivered = dateDelivered;
        } else {
            updateData.date_delivered = null;
        }
        
        const { error } = await supabase
            .from('equipment')
            .update(updateData)
            .eq('id', equipmentId);
        
        if (error) throw error;
        
        closeEditEquipmentModal();
        await fetchEquipment();
        alert('Equipment updated successfully!');
        
    } catch (error) {
        console.error('Error updating equipment:', error);
        alert('Failed to update equipment. Please try again.');
    }
}

// Update amount display when editing
function updateEditAmount() {
    const quantity = parseInt(document.getElementById('editQuantity').value) || 0;
    const unitCost = parseFloat(document.getElementById('editUnitCost').value) || 0;
    const amount = quantity * unitCost;
    document.getElementById('editAmountDisplay').textContent = formatCurrency(amount);
}

// ==========================================
// 5. ADD SUPPLIER MODAL FUNCTIONS
// ==========================================
function openAddSupplierModal() {
    addSupplierModal.style.display = 'flex';
    document.getElementById('addSupplierForm').reset();
}

function closeAddSupplierModal() {
    addSupplierModal.style.display = 'none';
}

async function handleCreateSupplier(event) {
    event.preventDefault();
    
    const supplierName = document.getElementById('supplierName').value.trim();
    const supplierContact = document.getElementById('supplierContact').value.trim();
    
    if (!supplierName) {
        alert('Please enter a supplier name');
        return;
    }
    
    // Check for duplicate supplier name (case-insensitive)
    const normalizedName = supplierName.toLowerCase();
    const existingSupplier = allSuppliers.find(s => 
        s.supplier_name.toLowerCase() === normalizedName
    );
    
    if (existingSupplier) {
        alert(`Supplier "${supplierName}" already exists! Please use a different name or select it from the dropdown.`);
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('suppliers')
            .insert([{
                supplier_name: supplierName,
                contact_info: supplierContact,
                created_at: new Date().toISOString()
            }])
            .select();

        
        if (error) throw error;
        
        closeAddSupplierModal();
        
        // Refresh suppliers dropdown with force refresh to include new supplier
        await fetchSuppliers(true);
        
        // Select the newly created supplier in the dropdown
        if (data && data[0]) {
            const createSupplierSelect = document.getElementById('supplier');
            const editSupplierSelect = document.getElementById('editSupplier');
            
            if (createSupplierSelect && createSupplierSelect.style.display !== 'none') {
                createSupplierSelect.value = data[0].id;
            }
            if (editSupplierSelect && editSupplierSelect.style.display !== 'none') {
                editSupplierSelect.value = data[0].id;
            }
        }
        
        alert('Supplier created successfully!');
        
    } catch (error) {
        console.error('Error creating supplier:', error);
        alert('Failed to create supplier. Please try again.');
    }
}

// ==========================================
// 6. DELETE EQUIPMENT & SUPPLIERS
// ==========================================
async function deleteEquipment(equipmentId) {

    if (!confirm('Are you sure you want to delete this equipment?')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('equipment')
            .delete()
            .eq('id', equipmentId);
        
        if (error) throw error;
        
        await fetchEquipment();
        alert('Equipment deleted successfully!');
        
    } catch (error) {
        console.error('Error deleting equipment:', error);
        alert('Failed to delete equipment. Please try again.');
    }
}

async function deleteSupplier(supplierId) {
    if (!confirm('Are you sure you want to delete this supplier? This cannot be undone.')) {
        return;
    }
    
    try {
        // Check if supplier is being used by any equipment
        const { data: equipmentUsingSupplier, error: checkError } = await supabase
            .from('equipment')
            .select('id')
            .eq('supplier_id', supplierId)
            .limit(1);
        
        if (checkError) throw checkError;
        
        if (equipmentUsingSupplier && equipmentUsingSupplier.length > 0) {
            alert('Cannot delete this supplier because it is being used by equipment items. Please reassign or delete those items first.');
            return;
        }
        
        const { error } = await supabase
            .from('suppliers')
            .delete()
            .eq('id', supplierId);
        
        if (error) throw error;
        
        // Refresh suppliers list
        await fetchSuppliers(true);
        
        // Refresh manage suppliers modal if open
        renderManageSuppliersList();
        
        alert('Supplier deleted successfully!');
        
    } catch (error) {
        console.error('Error deleting supplier:', error);
        alert('Failed to delete supplier. Please try again.');
    }
}

// Manage Suppliers Modal Functions
function openManageSuppliersModal() {
    const modal = document.getElementById('manageSuppliersModal');
    if (modal) {
        modal.style.display = 'flex';
        renderManageSuppliersList();
    }
}

function closeManageSuppliersModal() {
    const modal = document.getElementById('manageSuppliersModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function renderManageSuppliersList() {
    const container = document.getElementById('manageSuppliersList');
    if (!container) return;
    
    // Get unique suppliers for display
    const uniqueSuppliers = getUniqueSuppliers(allSuppliers);
    
    if (uniqueSuppliers.length === 0) {
        container.innerHTML = '<p class="no-suppliers">No suppliers found.</p>';
        return;
    }
    
    let html = '';
    uniqueSuppliers.forEach(supplier => {
        html += `
            <div class="supplier-item">
                <div class="supplier-info">
                    <strong>${escapeHtml(supplier.supplier_name)}</strong>
                    ${supplier.contact_info ? `<br><small>${escapeHtml(supplier.contact_info)}</small>` : ''}
                </div>
                <button onclick="deleteSupplier('${supplier.id}')" class="action-btn delete" title="Delete Supplier">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ==========================================
// 7. SEARCH FUNCTIONALITY
// ==========================================

function filterEquipment() {
    const query = equipmentSearch.value.trim().toLowerCase();
    const filterType = searchFilter ? searchFilter.value : 'all';
    
    if (!query) {
        renderEquipment(allEquipment);
        return;
    }
    
    const filtered = allEquipment.filter(item => {
        let searchText = '';
        
        switch (filterType) {
            case 'receipt_number':
                searchText = (item.receipt_number || '').toLowerCase();
                return searchText.includes(query);
            case 'item_name':
                searchText = item.item_name.toLowerCase();
                return searchText.includes(query);
            case 'supplier':
                searchText = (item.suppliers ? item.suppliers.supplier_name : '').toLowerCase();
                return searchText.includes(query);
            case 'accountable':
                searchText = (item.accountable || '').toLowerCase();
                return searchText.includes(query);
            case 'received_by':
                searchText = (item.received_by || '').toLowerCase();
                return searchText.includes(query);
            case 'all':
            default:
                searchText = (
                    (item.receipt_number || '') + ' ' +
                    item.item_name + ' ' + 
                    (item.item_description || '') + ' ' +
                    (item.suppliers ? item.suppliers.supplier_name : '') + ' ' +
                    (item.accountable || '') + ' ' +
                    (item.received_by || '')
                ).toLowerCase();
                return searchText.includes(query);
        }
    });
    
    renderEquipment(filtered);
}

// ==========================================
// 8. UI HELPER FUNCTIONS
// ==========================================
function showLoading(show) {
    loadingState.style.display = show ? 'block' : 'none';
    if (show) {
        equipmentContainer.style.display = 'none';
        emptyState.style.display = 'none';
    }
}

function showError(message) {
    errorState.style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
    equipmentContainer.style.display = 'none';
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

function formatCurrency(value) {
    return new Intl.NumberFormat('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// ==========================================
// 9. EVENT LISTENERS
// ==========================================

// Search functionality
if (equipmentSearch) {
    equipmentSearch.addEventListener('input', filterEquipment);
}

if (searchFilter) {
    searchFilter.addEventListener('change', filterEquipment);
}

if (clearSearch) {
    clearSearch.addEventListener('click', function() {
        equipmentSearch.value = '';
        filterEquipment();
        equipmentSearch.focus();
    });
}

// Close modals when clicking outside
if (createEquipmentModal) {
    createEquipmentModal.addEventListener('click', function(e) {
        if (e.target === createEquipmentModal) {
            closeCreateEquipmentModal();
        }
    });
}

if (editEquipmentModal) {
    editEquipmentModal.addEventListener('click', function(e) {
        if (e.target === editEquipmentModal) {
            closeEditEquipmentModal();
        }
    });
}

if (addSupplierModal) {
    addSupplierModal.addEventListener('click', function(e) {
        if (e.target === addSupplierModal) {
            closeAddSupplierModal();
        }
    });
}

// Manage Suppliers Modal close on outside click
const manageSuppliersModal = document.getElementById('manageSuppliersModal');
if (manageSuppliersModal) {
    manageSuppliersModal.addEventListener('click', function(e) {
        if (e.target === manageSuppliersModal) {
            closeManageSuppliersModal();
        }
    });
}


// Edit amount calculation
document.getElementById('editQuantity')?.addEventListener('input', updateEditAmount);
document.getElementById('editUnitCost')?.addEventListener('input', updateEditAmount);

// ==========================================
// 10. INITIALIZE - LOAD EQUIPMENT ON PAGE LOAD
// ==========================================
fetchEquipment();
fetchSuppliers();

// Make functions available globally for onclick handlers
window.openCreateEquipmentModal = openCreateEquipmentModal;
window.closeCreateEquipmentModal = closeCreateEquipmentModal;
window.handleCreateEquipment = handleCreateEquipment;
window.openEditEquipmentModal = openEditEquipmentModal;
window.closeEditEquipmentModal = closeEditEquipmentModal;
window.handleEditEquipment = handleEditEquipment;
window.deleteEquipment = deleteEquipment;
window.fetchEquipment = fetchEquipment;
window.openAddSupplierModal = openAddSupplierModal;
window.closeAddSupplierModal = closeAddSupplierModal;
window.handleCreateSupplier = handleCreateSupplier;
window.deleteSupplier = deleteSupplier;
window.openManageSuppliersModal = openManageSuppliersModal;
window.closeManageSuppliersModal = closeManageSuppliersModal;
