# Supabase Implementation Plan for Inventory Management System

## 1. Project Overview

This document outlines the plan to migrate the current inventory management system from static/mock data to Supabase as the backend database.

### Current State:
- Static HTML pages with mock data
- Uses localStorage for authentication
- Items and logs are hardcoded in HTML

### Goal:
- Use Supabase (PostgreSQL) as the backend
- Store items with: name, label, quantity
- Track individuals who took items with: individual name, quantity taken, time

---

## 2. Database Schema Design

### Table 1: `items`
This table stores all inventory items.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `name` | TEXT | Name of the item (e.g., "Ballpoint Pens") |
| `label` | TEXT | Additional label/category (e.g., "Pack of 50") |
| `quantity` | INTEGER | Current stock quantity |
| `created_at` | TIMESTAMP | When the item was created |
| `updated_at` | TIMESTAMP | When the item was last updated |

### Table 2: `item_distributions` (or `logs`)
This table tracks who took what items and when.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `item_id` | UUID | Foreign key to `items` table |
| `individual_name` | TEXT | Name of the person who took the item |
| `quantity_taken` | INTEGER | Number of items taken |
| `timestamp` | TIMESTAMP | When the items were taken |
| `notes` | TEXT (optional) | Any additional notes |
| `created_at` | TIMESTAMP | Record creation time |

### Table 3: `users` (optional - if needed for authentication)
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `email` | TEXT | User email |
| `full_name` | TEXT | User's full name |
| `role` | TEXT | Role (admin, teacher, etc.) |

---

## 3. Supabase Setup Steps

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in project details:
   - Name: `rmnhs-inventory`
   - Database Password: Create a strong password
   - Region: Select closest region to you
4. Wait for project to be provisioned (may take a few minutes)

### Step 2: Get API Credentials
1. In Supabase dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL**: `https://[project-ref].supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Step 3: Create Database Tables
Run the following SQL in Supabase SQL Editor:

```sql
-- Create items table
CREATE TABLE items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  label TEXT,
  quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create item_distributions table
CREATE TABLE item_distributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  individual_name TEXT NOT NULL,
  quantity_taken INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_distributions ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed)
CREATE POLICY "Enable all access for items" ON items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for distributions" ON item_distributions FOR ALL USING (true) WITH CHECK (true);
```

### Step 4: Insert Sample Data
```sql
-- Insert sample items
INSERT INTO items (name, label, quantity) VALUES
('Ballpoint Pens', 'Pack of 50', 245),
('Notebooks', '100 pages', 15),
('Paper Clips', 'Box of 100', 567),
('Bond Paper', 'Ream of 500 sheets', 89);
```

---

## 4. Frontend Integration Plan

### Step 1: Create Supabase Client
Create a new file `src/js/supabase.js`:

```javascript
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'

const supabaseUrl = 'YOUR_SUPABASE_PROJECT_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseKey)
```

### Step 2: Update Items Page (input.html)
- Fetch items from Supabase instead of using static data
- Add functionality to add new items
- Add functionality to update quantity

### Step 3: Update Logs/Distributions Page
- Add form to record item distributions
- Fetch and display distribution history
- Link to items table

### Step 4: Update Dashboard (index.html)
- Fetch real statistics from Supabase
- Calculate low stock items
- Show recent distributions

---

## 5. API Operations

### Fetch All Items
```javascript
const { data: items, error } = await supabase
  .from('items')
  .select('*')
```

### Add New Item
```javascript
const { data, error } = await supabase
  .from('items')
  .insert([{ name: 'New Item', label: 'Label', quantity: 100 }])
```

### Record Item Distribution
```javascript
const { data, error } = await supabase
  .from('item_distributions')
  .insert([{ 
    item_id: 'item-uuid', 
    individual_name: 'John Doe', 
    quantity_taken: 5 
  }])
```

### Update Item Quantity (after distribution)
```javascript
const { data, error } = await supabase
  .from('items')
  .update({ quantity: newQuantity })
  .eq('id', itemId)
```

---

## 6. Implementation Tasks

- [/] Create Supabase account and project
- [ ] Set up database tables (items, item_distributions)
- [ ] Configure Row Level Security policies
- [ ] Add Supabase credentials to environment variables
- [ ] Create Supabase client JavaScript module
- [ ] Update input.html to fetch items from Supabase
- [ ] Add item creation functionality
- [ ] Update logs.html to record distributions
- [ ] Add distribution history display
- [ ] Update dashboard statistics to use real data
- [ ] Test all CRUD operations

---

## 7. Security Considerations

1. **Environment Variables**: Store Supabase credentials in environment variables, not in source code
2. **RLS Policies**: Configure Row Level Security to control who can read/write data
3. **Input Validation**: Validate all user inputs before sending to database
4. **Error Handling**: Handle Supabase errors gracefully in the UI

---

## 8. Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [PostgreSQL Basics](https://www.postgresql.org/docs/)

---

*Plan created for RMNHS Supplies Inventory System*
