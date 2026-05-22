// Import Supabase client
import { supabase } from './supabase.js';
// animation helpers
import { showNotification, pulseElement, fadeIn } from './animate.js';

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
const viewEquipmentOldPropertyNo = document.getElementById('viewEquipmentOldPropertyNo');
const viewEquipmentNewPropertyNo = document.getElementById('viewEquipmentNewPropertyNo');
const viewEquipmentUnitOfMeasurement = document.getElementById('viewEquipmentUnitOfMeasurement');
const viewEquipmentQtyPerPhysicalCount = document.getElementById('viewEquipmentQtyPerPhysicalCount');
const viewEquipmentCondition = document.getElementById('viewEquipmentCondition');

// Store all equipment for search functionality
let allEquipment = [];

// Store all suppliers
let allSuppliers = [];
let isFetchingSuppliers = false; // Flag to prevent duplicate fetches

// Pagination state
let currentPage = 1;
const itemsPerPage = 16; // 16 items per page for the grid layout
let filteredEquipment = [];
let totalPages = 1;

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
        filteredEquipment = allEquipment;
        currentPage = 1;
        totalPages = Math.ceil(allEquipment.length / itemsPerPage);
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

    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedEquipment = equipment.slice(startIndex, endIndex);

    // Show/hide pagination controls
    const paginationContainer = document.getElementById('paginationContainer');
    if (equipment.length > itemsPerPage) {
        paginationContainer.style.display = 'flex';
        updatePaginationControls();
    } else {
        paginationContainer.style.display = 'none';
    }

    equipmentList.innerHTML = '';

    if (paginatedEquipment.length === 0) {
        equipmentList.innerHTML = `
            <div class="empty-state" style="padding: 30px; text-align: center;">
                <i class="fa-solid fa-box-open"></i>
                <p>No equipment found</p>
            </div>
        `;
        return;
    }

    paginatedEquipment.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'equipment-card';
        itemEl.dataset .equipmentId = item.id;
        // animate card appearance
        fadeIn(itemEl);

        const amount = (item.quantity || 0) * (item.unit_cost || 0);
        const supplierName = item.suppliers ? item.suppliers.supplier_name : '-';
        const receiptNumber = item.receipt_number || '-';
        const updatedAt = item.updated_at || item.created_at || null;
        const updatedDisplay = updatedAt ? new Date(updatedAt).toLocaleDateString() : 'Recently';

        // Property numbers display on card
        const properties = [];
        if (item.old_property_number) properties.push(`Old Prop: ${item.old_property_number}`);
        if (item.new_property_number) properties.push(`New Prop: ${item.new_property_number}`);
        const propertyDisplay = properties.length > 0 
            ? `<p style="margin: 3px 0; font-size: 11px; color: #777; font-weight: 500;">${escapeHtml(properties.join(' | '))}</p>`
            : '';

        const qtyDisplay = item.unit_of_measurement ? `${item.quantity} ${item.unit_of_measurement}` : `${item.quantity}`;
        const physicalCountDisplay = item.quantity_per_physical_count !== null && item.quantity_per_physical_count !== undefined
            ? `<strong style="margin-left: 8px;">Physical Count:</strong> ${item.quantity_per_physical_count}`
            : '';
        const conditionDisplay = `<strong style="margin-left: 8px;">Condition:</strong> ${escapeHtml(item.condition || 'Good')}`;

        itemEl.innerHTML = `
            <div style="display: flex; gap: 8px; margin-bottom: 10px; align-items: flex-start;">
                <div class="stat-icon" style="width:44px; height:44px; min-width:44px; border-radius:8px; background: var(--hover); color: #fff; display:flex; align-items:center; justify-content:center; font-size: 20px;">
                    <i class="fa-solid fa-tools"></i>
                </div>
                
                <div style="flex: 1;">
                    <div class="equipment-header">
                        <div style="flex: 1;">
                            <h3 class="equipment-name">${escapeHtml(item.item_name)}</h3>
                            ${receiptNumber !== '-' ? `<p style="margin: 3px 0 0 0; font-size: 9px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">${escapeHtml(receiptNumber)}</p>` : ''}
                        </div>
                        <div class="equipment-actions">
                            <button onclick="window.openEditEquipmentModal('${item.id}')" title="Edit">
                                <i class="fa-solid fa-edit"></i>
                            </button>
                            <button onclick="window.deleteEquipment('${item.id}')" title="Delete">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            ${item.item_description ? `<p class="equipment-description">${escapeHtml(item.item_description)}</p>` : ''}
            
            <div class="equipment-meta">
                ${propertyDisplay}
                <p><strong>Qty:</strong> ${qtyDisplay} ${physicalCountDisplay} ${conditionDisplay} <strong style="margin-left: 8px;">Unit Cost:</strong> ${formatCurrency(item.unit_cost || 0)} <strong style="margin-left: 8px;">Amount:</strong> ${formatCurrency(amount)}</p>
                <p><strong>Supplier:</strong> ${escapeHtml(supplierName)}</p>
                <p><strong>Delivered:</strong> ${item.date_delivered ? formatDate(item.date_delivered) : '-'}</p>
                <p><strong>Last updated:</strong> ${escapeHtml(updatedDisplay)}</p>
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
        renderEquipment(filteredEquipment);
        // Scroll to top of equipment list
        document.getElementById('equipmentList').scrollIntoView({ behavior: 'smooth' });
    }
}

window.nextPage = function() {
    if (currentPage < totalPages) {
        currentPage++;
        renderEquipment(filteredEquipment);
        // Scroll to top of equipment list
        document.getElementById('equipmentList').scrollIntoView({ behavior: 'smooth' });
    }
}

// ==========================================
// 3. CREATE EQUIPMENT MODAL FUNCTIONS
// ==========================================
function openCreateEquipmentModal() {
    createEquipmentModal.classList.add('show');
    document.getElementById('createEquipmentForm').reset();
    // Refresh suppliers dropdown
    fetchSuppliers();
}

function closeCreateEquipmentModal() {
    createEquipmentModal.classList.remove('show');
}

async function handleCreateEquipment(event) {
    event.preventDefault();
    
    const receiptNumber = document.getElementById('receiptNumber').value.trim();
    const oldPropertyNumber = document.getElementById('oldPropertyNumber').value.trim();
    const newPropertyNumber = document.getElementById('newPropertyNumber').value.trim();
    const itemName = document.getElementById('itemName').value.trim();
    const itemDescription = document.getElementById('itemDescription').value.trim();
    const unitOfMeasurement = document.getElementById('unitOfMeasurement').value.trim();
    const condition = document.getElementById('condition').value.trim() || 'Good';
    const quantity = parseInt(document.getElementById('quantity').value);
    const quantityPerPhysicalCountVal = document.getElementById('quantityPerPhysicalCount').value;
    const quantityPerPhysicalCount = quantityPerPhysicalCountVal !== '' ? parseInt(quantityPerPhysicalCountVal) : null;
    const unitCost = parseFloat(document.getElementById('unitCost').value) || 0;
    const supplierId = document.getElementById('supplier').value;
    const accountable = document.getElementById('accountable').value.trim();
    const receivedBy = document.getElementById('receivedBy').value.trim();
    const dateDelivered = document.getElementById('dateDelivered').value;
    const isConsumable = document.getElementById('isConsumable').value === 'true';
    
    if (!itemName || isNaN(quantity)) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    // Calculate amount
    const amount = quantity * unitCost;
    
    try {
        const equipmentData = {
            receipt_number: receiptNumber,
            old_property_number: oldPropertyNumber || null,
            new_property_number: newPropertyNumber || null,
            item_name: itemName,
            item_description: itemDescription,
            unit_of_measurement: unitOfMeasurement || null,
            condition: condition,
            quantity: quantity,
            quantity_per_physical_count: quantityPerPhysicalCount,
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
        
        // Add is_consumable field
        equipmentData.is_consumable = isConsumable;
        
        const { data, error } = await supabase
            .from('equipment')
            .insert([equipmentData])
            .select();
        
        if (error) throw error;
        
        closeCreateEquipmentModal();
        await fetchEquipment();
        showNotification('Equipment created successfully!');
        
    } catch (error) {
        console.error('Error creating equipment:', error);
        showNotification('Failed to create equipment. Please try again.', 'error');
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
    document.getElementById('editOldPropertyNumber').value = item.old_property_number || '';
    document.getElementById('editNewPropertyNumber').value = item.new_property_number || '';
    document.getElementById('editItemName').value = item.item_name;
    document.getElementById('editItemDescription').value = item.item_description || '';
    document.getElementById('editUnitOfMeasurement').value = item.unit_of_measurement || '';
    document.getElementById('editCondition').value = item.condition || 'Good';
    document.getElementById('editQuantity').value = item.quantity;
    document.getElementById('editQuantityPerPhysicalCount').value = item.quantity_per_physical_count !== null && item.quantity_per_physical_count !== undefined ? item.quantity_per_physical_count : '';
    document.getElementById('editUnitCost').value = item.unit_cost;
    document.getElementById('editAccountable').value = item.accountable || '';
    document.getElementById('editReceivedBy').value = item.received_by || '';
    document.getElementById('editDateDelivered').value = item.date_delivered || '';
    
    // Set is_consumable dropdown
    const editIsConsumable = document.getElementById('editIsConsumable');
    if (editIsConsumable) {
        editIsConsumable.value = item.is_consumable ? 'true' : 'false';
    }
    
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
    
    editEquipmentModal.classList.add('show');
}

function closeEditEquipmentModal() {
    editEquipmentModal.classList.remove('show');
}

// ==========================================
// VIEW EQUIPMENT ITEM
// ==========================================
function openViewEquipmentModal(equipmentId) {
    const item = allEquipment.find(e => e.id === equipmentId);
    if (!item) return;

    if (viewEquipmentName) viewEquipmentName.textContent = item.item_name;
    if (viewEquipmentReceipt) viewEquipmentReceipt.textContent = item.receipt_number || '-';
    if (viewEquipmentOldPropertyNo) viewEquipmentOldPropertyNo.textContent = item.old_property_number || '-';
    if (viewEquipmentNewPropertyNo) viewEquipmentNewPropertyNo.textContent = item.new_property_number || '-';
    if (viewEquipmentUnitOfMeasurement) viewEquipmentUnitOfMeasurement.textContent = item.unit_of_measurement || '-';
    if (viewEquipmentCondition) viewEquipmentCondition.textContent = item.condition || '-';
    if (viewEquipmentQuantity) viewEquipmentQuantity.textContent = `${item.quantity}`;
    if (viewEquipmentQtyPerPhysicalCount) viewEquipmentQtyPerPhysicalCount.textContent = item.quantity_per_physical_count !== null && item.quantity_per_physical_count !== undefined ? item.quantity_per_physical_count : '-';
    if (viewEquipmentUnitCost) viewEquipmentUnitCost.textContent = formatCurrency(item.unit_cost || 0);
    if (viewEquipmentSupplier) viewEquipmentSupplier.textContent = item.suppliers ? item.suppliers.supplier_name : '-';
    if (viewEquipmentAccountable) viewEquipmentAccountable.textContent = item.accountable || '-';
    if (viewEquipmentReceivedBy) viewEquipmentReceivedBy.textContent = item.received_by || '-';
    if (viewEquipmentDate) viewEquipmentDate.textContent = item.date_delivered ? formatDate(item.date_delivered) : '-';
    
    // Display consumable status
    const viewEquipmentConsumable = document.getElementById('viewEquipmentConsumable');
    if (viewEquipmentConsumable) {
        viewEquipmentConsumable.textContent = item.is_consumable ? 'Yes' : 'No';
    }

    if (viewEquipmentModal) {
        viewEquipmentModal.classList.add('show');
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
    if (viewEquipmentModal) viewEquipmentModal.classList.remove('show');
};

async function handleEditEquipment(event) {
    event.preventDefault();
    
    const equipmentId = document.getElementById('editEquipmentId').value;
    const receiptNumber = document.getElementById('editReceiptNumber').value.trim();
    const oldPropertyNumber = document.getElementById('editOldPropertyNumber').value.trim();
    const newPropertyNumber = document.getElementById('editNewPropertyNumber').value.trim();
    const itemName = document.getElementById('editItemName').value.trim();
    const itemDescription = document.getElementById('editItemDescription').value.trim();
    const unitOfMeasurement = document.getElementById('editUnitOfMeasurement').value.trim();
    const condition = document.getElementById('editCondition').value.trim() || 'Good';
    const quantity = parseInt(document.getElementById('editQuantity').value);
    const quantityPerPhysicalCountVal = document.getElementById('editQuantityPerPhysicalCount').value;
    const quantityPerPhysicalCount = quantityPerPhysicalCountVal !== '' ? parseInt(quantityPerPhysicalCountVal) : null;
    const unitCost = parseFloat(document.getElementById('editUnitCost').value) || 0;
    const supplierId = document.getElementById('editSupplier').value;
    const accountable = document.getElementById('editAccountable').value.trim();
    const receivedBy = document.getElementById('editReceivedBy').value.trim();
    const dateDelivered = document.getElementById('editDateDelivered').value;
    const editIsConsumable = document.getElementById('editIsConsumable').value === 'true';
    
    if (!itemName || isNaN(quantity)) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    // Calculate amount
    const amount = quantity * unitCost;
    
    try {
        const updateData = {
            receipt_number: receiptNumber,
            old_property_number: oldPropertyNumber || null,
            new_property_number: newPropertyNumber || null,
            item_name: itemName,
            item_description: itemDescription,
            unit_of_measurement: unitOfMeasurement || null,
            condition: condition,
            quantity: quantity,
            quantity_per_physical_count: quantityPerPhysicalCount,
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
        
        // Add is_consumable field
        updateData.is_consumable = editIsConsumable;
        
        const { error } = await supabase
            .from('equipment')
            .update(updateData)
            .eq('id', equipmentId);
        
        if (error) throw error;
        
        closeEditEquipmentModal();
        await fetchEquipment();
        showNotification('Equipment updated successfully!');
        
    } catch (error) {
        console.error('Error updating equipment:', error);
        showNotification('Failed to update equipment. Please try again.', 'error');
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
    addSupplierModal.classList.add('show');
    document.getElementById('addSupplierForm').reset();
}

function closeAddSupplierModal() {
    addSupplierModal.classList.remove('show');
}

async function handleCreateSupplier(event) {
    event.preventDefault();
    
    const supplierName = document.getElementById('supplierName').value.trim();
    const supplierContact = document.getElementById('supplierContact').value.trim();
    
    if (!supplierName) {
        showNotification('Please enter a supplier name', 'error');
        return;
    }
    
    // Check for duplicate supplier name (case-insensitive)
    const normalizedName = supplierName.toLowerCase();
    const existingSupplier = allSuppliers.find(s => 
        s.supplier_name.toLowerCase() === normalizedName
    );
    
    if (existingSupplier) {
        showNotification(`Supplier "${supplierName}" already exists! Please use a different name or select it from the dropdown.`, 'error');
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
        
        showNotification('Supplier created successfully!');
        
    } catch (error) {
        console.error('Error creating supplier:', error);
        showNotification('Failed to create supplier. Please try again.', 'error');
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
        showNotification('Equipment deleted successfully!');
        
    } catch (error) {
        console.error('Error deleting equipment:', error);
        showNotification('Failed to delete equipment. Please try again.', 'error');
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
            showNotification('Cannot delete this supplier because it is being used by equipment items. Please reassign or delete those items first.', 'error');
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
        
        showNotification('Supplier deleted successfully!');
        
    } catch (error) {
        console.error('Error deleting supplier:', error);
        showNotification('Failed to delete supplier. Please try again.', 'error');
    }
}

// Manage Suppliers Modal Functions
function openManageSuppliersModal() {
    const modal = document.getElementById('manageSuppliersModal');
    if (modal) {
        modal.classList.add('show');
        renderManageSuppliersList();
    }
}

function closeManageSuppliersModal() {
    const modal = document.getElementById('manageSuppliersModal');
    if (modal) {
        modal.classList.remove('show');
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
        filteredEquipment = allEquipment;
        currentPage = 1;
        totalPages = Math.ceil(filteredEquipment.length / itemsPerPage);
        renderEquipment(filteredEquipment);
        return;
    }
    
    const filtered = allEquipment.filter(item => {
        let searchText = '';
        
        switch (filterType) {
            case 'receipt_number':
                searchText = (item.receipt_number || '').toLowerCase();
                return searchText.includes(query);
            case 'old_property_number':
                searchText = (item.old_property_number || '').toLowerCase();
                return searchText.includes(query);
            case 'new_property_number':
                searchText = (item.new_property_number || '').toLowerCase();
                return searchText.includes(query);
            case 'item_name':
                searchText = item.item_name.toLowerCase();
                return searchText.includes(query);
            case 'condition':
                searchText = (item.condition || '').toLowerCase();
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
                    (item.old_property_number || '') + ' ' +
                    (item.new_property_number || '') + ' ' +
                    item.item_name + ' ' + 
                    (item.condition || '') + ' ' + 
                    (item.item_description || '') + ' ' +
                    (item.suppliers ? item.suppliers.supplier_name : '') + ' ' +
                    (item.accountable || '') + ' ' +
                    (item.received_by || '')
                ).toLowerCase();
                return searchText.includes(query);
        }
    });
    
    filteredEquipment = filtered;
    currentPage = 1;
    totalPages = Math.ceil(filteredEquipment.length / itemsPerPage);
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
// 10. GET EQUIPMENT FUNCTIONALITY
// ==========================================

// Get Equipment Flow - Requester Info State
let equipmentRequesterName = '';
let equipmentRequesterTimestamp = '';
let selectedGetEquipment = null;
let equipmentCartItems = []; // Cart array for multi-item support
let isEquipmentSubmitting = false; // Prevent double submission

// Get Equipment Modal DOM Elements
const getEquipmentModal = document.getElementById('getEquipmentModal');
const getEquipmentSearch = document.getElementById('getEquipmentSearch');
const clearGetEquipmentSearch = document.getElementById('clearGetEquipmentSearch');
const getEquipmentSelectableList = document.getElementById('getEquipmentSelectableList');
const getEquipmentDetails = document.getElementById('getEquipmentDetails');
const getEquipmentSelectedId = document.getElementById('getEquipmentSelectedId');
const getEquipmentSelectedName = document.getElementById('getEquipmentSelectedName');
const getEquipmentSelectedStock = document.getElementById('getEquipmentSelectedStock');
const getEquipmentQuantity = document.getElementById('getEquipmentQuantity');

// ==========================================
// ACTIVITY LOGGING HELPER FUNCTION
// ==========================================
async function logEquipmentActivity(actionType, equipmentId, equipmentName, quantityChanged, quantityBefore, quantityAfter, person = null, details = null, customTimestamp = null) {
    try {
        // Use custom timestamp if provided, otherwise use current time
        const timestamp = customTimestamp ? new Date(customTimestamp).toISOString() : new Date().toISOString();
        
        const { error } = await supabase
            .from('activity_logs')
            .insert([{
                action_type: actionType,
                item_id: null, // Equipment is tracked separately
                item_name: equipmentName,
                quantity_changed: quantityChanged,
                quantity_before: quantityBefore,
                quantity_after: quantityAfter,
                person: person,
                details: details,
                timestamp: timestamp
            }]);

        if (error) {
            console.warn('Failed to log activity:', error);
        }
    } catch (error) {
        console.warn('Error logging activity:', error);
    }
}

// ==========================================
// GET EQUIPMENT MODAL FUNCTIONS
// ==========================================
function openGetEquipmentModal() {
    getEquipmentModal.classList.add('show');
    
    // Reset all states for new flow
    equipmentRequesterName = '';
    equipmentRequesterTimestamp = '';
    selectedGetEquipment = null;
    equipmentCartItems = [];
    
    // Show Step 1: Requester Info Form (always show first)
    document.getElementById('equipmentRequesterInfoSection').style.display = 'block';
    document.getElementById('getEquipmentSearchContainer').style.display = 'none';
    getEquipmentSelectableList.style.display = 'none';
    getEquipmentDetails.style.display = 'none';
    document.getElementById('equipmentConfirmationSection').style.display = 'none';
    
    // Reset form fields
    if (document.getElementById('equipmentRequesterName')) document.getElementById('equipmentRequesterName').value = '';
    if (document.getElementById('equipmentRequesterTimestamp')) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('equipmentRequesterTimestamp').value = now.toISOString().slice(0, 16);
    }
    if (getEquipmentSearch) getEquipmentSearch.value = '';
    if (getEquipmentQuantity) getEquipmentQuantity.value = '';
    
    // Focus on requester name input
    setTimeout(() => {
        document.getElementById('equipmentRequesterName').focus();
    }, 100);
}

function closeGetEquipmentModal() {
    getEquipmentModal.classList.remove('show');
    // Reset all flow states
    equipmentRequesterName = '';
    equipmentRequesterTimestamp = '';
    selectedGetEquipment = null;
    equipmentCartItems = [];
    isEquipmentSubmitting = false;
    // Reset form
    if (getEquipmentQuantity) getEquipmentQuantity.value = '';
    cancelGetEquipmentSelection();
}

// Step 1 -> Step 2: Proceed from requester info to equipment selection
function proceedToEquipmentSelection(event) {
    event.preventDefault();
    
    const nameInput = document.getElementById('equipmentRequesterName');
    const timestampInput = document.getElementById('equipmentRequesterTimestamp');
    
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
    equipmentRequesterName = nameInput.value.trim();
    equipmentRequesterTimestamp = timestampInput.value;
    
    // Hide requester form, show equipment selection
    document.getElementById('equipmentRequesterInfoSection').style.display = 'none';
    document.getElementById('getEquipmentSearchContainer').style.display = 'block';
    getEquipmentSelectableList.style.display = 'block';
    
    // Render available equipment
    renderGetEquipmentSelectableItems(allEquipment);
    
    return false;
}

// Back from equipment details to equipment selection
function backToEquipmentSelection() {
    // If cart has items, go to confirmation section instead
    if (equipmentCartItems.length > 0) {
        getEquipmentDetails.style.display = 'none';
        document.getElementById('equipmentConfirmationSection').style.display = 'block';
        return;
    }
    
    getEquipmentDetails.style.display = 'none';
    getEquipmentSelectableList.style.display = 'block';
    if (getEquipmentQuantity) getEquipmentQuantity.value = '';
    selectedGetEquipment = null;
}

function renderGetEquipmentSelectableItems(equipment) {
    if (!getEquipmentSelectableList) return;
    
    getEquipmentSelectableList.innerHTML = '';
    
    // Only show equipment with quantity > 0
    const availableEquipment = equipment.filter(item => item.quantity > 0);
    
    if (availableEquipment.length === 0) {
        getEquipmentSelectableList.innerHTML = `
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
        
        getEquipmentSelectableList.appendChild(itemEl);
    });
}

