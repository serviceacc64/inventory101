// exportHelpers.js - shared utilities for generating Excel workbooks
// This module centralizes the "rooms" export layout so both the
// rooms page and the reports page can produce identical spreadsheets.

// Note: XLSX is expected to be available globally via the CDN script
// included in the HTML pages (same as in other modules).

/**
 * Build a workbook containing room/item data with the standard column set.
 *
 * @param {Array<Object>} items  List of item objects. Each object may
 *   include name/item_name, quantity, units/unit, condition, description,
 *   remarks, item_id, created_at, and any additional fields.
 * @param {string} title         Sheet name (typically room name or report
 *   title). Also used in the generated filename when writeWorkbook is used.
 * @returns {XLSX.WorkBook}      A workbook ready to be written.
 */
export function buildRoomWorkbook(items, title) {
    // decide whether to include a "Room Name" column based on input data
    const includeRoom = items.some(it => it.room_name || it.roomName);

    const headerRow1 = {
        'No.': '',
        'Item Name': `Room: ${title}`
    };
    if (includeRoom) headerRow1['Room Name'] = '';
    Object.assign(headerRow1, {
        'Quantity': '',
        'Units': '',
        'Condition': '',
        'Description': '',
        'Remarks': '',
        'Type': '',
        'Date Added': ''
    });

    const blankRow = {};
    Object.keys(headerRow1).forEach(k => blankRow[k] = '');

    const exportData = [
        headerRow1,
        blankRow,
        ...items.map((item, idx) => {
            const row = {
                'No.': idx + 1,
                'Item Name': item.item_name || item.name || ''
            };
            if (includeRoom) row['Room Name'] = item.room_name || item.roomName || '';
            Object.assign(row, {
                'Quantity': item.quantity || 0,
                'Units': item.units || item.unit || 'pcs',
                'Condition': item.condition || 'Good',
                'Description': item.description || '-',
                'Remarks': item.remarks || '-',
                'Type': item.item_id ? 'Inventory' : 'Custom',
                'Date Added': item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'
            });
            return row;
        })
    ];

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
const sheetName = title.length > 31 ? title.slice(0, 31) : title;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // optional column widths for each column
    const cols = [
        { wch: 6 },  // No.
        { wch: 25 }  // Item Name
    ];
    if (includeRoom) cols.push({ wch: 20 }); // Room Name column width
    cols.push(
        { wch: 10 }, // Quantity
        { wch: 10 }, // Units
        { wch: 12 }, // Condition
        { wch: 30 }, // Description
        { wch: 30 }, // Remarks
        { wch: 12 }, // Type
        { wch: 15 }  // Date Added
    );
    ws['!cols'] = cols;

    return wb;
}

/**
 * Write a workbook to disk using a filename based on baseName and current date.
 *
 * @param {XLSX.WorkBook} wb
 * @param {string} baseName  Base part of the filename (no extension).
 * @returns {string}         Final filename used.
 */
export function writeWorkbook(wb, baseName) {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${baseName}_${timestamp}.xlsx`;
    XLSX.writeFile(wb, filename);
    return filename;
}

/**
 * Convenience helper that builds and writes a workbook in one go.
 */
export function exportRoomExcel(items, title) {
    const wb = buildRoomWorkbook(items, title);
    return writeWorkbook(wb, title);
}
