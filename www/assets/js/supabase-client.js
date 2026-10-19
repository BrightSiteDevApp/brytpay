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
// Auto-rewrite directory links for Capacitor WebViews
if (window.Capacitor !== undefined) {
    // 1. Rewrite all hardcoded links immediately on load
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('a').forEach(link => {
            let href = link.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('#')) {
                if (href.endsWith('/')) {
                    link.setAttribute('href', href + 'index.html');
                } else if (href.includes('/?')) {
                    link.setAttribute('href', href.replace('/?', '/index.html?'));
                }
            }
        });
    });

    // 2. Keep click listener as a backup for dynamically injected elements
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        
        let href = link.getAttribute('href');
        if (href && !href.startsWith('http') && !href.startsWith('#')) {
            if (href.endsWith('/')) {
                e.preventDefault();
                window.location.href = href + 'index.html';
            } else if (href.includes('/?')) {
                e.preventDefault();
                window.location.href = href.replace('/?', '/index.html?');
            }
        }
    });
}

// Automatically hide bottom navigation while typing
const inputs = document.querySelectorAll('input, select, textarea');
const navBar = document.querySelector('.mobile-nav');

if (navBar) {
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            navBar.style.display = 'none';
        });
        input.addEventListener('blur', () => {
            navBar.style.display = 'flex';
        });
    });
}

// Automatically load global network guard across all pages
if (!document.getElementById('bryt-network-guard-script')) {
    const netGuardScript = document.createElement('script');
    netGuardScript.id = 'bryt-network-guard-script';
    netGuardScript.src = '/assets/js/network-guard.js';
    document.head.appendChild(netGuardScript);
}

document.addEventListener('DOMContentLoaded', async () => {
    if (window.Capacitor && window.Capacitor.Plugins.OtaKit) {
        try {
            await window.Capacitor.Plugins.OtaKit.notifyAppReady();
            console.log("OtaKit: App is ready and stable.");
        } catch (e) {
            console.error('OtaKit Ready Signal Failed:', e);
        }
    }
});