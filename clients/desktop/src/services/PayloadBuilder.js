/**
 * PayloadBuilder.js
 * Responsável por construir payloads específicos para cada tipo de ativo
 * Extraído de: CommandPoller.js → buildLegacyPayload + sendToModuleSystem
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PAYLOAD VALIDATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function hasValidValue(value) {
    if (value == null || value === undefined) return false;
    const str = String(value).trim();
    if (!str || str === 'N/A' || str.toLowerCase() === 'null') return false;
    if (/^(0+|0+:0+:0+.*)$/.test(str)) return false;
    return true;
}

function validatePayload(payload, moduleType) {
    const errors = [];
    const warnings = [];

    if (!hasValidValue(payload.serial_number)) errors.push('Serial number inválido ou ausente');
    if (!hasValidValue(payload.asset_name)) errors.push('Asset name inválido ou ausente');
    if (!hasValidValue(payload.hostname)) {
        warnings.push('Hostname ausente - usando fallback');
        payload.hostname = payload.asset_name || 'UNKNOWN';
    }

    const type = (moduleType || '').toLowerCase();
    if (type === 'notebook') {
        if (!hasValidValue(payload.battery_level)) warnings.push('Nível de bateria não detectado');
        if (!hasValidValue(payload.mac_address_radio)) warnings.push('BSSID não detectado - localização WiFi indisponível');
    }
    if (type === 'desktop') {
        if (!hasValidValue(payload.biometric_reader)) warnings.push('Status do leitor biométrico não detectado');
    }
    if (type === 'printer') {
        if (!hasValidValue(payload.printer_status)) errors.push('Status da impressora obrigatório');
    }
    if (type === 'totem') {
        // Totem: serial + hostname são obrigatórios
        if (!hasValidValue(payload.printer_status)) warnings.push('Status da impressora não detectado');
    }

    return { isValid: errors.length === 0, errors, warnings };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LEGACY PAYLOAD (para /api/monitor — totem legado)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildLegacyPayload(coreInfo, assetName) {
    return {
        serial_number: coreInfo.serial_number,
        serialNumber: coreInfo.serial_number, // Compatibilidade com endpoint legado
        hostname: coreInfo.hostname,
        device_name: assetName || coreInfo.hostname,
        asset_name: assetName || coreInfo.hostname,
        mac_address_radio: coreInfo.mac_address_radio,
        biometric_reader: coreInfo.biometric_reader || 'N/A',
        biometricReaderStatus: coreInfo.biometric_reader || 'N/A', // Legacy field
        printer_status: coreInfo.printer_status || 'N/A',
        printerStatus: coreInfo.printer_status || 'N/A', // Legacy field
        zebra_status: coreInfo.zebra_status || 'N/A',
        zebraStatus: coreInfo.zebra_status || 'N/A', // Legacy field
        bematech_status: coreInfo.bematech_status || 'N/A',
        bematechStatus: coreInfo.bematech_status || 'N/A', // Legacy field
        totem_type: coreInfo.totem_type || 'Generic',
        totemType: coreInfo.totem_type || 'Generic', // Legacy field
        ram: coreInfo.ram || 'N/A',
        storage_type: coreInfo.storage_type || 'N/A',
        hdType: coreInfo.storage_type || 'N/A', // Legacy field
        storage: coreInfo.storage || 'N/A',
        hdStorage: coreInfo.storage || 'N/A', // Legacy field
        model: coreInfo.model || 'N/A',
        ip_address: coreInfo.ip_address,
        installed_programs: coreInfo.installed_programs || [],
        sector: 'Padrão',
        floor: 0,
        timestamp: new Date().toISOString(),
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODULE-BASED PAYLOAD (para /api/modules/{moduleId}/assets)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Prepara payload específico por tipo de módulo
 * @param {Object} coreInfo - Dados coletados do sistema
 * @param {string} moduleType - Tipo do módulo (desktop, notebook, panel, totem, etc)
 * @param {string} sector - Setor da localização
 * @param {string} floor - Andar
 * @param {string} assetName - Nome manual do ativo (opcional)
 * @returns {Object} Payload pronto para envio
 */
function buildModulePayload(coreInfo, moduleType, sector, floor, assetName) {
    const payload = {
        ...coreInfo,
        custom_data: { sector: sector || '', floor: floor || '' },
    };

    if (assetName && assetName.trim()) {
        console.log(`[PayloadBuilder] Usando Nome do Ativo manual: ${assetName}`);
        payload.asset_name = assetName.trim();
    }

    const type = (moduleType || '').toLowerCase();

    // Ajustes específicos por tipo
    switch (type) {
        case 'desktop':
            console.log('[PayloadBuilder] 💻 Preparando dados de Desktop...');
            delete payload.battery_level;
            delete payload.battery_health;
            break;

        case 'notebook':
            console.log('[PayloadBuilder] 💼 Preparando dados de Notebook...');
            delete payload.biometric_reader;
            delete payload.connected_printer;
            if (payload.battery_level == null) {
                console.warn('[PayloadBuilder] ⚠️ Nível de bateria nulo. Usando 0.');
                payload.battery_level = 0;
                payload.battery_health = payload.battery_health || 'Não detectada';
            }
            break;

        case 'panel':
            console.log('[PayloadBuilder] 📺 Preparando dados de Painel...');
            delete payload.battery_level;
            delete payload.battery_health;
            delete payload.biometric_reader;
            payload.screen_size = payload.screen_size || 'N/A';
            payload.resolution = payload.resolution || '1920x1080';
            payload.brightness = 100;
            payload.volume = 50;
            payload.hdmi_input = 'HDMI 1';
            payload.firmware_version = payload.os_version || 'N/A';
            payload.is_online = true;
            payload.current_content = 'Default Playlist';
            payload.content_last_updated = new Date().toISOString();
            payload.connected_devices = [];
            break;

        case 'totem':
            console.log('[PayloadBuilder] 🖥️ Preparando dados de Totem...');
            // Totem: mantém dados como estão, compatível com ManagedAsset
            payload.printer_status = payload.printer_status || 'N/A';
            payload.zebra_status = payload.zebra_status || 'N/A';
            payload.bematech_status = payload.bematech_status || 'N/A';
            break;

        case 'mobile':
            console.log('[PayloadBuilder] 📱 Preparando dados de Mobile...');
            // Mobile: remove dados desktop-specific
            delete payload.biometric_reader;
            delete payload.connected_printer;
            break;

        default:
            console.log(`[PayloadBuilder] Tipo ${type} sem tratamento específico`);
    }

    return payload;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

module.exports = {
    validatePayload,
    buildLegacyPayload,
    buildModulePayload,
    hasValidValue,
};
