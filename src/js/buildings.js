// Import Supabase client
import { supabase } from './supabase.js';
// animation helpers
import { showNotification, pulseElement, fadeIn } from './animate.js';

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
const buildingNameInput = document.getElementById('buildingName');
const buildingDescriptionInput = document.getElementById('buildingDescription');

// Building Details Modal Elements
const buildingDetailsModal = document.getElementById('buildingDetailsModal');
const buildingDetailsTitle = document.getElementById('buildingDetailsTitle');
const detailBuildingName = document.getElementById('detailBuildingName');
const detailBuildingDescription = document.getElementById('detailBuildingDescription');
const excelBuildingIdInput = document.getElementById('excelBuildingId');
const noExcelState = document.getElementById('noExcelState');
const hasExcelState = document.getElementById('hasExcelState');
const excelFileName = document.getElementById('excelFileName');
const excelUploadDate = document.getElementById('excelUploadDate');
const downloadExcelBtn = document.getElementById('downloadExcelBtn');
const removeExcelBtn = document.getElementById('removeExcelBtn');
const selectedFileName = document.getElementById('selectedFileName');

// Edit Building Modal Elements
const editBuildingModal = document.getElementById('editBuildingModal');
const editBuildingForm = document.getElementById('editBuildingForm');
const editBuildingId = document.getElementById('editBuildingId');
const editBuildingName = document.getElementById('editBuildingName');
const editBuildingDescription = document.getElementById('editBuildingDescription');
const editBuildingLocation = document.getElementById('editBuildingLocation');
const editBuildingAccountable = document.getElementById('editBuildingAccountable');

// State
let allBuildings = [];
let currentBuildingId = null;
let selectedFile = null;
let currentExcelPath = null;
let isSubmitting = false;
let isRendering = false;
let searchTimeout = null;

// Pagination state
let currentPage = 1;
const itemsPerPage = 16;
let filteredBuildings = [];
let totalPages = 1;

// Storage bucket name
const STORAGE_BUCKET = 'buildings';


// ==========================================
// INITIALIZE
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    fetchBuildings();
    setupEventListeners();
});

function setupEventListeners() {
    // Search with debounce
    if (buildingSearch) {
        buildingSearch.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            
            searchTimeout = setTimeout(() => {
                applyFilters();
            }, 300);
        });
    }

    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            clearTimeout(searchTimeout);
            buildingSearch.value = '';
            applyFilters();
        });
    }

    // Create building form
    if (createBuildingForm) {
        createBuildingForm.addEventListener('submit', window.handleCreateBuilding);
    }

    // Edit building form
    if (editBuildingForm) {
        editBuildingForm.addEventListener('submit', window.handleEditBuilding);
    }
}

// ==========================================
// FILTER FUNCTIONS
// ==========================================
function applyFilters() {
    const searchTerm = buildingSearch ? buildingSearch.value.toLowerCase().trim() : '';

    // Start with all buildings
    let filtered = [...allBuildings];

    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(building =>
            building.name.toLowerCase().includes(searchTerm) ||
            (building.location && building.location.toLowerCase().includes(searchTerm)) ||
            (building.accountable && building.accountable.toLowerCase().includes(searchTerm)) ||
            (building.description && building.description.toLowerCase().includes(searchTerm))
        );
    }

    // Sort by name (alphabetically A-Z)
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    // Update filtered buildings and reset pagination
    filteredBuildings = filtered;
    currentPage = 1;
    totalPages = Math.ceil(filteredBuildings.length / itemsPerPage);

    renderBuildings(filteredBuildings);
}

// ==========================================
// FETCH DATA
// ==========================================
async function fetchBuildings() {
    showLoading(true);
    hideError();

    try {
        const { data: buildings, error } = await supabase
            .from('buildings')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allBuildings = buildings || [];
        
        // Apply filters on initial load
        applyFilters();

        if (allBuildings.length === 0) {
            emptyState.style.display = 'block';
            buildingsContainer.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            buildingsContainer.style.display = 'grid';
        }
    } catch (error) {
        console.error('Error fetching buildings:', error);
        showError('Failed to load buildings. Please try again.');
    } finally {
        showLoading(false);
    }
}


