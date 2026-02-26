# Room Inventory System - Setup & Usage Guide

## Overview
The Room Inventory system allows you to track inventory items by room. For example, you can specify that "Grade 1 Classroom A" has 50 chairs, 20 tables, 5 fans, and many more items.

## 🚀 Quick Start

### Step 1: Create Database Tables
1. Log into your Supabase dashboard: https://app.supabase.com
2. Go to **SQL Editor** → **New Query**
3. Copy the content from `supabase_setup_rooms.sql` file
4. Paste and execute the SQL script
5. The `rooms` and `room_items` tables will be created automatically

### Step 2: Access the Rooms Page
- The new **Rooms** page is now available in the navigation menu
- Look for the door icon (🚪) labeled "Rooms" in the sidebar
- You can access it from any page with the navigation menu

---

## 📋 Features

### 1. **Create a New Room**
- Click the **"New Room"** button
- Enter the room name (e.g., "Grade 1 Classroom", "Library", "Gymnasium")
- Optionally add a description (e.g., "Classroom with 40 seats")
- Click **"Create Room"**

### 2. **View Room Summary**
Each room card displays:
- Room name and description
- Number of **Item Types** in the room
- **Total Items** quantity in the room
- Preview of the first 3 items
- "View Items" button for detailed management

### 3. **Manage Items in a Room**
- Click **"View Items"** on any room card
- See all items in that room with quantities
- Add new items by:
  1. Selecting an item from the dropdown
  2. Entering the quantity
  3. Clicking **"Add"**
- Update quantities by editing the number directly
- Remove items with the trash icon

### 4. **Edit a Room**
- Click the **edit icon** (✏️) on any room card
- Update room name and description
- Save changes or delete the entire room

### 5. **Search Rooms**
- Use the search box at the top
- Filters by room name or description
- Real-time search results

---

## 📊 Database Structure

### Rooms Table
```
Table: rooms
├── id (UUID) - Primary key
├── name (VARCHAR) - Room name
├── description (TEXT) - Optional description
├── created_at (TIMESTAMP) - Creation date
└── updated_at (TIMESTAMP) - Last update date
```

### Room Items Table
```
Table: room_items
├── id (UUID) - Primary key
├── room_id (UUID) - References rooms.id
├── item_id (UUID) - References items.id
├── item_name (VARCHAR) - Name of the item
├── quantity (INTEGER) - Quantity in this room
├── created_at (TIMESTAMP) - Creation date
└── updated_at (TIMESTAMP) - Last update date
```

---

## 🎯 Example Setup

### Step 1: Create Rooms
1. "Grade 1 Classroom A"
2. "Grade 1 Classroom B"
3. "Grade 2 Classroom"
4. "Library"
5. "Main Office"

### Step 2: Add Items to Each Room
**Grade 1 Classroom A:**
- 50 × Chairs
- 20 × Tables
- 5 × Fans
- 30 × Books
- 3 × Whiteboards

**Grade 1 Classroom B:**
- 50 × Chairs
- 20 × Tables
- 4 × Fans
- 40 × Books

**Library:**
- 200 × Books
- 20 × Shelves
- 10 × Study Tables
- 30 × Study Chairs

---

## 🔑 Key Features Explained

### Real-time Updates
- All changes are saved immediately to Supabase
- Room cards automatically update when you modify items
- Search results refresh as you type

### Item Preview
- Room cards show a preview of the first 3 items
- If there are more items, a "+X more items" indicator appears
- Click "View Items" to see the complete list

### Quantity Management
- Easily update item quantities inline
- Add quantities when adding the same item again
- Quantities are tracked per room

### Validation
- Room names are required
- Item quantities must be at least 1
- Duplicate items in the same room are not allowed (quantity is updated instead)

---

## ⚠️ Important Notes

### Data Organization
- **Items Page**: Manages all items in the system globally
- **Rooms Page**: Manages items distributed across specific rooms
- Items can exist in the global inventory without being assigned to any room
- An item must exist in the "Items" section before it can be added to a room

### Deletion Behavior
- Deleting a room **automatically removes all items** from that room
- Deleting an item from the global inventory does NOT delete it from room records (if set up with proper cascading)
- Room deletions require confirmation

### Search & Filter
- Search works on room names and descriptions
- Case-insensitive search
- Clears when you click the X button

---

## 🐛 Troubleshooting

### Tables Not Found Error
**Problem**: "Failed to load rooms" error on page load
**Solution**: 
1. Make sure you've run the SQL setup script from `supabase_setup_rooms.sql`
2. Check that both `rooms` and `room_items` tables exist in your Supabase database
3. Verify your API key has permission to access these tables

### Can't Add Items to Room
**Problem**: Item dropdown is empty
**Solution**:
1. Make sure you have created items in the "Items" page first
2. Go to Items page and create at least one item
3. Return to Rooms page and try again

### Navigation Not Updated
**Problem**: "Rooms" link doesn't appear in navigation
**Solution**:
1. Make sure browser cache is cleared (Ctrl+Shift+Delete)
2. Refresh the page with F5
3. Log out and log back in

---

## 📱 Responsive Design

The Rooms feature is fully responsive:
- **Desktop**: Grid layout with multiple room cards
- **Tablet**: 2-column layout
- **Mobile**: Single column layout
- All modals and forms adapt to screen size

---

## 🔐 Security Considerations

- The system assumes users are authenticated (login required)
- All data is stored in Supabase with your configured security policies
- Consider implementing Row Level Security (RLS) if multiple users with different permissions exist
- The SQL file includes commented RLS policies for future implementation

---

## 📝 SQL Script Sections

The `supabase_setup_rooms.sql` file includes:
1. **Rooms Table Creation**: Main table for storing room information
2. **Room Items Table Creation**: Junction table for tracking items in rooms
3. **Indexes**: For optimized query performance
4. **Foreign Key Constraints**: Ensures data integrity
5. **Sample Data**: Optional test data (commented out)
6. **RLS Policies**: Optional security policies (commented out)

---

## 📞 Support

If you encounter any issues:
1. Check the browser console (F12) for error messages
2. Verify all tables were created successfully in Supabase
3. Ensure your API key is valid
4. Check that the items exist before adding them to rooms

---

**Last Updated**: February 18, 2026
