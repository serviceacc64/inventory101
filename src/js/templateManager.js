// templateManager.js - Handles Excel template upload and management
import { supabase } from './supabase.js';

// Template Manager Functions
const TemplateManager = {
    // Available system fields for mapping
    availableFields: {
        items_list: ['name', 'label', 'quantity', 'unit', 'created_at', 'updated_at', 'description', 'property_number', 'serial_number'],
        items_lost: ['item_name', 'category', 'person', 'quantity', 'last_date'],
        logs: ['timestamp', 'action_type', 'item_name', 'quantity_changed', 'quantity_before', 'quantity_after', 'person', 'details'],
        rooms: ['name', 'description', 'created_at'],
        equipment: ['item_name', 'item_description', 'quantity', 'unit_cost', 'amount', 'created_at', 'updated_at']
    },

    // Default column mappings for each export type
    defaultMappings: {
        items_list: {
            'Item Name': 'name',
            'Category': 'label',
            'Quantity': 'quantity',
            'Unit': 'unit',
            'Date Added': 'created_at'
        },
        items_lost: {
            'Item Name': 'item_name',
            'Category': 'category',
            'Person': 'person',
            'Quantity': 'quantity',
            'Last Distribution Date': 'last_date'
        },
        logs: {
            'Timestamp': 'timestamp',
            'Action': 'action_type',
            'Item Name': 'item_name',
            'Quantity Changed': 'quantity_changed',
            'Person': 'person'
        },
        rooms: {
            'Room Name': 'name',
            'Description': 'description',
            'Date Added': 'created_at'
        },
        equipment: {
            'Item Name': 'item_name',
            'Description': 'item_description',
            'Quantity': 'quantity',
            'Unit Cost': 'unit_cost',
            'Amount': 'amount',
            'Date Added': 'created_at'
        }
    },

    // Header synonyms for flexible matching
    headerSynonyms: {
        'item_name': ['item', 'item name', 'name', 'itemname', 'product', 'product name', 'description'],
        'category': ['category', 'type', 'label', 'group', 'class', 'kind'],
        'person': ['person', 'who', 'name of person', 'assigned to', 'responsible', 'officer', 'user', 'recipient'],
        'quantity': ['quantity', 'qty', 'amount', 'count', 'number', 'total', 'volume'],
        'last_date': ['date', 'last date', 'last distribution date', 'distribution date', 'when', 'timestamp']
    },

    // Fetch all templates from Supabase
    async fetchTemplates() {
        try {
            const { data, error } = await supabase
                .from('excel_templates')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching templates:', error);
            return [];
        }
    },

// Fetch active template
    async fetchActiveTemplate() {
        try {
            const { data, error } = await supabase
                .from('excel_templates')
                .select('*')
                .eq('is_active', true)
                .limit(1)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            return data || null;
        } catch (error) {
            console.error('Error fetching active template:', error);
            return null;
        }
    },

    // Fetch template by export type (automatic selection based on report type)
    // This eliminates the need to manually set templates as active
    async fetchTemplateByExportType(exportType) {
        try {
            // Use .overlaps() to check if the array contains the export type
            // Or use a direct select with filter on the array column
            const { data, error } = await supabase
                .from('excel_templates')
                .select('*')
                .overlaps('supported_types', [exportType])
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                console.log(`No template found for export type: ${exportType}`, error.message);
                return null;
            }
            
            if (data) {
                console.log(`Found template for ${exportType}:`, data.name);
            }
            return data || null;
        } catch (error) {
            console.error(`Error fetching template for ${exportType}:`, error);
            return null;
        }
    },

    // Fetch template by name (for specific template association like "CLASSROOM INVENTORY")
    async fetchTemplateByName(templateName) {
        try {
            const { data, error } = await supabase
                .from('excel_templates')
                .select('*')
                .ilike('name', templateName)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                console.log(`No template found with name: ${templateName}`);
                return null;
            }
            
            if (data) {
                console.log(`Found template by name "${templateName}":`, data.name);
            }
            return data || null;
        } catch (error) {
            console.error(`Error fetching template by name ${templateName}:`, error);
            return null;
        }
    },

    // Find best matching field for a header
    findBestFieldMatch(header, exportType) {
        const headerLower = header.toString().toLowerCase().trim();
        const headerClean = headerLower.replace(/[_\s-]/g, '');
        
        // First try exact match with available fields
        const availableFields = this.availableFields[exportType] || [];
        for (const field of availableFields) {
            const fieldLower = field.toLowerCase();
            const fieldClean = fieldLower.replace(/[_\s-]/g, '');
            
            if (headerClean === fieldClean || headerLower === fieldLower) {
                return field;
            }
        }
        
        // Try synonyms
        for (const [fieldName, synonyms] of Object.entries(this.headerSynonyms)) {
            // Check if this field is relevant for this export type
            if (!availableFields.includes(fieldName)) continue;
            
            for (const synonym of synonyms) {
                const synonymLower = synonym.toLowerCase();
                const synonymClean = synonymLower.replace(/[_\s-]/g, '');
                
                if (headerClean === synonymClean || 
                    headerLower.includes(synonymLower) || 
                    synonymLower.includes(headerClean)) {
                    return fieldName;
                }
            }
        }
        
        // Try default mappings
        const defaultMappings = this.defaultMappings[exportType] || {};
        for (const [defaultHeader, fieldName] of Object.entries(defaultMappings)) {
            const defaultLower = defaultHeader.toLowerCase();
            const defaultClean = defaultLower.replace(/[_\s-]/g, '');
            
            if (headerClean === defaultClean || headerLower === defaultLower) {
                return fieldName;
            }
        }
        
        return null;
    },

    // Upload and parse Excel template
    async uploadTemplate(file, name, description, exportType) {
        try {
            // Parse Excel to get headers first
            const arrayBuffer = await file.arrayBuffer();
            const excelData = new Uint8Array(arrayBuffer);
            const workbook = XLSX.read(excelData, { type: 'array' });

            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const headers = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })[0] || [];

            // Detect header row and data start row
            // For Lost/Stolen/Damaged/Destroyed templates, data typically starts at row 22
            let headerRow = 1;
            let dataStartsAtRow = 2;
            
            // Try to find the actual header row by looking for known headers
            const allRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            for (let i = 0; i < Math.min(allRows.length, 30); i++) {
                const row = allRows[i];
                if (!row) continue;
                
                const rowStr = row.join(' ').toLowerCase();
                // Look for indicators of header row
                if (rowStr.includes('item') && (rowStr.includes('name') || rowStr.includes('quantity'))) {
                    headerRow = i + 1; // 1-based
                    dataStartsAtRow = headerRow + 1;
                    
                    // For items_lost templates, check if there's a specific data section
                    if (exportType === 'items_lost') {
                        // Look for row 22 pattern (common in government forms)
                        if (i >= 20 && i <= 25) {
                            dataStartsAtRow = 22;
                        }
                    }
                    break;
                }
            }

            // Create template data with column mappings
            const templateData = {
                column_mappings: {},
                header_row: headerRow,
                data_starts_at_row: dataStartsAtRow,
                sheet_name: workbook.SheetNames[0],
                export_type: exportType,
                original_headers: headers
            };

            console.log(`Detected header row: ${headerRow}, data starts at: ${dataStartsAtRow}`);

            // Auto-map headers using flexible matching
            let mappedCount = 0;
            headers.forEach(header => {
                const fieldMatch = this.findBestFieldMatch(header, exportType);
                if (fieldMatch) {
                    templateData.column_mappings[header] = fieldMatch;
                    mappedCount++;
                    console.log(`Mapped header "${header}" -> "${fieldMatch}"`);
                } else {
                    console.log(`Could not map header: "${header}"`);
                }
            });

            // If no mappings found, use default mappings as fallback
            if (mappedCount === 0) {
                console.warn('No headers auto-mapped, using default mappings');
                const defaults = this.defaultMappings[exportType] || {};
                templateData.column_mappings = { ...defaults };
                templateData.original_headers = Object.keys(defaults);
            }

            console.log('Final column mappings:', templateData.column_mappings);

            // Get current user from localStorage (app uses localStorage auth)
            const adminUser = localStorage.getItem('adminUser');
            let userId = null;
            if (adminUser) {
                try {
                    const user = JSON.parse(adminUser);
                    userId = user.id || user.email || null;
                } catch (e) {
                    userId = adminUser;
                }
            }

            // Try to upload file to Supabase Storage (optional)
            let filePath = null;
            try {
                const fileName = `templates/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                const { error: uploadError } = await supabase.storage
                    .from('templates')
                    .upload(fileName, file, {
                        contentType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        upsert: false
                    });

                if (!uploadError) {
                    filePath = fileName;
                    console.log('File uploaded successfully:', fileName);
                } else {
                    console.warn('Storage upload failed:', uploadError);
                }
            } catch (storageError) {
                console.warn('Storage error (continuing without file):', storageError);
            }

            // Save to Supabase database
            const insertData = {
                name: name,
                description: description,
                template_data: templateData,
                supported_types: [exportType],
                is_active: false
            };

            // Only add file_path if it was successfully uploaded
            if (filePath) {
                insertData.file_path = filePath;
            }

            // Only add created_by if we have a user
            if (userId) {
                insertData.created_by = userId;
            }

            console.log('Inserting template data:', insertData);

            const { data: templateRecord, error } = await supabase
                .from('excel_templates')
                .insert(insertData)
                .select()
                .single();

            if (error) {
                console.error('Database insert error:', error);
                throw error;
            }
            
            console.log('Template saved successfully:', templateRecord);
            return { success: true, template: templateRecord, mappedFields: mappedCount };
        } catch (error) {
            console.error('Error uploading template:', error);
            return { success: false, error: error.message };
        }
    },

    // Set a template as active
    async setActiveTemplate(templateId) {
        try {
            // First, deactivate all templates
            await supabase
                .from('excel_templates')
                .update({ is_active: false })
                .eq('is_active', true);

            // Then activate the selected one
            const { data, error } = await supabase
                .from('excel_templates')
                .update({ is_active: true })
                .eq('id', templateId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, template: data };
        } catch (error) {
            console.error('Error setting active template:', error);
            return { success: false, error: error.message };
        }
    },

    // Delete a template
    async deleteTemplate(templateId) {
        try {
            const { error } = await supabase
                .from('excel_templates')
                .delete()
                .eq('id', templateId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error deleting template:', error);
            return { success: false, error: error.message };
        }
    },

    // Update column mappings for a template
    async updateColumnMappings(templateId, mappings) {
        try {
            const { data, error } = await supabase
                .from('excel_templates')
                .update({ 
                    template_data: { 
                        column_mappings: mappings,
                        export_type: 'items'
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('id', templateId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, template: data };
        } catch (error) {
            console.error('Error updating column mappings:', error);
            return { success: false, error: error.message };
        }
    },

    // Apply template to export data
    applyTemplate(template, data) {
        if (!template || !template.template_data) {
            return data; // Return default if no template
        }

        const mappings = template.template_data.column_mappings || {};
        
        // Transform data according to mappings
        return data.map(row => {
            const transformed = {};
            Object.keys(mappings).forEach(exportHeader => {
                const fieldName = mappings[exportHeader];
                let value = row[fieldName];
                
                // Format dates
                if (fieldName === 'created_at' || fieldName === 'updated_at' || fieldName === 'timestamp') {
                    if (value) {
                        value = new Date(value).toLocaleString();
                    }
                }
                
                transformed[exportHeader] = value;
            });
            return transformed;
        });
    },

    // Fetch and fill template with data for pre-filled export
    // Uses template's column_mappings and data_starts_at_row from database
    async fillTemplateWithData(template, data, emptyRows = 10) {
        try {
            if (!template || !template.file_path) {
                console.warn('No template file available, using default export');
                return null;
            }

            console.log('Filling template with data:', { template: template.name, dataCount: data.length });

            // Fetch template file from Supabase Storage
            let fileData = null;
            let fileError = null;
            
            try {
                const result = await supabase.storage
                    .from('templates')
                    .download(template.file_path);
                fileData = result.data;
                fileError = result.error;
            } catch (storageError) {
                console.warn('Storage download error:', storageError);
                fileError = storageError;
            }

            if (fileError || !fileData) {
                console.warn('Error downloading template file, using default export instead:', fileError?.message || 'Unknown error');
                return null;
            }

            // Read the template file
            const arrayBuffer = await fileData.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            
            // Get the first sheet (or use specified sheet name)
            const sheetName = template.template_data?.sheet_name || workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            if (!worksheet) {
                console.error('Template sheet not found:', sheetName);
                return null;
            }

            // Check if this is the CLASSROOM INVENTORY template
            const isClassroomInventory = template.name && template.name.toUpperCase().includes('CLASSROOM INVENTORY');
            
            let dataStartsAtRow;
            let fieldToColumnMap;
            let maxTemplateRows = 10; // Default capacity

            if (isClassroomInventory) {
                // CLASSROOM INVENTORY template specific layout:
                // - Item Name: Column A (index 0), Rows 6-15
                // - Description: Column B (index 1), Rows 6-15
                // - Units: Column E (index 4), Rows 6-15
                // - Quantity: Column F (index 5), Rows 6-15
                // - Room Name: Column I (index 8), Rows 6-15
                // - Condition: Column J (index 9), Rows 6-15
                // - Remarks: Column K (index 10), Rows 6-15
                
                dataStartsAtRow = 6;
                maxTemplateRows = 10; // Rows 6-15 = 10 items
                fieldToColumnMap = {
                    'name': 0,           // Column A - Item Name
                    'description': 1,    // Column B - Description
                    'unit': 4,           // Column E - Units
                    'quantity': 5,       // Column F - Quantity
                    'room_name': 8,      // Column I - Room Name
                    'condition': 9,      // Column J - Condition
                    'remarks': 10        // Column K - Remarks
                };

                console.log('✓ Using CLASSROOM INVENTORY layout: rows 6-15');
                console.log('  Field to column mapping:', fieldToColumnMap);
                console.log('  Items will fill: A6-K6, A7-K7, A8-K8, etc.');
            } else {
                // Default government form layout for Lost/Stolen/Damaged/Destroyed Items
                dataStartsAtRow = 22;
                maxTemplateRows = 7; // Rows 22-28 = 7 items
                fieldToColumnMap = {
                    'item_name': 2,      // Column C
                    'category': 3,       // Column D
                    'person': 4,         // Column E
                    'quantity': 5        // Column F
                };

                console.log('✓ Using default layout: rows 22-28, columns C-F');
                console.log('  Field to column mapping:', fieldToColumnMap);
            }

            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z100');

            console.log(`Filling data starting at row ${dataStartsAtRow} using template column mappings`);
            console.log(`Data count: ${data.length}, Template capacity: ${maxTemplateRows} rows`);

            // Check if we need to extend the worksheet for more items
            const needsExtension = data.length > maxTemplateRows;
            const lastDataRow = dataStartsAtRow + data.length - 1;

            if (needsExtension) {
                console.log(`⚠️  Data exceeds template capacity. Extending from ${maxTemplateRows} to ${data.length} rows.`);

                // Extend the worksheet range to accommodate all data
                const newEndRow = Math.max(range.e.r, lastDataRow - 1);
                range.e.r = newEndRow;

                // For classroom inventory, we need to create additional rows to preserve template structure
                // Copy the last template row to create new rows
                const templateLastRow = dataStartsAtRow + maxTemplateRows - 1;

                for (let i = maxTemplateRows; i < data.length; i++) {
                    const targetRow = dataStartsAtRow + i;

                    // Copy all cells from the last template row to the new row
                    for (let col = range.s.c; col <= range.e.c; col++) {
                        const sourceCellRef = XLSX.utils.encode_cell({ r: templateLastRow - 1, c: col });
                        const targetCellRef = XLSX.utils.encode_cell({ r: targetRow - 1, c: col });

                        const sourceCell = worksheet[sourceCellRef];
                        if (sourceCell) {
                            // Copy the cell structure but clear the value
                            worksheet[targetCellRef] = {
                                ...sourceCell,
                                v: '',
                                t: 's'
                            };
                        }
                    }
                }

                console.log(`✓ Extended worksheet with ${data.length - maxTemplateRows} additional rows`);
            }

            // Fill data into template
            data.forEach((row, index) => {
                const rowNum = dataStartsAtRow + index; // 1-based Excel row number
                
                console.log(`Filling row ${index + 1} at Excel row ${rowNum}:`, row);
                
                // Fill each mapped field
                Object.entries(fieldToColumnMap).forEach(([fieldName, colIndex]) => {
                    let value;
                    
                    // Map field names based on the data structure
                    if (isClassroomInventory) {
                        // Map different field names to the correct values
                        switch(fieldName) {
                            case 'name':
                                value = row.name || row.item_name || '';
                                break;
                            case 'description':
                                value = row.description || row.item_description || '';
                                break;
                            case 'unit':
                                value = row.unit || row.units || 'pcs';
                                break;
                            case 'quantity':
                                value = row.quantity || 0;
                                break;
                            case 'room_name':
                                value = row.room_name || row.roomName || '';
                                break;
                            case 'condition':
                                value = row.condition || 'Good';
                                break;
                            case 'remarks':
                                value = row.remarks || '';
                                break;
                            default:
                                value = row[fieldName];
                        }
                    } else {
                        // Default mapping for other templates
                        value = row[fieldName];
                        
                        // Handle special fields
                        if (fieldName === 'last_date' && value) {
                            value = new Date(value).toLocaleDateString();
                        }
                    }
                    
                    // Ensure value is not undefined/null
                    if (value === undefined || value === null) {
                        value = '';
                    }
                    
                    const cellRef = XLSX.utils.encode_cell({ r: rowNum - 1, c: colIndex });
                    const cellType = typeof value === 'number' ? 'n' : 's';
                    
                    worksheet[cellRef] = { v: value, t: cellType };
                    console.log(`  Set ${fieldName}: "${value}" at ${XLSX.utils.encode_col(colIndex)}${rowNum}`);
                });
            });

            // Ensure range covers all filled data
            if (range.e.r < lastDataRow - 1) {
                range.e.r = lastDataRow - 1;
            }

            // Update worksheet range
            worksheet['!ref'] = XLSX.utils.encode_range(range);

            console.log('Template filled successfully using database column mappings');
            return workbook;
        } catch (error) {
            console.error('Error filling template with data:', error);
            return null;
        }
    },

    // Write workbook to file
    writeFileWithStyles(workbook, filename) {
        try {
            XLSX.writeFile(workbook, filename);
            console.log('File written successfully:', filename);
            return true;
        } catch (error) {
            console.error('Error writing file:', error);
            return false;
        }
    },

    // Get default export columns
    getDefaultColumns(exportType) {
        return this.defaultMappings[exportType] || {};
    }
};

// Make available globally
window.TemplateManager = TemplateManager;
export default TemplateManager;
