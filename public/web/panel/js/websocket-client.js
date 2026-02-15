// MDM Dashboard — WebSocket Client
// Connects to the server's WebSocket and handles real-time updates

const WS = (() => {
    let ws = null;
    let reconnectTimer = null;
    let reconnectDelay = 2000;
    const MAX_RECONNECT_DELAY = 30000;
    const handlers = {};

    function getWsUrl() {
        const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${proto}//${location.host}/ws`;
    }

    function connect() {
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

        try {
            ws = new WebSocket(getWsUrl());
        } catch (e) {
            scheduleReconnect();
            return;
        }

        ws.onopen = () => {
            reconnectDelay = 2000;
            updateIndicator(true);

            // Register as panel client
            ws.send(JSON.stringify({
                type: 'register',
                clientId: 'panel-' + Date.now(),
                role: 'panel'
            }));
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                dispatch(msg);
            } catch (e) {
                // ignore non-JSON messages
            }
        };

        ws.onclose = () => {
            updateIndicator(false);
            scheduleReconnect();
        };

        ws.onerror = () => {
            updateIndicator(false);
        };
    }

    function scheduleReconnect() {
        if (reconnectTimer) return;
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            reconnectDelay = Math.min(reconnectDelay * 1.5, MAX_RECONNECT_DELAY);
            connect();
        }, reconnectDelay);
    }

    function updateIndicator(connected) {
        const dot = document.getElementById('ws-status-dot');
        if (dot) {
            dot.classList.toggle('connected', connected);
            dot.title = connected ? 'WebSocket conectado' : 'WebSocket desconectado';
        }
    }

    function dispatch(msg) {
        const type = msg.type;
        if (handlers[type]) {
            handlers[type].forEach(fn => fn(msg));
        }
        if (handlers['*']) {
            handlers['*'].forEach(fn => fn(msg));
        }
    }

    function on(type, callback) {
        if (!handlers[type]) handlers[type] = [];
        handlers[type].push(callback);
    }

    function off(type, callback) {
        if (!handlers[type]) return;
        handlers[type] = handlers[type].filter(fn => fn !== callback);
    }

    // Auto-connect when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        if (API.getToken()) connect();
    });

    // ===== Built-in handlers for device status updates =====

    on('device_online', (msg) => {
        updateDeviceRow(msg.deviceId, 'online', msg.hostname);
        showToast(`📱 ${msg.hostname || 'Dispositivo'} ficou online`, 'success');
    });

    on('device_offline', (msg) => {
        updateDeviceRow(msg.deviceId, 'offline', msg.hostname);
        showToast(`📱 ${msg.hostname || 'Dispositivo'} ficou offline`, 'warning');
    });

    function updateDeviceRow(deviceId, status, hostname) {
        // Update device table rows if visible
        const rows = document.querySelectorAll(`tr[data-device-id="${deviceId}"]`);
        rows.forEach(row => {
            const badge = row.querySelector('.status-badge');
            if (badge) {
                badge.className = 'status-badge ' + status;
                badge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
            }
        });

        // Update dashboard counter if on dashboard
        if (typeof window.DashboardRefresh === 'function') {
            window.DashboardRefresh();
        }
    }

    return { connect, on, off };
})();
