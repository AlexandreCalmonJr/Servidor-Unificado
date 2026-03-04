// MDM Dashboard — WebSocket Client

const WS = (() => {
    let ws = null;
    let reconnectTimer = null;
    let reconnectDelay = 2000;
    const MAX_RECONNECT_DELAY = 30000;

    // ─── CORREÇÃO: handlers registrados como Map de conjuntos para evitar
    // duplicatas quando o módulo é avaliado múltiplas vezes ou on() é chamado
    // repetidamente para o mesmo tipo/callback.
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
            ws.send(JSON.stringify({
                type: 'register',
                clientId: 'panel-' + Date.now(),
                role: 'panel',
            }));
        };

        ws.onmessage = (event) => {
            try { dispatch(JSON.parse(event.data)); } catch (e) { /* non-JSON */ }
        };

        ws.onclose = () => { updateIndicator(false); scheduleReconnect(); };
        ws.onerror = () => { updateIndicator(false); };
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
        if (handlers[type]) handlers[type].forEach(fn => fn(msg));
        if (handlers['*']) handlers['*'].forEach(fn => fn(msg));
    }

    // ─── CORREÇÃO: on() verifica duplicatas antes de registrar ───────────────
    function on(type, callback) {
        if (!handlers[type]) handlers[type] = [];
        // Evita registrar o mesmo callback duas vezes para o mesmo tipo
        if (!handlers[type].includes(callback)) {
            handlers[type].push(callback);
        }
    }

    function off(type, callback) {
        if (!handlers[type]) return;
        handlers[type] = handlers[type].filter(fn => fn !== callback);
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (API.getToken()) connect();
    });

    // ===== Handlers de status de ativos =====
    // Registrados aqui uma única vez no nível do módulo — nunca duplicam.

    function onAssetOnline(msg) {
        const label = msg.hostname || msg.serialNumber || msg.assetId || 'Ativo';
        _updateAssetRow(msg.assetId, 'online');
        showToast(`📱 ${label} ficou online`, 'success');
        if (typeof window.DashboardRefresh === 'function') window.DashboardRefresh();
    }

    function onAssetOffline(msg) {
        const label = msg.hostname || msg.serialNumber || msg.assetId || 'Ativo';
        _updateAssetRow(msg.assetId, 'offline');
        showToast(`📱 ${label} ficou offline`, 'warning');
        if (typeof window.DashboardRefresh === 'function') window.DashboardRefresh();
    }

    // Backward-compat
    function onDeviceOnline(msg) {
        _updateAssetRow(msg.deviceId, 'online');
        showToast(`📱 ${msg.hostname || msg.deviceId || 'Dispositivo'} ficou online`, 'success');
    }

    function onDeviceOffline(msg) {
        _updateAssetRow(msg.deviceId, 'offline');
        showToast(`📱 ${msg.hostname || msg.deviceId || 'Dispositivo'} ficou offline`, 'warning');
    }

    on('asset_online', onAssetOnline);
    on('asset_offline', onAssetOffline);
    on('device_online', onDeviceOnline);
    on('device_offline', onDeviceOffline);

    on('notification', (msg) => {
        const { title, message, severity, event } = msg;
        const icon = severity === 'success' ? '✅' : severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️';
        showToast(`${icon} ${title}\n${message}`, severity);

        if (event === 'token_created' && typeof window.loadTokens === 'function') window.loadTokens();
        else if (event === 'device_enrolled' && typeof window.loadModules === 'function') window.loadModules();
        else if (event === 'command_executed' && typeof window.loadCommands === 'function') window.loadCommands();
    });

    on('dashboard_update', (msg) => {
        if (typeof window.updateDashboard === 'function') {
            window.updateDashboard(msg.moduleId, msg.stats);
        }
    });

    function _updateAssetRow(assetId, status) {
        if (!assetId) return;
        [
            ...document.querySelectorAll(`tr[data-asset-id="${assetId}"]`),
            ...document.querySelectorAll(`tr[data-device-id="${assetId}"]`),
        ].forEach(row => {
            const badge = row.querySelector('.status-badge');
            if (badge) {
                badge.className = `status-badge ${status === 'online' ? 'online' : 'offline'}`;
                badge.textContent = status === 'online' ? 'Online' : 'Offline';
            }
        });
    }

    return { connect, on, off };
})();