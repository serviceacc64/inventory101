// Import Supabase client
import { supabase } from './supabase.js';
// Animation helpers
import { showNotification, pulseElement, fadeIn } from './animate.js';

// DOM Elements
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const emptyState = document.getElementById('emptyState');
const personnelContainer = document.getElementById('personnelContainer');
const personnelSearch = document.getElementById('personnelSearch');
const clearSearch = document.getElementById('clearSearch');
const schoolLevelFilter = document.getElementById('schoolLevelFilter');
const departmentFilter = document.getElementById('departmentFilter');

// Modals & Forms (Create/Edit Personnel)
const createPersonnelModal = document.getElementById('createPersonnelModal');
const createPersonnelForm = document.getElementById('createPersonnelForm');
const empNameInput = document.getElementById('empName');
const empIdInput = document.getElementById('empId');
const empPositionInput = document.getElementById('empPosition');
const empSchoolLevelInput = document.getElementById('empSchoolLevel');
const empDepartmentInput = document.getElementById('empDepartment');

const editPersonnelModal = document.getElementById('editPersonnelModal');
const editPersonnelForm = document.getElementById('editPersonnelForm');
const editPersonnelRecordId = document.getElementById('editPersonnelRecordId');
const editEmpNameInput = document.getElementById('editEmpName');
const editEmpIdInput = document.getElementById('editEmpId');
const editEmpPositionInput = document.getElementById('editEmpPosition');
const editEmpSchoolLevelInput = document.getElementById('editEmpSchoolLevel');
const editEmpDepartmentInput = document.getElementById('editEmpDepartment');

// Modals & Forms (Personnel Items)
const personnelItemsModal = document.getElementById('personnelItemsModal');
const personnelItemsTitle = document.getElementById('personnelItemsTitle');
const personnelItemsList = document.getElementById('personnelItemsList');
const noItemsState = document.getElementById('noItemsState');
const addCustomItemForm = document.getElementById('addCustomItemForm');
const showCustomItemBtn = document.getElementById('showCustomItemBtn');

// Edit Personnel Item Modal Elements
const editPersonnelItemModal = document.getElementById('editPersonnelItemModal');
const editPersonnelItemForm = document.getElementById('editPersonnelItemForm');
const editPersonnelItemIdInput = document.getElementById('editPersonnelItemId');
const editItemNameInput = document.getElementById('editItemName');
const editItemQuantityInput = document.getElementById('editItemQuantity');
const editItemUnitsInput = document.getElementById('editItemUnits');
const editItemUnitValueInput = document.getElementById('editItemUnitValue');
const editItemConditionInput = document.getElementById('editItemCondition');
const editItemDescriptionInput = document.getElementById('editItemDescription');
const editItemRemarksInput = document.getElementById('editItemRemarks');

// View Personnel Item Modal Elements
const viewPersonnelItemModal = document.getElementById('viewPersonnelItemModal');
const viewItemNameInput = document.getElementById('viewItemName');
const viewItemQuantityInput = document.getElementById('viewItemQuantity');
const viewItemUnitsInput = document.getElementById('viewItemUnits');
const viewItemUnitValueInput = document.getElementById('viewItemUnitValue');
const viewItemConditionInput = document.getElementById('viewItemCondition');
const viewItemDescriptionInput = document.getElementById('viewItemDescription');
const viewItemRemarksInput = document.getElementById('viewItemRemarks');
const viewItemEditBtn = document.getElementById('viewItemEditBtn');
const viewItemDeleteBtn = document.getElementById('viewItemDeleteBtn');

// State Management
let allPersonnel = [];
let filteredPersonnel = [];
let currentPersonnelId = null;
let currentPersonnelName = '';
let isSubmitting = false;
let isRendering = false;
let searchTimeout = null;

// Pagination state
let currentPage = 1;
const itemsPerPage = 12;
let totalPages = 1;

// Department options by school level
const DEPARTMENTS_BY_SCHOOL_LEVEL = {
    'Junior High': [
        'ENGLISH',
        'FILIPINO',
        'MATHEMATICS',
        'SCIENCE',
        'ARALING PANLIPUNAN',
        'MAPEH',
        'ESP',
        'TLE',
        'UNDEFINED',
        'ADMINISTRATIVE'
    ],
    'Senior High': [
        'HUMMS',
        'ARTS & DESIGN',
        'STEM',
        'ABM',
        'TECH',
        'UNDEFINED',
        'ADMINISTRATIVE'
    ]
};

