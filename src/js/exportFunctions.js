// Export Items Function
async function exportItems(format = 'xlsx') {
    const loadingState = document.getElementById('loadingState');
    const showLoading = (show) => { if (loadingState) loadingState.style.display = show ? 'block' : 'none'; };
    
    showLoading(true);
    try {
        const { supabase } = await import('./supabase.js');
        const { data: items, error } = await supabase.from('items').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (!items || items.length === 0) { alert('No items found to export'); return; }
        
        const exportData = items.map(item => ({
            'Item Name': item.name, 'Category': item.label || '', 'Quantity': item.quantity,
            'Unit': item.unit || '', 'Created At': item.created_at ? new Date(item.created_at).toLocaleString() : '',
            'Updated At': item.updated_at ? new Date(item.updated_at).toLocaleString() : ''
        }));
        
        const filenameBase = `inventory_items_${new Date().toISOString().split('T')[0]}`;
        if (format === 'xlsx') {
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Items');
            XLSX.writeFile(wb, `${filenameBase}.xlsx`);
        } else {
            const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(exportData));
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${filenameBase}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (error) { console.error('Error exporting items:', error); alert('Failed to export items'); }
    finally { showLoading(false); }
}

// Export Room Items Function
async function exportRoomItems(format = 'xlsx') {
    const loadingState = document.getElementById('loadingState');
    const showLoading = (show) => { if (loadingState) loadingState.style.display = show ? 'block' : 'none'; };
    
    showLoading(true);
    try {
        const { supabase } = await import('./supabase.js');
        const { data: rooms, error: roomsError } = await supabase.from('rooms').select('*').order('name', { ascending: true });
        if (roomsError) throw roomsError;
        if (!rooms || rooms.length === 0) { alert('No rooms found to export'); return; }
        
        const { data: roomItems, error: itemsError } = await supabase.from('room_items').select('*');
        if (itemsError) throw itemsError;
        
        const exportData = [];
        rooms.forEach(room => {
            const items = roomItems.filter(item => item.room_id === room.id);
            items.forEach(item => {
                exportData.push({
                    'Room Name': room.name, 'Room Description': room.description || '',
                    'Item Name': item.name, 'Quantity': item.quantity,
                    'Created At': item.created_at ? new Date(item.created_at).toLocaleString() : ''
                });
            });
        });
        
        const filenameBase = `room_items_${new Date().toISOString().split('T')[0]}`;
        if (format === 'xlsx') {
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'RoomItems');
            XLSX.writeFile(wb, `${filenameBase}.xlsx`);
        } else {
            const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(exportData));
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${filenameBase}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (error) { console.error('Error exporting room items:', error); alert('Failed to export room items'); }
    finally { showLoading(false); }
}

// Export Activity Logs Function
async function exportActivityLogs(format = 'xlsx') {
    const loadingState = document.getElementById('loadingState');
    const showLoading = (show) => { if (loadingState) loadingState.style.display = show ? 'block' : 'none'; };
    
    showLoading(true);
    try {
        const { supabase } = await import('./supabase.js');
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        const { data: logs, error } = await supabase.from('activity_logs').select('*')
            .gte('timestamp', oneYearAgo.toISOString()).order('timestamp', { ascending: false });
        if (error) throw error;
        if (!logs || logs.length === 0) { alert('No activity logs found to export'); return; }
        
        const exportData = logs.map(log => ({
            'Timestamp': log.timestamp ? new Date(log.timestamp).toLocaleString() : '',
            'Action Type': log.action_type || '', 'Item Name': log.item_name || '',
            'Quantity Changed': log.quantity_changed || '', 'Quantity Before': log.quantity_before || '',
            'Quantity After': log.quantity_after || '', 'Person': log.person || '',
            'Category': log.details?.category || log.details?.label || ''
        }));
        
        const filenameBase = `activity_logs_${new Date().toISOString().split('T')[0]}`;
        if (format === 'xlsx') {
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'ActivityLogs');
            XLSX.writeFile(wb, `${filenameBase}.xlsx`);
        } else {
            const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(exportData));
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${filenameBase}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (error) { console.error('Error exporting activity logs:', error); alert('Failed to export activity logs'); }
    finally { showLoading(false); }
}

// Make functions available globally
window.exportItems = exportItems;
window.exportRoomItems = exportRoomItems;
window.exportActivityLogs = exportActivityLogs;
