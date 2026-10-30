// MDM Dashboard — WebSocket Client (Modernizado P4 com Resiliência e Estado Único)

const WS = (() => {
    let ws = null;
    let reconnectTimer = null;
    let reconnectAttempts = 0;
    const INITIAL_RECONNECT_DELAY = 1000;
    const MAX_RECONNECT_DELAY = 30000;
    const BACKOFF_MULTIPLIER = 1.5;

    const handlers = {};

    function getWsUrl() {
        const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${proto}//${location.host}/ws`;
    }

    function connect() {
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        updateBanner('connecting', '⏳ Conectando ao servidor em tempo real...');
        if (typeof StateStore !== 'undefined') {
            StateStore.setConnectionState('connecting', { attempts: reconnectAttempts });
        }

        try {
            const token = typeof API !== 'undefined' ? API.getToken() : null;
            const protocols = token ? [`mdm.jwt.${token}`] : undefined;
            ws = protocols ? new WebSocket(getWsUrl(), protocols) : new WebSocket(getWsUrl());
        } catch (e) {
            console.warn('[WS] Falha ao instanciar WebSocket:', e.message);
            scheduleReconnect();
            return;
        }

        ws.onopen = () => {
            console.log('✅ [WS] Conectado ao servidor');
            const wasReconnecting = reconnectAttempts > 0;
            reconnectAttempts = 0;

            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }

            updateIndicator(true);
            updateBanner('connected', '✅ Conectado em tempo real');

            if (typeof StateStore !== 'undefined') {
                StateStore.setConnectionState('connected', { attempts: 0 });
            }

            // Identificação do painel
            try {
                ws.send(JSON.stringify({
                    type: 'register',
                    clientId: 'panel-' + Date.now(),
                    role: 'panel',
                }));
            } catch {}

            // Re-sincronização sem recarregar a tela inteira
            if (wasReconnecting) {
                syncActiveView();
            }
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                dispatch(msg);
            } catch (e) {
                // Mensagem não-JSON ignorada
            }
        };

        ws.onclose = (event) => {
            console.warn('[WS] Conexão encerrada:', event.code, event.reason);
            updateIndicator(false);
            if (typeof StateStore !== 'undefined') {
                StateStore.setConnectionState('disconnected', { attempts: reconnectAttempts });
            }
            scheduleReconnect();
        };

        ws.onerror = (err) => {
            console.warn('[WS] Erro de transporte:', err);
            updateIndicator(false);
        };
    }

    function calculateBackoffWithJitter(attempt) {
        // Exponencial: delay * 1.5^attempt
        const expDelay = Math.min(
            INITIAL_RECONNECT_DELAY * Math.pow(BACKOFF_MULTIPLIER, attempt),
            MAX_RECONNECT_DELAY
        );
        // Jitter entre 80% e 120% do delay para evitar manada
        const jitter = 0.8 + Math.random() * 0.4;
        return Math.round(expDelay * jitter);
    }

    function scheduleReconnect() {
        if (reconnectTimer) return;

        reconnectAttempts++;
        const delay = calculateBackoffWithJitter(reconnectAttempts);
        const delaySeconds = Math.max(1, Math.round(delay / 1000));

        updateBanner('disconnected', `⚠️ Desconectado do servidor. Tentando reconectar em ${delaySeconds}s... (Tentativa ${reconnectAttempts})`);

        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect();
        }, delay);
    }

    function updateIndicator(connected) {
        const dot = document.getElementById('ws-status-dot');
        if (dot) {
            dot.classList.toggle('connected', connected);
            dot.title = connected ? 'WebSocket conectado' : 'WebSocket desconectado';
        }
    }

    function updateBanner(status, message) {
        let banner = document.getElementById('ws-connection-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'ws-connection-banner';
            banner.className = 'ws-banner';
            document.body.prepend(banner);
        }

        banner.className = `ws-banner ws-banner-${status}`;
        banner.textContent = message;

        if (status === 'connected') {
            banner.style.display = 'block';
            setTimeout(() => {
                if (banner && banner.classList.contains('ws-banner-connected')) {
                    banner.style.display = 'none';
                }
            }, 2500);
        } else {
            banner.style.display = 'block';
        }
    }

    function syncActiveView() {
        console.log('🔄 [WS] Sincronizando estado da visualização ativa...');
        // Notifica componentes inscritos sobre reconexão
        dispatch({ type: 'ws_reconnected' });

        // Atualização sutil sem recarregar o DOM
        if (typeof window.DynamicAssetManager?.refreshCurrent === 'function') {
            window.DynamicAssetManager.refreshCurrent({ silent: true });
        }
        if (typeof window.loadMetrics === 'function') {
            window.loadMetrics();
        }
    }

    function dispatch(msg) {
        const type = msg.type;
        if (handlers[type]) handlers[type].forEach((fn) => fn(msg));
        if (handlers['*']) handlers['*'].forEach((fn) => fn(msg));
    }

    function on(type, callback) {
        if (!handlers[type]) handlers[type] = [];
        if (!handlers[type].includes(callback)) {
            handlers[type].push(callback);
        }
    }

    function off(type, callback) {
        if (!handlers[type]) return;
        handlers[type] = handlers[type].filter((fn) => fn !== callback);
    }

    function send(data) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(typeof data === 'string' ? data : JSON.stringify(data));
            return true;
        }
        return false;
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (typeof API !== 'undefined' && API.getToken()) {
            connect();
        }
    });

    // ===== Handlers Reativos de Ativos e Módulos =====

    function onAssetStatusUpdate(assetId, status, extra = {}) {
        if (!assetId) return;

        // 1. Atualiza StateStore centralizado
        if (typeof StateStore !== 'undefined') {
            StateStore.updateAssetStatus(assetId, status, extra);
        }

        // 2. Atualiza atomicamente as linhas das tabelas no DOM sem piscar a tela
        _updateAssetRow(assetId, status, extra);
    }

    function onAssetOnline(msg) {
        const assetId = msg.assetId || msg.deviceId;
        const label = msg.hostname || msg.serialNumber || assetId || 'Ativo';
        onAssetStatusUpdate(assetId, 'online', msg);
        if (typeof showToast === 'function') {
            showToast(`📱 ${label} ficou online`, 'success');
        }
    }

    function onAssetOffline(msg) {
        const assetId = msg.assetId || msg.deviceId;
        const label = msg.hostname || msg.serialNumber || assetId || 'Ativo';
        onAssetStatusUpdate(assetId, 'offline', msg);
        if (typeof showToast === 'function') {
            showToast(`📱 ${label} ficou offline`, 'warning');
        }
    }

    on('asset_online', onAssetOnline);
    on('asset_offline', onAssetOffline);
    on('device_online', onAssetOnline);
    on('device_offline', onAssetOffline);

    on('notification', (msg) => {
        const { title, message, severity, event } = msg;
        const icon = severity === 'success' ? '✅' : severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️';
        if (typeof showToast === 'function') {
            showToast(`${icon} ${title}\n${message}`, severity);
        }

        if (event === 'token_created' && typeof window.loadTokens === 'function') window.loadTokens();
        else if (event === 'device_enrolled' && typeof window.loadModules === 'function') window.loadModules();
        else if (event === 'command_executed' && typeof window.loadCommands === 'function') window.loadCommands();
    });

    on('dashboard_update', (msg) => {
        if (typeof StateStore !== 'undefined' && msg.moduleId && msg.stats) {
            StateStore.setModuleStats(msg.moduleId, msg.stats);
        }
        if (typeof window.updateDashboardCard === 'function') {
            window.updateDashboardCard(msg.moduleId, msg.stats);
        }
    });

    function _updateAssetRow(assetId, status, extra = {}) {
        if (!assetId) return;
        const rows = [
            ...document.querySelectorAll(`tr[data-asset-id="${assetId}"]`),
            ...document.querySelectorAll(`tr[data-device-id="${assetId}"]`),
        ];

        rows.forEach((row) => {
            // Atualiza status badge com estilo suave
            const badge = row.querySelector('.status-badge') || row.querySelector('span[class*="status"]');
            if (badge) {
                const isOnline = status === 'online';
                badge.className = `status-badge ${isOnline ? 'online' : 'offline'}`;
                badge.textContent = isOnline ? 'Online' : 'Offline';
            }

            // Atualiza timestamp de última conexão se disponível
            const lastSeenCell = row.querySelector('.last-seen-cell') || row.querySelector('td:nth-last-child(2)');
            if (lastSeenCell && typeof TimeFormatter !== 'undefined') {
                const now = extra.last_seen || new Date().toISOString();
                lastSeenCell.title = new Date(now).toLocaleString('pt-BR');
                lastSeenCell.textContent = TimeFormatter.formatTimeAgo(now);
            }
        });
    }

    return {
        connect,
        scheduleReconnect,
        on,
        off,
        send,
        syncActiveView,
        _updateAssetRow,
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = WS;
}
