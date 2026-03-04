// MDM Dashboard — Notification System
//
// ─── CORREÇÃO ────────────────────────────────────────────────────────────────
// A versão anterior fazia polling de /api/monitoring/assets a cada 30s para
// detectar mudanças de status e disparar toasts. Isso é redundante porque
// websocket-client.js já faz exatamente isso via eventos asset_online /
// asset_offline em tempo real, sem custo de polling.
//
// Este arquivo mantém a interface pública (NotificationSystem.init) para não
// quebrar código que já chame isso, mas não faz mais polling. A lógica de
// notificação de status vive exclusivamente em websocket-client.js.
// ─────────────────────────────────────────────────────────────────────────────

const NotificationSystem = (() => {
    let isInitialized = false;

    function init() {
        if (isInitialized) return;
        isInitialized = true;
        // WebSocket em websocket-client.js cuida de todos os alertas de status.
        // Nada a fazer aqui.
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(NotificationSystem.init, 5000);
});