document.addEventListener('DOMContentLoaded', async () => {
    // 1. Only run this if the app is running natively in Capacitor
    if (window.Capacitor && window.Capacitor.Plugins.PushNotifications) {
        const { PushNotifications } = window.Capacitor.Plugins;

        // 2. Function to request the native Android prompt
        const registerPush = async () => {
            // This line triggers the native "Allow notifications?" popup!
            let permStatus = await PushNotifications.checkPermissions();

            if (permStatus.receive === 'prompt') {
                permStatus = await PushNotifications.requestPermissions();
            }

            if (permStatus.receive === 'granted') {
                // If they click "Allow", register the device with Google/Firebase
                await PushNotifications.register();
            }
        };

        // 3. Listen for the generated device token
        PushNotifications.addListener('registration', async (token) => {
            console.log('Push token received: ', token.value);
            
            // Save the token to your Supabase push_subscriptions table
            const { data: { session } } = await window.db.auth.getSession();
            if (session) {
                await window.db.from('push_subscriptions').upsert({
                    user_id: session.user.id,
                    token: token.value,
                    platform: 'android',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'token' });
            }
        });

        // 3. Listen for the generated device token
        PushNotifications.addListener('registration', async (token) => {
            console.log('Push token received: ', token.value);
            
            const { data: { session } } = await window.db.auth.getSession();
            if (session) {
                const { error } = await window.db.from('push_subscriptions').upsert({
                    user_id: session.user.id,
                    token: token.value,
                    platform: 'android',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'token' });

                // 🛑 DIAGNOSTIC TRAP:
                if (error) {
                    alert("Token Save Error: " + error.message);
                } else {
                    alert("Android Device Registered Successfully!");
                }
            }
        });
        // 5. Fire the permission request 
        // We delay it slightly (e.g., 2 seconds) so it doesn't interrupt the immediate splash screen load
        setTimeout(() => {
            registerPush();
        }, 2000);
    }
});