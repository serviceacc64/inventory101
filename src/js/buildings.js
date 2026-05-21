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

// Building Details Modal Elements
const buildingDetailsModal = document.getElementById('buildingDetailsModal');
const buildingDetailsTitle = document.getElementById('buildingDetailsTitle');
const detailBuildingName = document.getElementById('detailBuildingName');
const detailBuildingDescription = document.getElementById('detailBuildingDescription');
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

// State
let allBuildings = [];
let currentBuildingId = null;
let isSubmitting = false;

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
            (building.description && building.description.toLowerCase().includes(searchTerm))
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
                ${building.description ? `<p class="room-adviser"><i class="fa-solid fa-info-circle"></i> ${escapeHtml(building.description)}</p>` : '<p class="room-adviser">No description</p>'}
            </div>

            <div class="room-stats">
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
    detailBuildingDescription.textContent = building.description || 'No description';

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

    const name = document.getElementById('buildingName').value.trim();
    const description = document.getElementById('buildingDescription').value.trim();

    try {
        const { error } = await supabase
            .from('buildings')
            .insert([{ name, description }]);

        if (error) throw error;

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
    const name = editBuildingName.value.trim();
    const description = editBuildingDescription.value.trim();

    try {
        const { error } = await supabase
            .from('buildings')
            .update({ name, description })
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
            'Description': building.description || '',
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

// Expose fetchBuildings to window
window.fetchBuildings = fetchBuildings;
