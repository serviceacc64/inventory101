// Import Supabase client
import { supabase } from './supabase.js';
// Animation helpers
import { showNotification, fadeIn } from './animate.js';

// DOM Elements
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const emptyState = document.getElementById('emptyState');
const buildingsContainer = document.getElementById('buildingsContainer');
const buildingSearch = document.getElementById('buildingSearch');
const clearSearch = document.getElementById('clearSearch');

// Create Building Modal Elements
const createBuildingModal = document.getElementById('createBuildingModal');
const createBuildingForm = document.getElementById('createBuildingForm');
const createStructuresList = document.getElementById('createStructuresList');
const noCreateStructuresState = document.getElementById('noCreateStructuresState');

// Building Details Modal Elements
const buildingDetailsModal = document.getElementById('buildingDetailsModal');
const buildingDetailsTitle = document.getElementById('buildingDetailsTitle');
const detailBuildingName = document.getElementById('detailBuildingName');
const detailBuildingMetadata = document.getElementById('detailBuildingMetadata');
const structuresList = document.getElementById('structuresList');
const noStructuresState = document.getElementById('noStructuresState');
const structureBuildingIdInput = document.getElementById('structureBuildingId');
const addStructureForm = document.getElementById('addStructureForm');

// Edit Building Modal Elements
const editBuildingModal = document.getElementById('editBuildingModal');
const editBuildingForm = document.getElementById('editBuildingForm');
const editBuildingId = document.getElementById('editBuildingId');
const editBuildingName = document.getElementById('editBuildingName');
const editBuildingDescription = document.getElementById('editBuildingDescription');
const editBuildingNumber = document.getElementById('editBuildingNumber');
const editStructureNumber = document.getElementById('editStructureNumber');
const editNumberOfStoreys = document.getElementById('editNumberOfStoreys');
const editNumberOfRooms = document.getElementById('editNumberOfRooms');
const editPropertyNumber = document.getElementById('editPropertyNumber');
const editFundSource = document.getElementById('editFundSource');
const editAcquisitionCost = document.getElementById('editAcquisitionCost');
const editAcquisitionDate = document.getElementById('editAcquisitionDate');

// State
let allBuildings = [];
let currentBuildingId = null;
let isSubmitting = false;
let createBuildingStructures = [];

// ==========================================
// INITIALIZE
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    fetchBuildings();
    setupEventListeners();
});

function setupEventListeners() {
    // Search
    if (buildingSearch) {
        buildingSearch.addEventListener('input', () => {
            applyFilters();
        });
    }

    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            buildingSearch.value = '';
            applyFilters();
        });
    }

    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === createBuildingModal) window.closeCreateBuildingModal();
        if (event.target === buildingDetailsModal) window.closeBuildingDetailsModal();
        if (event.target === editBuildingModal) window.closeEditBuildingModal();
        if (event.target === document.getElementById('viewStructureModal')) window.closeViewStructureModal();
    });

    const roomsCountInput = document.getElementById('structureRoomsCount');
    if (roomsCountInput) {
        roomsCountInput.addEventListener('input', () => {
            window.generateRoomInputs();
        });
    }

    const createRoomsCountInput = document.getElementById('createStructureRoomsCount');
    if (createRoomsCountInput) {
        createRoomsCountInput.addEventListener('input', () => {
            window.generateCreateStructureRoomInputs();
        });
    }

    const buildingRoomsInput = document.getElementById('numberOfRooms');
    if (buildingRoomsInput) {
        buildingRoomsInput.addEventListener('input', () => {
            generateBuildingUsageInputs('create');
        });
    }

    if (editNumberOfRooms) {
        editNumberOfRooms.addEventListener('input', () => {
            generateBuildingUsageInputs('edit');
        });
    }
}