function filterGetEquipmentSelectableItems() {
    const query = getEquipmentSearch.value.trim().toLowerCase();
    
    let filtered = allEquipment.filter(item => item.quantity > 0);
    
    if (query) {
        filtered = filtered.filter(item => {
            const searchText = (item.item_name + ' ' + (item.item_description || '')).toLowerCase();
            return searchText.includes(query);
        });
    }
    
    renderGetEquipmentSelectableItems(filtered);
}

function selectGetEquipment(equipment) {
    // Store selected equipment
    selectedGetEquipment = equipment;
    
    // Hide list, show details
    getEquipmentSelectableList.style.display = 'none';
    getEquipmentDetails.style.display = 'block';
    
    // Populate details
    getEquipmentSelectedId.value = equipment.id;
    getEquipmentSelectedName.textContent = equipment.item_name;
    
    const stockText = `Available Qty: ${equipment.quantity}`;
    getEquipmentSelectedStock.textContent = stockText;
    
    // Set max attribute for quantity input
    if (getEquipmentQuantity) {
        getEquipmentQuantity.max = equipment.quantity;
        getEquipmentQuantity.value = ''; // Reset quantity for new selection
    }
    
    // Focus on quantity input
    setTimeout(() => {
        if (getEquipmentQuantity) getEquipmentQuantity.focus();
    }, 100);
}

