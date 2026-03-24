// Shared equipment data for input modal
// Import this in input.js and equipment.js for sync

import { supabase } from './supabase.js';

let allEquipmentForGet = [];
let equipmentFetchPromise = null;
let isEquipmentLoading = false;

export async function fetchEquipmentForGet() {
  if (equipmentFetchPromise) return equipmentFetchPromise;
  
  isEquipmentLoading = true;
  equipmentFetchPromise = (async () => {
    try {
      const { data: equipment, error } = await supabase
        .from('equipment')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      allEquipmentForGet = equipment || [];
      return allEquipmentForGet;
    } catch (error) {
      console.error('Error fetching equipment for get modal:', error);
      allEquipmentForGet = [];
      throw error;
    } finally {
      isEquipmentLoading = false;
    }
  })();
  
  return equipmentFetchPromise;
}

export function getEquipmentForGet() {
  return allEquipmentForGet;
}

export function isEquipmentLoadingState() {
  return isEquipmentLoading;
}

export function refreshEquipmentForGet() {
  equipmentFetchPromise = null;
  return fetchEquipmentForGet();
}
