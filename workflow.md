Building & Structure Management — UX Workflow Design
Goal

Create a clean, scalable, and user-friendly workflow for managing:

Buildings
Multiple Structures under each building
Dynamic structure details based on structure type

The workflow should:

Reduce user confusion
Minimize form overload
Make adding structures fast
Support future expansion
Recommended UX Approach

Instead of placing everything directly inside the building card, use:

Primary Pattern
Building Card → Structure Management Modal / Drawer

This avoids:

Extremely long cards
Cluttered UI
Confusing nested forms
Recommended User Flow
Dashboard
   ↓
Building List
   ↓
Select Building
   ↓
Open Structure Manager
   ↓
View Existing Structures
   ↓
Add New Structure
   ↓
Choose Structure Type
   ↓
Dynamic Form Appears
   ↓
Save Structure
   ↓
Updated Structure List
1. Building Page (building.html)
Layout Recommendation

Use a responsive card grid.

Each building card should contain:

--------------------------------
| Building Name               |
| Total Structures: 5         |
|                             |
| [ View Structures ]         |
--------------------------------
Why This UX Works

Avoids:

Huge expandable cards
Nested form chaos
Overwhelming users

Instead:

Buildings remain clean
Structure management becomes focused
Easier mobile responsiveness
2. Structure Management Screen

When user clicks:

View Structures

Open:

Modal
OR
Right-side drawer
OR
Dedicated page

Recommended:

Desktop → Drawer
Mobile → Fullscreen Modal
Structure Management Layout
Building: Building 1

--------------------------------
| Structures                   |
--------------------------------

[ + Add Structure ]

--------------------------------
| Instructional                |
| Rooms: 5                     |
| [ Edit ] [ Delete ]          |
--------------------------------

--------------------------------
| Non-Instructional            |
| Purpose: Library             |
| [ Edit ] [ Delete ]          |
--------------------------------
3. Add Structure Workflow

When user clicks:

+ Add Structure

Open a guided form.

Recommended UX Pattern
Step-Based Form (Highly Recommended)

This is MUCH cleaner than showing all fields at once.

Multi-Step Workflow
STEP 1 — Select Structure Type
What type of structure is this?

( ) Instructional
( ) Non-Instructional
( ) Others

                [ Continue ]
Why This Matters

This:

Prevents cognitive overload
Makes the interface feel intelligent
Keeps forms minimal
STEP 2A — Instructional Flow

If user selects:

Instructional

Show:

Number of Rooms: [ 3 ]

[ Generate Rooms ]

After generation:

Room 1 Name [____________]
Room 2 Name [____________]
Room 3 Name [____________]
UX Recommendation
Auto-Generate Inputs

When user enters room count:

Dynamically generate room fields instantly
No page reload
Better UX Enhancement

Instead of:

Room 1
Room 2
Room 3

Use placeholders:

e.g. Computer Lab
e.g. Grade 8 - Rizal
e.g. Science Room
STEP 2B — Non-Instructional Flow

Show:

Purpose of Structure

[___________________]

Suggested autocomplete:

Library
Faculty Room
Registrar
Guidance Office
UX Improvement

Add:

Smart Suggestions

This:

Speeds input
Standardizes data
Reduces spelling inconsistencies
STEP 2C — Others Flow

Show:

Function of Structure

[___________________]

Suggestions:

CR
Storage Room
Utility Room
Guard House
4. Review Before Save (Optional but Recommended)

Before final save:

Structure Type: Instructional
Rooms: 3

• Computer Lab
• Science Room
• Grade 10 - A

Buttons:

[ Back ]
[ Save Structure ]
Why This Is Good UX

Users can:

Verify entries
Catch mistakes
Feel confident before saving

Especially useful for large room counts.

5. Structure List UX

Inside the structure manager:

Group Structures by Type
Instructional (5)
Non-Instructional (2)
Others (3)

This improves:

Scanability
Organization
Future scalability
6. Edit Structure UX

Editing should:

Re-open the same workflow
Pre-fill existing data

Example:

Edit Structure → Instructional

Rooms:
[ Computer Lab ]
[ Science Room ]
7. Delete Workflow

Avoid instant deletion.

Use confirmation modal:

Delete this structure?

This action cannot be undone.

[ Cancel ] [ Delete ]
8. Empty States (Important UX Detail)

If no structures exist:

No structures added yet.

[ + Add First Structure ]

This guides users clearly.

9. Recommended Data Architecture
Building

Contains:

Building Info
Structure Count
Structure

Contains:

Type
Purpose/Function
Rooms (if instructional)
Room

Separate entity/table.

Reason:
Future scalability.

Possible future features:

Room capacity
Room status
Equipment inventory
Scheduling
10. Recommended Frontend Component Structure
BuildingPage
 ├── BuildingCard
 │
 ├── StructureDrawer
 │     ├── StructureList
 │     ├── StructureCard
 │     ├── AddStructureWizard
 │     │      ├── StepType
 │     │      ├── StepInstructional
 │     │      ├── StepNonInstructional
 │     │      ├── StepOthers
 │     │      └── StepReview
UX Priorities
Highest Priority
Simplicity
Dynamic forms
Fast data entry
Clear structure hierarchy
Avoid These UX Mistakes
❌ Don’t
Put all forms inside the building card
Show every possible field at once
Use long scrolling forms
Force unnecessary reloads
Best UX Choice Summary
Recommended Final UX
Buildings Page

→ Clean cards only

Structure Management

→ Drawer/modal

Add Structure

→ Multi-step wizard

Dynamic Fields

→ Based on structure type

Instructional Rooms

→ Auto-generated room fields

This workflow is scalable, modern, and much easier for users to understand.