function cancelGetEquipmentSelection() {
    getEquipmentDetails.style.display = 'none';
    getEquipmentSelectableList.style.display = 'block';
    if (getEquipmentQuantity) getEquipmentQuantity.value = '';
    if (getEquipmentSelectedId) getEquipmentSelectedId.value = '';
    selectedGetEquipment = null;
}

// Step 3 -> Step 4: Show confirmation table with cart
function showEquipmentConfirmationStep(event) {
    event.preventDefault();
    
    const quantity = parseInt(getEquipmentQuantity.value);
    const equipmentId = getEquipmentSelectedId.value;
    
    // Validation
    if (!equipmentId || !selectedGetEquipment) {
        showNotification('Please select an equipment first', 'error');
        return false;
    }
    
    if (isNaN(quantity) || quantity < 1) {
        showNotification('Please enter a valid quantity', 'error');
        getEquipmentQuantity.focus();
        return false;
    }
    
    // Validate quantity doesn't exceed available stock
    if (quantity > selectedGetEquipment.quantity) {
        showNotification(`Cannot get ${quantity} units. Only ${selectedGetEquipment.quantity} units available in stock.`, 'error');
        getEquipmentQuantity.focus();
        return false;
    }
    
    // Add equipment to cart
    const cartItem = {
        equipmentId: selectedGetEquipment.id,
        equipmentName: selectedGetEquipment.item_name,
        category: selectedGetEquipment.item_description || 'Equipment',
        quantity: quantity,
        availableStock: selectedGetEquipment.quantity
    };
    
    // Check if equipment already in cart
    const existingIndex = equipmentCartItems.findIndex(item => item.equipmentId === cartItem.equipmentId);
    if (existingIndex >= 0) {
        // Update quantity if already in cart
        equipmentCartItems[existingIndex].quantity += quantity;
    } else {
        equipmentCartItems.push(cartItem);
    }
    
    // Update confirmation section
    document.getElementById('confirmEquipmentPerson').textContent = equipmentRequesterName;
    
    // Format timestamp for display
    const timestampDate = new Date(equipmentRequesterTimestamp);
    document.getElementById('confirmEquipmentTimestamp').textContent = timestampDate.toLocaleString();
    
    // Render cart equipment table
    renderEquipmentCartItems();
    
    // Hide equipment details, show confirmation
    getEquipmentDetails.style.display = 'none';
    document.getElementById('equipmentConfirmationSection').style.display = 'block';
    
    return false;
}

