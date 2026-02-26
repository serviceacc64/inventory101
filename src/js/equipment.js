// Import Supabase client
import { supabase } from './supabase.js';

// DOM Elements
const equipmentContainer = document.getElementById('equipmentContainer');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const emptyState = document.getElementById('emptyState');
const equipmentTableBody = document.getElementById('equipmentTableBody');
const createEquipmentModal = document.getElementById('createEquipmentModal');
const editEquipmentModal = document.getElementById('editEquipmentModal');
const addSupplierModal = document.getElementById('addSupplierModal');
const equipmentSearch = document.getElementById('equipmentSearch');
const searchFilter = document.getElementById('searchFilter');
const clearSearch = document.getElementById('clearSearch');

// Store all equipment for search functionality
let allEquipment = [];

// Store all suppliers
let allSuppliers = [];

// ==========================================
// 0. FETCH SUPPLIERS
// ==========================================
async function fetchSuppliers() {
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
    }
}

function renderSupplierDropdowns() {
    const createSupplierSelect = document.getElementById('supplier');
    const editSupplierSelect = document.getElementById('editSupplier');
    
    // Options HTML
    let optionsHTML = '<option value="">Select a supplier</option>';
    allSuppliers.forEach(supplier => {
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
// 2. RENDER EQUIPMENT TO THE TABLE
// ==========================================
function renderEquipment(equipment) {
    equipmentTableBody.innerHTML = '';
    
    if (equipment.length === 0) {
        equipmentTableBody.innerHTML = `
            <tr>
                <td colspan="11" class="empty-cell">
                    <i class="fa-solid fa-box-open"></i>
                    <p>No equipment found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    equipment.forEach((item, index) => {
        const tr = document.createElement('tr');
        
        // Calculate amount = quantity * unit_cost
        const amount = item.quantity * item.unit_cost;
        
        // Get supplier name from joined data
        const supplierName = item.suppliers ? item.suppliers.supplier_name : '-';
        const accountable = item.accountable || '-';
        const receivedBy = item.received_by || '-';
        const receiptNumber = item.receipt_number || '-';
        
        tr.innerHTML = `
            <td class="col-receipt">${escapeHtml(receiptNumber)}</td>
            <td class="col-name">${escapeHtml(item.item_name)}</td>
            <td class="col-description">${escapeHtml(item.item_description || '-')}</td>
            <td class="col-quantity">${item.quantity}</td>
            <td class="col-unit-cost currency">${formatCurrency(item.unit_cost)}</td>
            <td class="col-amount currency">${formatCurrency(amount)}</td>
            <td class="col-supplier">${escapeHtml(supplierName)}</td>
            <td class="col-accountable">${escapeHtml(accountable)}</td>
            <td class="col-received">${escapeHtml(receivedBy)}</td>
            <td class="col-date">${item.date_delivered ? formatDate(item.date_delivered) : '-'}</td>
            <td class="col-actions">
                <button onclick="window.openEditEquipmentModal('${item.id}')" class="action-btn edit" title="Edit">
                    <i class="fa-solid fa-edit"></i>
                </button>
                <button onclick="window.deleteEquipment('${item.id}')" class="action-btn delete" title="Delete">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        
        equipmentTableBody.appendChild(tr);
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
        
        // Refresh suppliers dropdown
        await fetchSuppliers();
        
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
// 6. DELETE EQUIPMENT
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
