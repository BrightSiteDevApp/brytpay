document.addEventListener('DOMContentLoaded', async () => {
    if (window.Capacitor && window.Capacitor.Plugins.PushNotifications) {
        const { PushNotifications } = window.Capacitor.Plugins;

        // 1. CUSTOM BRYT PAY TOAST INJECTOR
        const showPushToast = (msg, isError = false) => {
            let toast = document.getElementById('push-setup-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'push-setup-toast';
                toast.style.cssText = `
                    position: fixed; top: 20px; left: 16px; right: 16px; margin: 0 auto;
                    background: #ffffff; color: #0B1220; padding: 14px 16px;
                    border-radius: 12px; font-size: 0.85rem; font-weight: 700; z-index: 9999999;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.15); border-left: 4px solid #1D5ED0;
                    display: flex; align-items: flex-start; gap: 10px; transition: 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    opacity: 0; pointer-events: none; max-width: 400px; line-height: 1.4;
                    transform: translateY(-100px);
                `;
                document.body.appendChild(toast);
            }

            toast.style.borderLeftColor = isError ? '#ef4444' : '#10b981';
            toast.innerHTML = `
                <span style="flex-shrink: 0; margin-top: 2px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${isError ? '#ef4444' : '#10b981'}" stroke-width="2.5">
                        ${isError 
                            ? '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>' 
                            : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'}
                    </svg>
                </span>
                <span>${msg}</span>
            `;

            setTimeout(() => {
                toast.style.transform = 'translateY(0)';
                toast.style.opacity = '1';
            }, 100);

            setTimeout(() => {
                toast.style.transform = 'translateY(-100px)';
                toast.style.opacity = '0';
            }, 5000);
        };

        // 2. Request the native Android prompt
        const registerPush = async () => {
            let permStatus = await PushNotifications.checkPermissions();

            if (permStatus.receive === 'prompt') {
                permStatus = await PushNotifications.requestPermissions();
                
                // 🚀 FIX: Only show the toast if they explicitly clicked "Allow" right now
                if (permStatus.receive === 'granted') {
                    showPushToast("Notifications have been turned on!");
                }
            }

            if (permStatus.receive === 'granted') {
                await PushNotifications.register();
            }
        };

        // 3. Listen for the generated device token and silently save it
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

                if (error) {
                    console.error("Token Save Error: ", error.message);
                }
            }
        });

        // 4. Listen for notifications when the app is OPEN (Foreground)
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            showPushToast(`🔔 ${notification.title}: ${notification.body}`);
        });

        // 5. Fire the permission request after splash screen
        setTimeout(() => {
            registerPush();
        }, 2000);
    }
});