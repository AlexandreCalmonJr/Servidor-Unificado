// Empty service worker — unregisters itself to prevent stale SW from previous builds
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => {
    self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => client.navigate(client.url));
    });
    return self.registration.unregister();
});