function getDepartmentsForLevel(schoolLevel) {
    if (schoolLevel && DEPARTMENTS_BY_SCHOOL_LEVEL[schoolLevel]) {
        return DEPARTMENTS_BY_SCHOOL_LEVEL[schoolLevel];
    }
    return [...new Set(Object.values(DEPARTMENTS_BY_SCHOOL_LEVEL).flat())];
}

function populateDepartmentSelect(selectEl, schoolLevel, selectedValue = '') {
    if (!selectEl) return;

    const departments = getDepartmentsForLevel(schoolLevel);
    const keepValue = selectedValue && !departments.includes(selectedValue) ? selectedValue : '';

    selectEl.innerHTML = '';

    if (selectEl.id === 'departmentFilter') {
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = 'All Departments';
        selectEl.appendChild(allOption);
    }

    departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        selectEl.appendChild(option);
    });

    if (keepValue) {
        const legacyOption = document.createElement('option');
        legacyOption.value = keepValue;
        legacyOption.textContent = keepValue;
        selectEl.appendChild(legacyOption);
    }

    if (selectedValue && [...selectEl.options].some(o => o.value === selectedValue)) {
        selectEl.value = selectedValue;
    } else if (selectEl.id === 'departmentFilter') {
        selectEl.value = '';
    } else if (departments.length > 0) {
        selectEl.value = departments[0];
    }
}

function departmentsMatch(stored, selected) {
    if (!selected) return true;
    if (!stored) return false;
    return stored.trim().toUpperCase() === selected.trim().toUpperCase();
}

function updatePersonnelListVisibility() {
    if (!emptyState || !personnelContainer) return;

    const messages = emptyState.querySelectorAll('p');
    const titleEl = messages[0];
    const subtitleEl = messages[1];

    if (allPersonnel.length === 0) {
        emptyState.style.display = 'block';
        personnelContainer.style.display = 'none';
        if (titleEl) titleEl.textContent = 'No employees found';
        if (subtitleEl) subtitleEl.textContent = 'Click "New Employee" to create your first employee record.';
    } else if (filteredPersonnel.length === 0) {
        emptyState.style.display = 'block';
        personnelContainer.style.display = 'none';
        if (titleEl) titleEl.textContent = 'No employees match your filters';
        if (subtitleEl) subtitleEl.textContent = 'Set Department to "All Departments" or adjust your search.';
    } else {
        emptyState.style.display = 'none';
        personnelContainer.style.display = 'grid';
    }
}

function syncDepartmentFilterToSchoolLevel() {
    const level = schoolLevelFilter ? schoolLevelFilter.value : '';
    const currentDept = departmentFilter ? departmentFilter.value : '';
    populateDepartmentSelect(departmentFilter, level, currentDept);
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    populateDepartmentSelect(empDepartmentInput, 'Junior High');
    populateDepartmentSelect(editEmpDepartmentInput, 'Junior High');
    syncDepartmentFilterToSchoolLevel();
    fetchPersonnel();
    setupEventListeners();
});

function setupEventListeners() {
    // Search with debounce
    if (personnelSearch) {
        personnelSearch.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                applyFiltersAndSort();
            }, 300);
        });
    }

    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            personnelSearch.value = '';
            applyFiltersAndSort();
        });
    }

    // Filter selectors
    if (schoolLevelFilter) {
        schoolLevelFilter.addEventListener('change', () => {
            syncDepartmentFilterToSchoolLevel();
            applyFiltersAndSort();
        });
    }

    if (departmentFilter) {
        departmentFilter.addEventListener('change', () => applyFiltersAndSort());
    }

    if (empSchoolLevelInput) {
        empSchoolLevelInput.addEventListener('change', () => {
            populateDepartmentSelect(empDepartmentInput, empSchoolLevelInput.value);
        });
    }

    if (editEmpSchoolLevelInput) {
        editEmpSchoolLevelInput.addEventListener('change', () => {
            populateDepartmentSelect(editEmpDepartmentInput, editEmpSchoolLevelInput.value);
        });
    }
}

