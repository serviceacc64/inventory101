
# Supabase Implementation Guide for input.html

This guide provides step-by-step instructions to update the Items Page (input.html) to work with Supabase.

---

## Step 1: Fix supabase.js (Add Missing Import)

**File:** `src/js/supabase.js`

**Problem:** The file uses `createClient` but never imports it.

**Action:** Add this import line at the very top of the file:

```javascript
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
```

**Full file should look like:**
```javascript
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'

const supabaseUrl = 'https://qgiptrexxrqkrwytegdn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnaXB0cmV4eHJxa3J3eXRlZ2RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NTQ3MzQsImV4cCI6MjA4NjUzMDczNH0.Fuyw8d2lSlFgvkg_dZ_qgevtfGjWTMcgPG_W4eU1L2s'

export const supabase = createClient(supabaseUrl, supabaseKey)
```

**Why:** This imports the Supabase client library from a CDN. The `@2` means version 2 of the library.

---

## Step 2: Add Supabase Import to input.html

**File:** `src/pages/input.html`

**Where:** In the `<head>` section, after the existing scripts

**Add:**
```html
<!-- Supabase Client -->
<script type="module" src="../js/supabase.js"></script>
```

**Why:** The `type="module"` is required because we're using ES6 module imports in supabase.js.

---

## Step 3: Replace Static Items with Dynamic Container

**File:** `src/pages/input.html`

**Find and Replace:** Locate this entire section (around line 67-108):
```html
<section class="recent-activity">
    <h2>All Items</h2>
    <div class="activity-list">
        <!-- All the static activity-item divs -->
        <div class="activity-item">...</div>
        <div class="activity-item">...</div>
        ...
    </div>
</section>
```

**Replace With:**
```html
<section class="recent-activity">
    <h2>All Items</h2>
    
    <!-- Loading State -->
    <div id="loadingState" class="loading-state" style="display: none;">
        <i class="fa-solid fa-spinner fa-spin"></i> Loading items...
    </div>
    
    <!-- Error State -->
    <div id="errorState" class="error-state" style="display: none; color: #f44336; padding: 20px;">
        <i class="fa-solid fa-exclamation-circle"></i> <span id="errorMessage">Failed to load items</span>
    </div>
    
    <!-- Empty State -->
    <div id="emptyState" class="empty-state" style="display: none; padding: 20px; text-align: center; color: #666;">
        <i class="fa-solid fa-box-open" style="font-size: 48px; margin-bottom: 10px;"></i>
        <p>No items found. Click "Add Item" to create your first item.</p>
    </div>
    
    <!-- Dynamic Items Container -->
    <div id="itemsContainer" class="activity-list">
        <!-- Items will be rendered here dynamically -->
    </div>
</section>
```

**Why:** 
- `#loadingState` - Shows while fetching from Supabase
- `#errorState` - Displays if the Supabase call fails
- `#emptyState` - Shows when no items exist in database
- `#itemsContainer` - Where JavaScript will inject the item HTML

---

## Step 4: Add "Add Item" Modal HTML

**File:** `src/pages/input.html`

**Where:** Add this BEFORE the closing `</body>` tag (after all existing content)

**Add:**
```html
<!-- Add Item Modal -->
<div id="addItemModal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center;">
    <div class="modal-content" style="background: white; padding: 30px; border-radius: 8px; width: 90%; max-width: 500px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3>Add New Item</h3>
            <button onclick="closeAddModal()" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
        </div>
        
        <form id="addItemForm" onsubmit="handleAddItem(event)">
            <div class="form-group" style="margin-bottom: 15px;">
                <label for="itemName" style="display: block; margin-bottom: 5px; font-weight: 500;">Item Name *</label>
                <input type="text" id="itemName" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;" placeholder="e.g., Ballpoint Pens">
            </div>
            
            <div class="form-group" style="margin-bottom: 15px;">
                <label for="itemLabel" style="display: block; margin-bottom: 5px; font-weight: 500;">Label/Description</label>
                <input type="text" id="itemLabel" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;" placeholder="e.g., Pack of 50">
            </div>
            
            <div class="form-group" style="margin-bottom: 20px;">
                <label for="itemQuantity" style="display: block; margin-bottom: 5px; font-weight: 500;">Initial Quantity *</label>
                <input type="number" id="itemQuantity" required min="0" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;" placeholder="e.g., 100">
            </div>
            
            <div class="form-actions" style="display: flex; gap: 10px; justify-content: flex-end;">
                <button type="button" onclick="closeAddModal()" class="btn btn-secondary">Cancel</button>
                <button type="submit" class="btn btn-primary">
                    <i class="fa-solid fa-plus"></i> Add Item
                </button>
            </div>
        </form>
    </div>
</div>
```

**Why:** This creates a popup modal with a form to add new items. It includes:
- Item Name (required)
- Label/Description (optional)
- Initial Quantity (required, must be 0 or more)

---

## Step 5: Update the "Add Item" Button

**File:** `src/pages/input.html`

