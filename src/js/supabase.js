import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://qgiptrexxrqkrwytegdn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnaXB0cmV4eHJxa3J3eXRlZ2RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NTQ3MzQsImV4cCI6MjA4NjUzMDczNH0.Fuyw8d2lSlFgvkg_dZ_qgevtfGjWTMcgPG_W4eU1L2s'

// Create client with auth configuration
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
})
