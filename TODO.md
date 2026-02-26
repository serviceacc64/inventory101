# TODO: Add Supplier Functionality to Equipment

## Plan Summary:
- Add a suppliers table in the database
- Add a dropdown in equipment form to select from existing suppliers
- Add option to create new supplier at the bottom of dropdown

## Tasks Completed:

### 1. Database Setup ✅
- [x] Update supabase_setup_equipment.sql - Add suppliers table
- [x] Update supabase_setup_equipment.sql - Add supplier_id column to equipment table

### 2. HTML Updates (equipment.html) ✅
- [x] Add Supplier dropdown to Create Equipment Modal
- [x] Add Supplier dropdown to Edit Equipment Modal
- [x] Add Supplier column to equipment table header
- [x] Add Supplier Modal for creating new suppliers

### 3. JavaScript Updates (equipment.js) ✅
- [x] Add function to fetch suppliers from database
- [x] Add function to render supplier dropdown
- [x] Add function to create new supplier
- [x] Update handleCreateEquipment() to include supplier_id
- [x] Update handleEditEquipment() to include supplier_id
- [x] Update renderEquipment() to display supplier column
- [x] Update openEditEquipmentModal() to populate supplier field

### 4. CSS Updates (equipment.css) ✅
- [x] Add styles for supplier dropdown container
- [x] Add styles for supplier column in table
