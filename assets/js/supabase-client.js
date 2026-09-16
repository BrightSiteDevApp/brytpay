// assets/js/supabase-client.js

// Replace these with your actual Supabase Project URL and Anon Key
const SUPABASE_URL = 'https://yivxlmjaiczsnxakumof.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpdnhsbWphaWN6c254YWt1bW9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMzIzNDMsImV4cCI6MjEwNDgwODM0M30.Niu_DNJKGCF1CClm3xl4hjYr2yGgvgOs37w85OuThGQ';

// Initialize the Supabase client (relies on the CDN script loaded in HTML)
if (!window.supabase) {
    console.error("Supabase CDN not loaded. Check your HTML script tags.");
}

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other files
window.db = supabaseClient;