// ==========================================
// FILTER AND SORT LOGIC
// ==========================================
function applyFiltersAndSort() {
    const searchTerm = personnelSearch ? personnelSearch.value.toLowerCase().trim() : '';
    const selectedLevel = schoolLevelFilter ? schoolLevelFilter.value : '';
    const selectedDept = departmentFilter ? departmentFilter.value : '';

    let filtered = [...allPersonnel];

    // Apply school level filter
    if (selectedLevel) {
        filtered = filtered.filter(p => p.school_level === selectedLevel);
    }

    // Apply department filter (case-insensitive for legacy values like "English" vs "ENGLISH")
    if (selectedDept) {
        filtered = filtered.filter(p => departmentsMatch(p.department, selectedDept));
    }

    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.employee_name.toLowerCase().includes(searchTerm) ||
            p.employee_id.toLowerCase().includes(searchTerm) ||
            p.position.toLowerCase().includes(searchTerm)
        );
    }

    // Sort alphabetically by employee name
    filtered.sort((a, b) => a.employee_name.localeCompare(b.employee_name));

    filteredPersonnel = filtered;
    currentPage = 1;
    totalPages = Math.ceil(filteredPersonnel.length / itemsPerPage);

    updatePersonnelListVisibility();
    renderPersonnel(filteredPersonnel);
}

// ==========================================
// FETCH & RENDER PERSONNEL
// ==========================================
window.fetchPersonnel = async function() {
    showLoading(true);
    hideError();

    try {
        const { data: personnelList, error } = await supabase
            .from('personnel')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allPersonnel = personnelList || [];
        applyFiltersAndSort();
    } catch (error) {
        console.error('Error fetching personnel:', error);
        showError('Failed to load personnel profiles. Please try again.');
    } finally {
        showLoading(false);
    }
};

async function renderPersonnel(list) {
    if (isRendering) return;
    isRendering = true;

    try {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedList = list.slice(startIndex, endIndex);

        const paginationContainer = document.getElementById('paginationContainer');
        if (list.length > itemsPerPage) {
            paginationContainer.style.display = 'flex';
            updatePaginationControls();
        } else {
            paginationContainer.style.display = 'none';
        }

        personnelContainer.innerHTML = '';

        for (const item of paginatedList) {
            // Fetch issued items for summary statistics
            const { data: issuedItems, error } = await supabase
                .from('personnel_items')
                .select('*')
                .eq('personnel_id', item.id);

            const items = issuedItems || [];
            const uniqueItemsCount = items.length;
            const totalUnits = items.reduce((sum, it) => sum + (it.quantity || 0), 0);
            const totalValue = items.reduce((sum, it) => sum + ((it.quantity || 0) * (parseFloat(it.unit_value) || 0)), 0);

            const card = document.createElement('div');
            card.className = `personnel-card ${uniqueItemsCount === 0 ? 'empty' : ''}`;
            card.dataset.id = item.id;

            let badgeClass = item.school_level === 'Senior High' ? 'badge-senior' : 'badge-junior';

            // Limit compact items preview list to 3 items
            let itemsPreviewHtml = '';
            if (uniqueItemsCount > 0) {
                const compactItems = items.slice(0, 3);
                itemsPreviewHtml = `
                    <div class="personnel-items-preview">
                        <h4>Equipment Preview</h4>
                        <div class="items-list-compact">
                            ${compactItems.map(it => `
                                <div class="item-badge">
                                    <span class="item-name">${it.item_name}</span>
                                    <span class="item-qty">x${it.quantity}</span>
                                </div>
                            `).join('')}
                            ${uniqueItemsCount > 3 ? `
                                <div style="font-size: 10px; color: #888; text-align: center; margin-top: 4px;">
                                    + ${uniqueItemsCount - 3} more items
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            } else {
                itemsPreviewHtml = `
                    <div class="personnel-items-preview" style="justify-content: center; align-items: center; min-height: 90px; color: #ccc;">
                        <i class="fa-solid fa-box-open" style="font-size: 24px; margin-bottom: 8px;"></i>
                        <span style="font-size: 11px;">No equipment issued</span>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="personnel-header">
                    <div class="employee-avatar-title">
                        <div class="employee-icon"><i class="fa-solid fa-user"></i></div>
                        <div class="employee-name-container">
                            <h3 class="employee-name">${item.employee_name}</h3>
                            <span class="employee-id-badge">${item.employee_id}</span>
                        </div>
                    </div>
                    <div class="personnel-actions">
                        <button onclick="window.openEditPersonnelModal('${item.id}')" title="Edit Profile">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                    </div>
                </div>

                <div class="employee-details">
                    <p><i class="fa-solid fa-briefcase"></i> <strong>Position:</strong> ${item.position}</p>
                    <p><i class="fa-solid fa-graduation-cap"></i> <strong>Level:</strong> <span class="badge ${badgeClass}">${item.school_level}</span></p>
                    <p><i class="fa-solid fa-sitemap"></i> <strong>Dept:</strong> ${item.department}</p>
                </div>

                <div class="personnel-stats">
                    <div class="personnel-stat">
                        <span class="personnel-stat-value">${uniqueItemsCount}</span>
                        <span class="personnel-stat-label">Unique Items</span>
                    </div>
                    <div class="personnel-stat">
                        <span class="personnel-stat-value">${totalUnits}</span>
                        <span class="personnel-stat-label">Total Qty</span>
                    </div>
                    <div class="personnel-stat">
                        <span class="personnel-stat-value">₱${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span class="personnel-stat-label">Total Value</span>
                    </div>
                </div>

                ${itemsPreviewHtml}

                <button class="view-personnel-btn" onclick="window.openPersonnelItemsModal('${item.id}', '${item.employee_name.replace(/'/g, "\\'")}')">
                    <i class="fa-solid fa-clipboard-list"></i> Manage Equipment
                </button>
            `;

            personnelContainer.appendChild(card);
            fadeIn(card);
        }
    } catch (error) {
        console.error('Error rendering personnel:', error);
    } finally {
        isRendering = false;
    }
}

// ==========================================
// PAGINATION CONTROLS
// ==========================================
function updatePaginationControls() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageIndicator = document.getElementById('pageIndicator');

    if (pageIndicator) pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
}

