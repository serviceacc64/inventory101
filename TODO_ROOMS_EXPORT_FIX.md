# Rooms Export Fix - Long Sheet Names

Issue: XLSX SheetJS limits sheet names to 31 chars. Rooms like \"Science Equipment SHS (TVL Area)\" fail export with console error.

## Steps:
- [x] 1. Analysis complete, TODO created
- [x] 2. Edit src/js/exportHelpers.js: Truncate title.slice(0,31) before book_append_sheet
- [x] 3. Edit src/js/rooms.js: Add logs, empty check, sanitize, writeFile catch
- [x] 4. Test: Open src/pages/rooms.html, repro with long room, verify success (via command)
- [x] 5. Update TODO progress, complete task

**DONE** ✅ Rooms export now works for all room names.