// Render cart equipment table
function renderEquipmentCartItems() {
    const tbody = document.getElementById('cartEquipmentBody');
    if (!tbody) return;
    
    if (equipmentCartItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #666;">No equipment in cart</td></tr>';
        return;
    }
    
    tbody.innerHTML = equipmentCartItems.map((item, index) => `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">
                <i class="fa-solid fa-tools" style="margin-right: 8px; color: #ff9800;"></i>
                ${escapeHtml(item.equipmentName)}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">${escapeHtml(item.category)}</td>
            <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">${item.quantity}</td>
            <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">
                <button type="button" onclick="removeEquipmentFromCart(${index})" style="background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Remove equipment from cart
function removeEquipmentFromCart(index) {
    if (index >= 0 && index < equipmentCartItems.length) {
        equipmentCartItems.splice(index, 1);
        renderEquipmentCartItems();
    }
}

// Get another equipment - go back to equipment selection
function getAnotherEquipment() {
    // Hide confirmation, show equipment selection
    document.getElementById('equipmentConfirmationSection').style.display = 'none';
    document.getElementById('getEquipmentSearchContainer').style.display = 'block';
    getEquipmentDetails.style.display = 'none';
    
    // Reset selected equipment
    selectedGetEquipment = null;
    if (getEquipmentQuantity) getEquipmentQuantity.value = '';
    
    // Re-render available equipment
    renderGetEquipmentSelectableItems(allEquipment);
}

// Process all equipment in cart
async function processAllEquipment() {
    // Prevent double submission
    if (isEquipmentSubmitting) {
        console.log('Submission blocked - already in progress');
        return;
    }
    
    if (equipmentCartItems.length === 0) {
        showNotification('No equipment to process', 'error');
        return;
    }
    
    // Validate all items have valid quantities
    for (const cartItem of equipmentCartItems) {
        const equipment = allEquipment.find(i => i.id === cartItem.equipmentId);
        
        if (!equipment) {
            showNotification(`Equipment not found: ${cartItem.equipmentName}`, 'error');
            return;
        }
        if (cartItem.quantity > equipment.quantity) {
            showNotification(`Cannot get ${cartItem.quantity} units of ${cartItem.equipmentName}. Only ${equipment.quantity} available.`, 'error');
            return;
        }
    }
    
    // Set submission lock
    isEquipmentSubmitting = true;
    
    // Disable buttons
    const processBtn = document.querySelector('#equipmentConfirmationSection .btn-primary');
    const getAnotherBtn = document.querySelector('#equipmentConfirmationSection .btn-secondary');
    if (processBtn) {
        processBtn.disabled = true;
        processBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    }
    if (getAnotherBtn) getAnotherBtn.disabled = true;
    
    let successCount = 0;
    let failedItems = [];
    
    try {
        // Process each equipment in cart
        for (const cartItem of equipmentCartItems) {
            const equipment = allEquipment.find(i => i.id === cartItem.equipmentId);
            
            if (!equipment) {
                failedItems.push(cartItem.equipmentName);
                continue;
            }
            
            const oldQuantity = equipment.quantity;
            const newQuantity = equipment.quantity - cartItem.quantity;
            
            // Update quantity in equipment table
            const { error: updateError } = await supabase
                .from('equipment')
                .update({ 
                    quantity: newQuantity,
                    updated_at: new Date().toISOString()
                })
                .eq('id', cartItem.equipmentId);
            
            if (updateError) {
                console.error('Error updating quantity:', updateError);
                failedItems.push(cartItem.equipmentName);
                continue;
            }
            
            // Log activity for DISTRIBUTE action
            await logEquipmentActivity(
                'DISTRIBUTE',
                cartItem.equipmentId,
                cartItem.equipmentName,
                -cartItem.quantity,
                oldQuantity,
                newQuantity,
                equipmentRequesterName,
                { label: cartItem.category, equipment_id: cartItem.equipmentId },
                equipmentRequesterTimestamp
            );
            
            successCount++;
        }
        
        // Close modal and refresh
        closeGetEquipmentModal();
        await fetchEquipment();
        
        if (failedItems.length > 0) {
            showNotification(`Processed ${successCount} items. Failed: ${failedItems.join(', ')}`, 'warning');
        } else {
            const totalItems = equipmentCartItems.reduce((sum, item) => sum + item.quantity, 0);
            showNotification(`Successfully distributed ${totalItems} equipment items to ${equipmentRequesterName}`);
        }
        
    } catch (error) {
        console.error('Error processing equipment:', error);
        showNotification('Failed to process equipment. Please try again.', 'error');
    } finally {
        // Reset submission lock and button state
        isEquipmentSubmitting = false;
        
        if (processBtn) {
            processBtn.disabled = false;
            processBtn.innerHTML = '<i class="fa-solid fa-check"></i> Process All';
        }
        if (getAnotherBtn) getAnotherBtn.disabled = false;
    }
}

// ==========================================
// GET EQUIPMENT MODAL EVENT LISTENERS
// ==========================================
if (getEquipmentModal) {
    getEquipmentModal.addEventListener('click', function(e) {
        if (e.target === getEquipmentModal) {
            closeGetEquipmentModal();
        }
    });
}

if (getEquipmentSearch) {
    getEquipmentSearch.addEventListener('input', filterGetEquipmentSelectableItems);
}

if (clearGetEquipmentSearch) {
    clearGetEquipmentSearch.addEventListener('click', function() {
        getEquipmentSearch.value = '';
        filterGetEquipmentSelectableItems();
        getEquipmentSearch.focus();
    });
}


// ==========================================
// 11. ADD STOCK FUNCTIONALITY
// ==========================================

// Add Stock Modal DOM Elements
const selectEquipmentModal = document.getElementById('selectEquipmentModal');
const modalEquipmentSearch = document.getElementById('modalEquipmentSearch');
const clearModalEquipmentSearch = document.getElementById('clearModalEquipmentSearch');
const selectableEquipmentList = document.getElementById('selectableEquipmentList');
const selectedEquipmentDetails = document.getElementById('selectedEquipmentDetails');
const selectedEquipmentId = document.getElementById('selectedEquipmentId');
const selectedEquipmentName = document.getElementById('selectedEquipmentName');
const selectedEquipmentCurrentStock = document.getElementById('selectedEquipmentCurrentStock');
const addEquipmentStockForm = document.getElementById('addEquipmentStockForm');

// ==========================================
// ADD STOCK MODAL FUNCTIONS
// ==========================================
function setSelectStockModalBrowseMode(showBrowse) {
    const createSection = selectEquipmentModal?.querySelector('.create-new-item-section');
    const modalSearch = selectEquipmentModal?.querySelector('.modal-search');
    const display = showBrowse ? '' : 'none';
    if (createSection) createSection.style.display = display;
    if (modalSearch) modalSearch.style.display = display;
}

function openSelectEquipmentModal() {
    selectEquipmentModal.classList.add('show');
    
    // Reset form states
    const searchInput = selectEquipmentModal?.querySelector('.modal-search input');
    if (searchInput) searchInput.value = '';
    selectedEquipmentDetails.style.display = 'none';
    selectableEquipmentList.style.display = 'block';
    setSelectStockModalBrowseMode(true);
    
    // Render all equipment for selection
    renderSelectableEquipment(allEquipment);
    
    // Populate supplier dropdown
    populateAddStockSupplierDropdown();
    
    // Set default date to today
    const today = new Date();
    const dateInput = document.getElementById('addEquipmentDate');
    if (dateInput) {
        dateInput.value = today.toISOString().slice(0, 10);
    }
    
    // Focus on search input
    setTimeout(() => {
        if (modalEquipmentSearch) modalEquipmentSearch.focus();
    }, 100);
}

function closeSelectEquipmentModal() {
    selectEquipmentModal.classList.remove('show');
    // Reset form
    if (addEquipmentStockForm) addEquipmentStockForm.reset();
    selectedEquipmentDetails.style.display = 'none';
    selectableEquipmentList.style.display = 'block';
    setSelectStockModalBrowseMode(true);
}

function populateAddStockSupplierDropdown() {
    const addEquipmentSupplier = document.getElementById('addEquipmentSupplier');
    if (!addEquipmentSupplier) return;
    
    // Get unique suppliers
    const uniqueSuppliers = getUniqueSuppliers(allSuppliers);
    
    let optionsHTML = '<option value="">Select Supplier (Optional)</option>';
    uniqueSuppliers.forEach(supplier => {
        optionsHTML += `<option value="${supplier.id}">${escapeHtml(supplier.supplier_name)}</option>`;
    });
    
    addEquipmentSupplier.innerHTML = optionsHTML;
}

function renderSelectableEquipment(equipment) {
    if (!selectableEquipmentList) return;
    
    selectableEquipmentList.innerHTML = '';
    
    if (equipment.length === 0) {
        selectableEquipmentList.innerHTML = `
            <div class="empty-state" style="padding: 20px;">
                <i class="fa-solid fa-tools"></i>
                <p>No equipment found</p>
            </div>
        `;
        return;
    }
    
    equipment.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'selectable-item';
        itemEl.dataset.equipmentId = item.id;
        itemEl.onclick = () => selectEquipmentForStock(item);
        
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
        
        selectableEquipmentList.appendChild(itemEl);
    });
}

function filterSelectableEquipment() {
    const query = modalEquipmentSearch.value.trim().toLowerCase();
    
    let filtered = allEquipment;
    
    if (query) {
        filtered = filtered.filter(item => {
            const searchText = (item.item_name + ' ' + (item.item_description || '')).toLowerCase();
            return searchText.includes(query);
        });
    }
    
    renderSelectableEquipment(filtered);
}

function selectEquipmentForStock(equipment) {
    // Hide list, show details form
    selectableEquipmentList.style.display = 'none';
    selectedEquipmentDetails.style.display = 'block';
    setSelectStockModalBrowseMode(false);
    
    // Populate details
    selectedEquipmentId.value = equipment.id;
    selectedEquipmentName.textContent = equipment.item_name;
    
    const stockText = `Current Stock: ${equipment.quantity}`;
    selectedEquipmentCurrentStock.textContent = stockText;
    
    // Set max attribute for quantity input
    const quantityInput = document.getElementById('addEquipmentQuantity');
    if (quantityInput) {
        quantityInput.max = 999999; // No upper limit for adding stock
        quantityInput.value = '';
    }
    
    // Set default date to today
    const today = new Date();
    const dateInput = document.getElementById('addEquipmentDate');
    if (dateInput) {
        dateInput.value = today.toISOString().slice(0, 10);
    }
    
    // Focus on quantity input
    setTimeout(() => {
        if (quantityInput) quantityInput.focus();
    }, 100);
}

function cancelEquipmentSelection() {
    selectedEquipmentDetails.style.display = 'none';
    selectableEquipmentList.style.display = 'block';
    setSelectStockModalBrowseMode(true);
    if (addEquipmentStockForm) addEquipmentStockForm.reset();
}

async function handleAddEquipmentStock(event) {
    event.preventDefault();
    
    const equipmentId = selectedEquipmentId.value;
    const equipmentItem = allEquipment.find(e => e.id === equipmentId);
    
    if (!equipmentItem) {
        showNotification('Equipment not found', 'error');
        return;
    }
    
    const quantityToAdd = parseInt(document.getElementById('addEquipmentQuantity').value);
    const date = document.getElementById('addEquipmentDate').value;
    const poNumber = document.getElementById('addEquipmentPO').value.trim();
    const supplierId = document.getElementById('addEquipmentSupplier').value;
    
    if (isNaN(quantityToAdd) || quantityToAdd < 1) {
        showNotification('Please enter a valid quantity', 'error');
        return;
    }
    
    if (!date) {
        showNotification('Please select a date', 'error');
        return;
    }
    
    const oldQuantity = equipmentItem.quantity;
    const newQuantity = oldQuantity + quantityToAdd;
    
    try {
        // Update equipment quantity
        const { error: updateError } = await supabase
            .from('equipment')
            .update({ 
                quantity: newQuantity,
                updated_at: new Date().toISOString()
            })
            .eq('id', equipmentId);
        
        if (updateError) throw updateError;
        
        // Log activity for CREATE (Add Stock) action
        const details = {
            label: equipmentItem.item_description || 'Equipment',
            po_number: poNumber || null,
            equipment_id: equipmentId
        };
        
        await logEquipmentActivity(
            'CREATE',
            equipmentId,
            equipmentItem.item_name,
            quantityToAdd,
            oldQuantity,
            newQuantity,
            null, // person - not required for add stock
            details,
            date
        );
        
        closeSelectEquipmentModal();
        await fetchEquipment();
        
        showNotification(`Successfully added ${quantityToAdd} units to ${equipmentItem.item_name}. New stock: ${newQuantity}`);
        
    } catch (error) {
        console.error('Error adding equipment stock:', error);
        showNotification('Failed to add stock. Please try again.', 'error');
    }
}

function openCreateEquipmentFromStockModal() {
    // Close select modal, open create modal
    closeSelectEquipmentModal();
    openCreateEquipmentModal();
}

// Add Stock modal event listeners
if (selectEquipmentModal) {
    selectEquipmentModal.addEventListener('click', function(e) {
        if (e.target === selectEquipmentModal) {
            closeSelectEquipmentModal();
        }
    });
}

if (modalEquipmentSearch) {
    modalEquipmentSearch.addEventListener('input', filterSelectableEquipment);
}

if (clearModalEquipmentSearch) {
    clearModalEquipmentSearch.addEventListener('click', function() {
        modalEquipmentSearch.value = '';
        filterSelectableEquipment();
        modalEquipmentSearch.focus();
    });
}

// Add Add Stock button handler in View Equipment Modal
const viewEquipmentAddStockBtn = document.getElementById('viewEquipmentAddStockBtn');
if (viewEquipmentAddStockBtn) {
    viewEquipmentAddStockBtn.onclick = () => {
        const equipmentId = viewEquipmentModal.dataset.itemId;
        window.closeViewEquipmentModal();
        
        // Open select equipment modal with this item pre-selected
        openSelectEquipmentModal();
        
        // Find and select the equipment
        const equipment = allEquipment.find(e => e.id === equipmentId);
        if (equipment) {
            // Wait for modal to render then select
            setTimeout(() => {
                selectEquipmentForStock(equipment);
            }, 200);
        }
    };
}

// ==========================================
// 12. INITIALIZE - LOAD EQUIPMENT ON PAGE LOAD
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

// Get Equipment global functions
window.openGetEquipmentModal = openGetEquipmentModal;
window.closeGetEquipmentModal = closeGetEquipmentModal;
window.proceedToEquipmentSelection = proceedToEquipmentSelection;
window.backToEquipmentSelection = backToEquipmentSelection;
window.showEquipmentConfirmationStep = showEquipmentConfirmationStep;
window.processAllEquipment = processAllEquipment;
window.getAnotherEquipment = getAnotherEquipment;
window.removeEquipmentFromCart = removeEquipmentFromCart;
window.cancelGetEquipmentSelection = cancelGetEquipmentSelection;

// Add Stock global functions
window.openSelectEquipmentModal = openSelectEquipmentModal;
window.closeSelectEquipmentModal = closeSelectEquipmentModal;
window.openCreateEquipmentFromStockModal = openCreateEquipmentFromStockModal;
window.handleAddEquipmentStock = handleAddEquipmentStock;
window.cancelEquipmentSelection = cancelEquipmentSelection;