**Find:** The "Add Item" button (around line 52):
```html
<button class="btn btn-primary"><i class="fa-solid fa-plus"></i> Add Item</button>
```

**Change To:**
```html
<button class="btn btn-primary" onclick="openAddModal()"><i class="fa-solid fa-plus"></i> Add Item</button>
```

**Why:** This connects the button click to open the modal.

---

## Step 6: Add JavaScript Functions

**File:** `src/pages/input.html`

**Where:** Replace the entire existing `<script>` section at the bottom with this comprehensive script:

```html
<script type="module">
    // Import Supabase client
    import { supabase } from '../js/supabase.js';
    
    // DOM Elements
    const itemsContainer = document.getElementById('itemsContainer');
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const emptyState = document.getElementById('emptyState');
    const addItemModal = document.getElementById('addItemModal');
    const itemSearch = document.getElementById('itemSearch');
    const clearSearch = document.getElementById('clearSearch');
    
    // Store all items for search functionality
    let allItems = [];
    
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
            } else {
                emptyState.style.display = 'none';
            }
            
        } catch (error) {
            console.error('Error fetching items:', error);
            showError('Failed to load items. Please try again.');
        } finally {
            showLoading(false);
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
            let iconBg = '';
            
            if (item.quantity <= 0) {
                statusClass = 'activity-badge removed';
                statusText = 'Out of Stock';
                iconBg = 'background-color: rgba(244, 67, 54, 0.2); color: #f44336;';
            } else if (item.quantity < 20) {
                statusClass = 'activity-badge removed';
                statusText = 'Low Stock';
                iconBg = 'background-color: rgba(255, 152, 0, 0.2); color: #ff9800;';
            }
            
            // Format date
            const updatedAt = item.updated_at 
                ? new Date(item.updated_at).toLocaleDateString() 
                : 'Recently';
            
            itemEl.innerHTML = `
                <div class="stat-icon" style="width: 50px; height: 50px; ${iconBg}">
                    <i class="fa-solid fa-box"></i>
                </div>
                <div class="activity-details">
                    <p>${escapeHtml(item.name)} ${item.label ? '- ' + escapeHtml(item.label) : ''}</p>
                    <small>Stock: <span class="quantity-display">${item.quantity}</span> units | Last updated: ${updatedAt}</small>
                    <div class="quantity-edit" style="display: none; margin-top: 10px;">
                        <input type="number" class="quantity-input" value="${item.quantity}" min="0" style="width: 80px; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
                        <button onclick="saveQuantity('${item.id}')" class="btn btn-primary" style="padding: 5px 10px; margin-left: 5px; font-size: 12px;">Save</button>
                        <button onclick="cancelEdit('${item.id}')" class="btn btn-secondary" style="padding: 5px 10px; margin-left: 5px; font-size: 12px;">Cancel</button>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <span class="${statusClass}">${statusText}</span>
                    <button onclick="editQuantity('${item.id}')" class="btn btn-secondary" style="padding: 5px 10px; font-size: 12px;" title="Edit Quantity">
                        <i class="fa-solid fa-edit"></i>
                    </button>
                    <button onclick="deleteItem('${item.id}')" class="btn btn-secondary" style="padding: 5px 10px; font-size: 12px; color: #f44336;" title="Delete Item">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
            
            itemsContainer.appendChild(itemEl);
        });
    }
    
    // ==========================================
    // 3. ADD NEW ITEM TO SUPABASE
    // ==========================================
    async function handleAddItem(event) {
        event.preventDefault();
        
        const name = document.getElementById('itemName').value.trim();
        const label = document.getElementById('itemLabel').value.trim();
        const quantity = parseInt(document.getElementById('itemQuantity').value);
        
        if (!name || isNaN(quantity)) {
            alert('Please fill in all required fields');
            return;
        }
        
        try {
            const { data, error } = await supabase
                .from('items')
                .insert([{ 
                    name: name, 
                    label: label, 
                    quantity: quantity 
                }])
                .select();
            
            if (error) throw error;
            
            // Close modal and reset form
            closeAddModal();
            document.getElementById('addItemForm').reset();
            
            // Refresh items list
            await fetchItems();
            
            alert('Item added successfully!');
            
        } catch (error) {
            console.error('Error adding item:', error);
            alert('Failed to add item. Please try again.');
        }
    }
    
    // ==========================================
    // 4. UPDATE ITEM QUANTITY
    // ==========================================
    async function saveQuantity(itemId) {
        const itemEl = document.querySelector(`[data-item-id="${itemId}"]`);
        const newQuantity = parseInt(itemEl.querySelector('.quantity-input').value);
        
        if (isNaN(newQuantity) || newQuantity < 0) {
            alert('Please enter a valid quantity');
            return;
        }
        
        try {
            const { error } = await supabase
                .from('items')
                .update({ 
                    quantity: newQuantity,
                    updated_at: new Date().toISOString()
                })
                .eq('id', itemId);
            
            if (error) throw error;
            
            // Refresh the list to show updated data
            await fetchItems();
            
        } catch (error) {
            console.error('Error updating quantity:', error);
            alert('Failed to update quantity. Please try again.');
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
            const { error } = await supabase
                .from('items')
                .delete()
                .eq('id', itemId);
            
            if (error) throw error;
            
            await fetchItems();
            alert('Item deleted successfully!');
            
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Failed to delete item. Please try again.');
        }
    }
    
    // ==========================================
    // 6. UI HELPER FUNCTIONS
    // ==========================================
    function openAddModal() {
        addItemModal.style.display = 'flex';
    }
    
    function closeAddModal() {
        addItemModal.style.display = 'none';
    }
    
    function showLoading(show) {
        loadingState.style.display = show ? 'block' : 'none';
        itemsContainer.style.display = show ? 'none' : 'block';
    }
    
    function showError(message) {
        errorState.style.display = 'block';
        document.getElementById('errorMessage').textContent = message;
        itemsContainer.style.display = 'none';
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
    // 7. EDIT QUANTITY UI FUNCTIONS
    // ==========================================
    window.editQuantity = function(itemId) {
        const itemEl = document.querySelector(`[data-item-id="${itemId}"]`);
        itemEl.querySelector('.quantity-edit').style.display = 'block';
    };
    
    window.cancelEdit = function(itemId) {
        const itemEl = document.querySelector(`[data-item-id="${itemId}"]`);
        itemEl.querySelector('.quantity-edit').style.display = 'none';
    };
    
    // Make functions available globally for onclick handlers
    window.openAddModal = openAddModal;
    window.closeAddModal = closeAddModal;
    window.handleAddItem = handleAddItem;
    window.saveQuantity = saveQuantity;
    window.deleteItem = deleteItem;
    
    // ==========================================
    // 8. SEARCH FUNCTIONALITY
    // ==========================================
    function filterItems() {
        const query = itemSearch.value.trim().toLowerCase();
        
        const filtered = allItems.filter(item => {
            const searchText = (item.name + ' ' + (item.label || '')).toLowerCase();
            return searchText.includes(query);
        });
        
        renderItems(filtered);
    }
    
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
    
    // ==========================================
    // 9. INITIALIZE - LOAD ITEMS ON PAGE LOAD
    // ==========================================
    fetchItems();
    
    // Close modal when clicking outside
    addItemModal.addEventListener('click', function(e) {
        if (e.target === addItemModal) {
            closeAddModal();
        }
    });
</script>
```

---

## How Each Function Works

### `fetchItems()`
- **What it does:** Queries Supabase `items` table, gets all records ordered by creation date
- **Supabase call:** `supabase.from('items').select('*').order('created_at', { ascending: false })`
- **Error handling:** Catches errors and shows error message
- **Result:** Stores items in `allItems` array and calls `renderItems()`

### `renderItems(items)`
- **What it does:** Creates HTML for each item and injects it into the container
- **Features:**
  - Shows different status badges (In Stock, Low Stock, Out of Stock)
  - Formats the updated date
  - Adds Edit and Delete buttons
  - Includes hidden quantity edit form

### `handleAddItem(event)`
- **What it does:** Handles form submission from the modal
- **Supabase call:** `supabase.from('items').insert([{ name, label, quantity }])`
- **Validation:** Checks required fields
- **After success:** Closes modal, resets form, refreshes list

### `saveQuantity(itemId)`
- **What it does:** Updates the quantity of an existing item
- **Supabase call:** `supabase.from('items').update({ quantity, updated_at }).eq('id', itemId)`
- **Note:** Updates `updated_at` timestamp automatically

### `deleteItem(itemId)`
- **What it does:** Removes an item from the database
- **Supabase call:** `supabase.from('items').delete().eq('id', itemId)`
- **Safety:** Shows confirmation dialog first

---

## Step 7: Ensure Database Table Exists

**Important:** Before testing, make sure your Supabase project has the `items` table created. Run this SQL in your Supabase SQL Editor:

```sql
CREATE TABLE items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  label TEXT,
  quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (for development)
CREATE POLICY "Enable all access for items" ON items FOR ALL USING (true) WITH CHECK (true);
```

---

## Summary of All Changes

| File | Changes |
|------|---------|
| `src/js/supabase.js` | Add import statement at top |
| `src/pages/input.html` | 1. Add Supabase script import<br>2. Replace static items with dynamic container<br>3. Add modal HTML<br>4. Update "Add Item" button<br>5. Replace script with comprehensive JavaScript |

---

## Testing Checklist

After implementing, test these features:
- [ ] Page loads and shows items from Supabase
- [ ] Click "Add Item" button opens modal
- [ ] Can add new item with name, label, quantity
- [ ] New item appears in list after adding
- [ ] Click "Edit" button shows quantity input
- [ ] Can update quantity and save
- [ ] Quantity updates in database and UI
- [ ] Click "Delete" button removes item (with confirmation)
- [ ] Search box filters items
- [ ] Loading state shows while fetching
- [ ] Error state shows if Supabase fails