window.previousPage = function() {
    if (currentPage > 1) {
        currentPage--;
        renderPersonnel(filteredPersonnel);
    }
};

window.nextPage = function() {
    if (currentPage < totalPages) {
        currentPage++;
        renderPersonnel(filteredPersonnel);
    }
};

// ==========================================
// CREATE & EDIT EMPLOYEE LOGIC
// ==========================================
window.openCreatePersonnelModal = function() {
    if (createPersonnelForm) createPersonnelForm.reset();
    const level = empSchoolLevelInput ? empSchoolLevelInput.value : 'Junior High';
    populateDepartmentSelect(empDepartmentInput, level);
    createPersonnelModal.classList.add('show');
};

window.closeCreatePersonnelModal = function() {
    createPersonnelModal.classList.remove('show');
};

window.handleCreatePersonnel = async function(event) {
    event.preventDefault();
    if (isSubmitting) return;

    const name = empNameInput.value.trim();
    const employeeId = empIdInput.value.trim();
    const position = empPositionInput.value.trim();
    const schoolLevel = empSchoolLevelInput.value;
    const department = empDepartmentInput.value;

    if (!name || !employeeId || !position || !schoolLevel || !department) {
        showNotification('Please fill in all required fields.', 'error');
        return;
    }

    isSubmitting = true;
    const submitBtn = document.getElementById('createPersonnelBtn');
    if (submitBtn) submitBtn.disabled = true;

    try {
        // Enforce employee_id unique constraints gracefully
        const { data: existing, error: checkError } = await supabase
            .from('personnel')
            .select('id')
            .eq('employee_id', employeeId)
            .maybeSingle();

        if (checkError) throw checkError;
        if (existing) {
            showNotification(`An employee with ID '${employeeId}' already exists.`, 'error');
            isSubmitting = false;
            if (submitBtn) submitBtn.disabled = false;
            return;
        }

        const { error } = await supabase
            .from('personnel')
            .insert([{ employee_name: name, employee_id: employeeId, position, school_level: schoolLevel, department }]);

        if (error) throw error;

        showNotification('Employee profile created successfully!', 'success');
        closeCreatePersonnelModal();
        fetchPersonnel();
    } catch (err) {
        console.error(err);
        showNotification('Error creating profile. Please try again.', 'error');
    } finally {
        isSubmitting = false;
        if (submitBtn) submitBtn.disabled = false;
    }
};

