// MDM Dashboard — Notification System
// Polling /api/monitoring/assets para alertas de status

const NotificationSystem = (() => {
    let lastAssetStates = {};   // { assetId: { status, cpu } }
    let isInitialized = false;
    const POLLING_INTERVAL = 30000;

    function init() {
        if (isInitialized) return;
        isInitialized = true;

        fetchAssets(true);
        setInterval(() => fetchAssets(false), POLLING_INTERVAL);
    }

    // GET /api/monitoring/assets — todos os ativos
    async function fetchAssets(isInitial = false) {
        try {
            const data = await API.get('/monitoring/assets');
            const assets = Array.isArray(data) ? data : (data.assets || []);
            assets.forEach(a => checkAsset(a, isInitial));
        } catch (err) {
            // silencioso — não interrompe o painel
        }
    }

    function checkAsset(asset, isInitial) {
        const assetId = asset._id || asset.id;
        if (!assetId) return;

        const currentStatus = (asset.status || 'unknown').toLowerCase();
        const assetName = asset.asset_name || asset.name || assetId;
        const lastState = lastAssetStates[assetId];

        if (!isInitial && lastState && lastState.status !== currentStatus) {
            if (['online', 'active'].includes(currentStatus)) {
                showToast(`🟢 ${esc(assetName)} está Online`, 'success');
            } else if (['offline', 'failed', 'inactive'].includes(currentStatus)) {
                showToast(`🔴 ${esc(assetName)} está Offline`, 'error');
            }
        }

        lastAssetStates[assetId] = { status: currentStatus, timestamp: Date.now() };
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(NotificationSystem.init, 5000);
});
