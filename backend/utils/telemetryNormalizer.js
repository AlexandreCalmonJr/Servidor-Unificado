/**
 * backend/utils/telemetryNormalizer.js
 * Pipeline Canônico Unificado de Telemetria (Fase P2)
 *
 * Responsável por:
 * 1. Normalizar grandezas físicas (RAM em MB, disco em GB, bateria 0-100 ou null).
 * 2. Avaliar determinística de saúde de hardware/periféricos (health_status: healthy/degraded/error).
 * 3. Garantir consistência entre conectividade de rede (status: online/quarantine) e erros de periféricos.
 * 4. Normalizar timestamps para UTC ISO-8601 server-side.
 * 5. Sincronizar campos de topo com custom_data para evitar perda de dados (B4 e B5).
 */

function cleanIpAddress(rawIp) {
  if (!rawIp) return null;
  let ip = String(rawIp).trim();
  if (ip.startsWith('::ffff:')) ip = ip.substring(7);
  if (ip.includes(',')) ip = ip.split(',')[0].trim();
  return ip.replace(/[[\]]/g, '');
}

/**
 * Converte qualquer representação de RAM para inteiro em Megabytes (MB)
 */
function parseRamToMb(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    if (val <= 0) return null;
    if (val > 100000000) return Math.round(val / (1024 * 1024)); // Bytes -> MB
    if (val <= 128) return Math.round(val * 1024); // Assume Gigabytes
    return Math.round(val); // Já está em MB
  }

  const str = String(val).trim().toUpperCase();
  const gbMatch = str.match(/([\d.]+)\s*GB?/);
  if (gbMatch) {
    const parsed = parseFloat(gbMatch[1]);
    return isNaN(parsed) ? null : Math.round(parsed * 1024);
  }

  const mbMatch = str.match(/([\d.]+)\s*MB?/);
  if (mbMatch) {
    const parsed = parseFloat(mbMatch[1]);
    return isNaN(parsed) ? null : Math.round(parsed);
  }

  const num = parseFloat(str);
  if (isNaN(num) || num <= 0) return null;
  if (num <= 128) return Math.round(num * 1024);
  return Math.round(num);
}

/**
 * Converte qualquer representação de armazenamento para inteiro em Gigabytes (GB)
 */
function parseStorageToGb(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    if (val <= 0) return null;
    if (val > 10000000000) return Math.round(val / (1024 * 1024 * 1024)); // Bytes -> GB
    if (val > 20000) return Math.round(val / 1024); // MB -> GB
    return Math.round(val);
  }

  const str = String(val).trim().toUpperCase();
  const tbMatch = str.match(/([\d.]+)\s*TB?/);
  if (tbMatch) {
    const parsed = parseFloat(tbMatch[1]);
    return isNaN(parsed) ? null : Math.round(parsed * 1024);
  }

  const gbMatch = str.match(/([\d.]+)\s*GB?/);
  if (gbMatch) {
    const parsed = parseFloat(gbMatch[1]);
    return isNaN(parsed) ? null : Math.round(parsed);
  }

  const mbMatch = str.match(/([\d.]+)\s*MB?/);
  if (mbMatch) {
    const parsed = parseFloat(mbMatch[1]);
    return isNaN(parsed) ? null : Math.round(parsed / 1024);
  }

  const num = parseFloat(str);
  if (isNaN(num) || num <= 0) return null;
  return Math.round(num);
}

/**
 * Converte nível de bateria para inteiro 0-100 ou null quando ausente/inválido
 */
function parseBatteryLevel(val) {
  if (val === null || val === undefined || val === '') return null;
  const num = typeof val === 'number' ? val : parseInt(val, 10);
  if (isNaN(num)) return null;
  if (num < 0 || num > 100) return null; // -1 de desktop vira null
  return Math.round(num);
}

/**
 * Avalia o estado de integridade dos periféricos e hardware (health_status)
 */
function evaluateHardwareHealth(data) {
  const issues = [];
  let status = 'healthy';

  const printer = String(data.printer_status || data.printerStatus || '').trim().toLowerCase();
  const zebra = String(data.zebra_status || data.zebraStatus || '').trim().toLowerCase();
  const bematech = String(data.bematech_status || data.bematechStatus || '').trim().toLowerCase();

  const isError = (val) => /error|erro|falha|offline|desconectad|sem papel|paper out|jam|encravado/i.test(val);
  const isWarning = (val) => /warn|pouco papel|pouco toner|atencao|low/i.test(val);

  if (isError(printer)) {
    status = 'error';
    issues.push(`Impressora: ${data.printer_status || data.printerStatus}`);
  } else if (isWarning(printer)) {
    if (status !== 'error') status = 'degraded';
    issues.push(`Alerta de impressora: ${data.printer_status || data.printerStatus}`);
  }

  if (isError(zebra)) {
    status = 'error';
    issues.push(`Zebra: ${data.zebra_status || data.zebraStatus}`);
  }

  if (isError(bematech)) {
    status = 'error';
    issues.push(`Bematech: ${data.bematech_status || data.bematechStatus}`);
  }

  // Avaliação de disco cheio (< 5% livre = error, < 10% livre = degraded)
  const totalGb = parseStorageToGb(data.storage_total_gb || data.storageTotalGb || data.storage);
  const freeGb = parseStorageToGb(data.storage_free_gb || data.storageFreeGb);
  if (totalGb && freeGb !== null && totalGb > 0) {
    const ratio = freeGb / totalGb;
    if (ratio < 0.05) {
      status = 'error';
      issues.push(`Armazenamento crítico: apenas ${freeGb} GB livres de ${totalGb} GB`);
    } else if (ratio < 0.10) {
      if (status !== 'error') status = 'degraded';
      issues.push(`Armazenamento baixo: ${freeGb} GB livres de ${totalGb} GB`);
    }
  }

  return { health_status: status, health_issues: issues };
}

