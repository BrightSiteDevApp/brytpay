document.addEventListener('DOMContentLoaded', async () => {
    // Only run if the app is opened on a native Android/iOS device
    if (window.Capacitor && window.Capacitor.Plugins.CapacitorUpdater) {
        const { CapacitorUpdater } = window.Capacitor.Plugins;

        // 🛑 This is your current version. Change this number in your code 
        // right before you zip your files for a new update!
        const CURRENT_APP_VERSION = '1.0.0'; 

        try {
            // 1. Tell the plugin the app booted successfully (prevents boot loops)
            await CapacitorUpdater.notifyAppReady();

            // 2. Fetch the latest version from your Supabase database
            const { data, error } = await window.db
                .from('app_versions')
                .select('version, zip_url')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !data) return;

            // 3. If the database version is newer, download and apply the update
            if (data.version !== CURRENT_APP_VERSION) {
                console.log(`New version ${data.version} found. Downloading silently...`);
                
                // Download the .zip file from your storage bucket
                const update = await CapacitorUpdater.download({
                    url: data.zip_url,
                    version: data.version
                });

                // Apply the update! The app will instantly refresh with the new code.
                await CapacitorUpdater.set({ id: update.id });
            }
        } catch (err) {
            console.error('OTA Update process failed:', err);
        }
    }
});