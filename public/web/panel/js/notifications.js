/**
 * MDM Dashboard — Notification System
 * Handles real-time alerts for device status changes and system health
 */

const NotificationSystem = (() => {
    let lastDeviceStates = {}; // { serial: { status: 'online', cpu: 10 } }
    let isInitialized = false;
    const POLLING_INTERVAL = 30000; // 30 seconds

    function init() {
        if (isInitialized) return;
        isInitialized = true;

        // Initial fetch to populate state without alerting
        fetchDevices(true);

        // Start polling
        setInterval(() => fetchDevices(false), POLLING_INTERVAL);

        console.log('Notification System Initialized');
    }

    async function fetchDevices(isInitial = false) {
        try {
            const data = await API.get('/devices');
            const devices = Array.isArray(data) ? data : (data.devices || []);

            devices.forEach(device => {
                checkDevice(device, isInitial);
            });
        } catch (err) {
            console.error('Notification System Error:', err);
        }
    }

    function checkDevice(device, isInitial) {
        const serial = device.serial_number || device.serialNumber;
        if (!serial) return;

        const currentStatus = (device.provisioning_status || device.status || 'unknown').toLowerCase();
        const currentCpu = parseFloat(device.cpu_usage || 0); // Assuming API returns cpu_usage
        const deviceName = device.device_name || device.name || serial;

        // Get previous state
        const lastState = lastDeviceStates[serial];

        // 1. Status Change Alert
        if (!isInitial && lastState && lastState.status !== currentStatus) {
            // Only alert for significant changes (Online <-> Offline)
            if (currentStatus === 'online' || currentStatus === 'active') {
                showToast(`🟢 Dispositivo <b>${esc(deviceName)}</b> está Online`, 'success');
                addNotificationLog('online', deviceName, 'Dispositivo conectou-se à rede.');
            } else if (currentStatus === 'offline' || currentStatus === 'failed') {
                showToast(`🔴 Dispositivo <b>${esc(deviceName)}</b> está Offline`, 'error');
                addNotificationLog('offline', deviceName, 'Dispositivo desconectou-se ou parou de responder.');
            }
        }

        // 2. CPU Alert
        if (!isInitial && currentCpu > 90) {
            // Debounce: Only alert if it wasn't already high or if it's been a while (simple check here)
            if (!lastState || lastState.cpu <= 90) {
                showToast(`⚠️ Alta Carga de CPU em <b>${esc(deviceName)}</b>: ${currentCpu}%`, 'warning');
                addNotificationLog('cpu', deviceName, `Uso de CPU crítico: ${currentCpu}%`);
            }
        }

        // Update state
        lastDeviceStates[serial] = {
            status: currentStatus,
            cpu: currentCpu,
            timestamp: Date.now()
        };
    }

    function addNotificationLog(type, deviceName, message) {
        // Here we could persist to localStorage or add to a notification dropdown list
        // For now, we rely on Toasts as requested.
        // If we want a dropdown, we'd append to a list in the DOM.
        updateBellIndicator(true);
    }

    function updateBellIndicator(hasNew) {
        const bell = document.querySelector('.lucide-bell'); // Assuming lucide icon class or parent
        if (bell && hasNew) {
            // Add a red dot if possible, or just animate
            bell.classList.add('text-red-400');
            // setTimeout(() => bell.classList.remove('text-red-400'), 5000);
        }
    }

    return { init };
})();

// Auto-start
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(NotificationSystem.init, 5000); // Start after initial load
});