// ==========================================
// RENDER BUILDINGS
// ==========================================
function renderBuildings(buildings) {
    // Prevent concurrent renders
    if (isRendering) return;
    isRendering = true;

    try {
        // Calculate pagination
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedBuildings = buildings.slice(startIndex, endIndex);

        // Show/hide pagination controls
        const paginationContainer = document.getElementById('paginationContainer');
        if (buildings.length > itemsPerPage) {
            paginationContainer.style.display = 'flex';
            updatePaginationControls();
        } else {
            paginationContainer.style.display = 'none';
        }

        buildingsContainer.innerHTML = '';

        for (const building of paginatedBuildings) {
            const buildingEl = document.createElement('div');
            buildingEl.className = 'room-card';
            buildingEl.dataset.buildingId = building.id;

            // Check if building has Excel file (using excel_path instead of excel_data)
            const hasExcel = building.excel_path && building.excel_path.length > 0;
            const excelBadge = hasExcel 
                ? '<span class="item-type-badge inventory"><i class="fa-solid fa-file-excel"></i> Excel</span>'
                : '<span class="item-type-badge custom">No Excel</span>';

            buildingEl.innerHTML = `
                <div class="room-header">
                    <h3 class="room-name">${escapeHtml(building.name)}</h3>
                    <div class="room-actions">
                        <button onclick="window.openEditBuildingModalFromCard('${building.id}')" title="Edit Building">
                            <i class="fa-solid fa-edit"></i>
                        </button>
                    </div>
                </div>

                ${building.location || building.description || building.accountable ? `
                    <div class="room-info">
                        ${building.location ? `<p class="room-address"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(building.location)}</p>` : ''}
                        ${building.accountable ? `<p class="room-accountable"><i class="fa-solid fa-user"></i> ${escapeHtml(building.accountable)}</p>` : ''}
                        ${building.description ? `<p class="room-adviser"><i class="fa-solid fa-info-circle"></i> ${escapeHtml(building.description)}</p>` : ''}
                    </div>
                ` : ''}

                <div class="room-stats">
                    <div class="room-stat">
                        <span class="room-stat-value">${hasExcel ? '<i class="fa-solid fa-check" style="color: #217346;"></i>' : '<i class="fa-solid fa-times" style="color: #999;"></i>'}</span>
                        <span class="room-stat-label">Excel File</span>
                    </div>
                </div>

                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">
                    ${excelBadge}
                </div>

                <button onclick="window.openBuildingDetailsModal('${building.id}')" class="view-room-btn">
                    <i class="fa-solid fa-eye"></i> View Details
                </button>
            `;

            buildingsContainer.appendChild(buildingEl);
            fadeIn(buildingEl);
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
        renderBuildings(filteredBuildings);
        buildingsContainer.scrollIntoView({ behavior: 'smooth' });
    }
}

window.nextPage = function() {
    if (currentPage < totalPages) {
        currentPage++;
        renderBuildings(filteredBuildings);
        buildingsContainer.scrollIntoView({ behavior: 'smooth' });
    }
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

window.openBuildingDetailsModal = async function(buildingId) {
    currentBuildingId = buildingId;
    const building = allBuildings.find(b => b.id === buildingId);
    
    if (building) {
        buildingDetailsTitle.textContent = `${building.name} - Details`;
        detailBuildingName.textContent = building.name;
        detailBuildingDescription.textContent = building.description || '-';
        excelBuildingIdInput.value = building.id;
        
        // Store current Excel path
        currentExcelPath = building.excel_path || null;

        // Update Excel status
        updateExcelStatus(building);
    }

    buildingDetailsModal.classList.add('show');
};

function updateExcelStatus(building) {
    const hasExcel = building.excel_path && building.excel_path.length > 0;
    
    if (hasExcel) {
        noExcelState.style.display = 'none';
        hasExcelState.style.display = 'block';
        downloadExcelBtn.style.display = 'inline-flex';
        removeExcelBtn.style.display = 'inline-flex';
        
        excelFileName.textContent = building.excel_file_name || 'building_data.xlsx';
        
        if (building.excel_uploaded_at) {
            const uploadDate = new Date(building.excel_uploaded_at);
            excelUploadDate.textContent = `Uploaded: ${uploadDate.toLocaleDateString()} ${uploadDate.toLocaleTimeString()}`;
        } else {
            excelUploadDate.textContent = 'Uploaded: Unknown';
        }
    } else {
        noExcelState.style.display = 'block';
        hasExcelState.style.display = 'none';
        downloadExcelBtn.style.display = 'none';
        removeExcelBtn.style.display = 'none';
    }
    
    // Reset file input
    selectedFile = null;
    selectedFileName.textContent = '';
    document.getElementById('uploadBtnText').textContent = 'Upload Excel';
}

window.closeBuildingDetailsModal = function() {
    buildingDetailsModal.classList.remove('show');
    currentBuildingId = null;
    currentExcelPath = null;
}

window.openEditBuildingModalFromCard = function(buildingId) {
    openBuildingDetailsModal(buildingId).then(() => {
        setTimeout(() => {
            window.openEditBuildingModal();
        }, 100);
    });
}

window.openEditBuildingModal = function() {
    if (!currentBuildingId) return;
    
    const building = allBuildings.find(b => b.id === currentBuildingId);
    if (building) {
        editBuildingId.value = building.id;
        editBuildingName.value = building.name;
        editBuildingDescription.value = building.description || '';
        editBuildingLocation.value = building.location || '';
        editBuildingAccountable.value = building.accountable || '';
        editBuildingModal.classList.add('show');
    }
};

window.closeEditBuildingModal = function() {
    editBuildingModal.classList.remove('show');
}

// Close modals when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === createBuildingModal) window.closeCreateBuildingModal();
    if (event.target === buildingDetailsModal) window.closeBuildingDetailsModal();
    if (event.target === editBuildingModal) window.closeEditBuildingModal();
});