/**
 * Normaliza um payload de telemetria vindo de qualquer agente (desktop, totem, mobile)
 * @param {Object} rawData - Dados brutos do request
 * @param {Object} options - Opções de contexto (reqIp, isQuarantined, isMaintenance)
 * @returns {Object} Dados normalizados e tipados prontos para o ManagedAsset
 */
function normalizeTelemetry(rawData = {}, options = {}) {
  const data = rawData || {};

  const serialNumber = String(data.serial_number || data.serialNumber || '').trim();
  const assetName = String(data.asset_name || data.assetName || data.hostname || '').trim();
  const assetType = String(data.asset_type || data.assetType || 'desktop').toLowerCase().trim();

  const ramTotalMb = parseRamToMb(data.ram_total_mb || data.ramTotalMb || data.ram);
  const ramFreeMb = parseRamToMb(data.ram_free_mb || data.ramFreeMb || data.available_ram || data.availableRam);
  const storageTotalGb = parseStorageToGb(data.storage_total_gb || data.storageTotalGb || data.storage || data.hdStorage);
  const storageFreeGb = parseStorageToGb(data.storage_free_gb || data.storageFreeGb);
  const batteryLevel = parseBatteryLevel(data.battery_level ?? data.batteryLevel);

  const cleanIp = cleanIpAddress(options.reqIp || data.ip_address || data.ipAddress);
  const printerStatus = data.printer_status ?? data.printerStatus ?? null;
  const zebraStatus = data.zebra_status ?? data.zebraStatus ?? null;
  const bematechStatus = data.bematech_status ?? data.bematechStatus ?? null;
  const biometricReader = data.biometric_reader ?? data.biometricReaderStatus ?? null;

  const { health_status, health_issues } = evaluateHardwareHealth({
    printer_status: printerStatus,
    zebra_status: zebraStatus,
    bematech_status: bematechStatus,
    storage_total_gb: storageTotalGb,
    storage_free_gb: storageFreeGb,
  });

  // Conectividade de rede é separada da saúde de periféricos:
  // Se o dispositivo enviou telemetria, ele está online na rede.
  let networkStatus = 'online';
  if (options.isQuarantined) {
    networkStatus = 'quarantine';
  } else if (options.isMaintenance) {
    networkStatus = 'maintenance';
  }

  // Prepara custom_data garantindo que campos específicos também permaneçam sincronizados
  const rawCustom = data.custom_data
    ? (data.custom_data instanceof Map ? Object.fromEntries(data.custom_data) : data.custom_data)
    : {};

  const custom_data = {
    ...rawCustom,
    printer_status: printerStatus,
    zebra_status: zebraStatus,
    bematech_status: bematechStatus,
    biometric_reader: biometricReader,
    health_status,
    health_issues,
    raw_ram: data.ram || null,
    raw_storage: data.storage || data.hdStorage || null,
  };

  return {
    serial_number: serialNumber,
    asset_name: assetName || `${assetType}-${serialNumber}`,
    asset_type: assetType,
    status: networkStatus,
    health_status,
    health_issues,
    last_seen: new Date(),

    ip_address: cleanIp,
    mac_address: data.mac_address || data.macAddress || null,
    mac_address_radio: data.mac_address_radio || data.macAddressRadio || null,

    hostname: data.hostname || null,
    model: data.model || null,
    manufacturer: data.manufacturer || null,
    processor: data.processor || null,
    processor_cores: data.processor_cores || data.processorCores ? Number(data.processor_cores || data.processorCores) : null,
    operating_system: data.operating_system || data.operatingSystem || null,
    os_version: data.os_version || data.osVersion || null,

    // Métricas numéricas padronizadas
    ram_total_mb: ramTotalMb,
    ram_free_mb: ramFreeMb,
    available_ram: ramFreeMb ? `${ramFreeMb} MB` : (data.available_ram || null),
    ram: ramTotalMb ? `${ramTotalMb} MB` : (data.ram || null),

    storage_total_gb: storageTotalGb,
    storage_free_gb: storageFreeGb,
    storage: storageTotalGb ? `${storageTotalGb} GB` : (data.storage || null),
    storage_type: data.storage_type || data.hdType || null,

    battery_level: batteryLevel,
    battery_health: data.battery_health || data.batteryHealth || null,
    is_notebook: Boolean(data.is_notebook || data.isNotebook),
    is_encrypted: Boolean(data.is_encrypted || data.isEncrypted),
    is_mobile: Boolean(data.is_mobile || data.isMobile),

    // Periféricos de Totem
    printer_status: printerStatus,
    zebra_status: zebraStatus,
    bematech_status: bematechStatus,
    biometric_reader: biometricReader,
    totem_type: data.totem_type || data.totemType || null,

    // Software e antivírus
    installed_software: Array.isArray(data.installed_software || data.installedPrograms)
      ? (data.installed_software || data.installedPrograms)
      : [],
    antivirus_name: data.antivirus_name || data.antivirusName || null,
    antivirus_status: data.antivirus_status !== undefined ? Boolean(data.antivirus_status) : null,
    antivirus_version: data.antivirus_version || data.antivirusVersion || null,

    notes: String(data.notes || '').trim(),
    custom_data,
  };
}

module.exports = {
  cleanIpAddress,
  parseRamToMb,
  parseStorageToGb,
  parseBatteryLevel,
  evaluateHardwareHealth,
  normalizeTelemetry,
};
