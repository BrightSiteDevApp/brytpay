document.addEventListener('DOMContentLoaded', async () => {
    // OTA Updates only execute inside the compiled native mobile app
    if (window.Capacitor && window.Capacitor.Plugins.CapacitorUpdater) {
        const { CapacitorUpdater } = window.Capacitor.Plugins;

        // 🛑 This is your current version. Bump this string in your code 
        // immediately before you zip your files for a new update!
        const CURRENT_APP_VERSION = '1.1.0'; 

        try {
            // 1. Notify plugin that app booted successfully to prevent boot loops
            await CapacitorUpdater.notifyAppReady();

            // 2. Fetch the latest version from Supabase
            const { data, error } = await window.db
                .from('app_versions')
                .select('version, zip_url')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !data) return;

            // 3. If a newer version exists in the DB, trigger the UI Modal
            if (data.version !== CURRENT_APP_VERSION) {
                showUpdateModal(data.version, data.zip_url);
            }
        } catch (err) {
            console.error('OTA Update process failed:', err);
        }
    }

    function showUpdateModal(newVersion, zipUrl) {
        // Inject Premium Branded CSS
        const style = document.createElement('style');
        style.textContent = `
            .bryt-update-overlay { position: fixed; inset: 0; background: rgba(11, 18, 32, 0.85); backdrop-filter: blur(6px); z-index: 9999999; display: flex; align-items: center; justify-content: center; padding: 20px; font-family: system-ui, -apple-system, sans-serif; opacity: 0; animation: fadeIn 0.3s forwards; }
            @keyframes fadeIn { to { opacity: 1; } }
            .bryt-update-card { background: #ffffff; width: 100%; max-width: 340px; border-radius: 20px; padding: 30px 24px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.2); border: 1px solid #f1f5f9; transform: translateY(20px); animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
            html.dark-theme .bryt-update-card { background: #1e293b; border-color: #334155; }
            @keyframes slideUp { to { transform: translateY(0); } }
            .update-icon { width: 64px; height: 64px; background: rgba(29, 94, 208, 0.1); color: #1D5ED0; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
            html.dark-theme .update-icon { background: rgba(29, 94, 208, 0.15); }
            .update-icon svg { width: 32px; height: 32px; }
            .update-title { font-size: 1.3rem; font-weight: 800; color: #0B1220; margin: 0 0 10px 0; }
            html.dark-theme .update-title { color: #f8fafc; }
            .update-desc { font-size: 0.85rem; color: #64748b; line-height: 1.5; margin: 0 0 24px 0; font-weight: 500; }
            html.dark-theme .update-desc { color: #94a3b8; }
            .update-version { display: inline-block; background: #f1f5f9; color: #1D5ED0; font-size: 0.75rem; font-weight: 800; padding: 4px 10px; border-radius: 8px; margin-bottom: 20px; }
            html.dark-theme .update-version { background: rgba(29, 94, 208, 0.1); color: #60a5fa; }
            .update-btn { width: 100%; padding: 14px; background: #1D5ED0; color: #fff; font-size: 0.95rem; font-weight: 800; border: none; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; margin-bottom: 12px; }
            .update-btn:active { transform: scale(0.96); }
            .update-btn.loading { background: #64748b; cursor: not-allowed; }
            .skip-btn { width: 100%; padding: 14px; background: transparent; color: #64748b; font-size: 0.9rem; font-weight: 700; border: none; cursor: pointer; transition: 0.2s; }
            .skip-btn:active { color: #0B1220; }
            html.dark-theme .skip-btn:active { color: #f8fafc; }
            .spinner-mini { width: 18px; height: 18px; border: 2.5px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite; display: none; }
            .update-btn.loading .spinner-mini { display: block; }
        `;
        document.head.appendChild(style);

        // Inject DOM
        const overlay = document.createElement('div');
        overlay.className = 'bryt-update-overlay';
        overlay.innerHTML = `
            <div class="bryt-update-card">
                <div class="update-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                </div>
                <h2 class="update-title">New Update Available</h2>
                <span class="update-version">Version ${newVersion}</span>
                <p class="update-desc">A new version of BRYT Pay is available. Update now to get the latest features, security upgrades, and bug fixes.</p>
                <button type="button" class="update-btn" id="btn-update-now">
                    <div class="spinner-mini"></div>
                    <span id="update-btn-text">Download & Install</span>
                </button>
                <button type="button" class="skip-btn" id="btn-update-later">Later</button>
            </div>
        `;
        document.body.appendChild(overlay);

        const btnNow = overlay.querySelector('#btn-update-now');
        const btnLater = overlay.querySelector('#btn-update-later');
        const btnText = overlay.querySelector('#update-btn-text');

        // Allow users to skip the update temporarily
        btnLater.addEventListener('click', () => {
            overlay.style.display = 'none';
        });

        // Execute Download & Installation
        // Execute Download & Installation
        btnNow.addEventListener('click', async () => {
            if (btnNow.classList.contains('loading')) return;
            
            btnNow.classList.add('loading');
            btnText.textContent = 'Downloading...';
            btnLater.style.display = 'none';

            try {
                const { CapacitorUpdater } = window.Capacitor.Plugins;
                
                // 1. Download the Zip to the device
                const update = await CapacitorUpdater.download({
                    url: zipUrl,
                    version: newVersion
                });

                btnText.textContent = 'Restarting App...';

                // 2. Apply and Reload instantly
                await CapacitorUpdater.set({ id: update.id });
                
            } catch (err) {
                // NEW: This will show you exactly WHY it failed on the phone!
                btnNow.classList.remove('loading');
                btnNow.style.background = '#ef4444';
                
                // Show a short error on the button
                btnText.textContent = 'Failed (Tap to see error)';
                btnLater.style.display = 'block';
                
                // Show a detailed native popup with the exact error message
                alert("OTA UPDATE ERROR: " + (err.message || JSON.stringify(err)));
            }
        });
    }
});