// ==========================================
// FILE HANDLING (Using Supabase Storage)
// ==========================================
window.handleFileSelect = function(event) {
    const file = event.target.files[0];
    if (file) {
        // Validate file type
        const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
        const validExtensions = ['.xlsx', '.xls'];
        
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        if (!validExtensions.includes(fileExtension)) {
            showError('Please select a valid Excel file (.xlsx or .xls)');
            event.target.value = '';
            return;
        }
        
        selectedFile = file;
        selectedFileName.textContent = `Selected: ${file.name}`;
        document.getElementById('uploadBtnText').textContent = 'Change File';
    }
}

window.handleUploadExcel = async function(event) {
    event.preventDefault();
    
    if (!selectedFile) {
        showError('Please select an Excel file first');
        return;
    }

    if (!currentBuildingId) {
        showError('No building selected');
        return;
    }

    if (isSubmitting) return;
    isSubmitting = true;

    try {
        // First, delete old file if exists
        if (currentExcelPath) {
            await deleteOldFile(currentExcelPath);
        }

        // Generate unique file name: buildingId_filename
        const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf('.'));
        const newFileName = `${currentBuildingId}_${Date.now()}${fileExt}`;
        const filePath = `${currentBuildingId}/${newFileName}`;

        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, selectedFile, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error('Failed to upload file to storage');
        }

        // Get public URL for the file
        const { data: urlData } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(filePath);

        // Update building with Excel file path
        const { error: updateError } = await supabase
            .from('buildings')
            .update({
                excel_path: filePath,
                excel_file_name: selectedFile.name,
                excel_uploaded_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', currentBuildingId);

        if (updateError) {
            // Try to delete the uploaded file if update fails
            await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
            throw updateError;
        }

        // Update current Excel path
        currentExcelPath = filePath;

        // Refresh data
        await fetchBuildings();
        
        // Update the current building in memory
        const updatedBuilding = allBuildings.find(b => b.id === currentBuildingId);
        if (updatedBuilding) {
            updateExcelStatus({
                ...updatedBuilding,
                excel_path: filePath,
                excel_file_name: selectedFile.name,
                excel_uploaded_at: new Date().toISOString()
            });
        }

        showNotification('Excel file uploaded successfully!');
    } catch (error) {
        console.error('Error uploading Excel file:', error);
        showError('Failed to upload Excel file. Please try again. ' + error.message);
    } finally {
        isSubmitting = false;
    }
}

// Helper function to delete old file
async function deleteOldFile(filePath) {
    try {
        await supabase.storage
            .from(STORAGE_BUCKET)
            .remove([filePath]);
    } catch (error) {
        console.warn('Failed to delete old file:', error);
    }
}

window.downloadExcel = async function() {
    if (!currentBuildingId || !currentExcelPath) return;

    try {
        // Get the file from storage
        const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .download(currentExcelPath);

        if (error) {
            console.error('Download error:', error);
            throw error;
        }

        // Get the original file name from database
        const building = allBuildings.find(b => b.id === currentBuildingId);
        const fileName = building?.excel_file_name || 'building_data.xlsx';

        // Create download link
        const url = URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showNotification('Excel file downloaded successfully!');
    } catch (error) {
        console.error('Error downloading Excel file:', error);
        showError('Failed to download Excel file. Please try again.');
    }
}