window.openEditPersonnelModal = async function(id) {
    try {
        const { data: item, error } = await supabase
            .from('personnel')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        editPersonnelRecordId.value = item.id;
        editEmpNameInput.value = item.employee_name;
        editEmpIdInput.value = item.employee_id;
        editEmpPositionInput.value = item.position;
        editEmpSchoolLevelInput.value = item.school_level;
        populateDepartmentSelect(editEmpDepartmentInput, item.school_level, item.department);

        editPersonnelModal.classList.add('show');
    } catch (err) {
        console.error(err);
        showNotification('Failed to fetch employee details.', 'error');
    }
};

window.closeEditPersonnelModal = function() {
    editPersonnelModal.classList.remove('show');
};

window.handleEditPersonnel = async function(event) {
    event.preventDefault();
    if (isSubmitting) return;

    const id = editPersonnelRecordId.value;
    const name = editEmpNameInput.value.trim();
    const employeeId = editEmpIdInput.value.trim();
    const position = editEmpPositionInput.value.trim();
    const schoolLevel = editEmpSchoolLevelInput.value;
    const department = editEmpDepartmentInput.value;

    if (!name || !employeeId || !position || !schoolLevel || !department) {
        showNotification('Required fields must not be empty.', 'error');
        return;
    }

    isSubmitting = true;

    try {
        // Enforce employee_id uniqueness when modifying
        const { data: existing, error: checkError } = await supabase
            .from('personnel')
            .select('id')
            .eq('employee_id', employeeId)
            .neq('id', id)
            .maybeSingle();

        if (checkError) throw checkError;
        if (existing) {
            showNotification(`Another employee already uses ID '${employeeId}'.`, 'error');
            isSubmitting = false;
            return;
        }

        const { error } = await supabase
            .from('personnel')
            .update({ employee_name: name, employee_id: employeeId, position, school_level: schoolLevel, department, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;

        showNotification('Profile updated successfully!', 'success');
        closeEditPersonnelModal();
        fetchPersonnel();
    } catch (err) {
        console.error(err);
        showNotification('Error updating details. Try again.', 'error');
    } finally {
        isSubmitting = false;
    }
};

window.handleDeletePersonnel = async function() {
    const id = editPersonnelRecordId.value;
    const name = editEmpNameInput.value;

    if (!confirm(`Are you absolutely sure you want to delete the profile of "${name}"?\nAll associated issued equipment will be permanently removed.`)) {
        return;
    }

    try {
        const { error } = await supabase
            .from('personnel')
            .delete()
            .eq('id', id);

        if (error) throw error;

        showNotification('Employee profile deleted.', 'success');
        closeEditPersonnelModal();
        fetchPersonnel();
    } catch (err) {
        console.error(err);
        showNotification('Failed to delete employee profile.', 'error');
    }
};

// ==========================================
// ISSUED EQUIPMENT DETAILS MODAL LOGIC
// ==========================================
window.openPersonnelItemsModal = function(id, name) {
    currentPersonnelId = id;
    currentPersonnelName = name;
    personnelItemsTitle.textContent = `Issued Equipment - ${name}`;
    
    // Hide item issuance form on modal load
    hideCustomItemForm();
    fetchPersonnelItems();
    
    personnelItemsModal.classList.add('show');
};

window.closePersonnelItemsModal = function() {
    personnelItemsModal.classList.remove('show');
    fetchPersonnel(); // Refresh stats on main dashboard grid
};

window.showCustomItemForm = function() {
    if (addCustomItemForm) {
        addCustomItemForm.reset();
        addCustomItemForm.style.display = 'block';
    }
    if (showCustomItemBtn) showCustomItemBtn.style.display = 'none';
};

window.hideCustomItemForm = function() {
    if (addCustomItemForm) {
        addCustomItemForm.style.display = 'none';
    }
    if (showCustomItemBtn) showCustomItemBtn.style.display = 'block';
};

async function fetchPersonnelItems() {
    if (!currentPersonnelId) return;

    try {
        const { data: items, error } = await supabase
            .from('personnel_items')
            .select('*')
            .eq('personnel_id', currentPersonnelId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        renderPersonnelItems(items || []);
    } catch (err) {
        console.error(err);
        showNotification('Failed to fetch issued items.', 'error');
    }
}

function renderPersonnelItems(items) {
    if (!personnelItemsList) return;

    personnelItemsList.innerHTML = '';

    if (items.length === 0) {
        noItemsState.style.display = 'block';
        personnelItemsList.style.display = 'none';
        return;
    }

    noItemsState.style.display = 'none';
    personnelItemsList.style.display = 'flex';

    items.forEach(it => {
        const row = document.createElement('div');
        row.className = 'personnel-item-row';

        const unitVal = parseFloat(it.unit_value) || 0;
        const totalCostVal = (it.quantity || 1) * unitVal;

        let conditionClass = '';
        switch (it.condition) {
            case 'New': conditionClass = 'condition-new'; break;
            case 'Good': conditionClass = 'condition-good'; break;
            case 'Fair': conditionClass = 'condition-fair'; break;
            case 'Poor': conditionClass = 'condition-poor'; break;
            case 'Damaged': conditionClass = 'condition-damaged'; break;
            default: conditionClass = 'condition-good';
        }

        row.innerHTML = `
            <div class="personnel-item-info">
                <div class="personnel-item-header">
                    <h5 class="personnel-item-name" style="cursor:pointer;" onclick="window.openViewPersonnelItemModal('${it.id}')">${it.item_name}</h5>
                </div>
                ${it.description ? `<p class="personnel-item-description">${it.description}</p>` : ''}
                ${it.remarks ? `<p class="personnel-item-remarks"><i class="fa-solid fa-info-circle"></i> ${it.remarks}</p>` : ''}
                
                <div class="personnel-item-meta">
                    <span class="condition-badge ${conditionClass}">${it.condition}</span>
                    <span class="unit-badge">Qty: ${it.quantity} ${it.units || 'pcs'}</span>
                    <span class="value-badge">Val: ₱${unitVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    <span class="value-badge" style="background: rgba(137,22,35,0.08); color: var(--hover);">Total: ₱${totalCostVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
            
            <div class="personnel-item-actions">
                <button type="button" onclick="window.openEditPersonnelItemModal('${it.id}')" title="Edit Item">
                    <i class="fa-solid fa-pencil"></i>
                </button>
            </div>
        `;

        personnelItemsList.appendChild(row);
    });
}

// ==========================================
// ISSUE ITEM LOGIC (WITH UNIQUE MERGE CRITERIA)
// ==========================================
window.handleAddCustomItemToPersonnel = async function(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const name = document.getElementById('customItemName').value.trim();
    const qtyInput = document.getElementById('customItemQuantity');
    const units = document.getElementById('customItemUnits').value;
    const valueInput = document.getElementById('customItemUnitValue');
    const condition = document.getElementById('customItemCondition').value;
    const description = document.getElementById('customItemDescription').value.trim() || null;
    const remarks = document.getElementById('customItemRemarks').value.trim() || null;

    let quantity = parseInt(qtyInput.value);
    if (isNaN(quantity) || quantity < 1) quantity = 1;

    let unitValue = parseFloat(valueInput.value);
    if (isNaN(unitValue) || unitValue < 0) unitValue = 0.00;

    if (!name) {
        showNotification('Item name is required.', 'error');
        return;
    }

    if (!currentPersonnelId) {
        showNotification('Employee reference error.', 'error');
        return;
    }

    if (isSubmitting) return;
    isSubmitting = true;

    try {
        // MERGE CRITERIA: unique combinations of Name, Desc, Condition and Remarks
        const { data: existingItems, error: fetchError } = await supabase
            .from('personnel_items')
            .select('*')
            .eq('personnel_id', currentPersonnelId)
            .eq('item_name', name);

        if (fetchError) throw fetchError;

        const normalizedDescription = description ? description.trim().toLowerCase() : '';
        const normalizedRemarks = remarks ? remarks.trim().toLowerCase() : '';

        // Find existing match
        const matched = existingItems && existingItems.length > 0
            ? existingItems.find(item => {
                const existingDesc = item.description ? item.description.trim().toLowerCase() : '';
                const existingRemarks = item.remarks ? item.remarks.trim().toLowerCase() : '';
                return (
                    existingDesc === normalizedDescription &&
                    item.condition === condition &&
                    existingRemarks === normalizedRemarks &&
                    (parseFloat(item.unit_value) || 0) === unitValue &&
                    item.units === units
                );
            })
            : null;

        if (matched) {
            // Combine quantities
            const newQty = matched.quantity + quantity;
            const { error: updateError } = await supabase
                .from('personnel_items')
                .update({ quantity: newQty, updated_at: new Date().toISOString() })
                .eq('id', matched.id);

            if (updateError) throw updateError;
            showNotification(`Updated quantity of issued item: ${name} (+${quantity} units)`, 'success');
        } else {
            // Add new issued item entry
            const { error: insertError } = await supabase
                .from('personnel_items')
                .insert([{
                    personnel_id: currentPersonnelId,
                    item_name: name,
                    quantity,
                    units,
                    unit_value: unitValue,
                    condition,
                    description,
                    remarks
                }]);

            if (insertError) throw insertError;
            showNotification(`Issued new item: ${name}`, 'success');
        }

        hideCustomItemForm();
        fetchPersonnelItems();
    } catch (err) {
        console.error(err);
        showNotification('Error processing item assignment.', 'error');
    } finally {
        isSubmitting = false;
    }
};

// ==========================================
// EDIT / DELETE PERSONNEL ITEM LOGIC
// ==========================================
window.openEditPersonnelItemModal = async function(id) {
    try {
        const { data: item, error } = await supabase
            .from('personnel_items')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        editPersonnelItemIdInput.value = item.id;
        editItemNameInput.value = item.item_name;
        editItemQuantityInput.value = item.quantity;
        editItemUnitsInput.value = item.units || 'pcs';
        editItemUnitValueInput.value = item.unit_value || 0;
        editItemConditionInput.value = item.condition || 'Good';
        editItemDescriptionInput.value = item.description || '';
        editItemRemarksInput.value = item.remarks || '';

        // Close details modal if open
        closeViewPersonnelItemModal();

        editPersonnelItemModal.classList.add('show');
    } catch (err) {
        console.error(err);
        showNotification('Failed to retrieve issued item details.', 'error');
    }
};

window.closeEditPersonnelItemModal = function() {
    editPersonnelItemModal.classList.remove('show');
};

window.handleEditPersonnelItem = async function(event) {
    event.preventDefault();
    if (isSubmitting) return;

    const id = editPersonnelItemIdInput.value;
    const name = editItemNameInput.value.trim();
    let qty = parseInt(editItemQuantityInput.value);
    const units = editItemUnitsInput.value;
    let unitValue = parseFloat(editItemUnitValueInput.value);
    const condition = editItemConditionInput.value;
    const desc = editItemDescriptionInput.value.trim() || null;
    const remarks = editItemRemarksInput.value.trim() || null;

    if (!name || isNaN(qty) || qty < 1) {
        showNotification('Valid item name and quantity are required.', 'error');
        return;
    }

    if (isNaN(unitValue) || unitValue < 0) unitValue = 0.00;

    isSubmitting = true;

    try {
        const { error } = await supabase
            .from('personnel_items')
            .update({
                item_name: name,
                quantity: qty,
                units,
                unit_value: unitValue,
                condition,
                description: desc,
                remarks,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        showNotification('Issued item details updated.', 'success');
        closeEditPersonnelItemModal();
        fetchPersonnelItems();
    } catch (err) {
        console.error(err);
        showNotification('Failed to update issued item.', 'error');
    } finally {
        isSubmitting = false;
    }
};

window.handleDeletePersonnelItem = async function() {
    const id = editPersonnelItemIdInput.value;
    const name = editItemNameInput.value;

    if (!confirm(`Are you sure you want to de-allocate/delete "${name}" from this employee?`)) {
        return;
    }

    try {
        const { error } = await supabase
            .from('personnel_items')
            .delete()
            .eq('id', id);

        if (error) throw error;

        showNotification('Item removed from employee.', 'success');
        closeEditPersonnelItemModal();
        fetchPersonnelItems();
    } catch (err) {
        console.error(err);
        showNotification('Failed to de-allocate item.', 'error');
    }
};

// ==========================================
// VIEW PERSONNEL ITEM MODAL LOGIC
// ==========================================
window.openViewPersonnelItemModal = async function(id) {
    try {
        const { data: item, error } = await supabase
            .from('personnel_items')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        viewItemNameInput.textContent = item.item_name;
        viewItemQuantityInput.textContent = item.quantity;
        viewItemUnitsInput.textContent = item.units || 'pcs';
        viewItemUnitValueInput.textContent = (parseFloat(item.unit_value) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        viewItemConditionInput.textContent = item.condition || 'Good';
        viewItemDescriptionInput.textContent = item.description || '-';
        viewItemRemarksInput.textContent = item.remarks || '-';

        // Connect edit & delete buttons inside the view modal dynamically
        viewItemEditBtn.onclick = () => window.openEditPersonnelItemModal(item.id);
        viewItemDeleteBtn.onclick = async () => {
            closeViewPersonnelItemModal();
            editPersonnelItemIdInput.value = item.id;
            editItemNameInput.value = item.item_name;
            await window.handleDeletePersonnelItem();
        };

        viewPersonnelItemModal.classList.add('show');
    } catch (err) {
        console.error(err);
        showNotification('Failed to view item details.', 'error');
    }
};

window.closeViewPersonnelItemModal = function() {
    viewPersonnelItemModal.classList.remove('show');
};

// ==========================================
// EXPORT TO EXCEL LOGIC (SHEETJS integration)
// ==========================================
window.exportPersonnelItemsToExcel = async function() {
    if (!currentPersonnelId) return;

    try {
        const { data: items, error } = await supabase
            .from('personnel_items')
            .select('*')
            .eq('personnel_id', currentPersonnelId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!items || items.length === 0) {
            showNotification('No issued items found to export.', 'warning');
            return;
        }

        // Format worksheet titles
        const safeTitle = `Employee- ${currentPersonnelName.replace(/[\\\/\?\*\[\]\:]/g, '')}`;
        const sheetName = safeTitle.length > 31 ? safeTitle.slice(0, 31) : safeTitle;

        // Custom rows layout
        const headerRow = {
            'No.': '',
            'Item Name': `Accountable: ${currentPersonnelName}`
        };
        Object.assign(headerRow, {
            'Quantity': '',
            'Units': '',
            'Unit Value': '',
            'Total Value': '',
            'Condition': '',
            'Description': '',
            'Remarks': '',
            'Date Issued': ''
        });

        const blankRow = {};
        Object.keys(headerRow).forEach(k => blankRow[k] = '');

        const exportRows = [
            headerRow,
            blankRow,
            ...items.map((it, idx) => {
                const qty = it.quantity || 1;
                const val = parseFloat(it.unit_value) || 0;
                const total = qty * val;

                return {
                    'No.': idx + 1,
                    'Item Name': it.item_name,
                    'Quantity': qty,
                    'Units': it.units || 'pcs',
                    'Unit Value': `₱${val.toFixed(2)}`,
                    'Total Value': `₱${total.toFixed(2)}`,
                    'Condition': it.condition || 'Good',
                    'Description': it.description || '-',
                    'Remarks': it.remarks || '-',
                    'Date Issued': it.created_at ? new Date(it.created_at).toLocaleDateString() : '-'
                };
            })
        ];

        const ws = XLSX.utils.json_to_sheet(exportRows);
        const wb = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        // Define premium custom column widths
        ws['!cols'] = [
            { wch: 6 },   // No.
            { wch: 25 },  // Item Name
            { wch: 10 },  // Quantity
            { wch: 10 },  // Units
            { wch: 15 },  // Unit Value
            { wch: 15 },  // Total Value
            { wch: 12 },  // Condition
            { wch: 30 },  // Description
            { wch: 30 },  // Remarks
            { wch: 15 }   // Date Issued
        ];

        // Format dates and write file
        const isoDate = new Date().toISOString().split('T')[0];
        const filename = `${safeTitle.replace(/\s+/g, '_')}_Issued_Items_${isoDate}.xlsx`;
        XLSX.writeFile(wb, filename);

        showNotification(`Excel sheet '${filename}' generated successfully!`, 'success');
    } catch (err) {
        console.error(err);
        showNotification('Failed to generate Excel sheet.', 'error');
    }
};

// ==========================================
// INTERACTIVE MESSAGES HELPER
// ==========================================
function showLoading(show) {
    if (loadingState) loadingState.style.display = show ? 'block' : 'none';
}

function showError(msg) {
    if (errorState && errorMessage) {
        errorMessage.textContent = msg;
        errorState.style.display = 'block';
    }
}

function hideError() {
    if (errorState) errorState.style.display = 'none';
}
