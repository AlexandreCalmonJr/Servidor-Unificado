// MDM Dashboard — WebSocket Client
// Eventos emitidos pelo servidor: asset_online, asset_offline (ver websocketServer.js)

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
            ws.send(JSON.stringify({
                type: 'register',
                clientId: 'panel-' + Date.now(),
                role: 'panel',
            }));
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                dispatch(msg);
            } catch (e) { /* non-JSON */ }
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

    function on(type, callback) {
        if (!handlers[type]) handlers[type] = [];
        handlers[type].push(callback);
    }

    function off(type, callback) {
        if (!handlers[type]) return;
        handlers[type] = handlers[type].filter(fn => fn !== callback);
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (API.getToken()) connect();
    });

    // ===== Handlers para asset_online / asset_offline =====
    // O websocketServer.js emite: { type: 'asset_online', assetId, serialNumber, assetType, hostname }
    //                              { type: 'asset_offline', assetId, serialNumber, assetType, hostname }

    on('asset_online', (msg) => {
        const label = msg.hostname || msg.serialNumber || msg.assetId || 'Ativo';
        updateAssetRow(msg.assetId, 'online');
        showToast(`📱 ${label} ficou online`, 'success');
        if (typeof window.DashboardRefresh === 'function') window.DashboardRefresh();
    });

    on('asset_offline', (msg) => {
        const label = msg.hostname || msg.serialNumber || msg.assetId || 'Ativo';
        updateAssetRow(msg.assetId, 'offline');
        showToast(`📱 ${label} ficou offline`, 'warning');
        if (typeof window.DashboardRefresh === 'function') window.DashboardRefresh();
    });

    // Backward-compat: alguns eventos ainda podem usar device_online/offline
    on('device_online', (msg) => {
        const label = msg.hostname || msg.deviceId || 'Dispositivo';
        updateAssetRow(msg.deviceId, 'online');
        showToast(`📱 ${label} ficou online`, 'success');
    });

    on('device_offline', (msg) => {
        const label = msg.hostname || msg.deviceId || 'Dispositivo';
        updateAssetRow(msg.deviceId, 'offline');
        showToast(`📱 ${label} ficou offline`, 'warning');
    });

    function updateAssetRow(assetId, status) {
        // Atualiza qualquer linha de tabela que tenha data-asset-id ou data-device-id
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

    // ===== Handlers para notificações =====
    on('notification', (msg) => {
        const { title, message, severity, event } = msg;
        
        // Mostrar toast
        const icon = severity === 'success' ? '✅' : severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️';
        showToast(`${icon} ${title}\n${message}`, severity);

        // Log específico por evento
        if (event === 'token_created') {
            console.log('🔑 Novo token de provisionamento criado');
            if (typeof window.loadTokens === 'function') window.loadTokens();
        } else if (event === 'device_enrolled') {
            console.log('📱 Novo dispositivo provisionado');
            if (typeof window.loadModules === 'function') window.loadModules();
        } else if (event === 'command_executed') {
            console.log('⌨️ Comando executado');
            if (typeof window.loadCommands === 'function') window.loadCommands();
        }
    });

    // ===== Handler para atualizações de dashboard =====
    on('dashboard_update', (msg) => {
        const { moduleId, stats } = msg;
        console.log(`📊 Dashboard update para módulo ${moduleId}:`, stats);
        if (typeof window.updateDashboard === 'function') {
            window.updateDashboard(moduleId, stats);
        }
    });

    return { connect, on, off };
})();