window.removeExcel = async function() {
    if (!currentBuildingId) return;
    
    if (!confirm('Are you sure you want to remove the Excel file from this building?')) {
        return;
    }

    if (isSubmitting) return;
    isSubmitting = true;

    try {
        // Delete file from storage
        if (currentExcelPath) {
            await deleteOldFile(currentExcelPath);
        }

        // Update database
        const { error } = await supabase
            .from('buildings')
            .update({
                excel_path: null,
                excel_file_name: null,
                excel_uploaded_at: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentBuildingId);

        if (error) throw error;

        // Clear current path
        currentExcelPath = null;

        // Refresh data
        await fetchBuildings();
        
        // Update the current building in memory
        const updatedBuilding = allBuildings.find(b => b.id === currentBuildingId);
        if (updatedBuilding) {
            updateExcelStatus({
                ...updatedBuilding,
                excel_path: null,
                excel_file_name: null,
                excel_uploaded_at: null
            });
        }

        showNotification('Excel file removed successfully!');
    } catch (error) {
        console.error('Error removing Excel file:', error);
        showError('Failed to remove Excel file. Please try again.');
    } finally {
        isSubmitting = false;
    }
}

// ==========================================
// CREATE BUILDING
// ==========================================
window.handleCreateBuilding = async function(event) {
    event.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;

    try {
        // Get form values
        const buildingData = {
            name: buildingNameInput.value.trim(),
            description: buildingDescriptionInput.value.trim() || null,
            created_at: new Date().toISOString()
        };

        let excelPath = null;
        let excelFileName = null;
        let excelUploadedAt = null;

        // Handle Excel file upload if selected
        const createExcelFileInput = document.getElementById('createBuildingExcel');
        const createExcelNameSpan = document.getElementById('createBuildingExcelName');
        
        if (createExcelFileInput.files.length > 0) {
            const file = createExcelFileInput.files[0];
            
            // Generate unique file name
            const fileExt = file.name.substring(file.name.lastIndexOf('.'));
            const newFileName = `new_${Date.now()}${fileExt}`;
            const filePath = `${newFileName}`;

            // Upload to storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from(STORAGE_BUCKET)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                throw new Error('Failed to upload Excel file');
            }

            excelPath = filePath;
            excelFileName = file.name;
            excelUploadedAt = new Date().toISOString();

            buildingData.excel_path = filePath;
            buildingData.excel_file_name = file.name;
            buildingData.excel_uploaded_at = excelUploadedAt;
        }

        // Create building
        const { data, error } = await supabase
            .from('buildings')
            .insert([buildingData])
            .select();

        if (error) throw error;

        createExcelFileInput.value = ''; // Clear file input
        createExcelNameSpan.textContent = 'No file selected';

        closeCreateBuildingModal();
        await fetchBuildings();
        showNotification('Building created successfully!' + (excelPath ? ' with Excel file.' : ''));
    } catch (error) {
        console.error('Error creating building:', error);
        showError('Failed to create building. Please try again. ' + error.message);
    } finally {
        isSubmitting = false;
    }
}

// ==========================================
// EDIT BUILDING
// ==========================================
window.handleEditBuilding = async function(event) {
    event.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;

    try {
        const buildingId = editBuildingId.value;

        const { error } = await supabase
            .from('buildings')
            .update({
                name: editBuildingName.value.trim(),
                description: editBuildingDescription.value.trim() || null,
                location: editBuildingLocation.value.trim() || null,
                accountable: editBuildingAccountable.value.trim() || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', buildingId);

        if (error) throw error;

        closeEditBuildingModal();
        await fetchBuildings();
        
        // Refresh building details modal if open
        if (currentBuildingId === buildingId) {
            await openBuildingDetailsModal(buildingId);
        }
        
        showNotification('Building updated successfully!');
    } catch (error) {
        console.error('Error updating building:', error);
        showError('Failed to update building. Please try again.');
    } finally {
        isSubmitting = false;
    }
}

// ==========================================
// DELETE BUILDING
// ==========================================
window.handleDeleteBuilding = async function() {
    const buildingId = editBuildingId.value;
    if (!confirm('Are you sure you want to delete this building? This cannot be undone.')) {
        return;
    }

    if (isSubmitting) return;
    isSubmitting = true;

    try {
        // Get building to check for Excel file
        const building = allBuildings.find(b => b.id === buildingId);
        
        // Delete Excel file from storage if exists
        if (building && building.excel_path) {
            await deleteOldFile(building.excel_path);
        }

        // Delete building from database
        const { error } = await supabase
            .from('buildings')
            .delete()
            .eq('id', buildingId);

        if (error) throw error;

        closeEditBuildingModal();
        closeBuildingDetailsModal();
        await fetchBuildings();
        showNotification('Building deleted successfully!');
    } catch (error) {
        console.error('Error deleting building:', error);
        showError('Failed to delete building. Please try again.');
    } finally {
        isSubmitting = false;
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

// Expose fetchBuildings to window
window.fetchBuildings = fetchBuildings;

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

