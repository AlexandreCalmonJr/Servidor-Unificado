/**
 * frontend/js/state-store.js
 * StateStore reativo leve em Vanilla JS para o Painel MDM (Fase P4)
 * Elimina discrepâncias entre telas, cards e modais através de uma fonte única de verdade.
 */

const StateStore = (() => {
    // Armazenamento em memória
    const assets = new Map();
    const moduleStats = new Map();
    let serverStatus = {
        device_count: 0,
        active_devices: 0,
        provisioned_devices: 0,
        pending_commands: 0,
        cpu_usage: 0,
        memory_usage: 0,
        uptime: 0,
    };
    let connectionState = {
        status: 'disconnected', // 'connected' | 'connecting' | 'disconnected'
        attempts: 0,
        lastConnectedAt: null,
    };

    // PubSub com Sets para evitar listeners duplicados
    const listeners = new Map();

    function on(event, callback) {
        if (!listeners.has(event)) {
            listeners.set(event, new Set());
        }
        listeners.get(event).add(callback);
        // Retorna função para desinscrever facilmente
        return () => off(event, callback);
    }

    function off(event, callback) {
        if (listeners.has(event)) {
            listeners.get(event).delete(callback);
        }
    }

    function emit(event, data) {
        if (listeners.has(event)) {
            listeners.get(event).forEach((cb) => {
                try {
                    cb(data);
                } catch (err) {
                    console.error(`[StateStore] Erro no listener de "${event}":`, err);
                }
            });
        }
        // Listener curinga para monitoramento e debug
        if (listeners.has('*')) {
            listeners.get('*').forEach((cb) => {
                try {
                    cb({ event, data });
                } catch (err) {
                    console.error('[StateStore] Erro no listener curinga:', err);
                }
            });
        }
    }

    // ── GESTÃO DE ATIVOS ──────────────────────────────────────────────
    function upsertAsset(asset, options = {}) {
        if (!asset) return null;
        const id = String(asset._id || asset.id || asset.serial_number);
        if (!id) return null;

        const previous = assets.get(id);
        const merged = { ...(previous || {}), ...asset };
        assets.set(id, merged);

        if (!options.silent) {
            emit('asset:upsert', merged);

            // Emite mudança de status se houve alteração
            if (previous && previous.status !== merged.status) {
                emit('asset:status_change', {
                    assetId: id,
                    previousStatus: previous.status,
                    newStatus: merged.status,
                    asset: merged,
                });
            }
        }
        return merged;
    }

    function upsertAssets(items, options = {}) {
        if (!Array.isArray(items)) return [];
        const result = items.map((item) => upsertAsset(item, { silent: true }));
        if (!options.silent) {
            emit('assets:batch_update', result);
        }
        return result;
    }

    function updateAssetStatus(assetId, newStatus, extra = {}) {
        if (!assetId || !newStatus) return;
        const id = String(assetId);
        const current = assets.get(id) || { _id: id, id };
        const previousStatus = current.status;

        current.status = newStatus;
        current.last_seen = extra.last_seen || new Date().toISOString();
        if (extra.hostname) current.hostname = extra.hostname;
        if (extra.health_status) current.health_status = extra.health_status;
        if (extra.health_issues) current.health_issues = extra.health_issues;

        assets.set(id, current);

        // Atualiza contadores locais do módulo se o módulo for conhecido
        if (current.module_id && moduleStats.has(String(current.module_id))) {
            const stats = moduleStats.get(String(current.module_id));
            if (previousStatus !== newStatus) {
                if (previousStatus === 'online' && stats.online > 0) stats.online--;
                if (previousStatus === 'offline' && stats.offline > 0) stats.offline--;
                if (newStatus === 'online') stats.online++;
                if (newStatus === 'offline') stats.offline++;
                emit('module_stats:update', { moduleId: current.module_id, stats });
            }
        }

        emit('asset:status_change', {
            assetId: id,
            previousStatus,
            newStatus,
            asset: current,
            extra,
        });
    }

    function removeAsset(assetId) {
        if (!assetId) return;
        const id = String(assetId);
        const removed = assets.get(id);
        assets.delete(id);
        emit('asset:remove', { assetId: id, asset: removed });
    }

    function getAsset(assetId) {
        return assets.get(String(assetId)) || null;
    }

    function getAllAssets() {
        return Array.from(assets.values());
    }

    function getAssetsByModule(moduleId) {
        const mid = String(moduleId);
        return Array.from(assets.values()).filter((a) => String(a.module_id) === mid);
    }

    // ── GESTÃO DE STATS DE MÓDULOS ────────────────────────────────────
    function setModuleStats(moduleId, stats) {
        if (!moduleId || !stats) return;
        const mid = String(moduleId);
        moduleStats.set(mid, stats);
        emit('module_stats:update', { moduleId: mid, stats });
    }

    function getModuleStats(moduleId) {
        return moduleStats.get(String(moduleId)) || null;
    }

    // ── GESTÃO DE SERVIDOR ────────────────────────────────────────────
    function setServerStatus(data) {
        if (!data) return;
        serverStatus = { ...serverStatus, ...data };
        emit('server:status_update', serverStatus);
    }

    function getServerStatus() {
        return { ...serverStatus };
    }

    // ── GESTÃO DE CONEXÃO WEBSOCKET ───────────────────────────────────
    function setConnectionState(status, details = {}) {
        connectionState = {
            ...connectionState,
            status,
            ...details,
        };
        if (status === 'connected') {
            connectionState.lastConnectedAt = new Date().toISOString();
            connectionState.attempts = 0;
        }
        emit('connection:change', connectionState);
    }

    function getConnectionState() {
        return { ...connectionState };
    }

    function clear() {
        assets.clear();
        moduleStats.clear();
        serverStatus = {
            device_count: 0,
            active_devices: 0,
            provisioned_devices: 0,
            pending_commands: 0,
            cpu_usage: 0,
            memory_usage: 0,
            uptime: 0,
        };
        emit('store:cleared', {});
    }

    // Interface pública exposta
    return {
        on,
        off,
        emit,
        upsertAsset,
        upsertAssets,
        updateAssetStatus,
        removeAsset,
        getAsset,
        getAllAssets,
        getAssetsByModule,
        setModuleStats,
        getModuleStats,
        setServerStatus,
        getServerStatus,
        setConnectionState,
        getConnectionState,
        clear,
    };
})();

// Suporte para Node.js / Jest / Scripts de teste
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateStore;
}
