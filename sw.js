const CACHE_NAME = 'brytpay-pwa-v3';
const OFFLINE_URL = '/offline.html';

const ASSETS_TO_CACHE = [
    OFFLINE_URL,
    '/favicon.ico',
    '/assets/img/brytpay-logo.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match(OFFLINE_URL);
            })
        );
    }
});

// 🚀 Listen for incoming Push Notifications from Supabase
self.addEventListener('push', function(event) {
    if (!event.data) return;
    
    let data = {};
    try {
        data = event.data.json();
    } catch (e) {
        data = { body: event.data.text() };
    }
    
    const options = {
        body: data.body || 'You have a new notification from BRYT Pay.',
        icon: data.icon || '/assets/img/brytpay-logo.png',
        badge: '/assets/img/brytpay-logo.png', // Small icon for Android status bar
        vibrate: [200, 100, 200],
        data: { url: data.url || '/dashboard/' }
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'BRYT Pay', options)
    );
});

// 🚀 Handle when a user taps the notification
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // If the app is already open, just focus it and navigate
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url && 'focus' in client) {
                    client.navigate(event.notification.data.url);
                    return client.focus();
                }
            }
            // If the app is closed, open a new window
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});