// ==========================================
// FETCH DATA
// ==========================================
async function fetchBuildings() {
    showLoading(true);
    hideError();

    try {
        // Fetch buildings with their structures
        const { data: buildings, error } = await supabase
            .from('buildings')
            .select('*, structures(*)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allBuildings = buildings || [];
        applyFilters();

    } catch (error) {
        console.error('Error fetching buildings:', error);
        showError('Failed to load buildings. Please try again.');
    } finally {
        showLoading(false);
    }
}

function applyFilters() {
    const searchTerm = buildingSearch ? buildingSearch.value.toLowerCase().trim() : '';
    let filtered = [...allBuildings];

    if (searchTerm) {
        filtered = filtered.filter(building =>
            building.name.toLowerCase().includes(searchTerm) ||
            (building.description && building.description.toLowerCase().includes(searchTerm)) ||
            (building.building_number && building.building_number.toLowerCase().includes(searchTerm)) ||
            (building.structure_number && building.structure_number.toLowerCase().includes(searchTerm)) ||
            (building.property_number && building.property_number.toLowerCase().includes(searchTerm)) ||
            (building.fund_source && building.fund_source.toLowerCase().includes(searchTerm)) ||
            (building.usage && building.usage.toLowerCase().includes(searchTerm))
        );
    }

    renderBuildings(filtered);
}

// ==========================================
// RENDER BUILDINGS
// ==========================================
function renderBuildings(buildings) {
    buildingsContainer.innerHTML = '';

    if (buildings.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    buildings.forEach(building => {
        const buildingEl = document.createElement('div');
        buildingEl.className = 'room-card';
        buildingEl.dataset.buildingId = building.id;

        const structuresCount = building.structures ? building.structures.length : 0;

        buildingEl.innerHTML = `
            <div class="room-header">
                <h3 class="room-name">${escapeHtml(building.name)}</h3>
                <div class="room-actions">
                    <button onclick="window.openEditBuildingModal('${building.id}')" title="Edit Building">
                        <i class="fa-solid fa-edit"></i>
                    </button>
                </div>
            </div>

            <div class="room-info">
                ${building.building_number ? `<p class="room-adviser"><i class="fa-solid fa-hashtag"></i> ${escapeHtml(building.building_number)}</p>` : ''}
                ${building.structure_number ? `<p class="room-adviser"><i class="fa-solid fa-cubes"></i> ${escapeHtml(building.structure_number)}</p>` : ''}
                ${building.description ? `<p class="room-adviser"><i class="fa-solid fa-info-circle"></i> ${escapeHtml(building.description)}</p>` : '<p class="room-adviser">No description</p>'}
                ${building.usage ? `<p class="room-adviser"><i class="fa-solid fa-list-check"></i> ${escapeHtml(building.usage)}</p>` : ''}
            </div>

            <div class="room-stats">
                <div class="room-stat">
                    <span class="room-stat-value">${building.number_of_storeys ?? '-'}</span>
                    <span class="room-stat-label">Storeys</span>
                </div>
                <div class="room-stat">
                    <span class="room-stat-value">${building.number_of_rooms ?? '-'}</span>
                    <span class="room-stat-label">Rooms</span>
                </div>
                <div class="room-stat">
                    <span class="room-stat-value">${structuresCount}</span>
                    <span class="room-stat-label">Structures</span>
                </div>
            </div>

            <button onclick="window.openBuildingDetailsModal('${building.id}')" class="view-room-btn">
                <i class="fa-solid fa-eye"></i> View Details & Structures
            </button>
        `;

        buildingsContainer.appendChild(buildingEl);
        fadeIn(buildingEl);
    });
}

// ==========================================
// MODAL FUNCTIONS
// ==========================================
window.openCreateBuildingModal = function() {
    createBuildingForm.reset();
    createBuildingStructures = [];
    generateBuildingUsageInputs('create');
    window.hideCreateAddStructureForm();
    renderCreateStructures();
    createBuildingModal.classList.add('show');
}

window.closeCreateBuildingModal = function() {
    createBuildingModal.classList.remove('show');
}

window.openEditBuildingModal = function(buildingId) {
    const building = allBuildings.find(b => b.id === buildingId);
    if (!building) return;

    editBuildingId.value = building.id;
    editBuildingName.value = building.name;
    editBuildingDescription.value = building.description || '';
    editBuildingNumber.value = building.building_number || '';
    editStructureNumber.value = building.structure_number || '';
    editNumberOfStoreys.value = building.number_of_storeys ?? '';
    editNumberOfRooms.value = building.number_of_rooms ?? '';
    editPropertyNumber.value = building.property_number || '';
    editFundSource.value = building.fund_source || '';
    editAcquisitionCost.value = building.acquisition_cost ?? '';
    editAcquisitionDate.value = building.acquisition_date || '';
    generateBuildingUsageInputs('edit', parseRoomUsages(building.usage));

    editBuildingModal.classList.add('show');
}

window.closeEditBuildingModal = function() {
    editBuildingModal.classList.remove('show');
}

window.openBuildingDetailsModal = function(buildingId) {
    const building = allBuildings.find(b => b.id === buildingId);
    if (!building) return;

    currentBuildingId = buildingId;
    structureBuildingIdInput.value = buildingId;

    detailBuildingName.textContent = building.name;
    renderBuildingMetadata(building);

    renderStructures(building.structures || []);

    // Reset structure form
    window.hideAddStructureForm();

    buildingDetailsModal.classList.add('show');
}

window.closeBuildingDetailsModal = function() {
    buildingDetailsModal.classList.remove('show');
    currentBuildingId = null;
}

window.openViewStructureModal = function(structureId) {
    const building = allBuildings.find(b => b.id === currentBuildingId);
    if (!building) return;

    const structure = building.structures.find(s => s.id === structureId);
    if (!structure) return;

    document.getElementById('viewStructureType').textContent = structure.type;

    const instructionalInfo = document.getElementById('viewInstructionalInfo');
    const nonInstructionalInfo = document.getElementById('viewNonInstructionalInfo');
    const othersInfo = document.getElementById('viewOthersInfo');

    instructionalInfo.style.display = 'none';
    nonInstructionalInfo.style.display = 'none';
    othersInfo.style.display = 'none';

    if (structure.type === 'Instructional') {
        instructionalInfo.style.display = 'block';
        document.getElementById('viewStructureRoomsCount').textContent = structure.number_of_rooms;
        document.getElementById('viewStructureRoomNames').textContent = structure.room_names;
    } else if (structure.type === 'Non-Instructional') {
        nonInstructionalInfo.style.display = 'block';
        document.getElementById('viewStructurePurpose').textContent = structure.purpose;
    } else if (structure.type === 'Others') {
        othersInfo.style.display = 'block';
        document.getElementById('viewStructureFunction').textContent = structure.function;
    }

    document.getElementById('viewStructureModal').classList.add('show');
}

window.closeViewStructureModal = function() {
    document.getElementById('viewStructureModal').classList.remove('show');
}

window.showAddStructureForm = function() {
    addStructureForm.style.display = 'block';
    document.getElementById('showAddStructureBtn').style.display = 'none';
}

window.hideAddStructureForm = function() {
    addStructureForm.style.display = 'none';
    document.getElementById('showAddStructureBtn').style.display = 'block';
    addStructureForm.reset();
    
    // Hide all conditional fields
    document.getElementById('instructionalFields').style.display = 'none';
    document.getElementById('nonInstructionalFields').style.display = 'none';
    document.getElementById('othersFields').style.display = 'none';
}

window.generateRoomInputs = function() {
    const countInput = document.getElementById('structureRoomsCount');
    const container = document.getElementById('roomNamesContainer');
    
    if (!countInput || !container) return;
    
    const count = parseInt(countInput.value, 10) || 0;
    container.innerHTML = '';
    
    for (let i = 1; i <= count; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'room-name-input';
        input.placeholder = `Room ${i} Name`;
        input.required = true;
        input.style.padding = '8px 10px';
        input.style.border = '1px solid rgba(85, 0, 0, 0.2)';
        input.style.borderRadius = '8px';
        input.style.width = '100%';
        container.appendChild(input);
    }
}

window.generateCreateStructureRoomInputs = function() {
    const countInput = document.getElementById('createStructureRoomsCount');
    const container = document.getElementById('createRoomNamesContainer');

    if (!countInput || !container) return;

    const existingValues = Array.from(container.querySelectorAll('.create-room-name-input')).map(input => input.value);
    const count = parseInt(countInput.value, 10) || 0;
    container.innerHTML = '';

    for (let i = 1; i <= count; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-input create-room-name-input';
        input.placeholder = `Room ${i} Name`;
        input.value = existingValues[i - 1] || '';
        input.required = true;
        container.appendChild(input);
    }
}

// ==========================================
// CONDITIONAL LOGIC
// ==========================================
window.handleStructureTypeChange = function() {
    const type = document.getElementById('structureType').value;
    const instructional = document.getElementById('instructionalFields');
    const nonInstructional = document.getElementById('nonInstructionalFields');
    const others = document.getElementById('othersFields');

    instructional.style.display = 'none';
    nonInstructional.style.display = 'none';
    others.style.display = 'none';

    // Remove required from all conditional inputs first
    document.getElementById('structureRoomsCount').removeAttribute('required');
    document.getElementById('structurePurpose').removeAttribute('required');
    document.getElementById('structureFunction').removeAttribute('required');

    if (type === 'Instructional') {
        instructional.style.display = 'block';
        document.getElementById('structureRoomsCount').setAttribute('required', 'required');
        window.generateRoomInputs();
    } else if (type === 'Non-Instructional') {
        nonInstructional.style.display = 'block';
        document.getElementById('structurePurpose').setAttribute('required', 'required');
    } else if (type === 'Others') {
        others.style.display = 'block';
        document.getElementById('structureFunction').setAttribute('required', 'required');
    }
}

window.handleCreateStructureTypeChange = function() {
    const type = document.getElementById('createStructureType').value;
    const instructional = document.getElementById('createInstructionalFields');
    const nonInstructional = document.getElementById('createNonInstructionalFields');
    const others = document.getElementById('createOthersFields');

    instructional.style.display = 'none';
    nonInstructional.style.display = 'none';
    others.style.display = 'none';

    document.getElementById('createStructureRoomsCount').removeAttribute('required');
    document.getElementById('createStructurePurpose').removeAttribute('required');
    document.getElementById('createStructureFunction').removeAttribute('required');

    if (type === 'Instructional') {
        instructional.style.display = 'block';
        document.getElementById('createStructureRoomsCount').setAttribute('required', 'required');
        window.generateCreateStructureRoomInputs();
    } else if (type === 'Non-Instructional') {
        nonInstructional.style.display = 'block';
        document.getElementById('createStructurePurpose').setAttribute('required', 'required');
    } else if (type === 'Others') {
        others.style.display = 'block';
        document.getElementById('createStructureFunction').setAttribute('required', 'required');
    }
}

window.showCreateAddStructureForm = function() {
    document.getElementById('createAddStructureForm').style.display = 'block';
    document.getElementById('showCreateAddStructureBtn').style.display = 'none';
}

window.hideCreateAddStructureForm = function() {
    resetCreateStructureForm();
    document.getElementById('createAddStructureForm').style.display = 'none';
    document.getElementById('showCreateAddStructureBtn').style.display = 'block';
}

window.handleAddCreateStructure = function() {
    const structure = getCreateStructureFormData();

    if (!structure) return;

    createBuildingStructures.push({
        ...structure,
        tempId: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`
    });

    window.hideCreateAddStructureForm();
    renderCreateStructures();
}

window.removeCreateStructure = function(tempId) {
    createBuildingStructures = createBuildingStructures.filter(structure => structure.tempId !== tempId);
    renderCreateStructures();
}

// ==========================================
// RENDER STRUCTURES
// ==========================================
function renderStructures(structures) {
    structuresList.innerHTML = '';

    if (structures.length === 0) {
        noStructuresState.style.display = 'block';
        return;
    }

    noStructuresState.style.display = 'none';

    structures.forEach(structure => {
        const structureEl = document.createElement('div');
        structureEl.className = 'structure-item';
        structureEl.style.padding = '10px';
        structureEl.style.background = '#fff';
        structureEl.style.border = '1px solid #eee';
        structureEl.style.borderRadius = '6px';
        structureEl.style.marginBottom = '8px';
        structureEl.style.display = 'flex';
        structureEl.style.justifyContent = 'space-between';
        structureEl.style.alignItems = 'center';

        let detailsHtml = '';
        let badgeClass = 'others';

        if (structure.type === 'Instructional') {
            badgeClass = 'instructional';
            detailsHtml = `<span>Rooms: ${structure.number_of_rooms} (${escapeHtml(structure.room_names)})</span>`;
        } else if (structure.type === 'Non-Instructional') {
            badgeClass = 'non-instructional';
            detailsHtml = `<span>Purpose: ${escapeHtml(structure.purpose)}</span>`;
        } else if (structure.type === 'Others') {
            badgeClass = 'others';
            detailsHtml = `<span>Function: ${escapeHtml(structure.function)}</span>`;
        }

        structureEl.innerHTML = `
            <div>
                <span class="item-type-badge ${badgeClass}" style="padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600;">${structure.type}</span>
                <div style="margin-top: 5px; font-size: 13px;">
                    ${detailsHtml}
                </div>
            </div>
            <div style="display: flex; gap: 10px;">
                <button onclick="window.openViewStructureModal('${structure.id}')" style="background: none; border: none; color: var(--brand-primary); cursor: pointer;" title="View Details">
                    <i class="fa-solid fa-eye"></i>
                </button>
                <button onclick="window.handleDeleteStructure('${structure.id}')" style="background: none; border: none; color: #ff4d4d; cursor: pointer;" title="Delete">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;

        structuresList.appendChild(structureEl);
    });
}

// ==========================================
// CRUD OPERATIONS
// ==========================================
window.handleCreateBuilding = async function(event) {
    event.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;

    const data = getBuildingFormData();

    try {
        const { data: building, error } = await supabase
            .from('buildings')
            .insert([data])
            .select('id')
            .single();

        if (error) throw error;

        if (createBuildingStructures.length > 0) {
            const structures = createBuildingStructures.map(({ tempId, ...structure }) => ({
                ...structure,
                building_id: building.id
            }));
            const { error: structuresError } = await supabase
                .from('structures')
                .insert(structures);

            if (structuresError) throw structuresError;
        }

        showNotification('Building created successfully!');
        window.closeCreateBuildingModal();
        fetchBuildings();
    } catch (error) {
        console.error('Error creating building:', error);
        showNotification('Failed to create building.', 'error');
    } finally {
        isSubmitting = false;
    }
}

window.handleEditBuilding = async function(event) {
    event.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;

    const id = editBuildingId.value;
    const data = getBuildingFormData('edit');

    try {
        const { error } = await supabase
            .from('buildings')
            .update(data)
            .eq('id', id);

        if (error) throw error;

        showNotification('Building updated successfully!');
        window.closeEditBuildingModal();
        fetchBuildings();
    } catch (error) {
        console.error('Error updating building:', error);
        showNotification('Failed to update building.', 'error');
    } finally {
        isSubmitting = false;
    }
}

window.handleDeleteBuilding = async function() {
    const id = editBuildingId.value;
    if (!confirm('Are you sure you want to delete this building? All associated structures will be deleted.')) {
        return;
    }

    if (isSubmitting) return;
    isSubmitting = true;

    try {
        const { error } = await supabase
            .from('buildings')
            .delete()
            .eq('id', id);

        if (error) throw error;

        showNotification('Building deleted successfully!');
        window.closeEditBuildingModal();
        fetchBuildings();
    } catch (error) {
        console.error('Error deleting building:', error);
        showNotification('Failed to delete building.', 'error');
    } finally {
        isSubmitting = false;
    }
}

window.handleAddStructure = async function(event) {
    event.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;

    const type = document.getElementById('structureType').value;
    const data = {
        building_id: currentBuildingId,
        type: type
    };

    if (type === 'Instructional') {
        data.number_of_rooms = parseInt(document.getElementById('structureRoomsCount').value, 10);
        
        const roomInputs = document.querySelectorAll('.room-name-input');
        const names = [];
        roomInputs.forEach(input => {
            if (input.value.trim()) {
                names.push(input.value.trim());
            }
        });
        data.room_names = names.join(', ');
    } else if (type === 'Non-Instructional') {
        data.purpose = document.getElementById('structurePurpose').value.trim();
    } else if (type === 'Others') {
        data.function = document.getElementById('structureFunction').value.trim();
    }

    try {
        const { error } = await supabase
            .from('structures')
            .insert([data]);

        if (error) throw error;

        showNotification('Structure added successfully!');
        window.hideAddStructureForm();
        
        // Refresh buildings to get updated structures
        await fetchBuildings();
        
        // Re-open details modal to show updated list
        const updatedBuilding = allBuildings.find(b => b.id === currentBuildingId);
        if (updatedBuilding) {
            renderStructures(updatedBuilding.structures || []);
        }

    } catch (error) {
        console.error('Error adding structure:', error);
        showNotification('Failed to add structure.', 'error');
    } finally {
        isSubmitting = false;
    }
}

window.handleDeleteStructure = async function(structureId) {
    if (!confirm('Are you sure you want to delete this structure?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('structures')
            .delete()
            .eq('id', structureId);

        if (error) throw error;

        showNotification('Structure deleted successfully!');
        
        // Refresh buildings
        await fetchBuildings();
        
        // Re-open details modal to show updated list
        const updatedBuilding = allBuildings.find(b => b.id === currentBuildingId);
        if (updatedBuilding) {
            renderStructures(updatedBuilding.structures || []);
        }

    } catch (error) {
        console.error('Error deleting structure:', error);
        showNotification('Failed to delete structure.', 'error');
    }
}

window.exportBuildingToExcel = function() {
    const building = allBuildings.find(b => b.id === currentBuildingId);
    if (!building) {
        showNotification('No building selected.', 'error');
        return;
    }

    const structures = building.structures || [];
    
    if (structures.length === 0) {
        showNotification('No structures to export.', 'warning');
        return;
    }

    // Format data for Excel
    const data = structures.map(structure => {
        const row = {
            'Building Name': building.name,
            'Building Number': building.building_number || '',
            'Structure Number': building.structure_number || '',
            'Description': building.description || '',
            'Number of Storeys': building.number_of_storeys ?? '',
            'Building Number of Rooms': building.number_of_rooms ?? '',
            'Usage': building.usage || '',
            'Property Number': building.property_number || '',
            'Fund Source': building.fund_source || '',
            'Acquisition Cost': building.acquisition_cost ?? '',
            'Acquisition Date': building.acquisition_date || '',
            'Structure Type': structure.type,
            'Number of Rooms': '',
            'Room Names': '',
            'Purpose': '',
            'Function': ''
        };

        if (structure.type === 'Instructional') {
            row['Number of Rooms'] = structure.number_of_rooms || '';
            row['Room Names'] = structure.room_names || '';
        } else if (structure.type === 'Non-Instructional') {
            row['Purpose'] = structure.purpose || '';
        } else if (structure.type === 'Others') {
            row['Function'] = structure.function || '';
        }

        return row;
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Structures');

    // Generate file name
    const fileName = `${building.name.replace(/[^a-zA-Z0-9]/g, '_')}_structures.xlsx`;

    // Save file
    XLSX.writeFile(workbook, fileName);
    
    showNotification('Excel file generated successfully!');
}

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
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getBuildingFormData(mode = 'create') {
    const fields = mode === 'edit'
        ? {
            name: 'editBuildingName',
            description: 'editBuildingDescription',
            buildingNumber: 'editBuildingNumber',
            structureNumber: 'editStructureNumber',
            numberOfStoreys: 'editNumberOfStoreys',
            numberOfRooms: 'editNumberOfRooms',
            propertyNumber: 'editPropertyNumber',
            fundSource: 'editFundSource',
            acquisitionCost: 'editAcquisitionCost',
            acquisitionDate: 'editAcquisitionDate'
        }
        : {
            name: 'buildingName',
            description: 'buildingDescription',
            buildingNumber: 'buildingNumber',
            structureNumber: 'structureNumber',
            numberOfStoreys: 'numberOfStoreys',
            numberOfRooms: 'numberOfRooms',
            propertyNumber: 'propertyNumber',
            fundSource: 'fundSource',
            acquisitionCost: 'acquisitionCost',
            acquisitionDate: 'acquisitionDate'
        };
    const getValue = (fieldKey) => {
        const element = document.getElementById(fields[fieldKey]);
        return element ? element.value.trim() : '';
    };
    const getNumber = (fieldKey) => {
        const value = getValue(fieldKey);
        return value === '' ? null : Number(value);
    };

    return {
        name: getValue('name'),
        description: getValue('description'),
        building_number: getValue('buildingNumber') || null,
        structure_number: getValue('structureNumber') || null,
        number_of_storeys: getNumber('numberOfStoreys'),
        number_of_rooms: getNumber('numberOfRooms'),
        usage: getRoomUsageValue(mode) || null,
        property_number: getValue('propertyNumber') || null,
        fund_source: getValue('fundSource') || null,
        acquisition_cost: getNumber('acquisitionCost'),
        acquisition_date: getValue('acquisitionDate') || null
    };
}

function getCreateStructureFormData() {
    const type = document.getElementById('createStructureType').value;

    if (!type) {
        showNotification('Please select a structure type.', 'warning');
        return null;
    }

    const data = { type };

    if (type === 'Instructional') {
        const roomsCount = parseInt(document.getElementById('createStructureRoomsCount').value, 10);
        const names = Array.from(document.querySelectorAll('.create-room-name-input'))
            .map(input => input.value.trim())
            .filter(Boolean);

        if (!roomsCount || roomsCount < 1) {
            showNotification('Please enter the number of rooms for the instructional structure.', 'warning');
            return null;
        }

        if (names.length !== roomsCount) {
            showNotification('Please enter all room names for the instructional structure.', 'warning');
            return null;
        }

        data.number_of_rooms = roomsCount;
        data.room_names = names.join(', ');
    } else if (type === 'Non-Instructional') {
        const purpose = document.getElementById('createStructurePurpose').value.trim();

        if (!purpose) {
            showNotification('Please enter the purpose for the non-instructional structure.', 'warning');
            return null;
        }

        data.purpose = purpose;
    } else if (type === 'Others') {
        const structureFunction = document.getElementById('createStructureFunction').value.trim();

        if (!structureFunction) {
            showNotification('Please enter the function for this structure.', 'warning');
            return null;
        }

        data.function = structureFunction;
    }

    return data;
}

function resetCreateStructureForm() {
    const typeInput = document.getElementById('createStructureType');
    if (typeInput) typeInput.value = '';

    const roomsCount = document.getElementById('createStructureRoomsCount');
    const roomNamesContainer = document.getElementById('createRoomNamesContainer');
    const purpose = document.getElementById('createStructurePurpose');
    const structureFunction = document.getElementById('createStructureFunction');

    if (roomsCount) roomsCount.value = '';
    if (roomNamesContainer) roomNamesContainer.innerHTML = '';
    if (purpose) purpose.value = '';
    if (structureFunction) structureFunction.value = '';

    if (roomsCount) roomsCount.removeAttribute('required');
    if (purpose) purpose.removeAttribute('required');
    if (structureFunction) structureFunction.removeAttribute('required');

    document.getElementById('createInstructionalFields').style.display = 'none';
    document.getElementById('createNonInstructionalFields').style.display = 'none';
    document.getElementById('createOthersFields').style.display = 'none';
}

function renderCreateStructures() {
    if (!createStructuresList || !noCreateStructuresState) return;

    createStructuresList.innerHTML = '';

    if (createBuildingStructures.length === 0) {
        noCreateStructuresState.style.display = 'block';
        return;
    }

    noCreateStructuresState.style.display = 'none';

    createBuildingStructures.forEach(structure => {
        const structureEl = document.createElement('div');
        structureEl.className = 'structure-item';

        let detailsHtml = '';
        let badgeClass = 'others';

        if (structure.type === 'Instructional') {
            badgeClass = 'instructional';
            detailsHtml = `<span>Rooms: ${structure.number_of_rooms}${structure.room_names ? ` (${escapeHtml(structure.room_names)})` : ''}</span>`;
        } else if (structure.type === 'Non-Instructional') {
            badgeClass = 'non-instructional';
            detailsHtml = `<span>Purpose: ${escapeHtml(structure.purpose)}</span>`;
        } else if (structure.type === 'Others') {
            badgeClass = 'others';
            detailsHtml = `<span>Function: ${escapeHtml(structure.function)}</span>`;
        }

        structureEl.innerHTML = `
            <div>
                <span class="item-type-badge ${badgeClass}">${escapeHtml(structure.type)}</span>
                <div class="structure-item-details">${detailsHtml}</div>
            </div>
            <button type="button" onclick="window.removeCreateStructure('${structure.tempId}')" class="structure-remove-btn" title="Remove Structure">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;

        createStructuresList.appendChild(structureEl);
    });
}

function generateBuildingUsageInputs(mode, initialValues = []) {
    const isEdit = mode === 'edit';
    const countInput = document.getElementById(isEdit ? 'editNumberOfRooms' : 'numberOfRooms');
    const container = document.getElementById(isEdit ? 'editBuildingUsageContainer' : 'buildingUsageContainer');

    if (!countInput || !container) return;

    const existingValues = initialValues.length > 0
        ? initialValues
        : Array.from(container.querySelectorAll('.building-room-usage-input')).map(input => input.value);
    const count = parseInt(countInput.value, 10) || 0;

    container.innerHTML = '';

    if (count <= 0) {
        container.innerHTML = '<p class="room-usage-empty">Enter the number of rooms to add usage fields.</p>';
        return;
    }

    for (let i = 1; i <= count; i++) {
        const row = document.createElement('div');
        row.className = 'room-usage-row';

        const label = document.createElement('span');
        label.textContent = `Room ${i}`;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-input building-room-usage-input';
        input.placeholder = 'e.g., Classroom, Office, Storage';
        input.value = existingValues[i - 1] || '';
        input.dataset.roomNumber = String(i);

        row.appendChild(label);
        row.appendChild(input);
        container.appendChild(row);
    }
}

function getRoomUsageValue(mode) {
    const selector = mode === 'edit'
        ? '#editBuildingUsageContainer .building-room-usage-input'
        : '#buildingUsageContainer .building-room-usage-input';
    const usages = Array.from(document.querySelectorAll(selector))
        .map((input, index) => {
            const value = input.value.trim();
            return value ? `Room ${index + 1}: ${value}` : '';
        })
        .filter(Boolean);

    return usages.join('; ');
}

function parseRoomUsages(usage) {
    if (!usage) return [];

    const roomPattern = /^Room\s+\d+:\s*/i;
    const parts = usage.split(';').map(part => part.trim()).filter(Boolean);

    if (parts.length === 0) return [];
    if (!parts.some(part => roomPattern.test(part))) return [usage];

    return parts.map(part => part.replace(roomPattern, '').trim());
}

function renderBuildingMetadata(building) {
    if (!detailBuildingMetadata) return;

    const details = [
        ['Description', building.description],
        ['Building Number', building.building_number],
        ['Structure Number', building.structure_number],
        ['Number of Storeys', building.number_of_storeys],
        ['Number of Rooms', building.number_of_rooms],
        ['Usage', building.usage],
        ['Property Number', building.property_number],
        ['Fund Source', building.fund_source],
        ['Acquisition Cost', formatCurrency(building.acquisition_cost)],
        ['Acquisition Date', formatDate(building.acquisition_date)]
    ];

    detailBuildingMetadata.innerHTML = details
        .map(([label, value]) => `
            <div class="building-metadata-item">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(value === null || value === undefined || value === '' ? '-' : String(value))}</strong>
            </div>
        `)
        .join('');
}

function formatCurrency(value) {
    if (value === null || value === undefined || value === '') return '';
    return Number(value).toLocaleString('en-PH', {
        style: 'currency',
        currency: 'PHP'
    });
}

function formatDate(value) {
    if (!value) return '';
    return new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Expose fetchBuildings to window
window.fetchBuildings = fetchBuildings;
