// clients/desktop/src/services/CommandPoller.js
// Espelho exato de:
//   - command_executor_service.dart  → polling de comandos
//   - monitoring_service.dart        → coleta + envio (módulos e legado)
//   - legacy_totem_service.dart      → payload /api/monitor
//   - payload_validator.dart         → validação de serial/assetName
//   - background_service.dart        → ciclos e inicialização

const axios = require('axios');
const { exec, execSync } = require('child_process');
const Store = require('electron-store');
const os = require('os');
const path = require('path');
const fs = require('fs');

const store = new Store();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PAYLOAD VALIDATOR  (payload_validator.dart)
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

    return { isValid: errors.length === 0, errors, warnings };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTH HEADERS  (auth_service.dart → getHeaders / getLegacyHeaders)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getHeaders(token) {
    if (!token) return { 'Content-Type': 'application/json' };
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'AUTH_TOKEN': token,
    };
}

function getLegacyHeaders(token) {
    return {
        'Content-Type': 'application/json',
        'AUTH_TOKEN': token || '',
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SYSTEM INFO  (monitoring_service.dart → _getCoreSystemInfo via PS1)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CORE_INFO_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
$activeAdapter = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' -and !$_.Virtual } | Select-Object -First 1
$ipInfo = $activeAdapter | Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object -First 1
$ipAddress = if ($ipInfo) { $ipInfo.IPAddress } else { '0.0.0.0' }
$macAddress = if ($activeAdapter) { ($activeAdapter.MacAddress -replace '-', ':').ToUpper() } else { 'N/A' }
$wifiInterface = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' -and $_.PhysicalMediaType -like '*802.11*' } | Select-Object -First 1
$wlanOutput = netsh wlan show interfaces 2>$null
$bssid = 'N/A'; $ssid = 'N/A'; $signal = 'N/A'
if ($wlanOutput) {
    $bssidLine = $wlanOutput | Select-String 'BSSID' | Select-Object -First 1
    if ($bssidLine) { $bssid = ($bssidLine.ToString() -split ':',2)[1].Trim() }
    $ssidLine  = $wlanOutput | Select-String '^\s+SSID\s+:' | Select-Object -First 1
    if ($ssidLine)  { $ssid  = ($ssidLine.ToString()  -split ':',2)[1].Trim() }
    $sigLine   = $wlanOutput | Select-String 'Signal' | Select-Object -First 1
    if ($sigLine)   { $signal = ($sigLine.ToString()   -split ':',2)[1].Trim() }
}
$connectionType  = if ($wifiInterface) { 'WiFi' } else { 'Ethernet' }
$macAddressRadio = if ($wifiInterface) { ($wifiInterface.MacAddress -replace '-', ':').ToUpper() } else { 'N/A' }
$uptime = (Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime
$uptimeString = "$($uptime.Days)d $($uptime.Hours)h $($uptime.Minutes)m"
$serial = (Get-WmiObject Win32_BIOS).SerialNumber
if (!$serial -or $serial -eq 'N/A' -or $serial -match '^0+$') { $serial = $env:COMPUTERNAME }
$cpu = Get-WmiObject Win32_Processor | Select-Object -First 1
$mem = Get-WmiObject Win32_OperatingSystem
$totalRamGB = [math]::Round((Get-WmiObject Win32_ComputerSystem).TotalPhysicalMemory / 1GB)
$osInfo = Get-WmiObject Win32_OperatingSystem
$disk = Get-WmiObject Win32_DiskDrive | Select-Object -First 1
$diskGB = if ($disk) { [math]::Round($disk.Size / 1GB) } else { 0 }
$chassisTypes = (Get-WmiObject Win32_SystemEnclosure).ChassisTypes
$notebookChassis = @(9,10,14,30,31,32)
$isNotebook = [bool]($chassisTypes | Where-Object { $_ -in $notebookChassis })
$battery = Get-WmiObject Win32_Battery | Select-Object -First 1
$batteryLevel = if ($battery) { $battery.EstimatedChargeRemaining } else { $null }
$batteryHealth = if ($battery) { 'Detectada' } else { $null }
$gpu = (Get-WmiObject Win32_VideoController | Select-Object -First 1).Name
$av = Get-MpComputerStatus 2>$null
$avEnabled = if ($av) { $av.AntivirusEnabled } else { $false }
$avVersion = if ($av) { $av.AntivirusSignatureVersion } else { 'N/A' }
$diskModel = if ($disk) { $disk.Model } else { '' }
$hdType = if ($diskModel -match 'SSD|NVMe|Solid') { 'SSD' } else { 'HDD' }
@{
    serial_number = $serial; hostname = $env:COMPUTERNAME
    model = (Get-WmiObject Win32_ComputerSystem).Model
    manufacturer = (Get-WmiObject Win32_ComputerSystem).Manufacturer
    processor = $cpu.Name; ram = "${totalRamGB}GB"
    storage = "${diskGB}GB"; storage_type = $hdType
    operating_system = $osInfo.Caption; os_version = $osInfo.Version
    ip_address = $ipAddress; mac_address = $macAddress
    mac_address_radio = $macAddressRadio; wifi_ssid = $ssid
    wifi_signal = $signal; connection_type = $connectionType
    gpu = $gpu; current_user = $env:USERNAME
    antivirus_status = $avEnabled; antivirus_version = $avVersion
    is_notebook = $isNotebook; battery_level = $batteryLevel
    battery_health = $batteryHealth; biometric_reader = 'N/A'
    connected_printer = 'N/A'; installed_software = @()
    java_version = 'N/A'; browser_version = 'N/A'; is_encrypted = $false
    uptime = $uptimeString
} | ConvertTo-Json -Compress
`;

function _getSerialNumberSync() {
    try {
        const out = execSync('wmic bios get serialnumber', { timeout: 5000 }).toString();
        const serial = out.split('\n')
            .filter(l => l.trim() && !l.includes('SerialNumber'))
            .map(l => l.trim())[0];
        if (serial && !/^0+$/.test(serial)) return serial;
    } catch (_) { }
    return os.hostname();
}

async function _getBssidManually() {
    return new Promise(resolve => {
        exec(
            `powershell -Command "(Get-NetAdapter | Where-Object {$_.Status -eq 'Up' -and $_.PhysicalMediaType -like '*802.11*'} | Select-Object -First 1).MacAddress"`,
            { timeout: 8000 },
            (err, stdout) => {
                const bssid = (stdout || '').trim().replace(/-/g, ':').toUpperCase();
                resolve(bssid && bssid !== 'N/A' ? bssid : 'N/A');
            }
        );
    });
}

function _fallbackCoreInfo() {
    return {
        serial_number: _getSerialNumberSync(),
        hostname: os.hostname(),
        model: 'N/A', manufacturer: 'N/A', processor: 'N/A',
        ram: 'N/A', storage: 'N/A', storage_type: 'N/A',
        operating_system: os.type(), os_version: os.release(),
        ip_address: '0.0.0.0', mac_address: 'N/A',
        mac_address_radio: 'N/A', wifi_ssid: 'N/A',
        wifi_signal: 'N/A', connection_type: 'N/A',
        gpu: 'N/A', current_user: os.userInfo().username || 'N/A',
        antivirus_status: false, antivirus_version: 'N/A',
        is_notebook: false, battery_level: null, battery_health: null,
        biometric_reader: 'N/A', connected_printer: 'N/A',
        installed_software: [], java_version: 'N/A',
        browser_version: 'N/A', is_encrypted: false,
        uptime: 'N/A',
    };
}

async function getCoreSystemInfo() {
    const tmpScript = path.join(os.tmpdir(), `core_info_${Date.now()}.ps1`);
    try {
        fs.writeFileSync(tmpScript, CORE_INFO_SCRIPT, { encoding: 'utf8' });
    } catch (e) {
        console.error('[CommandPoller] Falha ao criar script temp:', e.message);
        return _fallbackCoreInfo();
    }

    return new Promise(resolve => {
        exec(
            `powershell -ExecutionPolicy Bypass -NoProfile -File "${tmpScript}"`,
            { timeout: 30000 },
            async (err, stdout) => {
                try { fs.unlinkSync(tmpScript); } catch (_) { }

                if (err || !stdout.trim()) {
                    console.error('[CommandPoller] Erro no script PS1:', err?.message);
                    resolve(_fallbackCoreInfo());
                    return;
                }

                try {
                    const data = JSON.parse(stdout.trim());
                    // getBssidManually se BSSID vazio (monitoring_service.dart)
                    if (!data.mac_address_radio || data.mac_address_radio === 'N/A') {
                        console.warn('[CommandPoller] ⚠️ BSSID não detectado. Tentando manualmente...');
                        data.mac_address_radio = await _getBssidManually();
                    }
                    resolve(data);
                } catch (e) {
                    console.error('[CommandPoller] Erro ao parsear JSON:', e.message);
                    resolve(_fallbackCoreInfo());
                }
            }
        );
    });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LEGACY TOTEM SERVICE  (legacy_totem_service.dart)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function _inferTotemType(biometric, zebra, bematech) {
    const notDetected = v => !v || v === 'N/A' || v === 'Não detectado';
    const hasBiometric = !notDetected(biometric);
    const hasPrinter = !notDetected(zebra) || !notDetected(bematech);
    if (hasBiometric && hasPrinter) return 'Totem Completo';
    if (hasBiometric) return 'Totem com Biometria';
    if (hasPrinter) return 'Totem com Impressora';
    return 'Desktop/Workstation';
}

function buildLegacyPayload(coreInfo, sector, floor) {
    const peripherals = (coreInfo.connected_printer || 'N/A / N/A').split('/');
    const zebraStatus = (peripherals[0] || 'N/A').trim();
    const bematechStatus = (peripherals[1] || 'N/A').trim();

    return {
        hostname: coreInfo.hostname || 'Unknown',
        serialNumber: coreInfo.serial_number || 'Unknown',
        model: coreInfo.model || 'N/A',
        serviceTag: coreInfo.serial_number || 'N/A',
        ip: coreInfo.ip_address || 'N/A',
        macAddress: coreInfo.mac_address || 'N/A',
        mac_address_radio: coreInfo.mac_address_radio || 'N/A',
        installedPrograms: coreInfo.installed_software || [],
        biometricReaderStatus: coreInfo.biometric_reader || 'Não detectado',
        zebraStatus,
        bematechStatus,
        totemType: _inferTotemType(coreInfo.biometric_reader, zebraStatus, bematechStatus),
        ram: coreInfo.ram || 'N/A',
        hdType: coreInfo.storage_type || 'N/A',
        hdStorage: coreInfo.storage || 'N/A',
        sector: sector || 'N/A',
        floor: floor || 'N/A',
        printerStatus: coreInfo.connected_printer || 'N/A',
    };
}

async function sendToLegacy(coreInfo, serverUrl, token, sector, floor) {
    const payload = buildLegacyPayload(coreInfo, sector, floor);
    console.log('[CommandPoller] 📤 Enviando dados para sistema legado de Totem...');
    console.log(`[CommandPoller]    S/N: ${payload.serialNumber} | Hostname: ${payload.hostname}`);

    const response = await axios.post(`${serverUrl}/api/monitor`, payload, {
        headers: getLegacyHeaders(token),
        timeout: 30000,
    });

    const location = response.data?.location || 'Desconhecida';
    console.log(`[CommandPoller] ✅ Dados enviados ao sistema legado com sucesso! Localização: ${location}`);
    return true;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODULE SYSTEM  (monitoring_service.dart → _sendToNewSystem + _sendPayload)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function fetchModuleStructure(serverUrl, moduleId, token) {
    const response = await axios.get(`${serverUrl}/api/modules/${moduleId}`, {
        headers: getHeaders(token),
        timeout: 10000,
    });
    return response.data?.module || null;
}

async function _sendPayload(payload, serverUrl, moduleId, moduleType, token) {
    // Validação (payload_validator.dart)
    const validation = validatePayload(payload, moduleType);
    if (!validation.isValid) {
        console.error('[CommandPoller] ❌ Payload inválido:', validation.errors.join(', '));
        throw new Error(`Payload inválido: ${validation.errors.join(', ')}`);
    }
    if (validation.warnings.length > 0) {
        console.warn('[CommandPoller] ⚠️ Avisos:', validation.warnings.join(', '));
    }

    // Sanitização (monitoring_service.dart → _sendPayload)
    let serial = String(payload.serial_number || '').trim();
    let assetName = String(payload.asset_name || '').trim();
    const hostname = String(payload.hostname || '').trim();

    if (!serial || serial === 'N/A' || serial.toLowerCase() === 'null' || /^0+$/.test(serial)) {
        console.warn(`[CommandPoller] ⚠️ Serial inválido: "${serial}". Usando hostname...`);
        serial = hostname || `UNKNOWN-${Date.now()}`;
    }
    if (!assetName || assetName === 'N/A' || assetName.toLowerCase() === 'null') {
        assetName = hostname || serial;
    }

    payload.serial_number = serial;
    payload.asset_name = assetName;
    if (hostname && hostname !== 'N/A') payload.hostname = hostname;

    console.log(`[CommandPoller] 📤 Enviando ativo: Nome="${assetName}" | S/N="${serial}"`);

    const response = await axios.post(
        `${serverUrl}/api/modules/${moduleId}/assets`,
        payload,
        { headers: getHeaders(token), timeout: 30000 }
    );

    const wasUpdated = response.data?.updated === true;
    console.log(wasUpdated
        ? `[CommandPoller] ✅ Ativo "${assetName}" atualizado com sucesso!`
        : `[CommandPoller] ✅ Novo ativo "${assetName}" criado com sucesso!`
    );
}

async function sendToModuleSystem(coreInfo, serverUrl, moduleId, token, sector, floor, assetName) {
    console.log(`[CommandPoller] 📡 Enviando para sistema de módulos...`);
    console.log(`[CommandPoller] 📋 Módulo: ${moduleId}`);

    const structure = await fetchModuleStructure(serverUrl, moduleId, token);
    if (!structure) throw new Error('Não foi possível obter a estrutura do módulo');

    const moduleType = (structure.type || '').toLowerCase();
    console.log(`[CommandPoller] 📦 Tipo do módulo: ${moduleType}`);

    const payload = {
        ...coreInfo,
        custom_data: { sector: sector || '', floor: floor || '' },
    };

    if (assetName && assetName.trim()) {
        console.log(`[CommandPoller] Usando Nome do Ativo manual: ${assetName}`);
        payload.asset_name = assetName.trim();
    }

    // Ajustes por tipo (monitoring_service.dart → switch(moduleType))
    switch (moduleType) {
        case 'desktop':
            console.log('[CommandPoller] 💻 Preparando dados de Desktop...');
            delete payload.battery_level;
            delete payload.battery_health;
            break;

        case 'notebook':
            console.log('[CommandPoller] 💼 Preparando dados de Notebook...');
            delete payload.biometric_reader;
            delete payload.connected_printer;
            // ✅ Valor default 0 (igual ao Flutter — mudado de -1 para 0)
            if (payload.battery_level == null) {
                console.warn('[CommandPoller] ⚠️ Nível de bateria nulo. Usando 0.');
                payload.battery_level = 0;
                payload.battery_health = payload.battery_health || 'Não detectada';
            }
            break;

        case 'panel':
            console.log('[CommandPoller] 📺 Preparando dados de Painel...');
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
    }

    await _sendPayload(payload, serverUrl, moduleId, moduleType, token);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTO-DETECÇÃO DE MÓDULO  (module_detection_service.dart → selectModuleForDeviceType)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function autoSelectModule(serverUrl, token, deviceType) {
    try {
        const response = await axios.get(`${serverUrl}/api/modules`, {
            headers: getHeaders(token),
            timeout: 10000,
        });
        const modules = response.data?.modules || [];

        // Procura módulo do tipo exato
        for (const m of modules) {
            if ((m.type || '').toLowerCase() === deviceType.toLowerCase()) {
                const id = m._id || m.id;
                console.log(`[CommandPoller] 🎯 Módulo selecionado: ${m.name} para tipo ${deviceType}`);
                return id;
            }
        }

        // Fallback: procura compatíveis
        for (const m of modules) {
            const t = (m.type || '').toLowerCase();
            if (['desktop', 'notebook', 'panel'].includes(t)) {
                const id = m._id || m.id;
                console.warn(`[CommandPoller] ⚠️ Nenhum módulo de tipo "${deviceType}" — usando: ${m.name}`);
                return id;
            }
        }

        // Último recurso: primeiro da lista
        if (modules.length > 0) {
            return modules[0]._id || modules[0].id;
        }

        return null;
    } catch (e) {
        console.error('[CommandPoller] Erro na auto-detecção de módulo:', e.message);
        return null;
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COLLECT AND SEND  (monitoring_service.dart → collectAndSendData)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function collectAndSendData() {
    const settings = store.get('settings', {});
    const { ip, port, token, moduleId, sector, floor, assetName, forceLegacyMode } = settings;

    if (!ip || !port || !token) {
        console.warn('[CommandPoller] ⚠️ Configurações incompletas. Abortando envio.');
        return false;
    }

    const serverUrl = `http://${ip}:${port}`;
    console.log('[CommandPoller] 🔄 INICIANDO CICLO DE MONITORAMENTO');

    try {
        console.log('[CommandPoller] Coletando dados do host...');
        const coreInfo = await getCoreSystemInfo();

        if (!coreInfo?.serial_number) {
            throw new Error('Não foi possível obter informações do sistema');
        }

        const isNotebook = coreInfo.is_notebook === true;
        const deviceType = isNotebook ? 'notebook' : 'desktop';
        console.log(`[CommandPoller] Tipo de dispositivo detectado: ${deviceType}`);

        // ── LÓGICA DE DECISÃO BINÁRIA (sem híbrido) — idêntica ao Flutter ──
        if (forceLegacyMode === true && !isNotebook) {
            console.log('[CommandPoller] 🔧 Modo legado forçado (Desktop/Totem). Enviando para /api/monitor.');
            await sendToLegacy(coreInfo, serverUrl, token, sector, floor);
            console.log('[CommandPoller] ✅ CICLO (LEGADO) CONCLUÍDO\n');
            return true;
        }

        console.log('[CommandPoller] Executando envio para Sistema de Módulos...');
        let effectiveModuleId = moduleId;

        if (!effectiveModuleId) {
            console.warn('[CommandPoller] ⚠️ Nenhum módulo configurado. Tentando auto-detecção...');
            effectiveModuleId = await autoSelectModule(serverUrl, token, deviceType);
            if (!effectiveModuleId) {
                throw new Error('Nenhum módulo configurado ou auto-detectado.');
            }
        } else {
            console.log(`[CommandPoller] ✅ Usando módulo configurado: ${effectiveModuleId}`);
        }

        await sendToModuleSystem(coreInfo, serverUrl, effectiveModuleId, token, sector, floor, assetName);
        console.log('[CommandPoller] ✅ CICLO (MÓDULOS) CONCLUÍDO\n');
        return true;

    } catch (e) {
        console.error('[CommandPoller] ❌ ERRO no ciclo de monitoramento:', e.message);
        return false;
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMMAND EXECUTOR  (command_executor_service.dart)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function fetchPendingCommands(serverUrl, moduleId, serialNumber, token) {
    try {
        const uri = `${serverUrl}/api/modules/${moduleId}/assets/commands/pending?serial_number=${encodeURIComponent(serialNumber)}`;
        const response = await axios.get(uri, {
            headers: getHeaders(token),
            timeout: 15000,
        });
        return response.data?.commands || [];
    } catch (e) {
        console.warn('[CommandPoller] ⚠️ Erro ao buscar comandos:', e.message);
        return [];
    }
}

async function reportCommandResult(serverUrl, moduleId, commandId, token, { success, stdout, stderr, exitCode, executionTime }) {
    try {
        const body = {
            success,
            stdout: stdout.length > 5000 ? stdout.substring(0, 5000) : stdout,
            stderr: stderr.length > 2000 ? stderr.substring(0, 2000) : stderr,
            exitCode,
            executionTime,
        };

        const response = await axios.post(
            `${serverUrl}/api/modules/${moduleId}/assets/commands/${commandId}/result`,
            body,
            { headers: getHeaders(token), timeout: 15000 }
        );

        if (response.status === 200) {
            console.log('[CommandPoller] ✅ Resultado reportado ao servidor');
        } else {
            console.warn(`[CommandPoller] ⚠️ Falha ao reportar resultado: ${response.status}`);
        }
    } catch (e) {
        console.error('[CommandPoller] ❌ Erro ao reportar resultado:', e.message);
    }
}

async function _runCommand(command, options = {}) {
    const timeout = options.timeout || 60000;
    const requiresElevation = options.requiresElevation || false;

    if (requiresElevation) {
        // Cria script .bat temporário e executa com RunAs (idêntico ao Flutter)
        const tmpBat = path.join(os.tmpdir(), `temp_command_${Date.now()}.bat`);
        return new Promise(resolve => {
            try {
                fs.writeFileSync(tmpBat, `@echo off\n${command}\n`);
                exec(
                    `powershell -Command "Start-Process -FilePath '${tmpBat}' -Verb RunAs -Wait"`,
                    { timeout },
                    (err, stdout, stderr) => {
                        try { fs.unlinkSync(tmpBat); } catch (_) { }
                        resolve({
                            stdout: (stdout || '').trim(),
                            stderr: (err?.message || stderr || '').trim(),
                            exitCode: err?.code ?? 0,
                        });
                    }
                );
            } catch (e) {
                resolve({ stdout: '', stderr: e.message, exitCode: -1 });
            }
        });
    }

    return new Promise(resolve => {
        exec(`cmd /c ${command}`, { timeout }, (err, stdout, stderr) => {
            resolve({
                stdout: (stdout || '').trim(),
                stderr: (err?.message || stderr || '').trim(),
                exitCode: err?.code ?? (err ? 1 : 0),
            });
        });
    });
}

async function executeCommand(serverUrl, moduleId, command, token) {
    const commandId = command.id;
    const commandType = (command.commandType || '').toUpperCase(); // Normalize
    const commandText = command.command;
    const requiresElevation = command.requiresElevation || false;
    const timeout = command.timeout || 60000;

    logger.info(`⚙️ Executing command: ${commandType} (ID: ${commandId})`, { requiresElevation, timeout });

    const startTime = Date.now();
    let stdout = '', stderr = '', exitCode = 0, success = true;

    try {
        // ─────────────────────────────────────────────────────────────────
        // INTERNAL COMMANDS
        // ─────────────────────────────────────────────────────────────────
        if (commandType === 'INTERNAL' || commandType === 'SYSTEM') {
            const cmd = commandText.toLowerCase();

            if (cmd === 'force_sync' || cmd === 'sync') {
                logger.info('Running Force Sync via Command');
                const syncSuccess = await module.exports.syncDeviceData();
                if (!syncSuccess) throw new Error('Sync cycle failed');
                stdout = 'Synchronization completed successfully';

            } else if (cmd.startsWith('set_interval')) {
                // Usage: set_interval 600
                const parts = cmd.split(' ');
                const seconds = parseInt(parts[1], 10);
                if (isNaN(seconds) || seconds < 60) throw new Error('Invalid interval (min 60s)');

                await module.exports.updateSettings({ interval: seconds });
                stdout = `Interval updated to ${seconds} seconds`;

            } else if (cmd === 'restart_service') {
                await module.exports.initialize();
                stdout = 'Service restarted';

            } else {
                throw new Error(`Unknown internal command: ${cmd}`);
            }

        } else {
            // ─────────────────────────────────────────────────────────────────
            // SHELL COMMANDS
            // ─────────────────────────────────────────────────────────────────
            const result = await _runCommand(commandText, { requiresElevation, timeout });
            stdout = result.stdout;
            stderr = result.stderr;
            exitCode = result.exitCode;
            success = exitCode === 0;
        }

        logger.info(success ? '✅ Command executed successfully' : '❌ Command failed');
        if (stderr) logger.warn(`STDERR: ${stderr}`);

    } catch (e) {
        success = false;
        exitCode = -1;
        stderr = `Execution Exception: ${e.message}`;
        logger.error('❌ Exception executing command:', e.message);
    }

    await reportCommandResult(serverUrl, moduleId, commandId, token, {
        success, stdout, stderr, exitCode,
        executionTime: Date.now() - startTime,
    });
}

async function checkAndExecuteCommands(serverUrl, moduleId, serialNumber, token) {
    const commands = await fetchPendingCommands(serverUrl, moduleId, serialNumber, token);
    if (commands.length === 0) return;

    console.log(`[CommandPoller] 📥 ${commands.length} comando(s) recebido(s)`);
    for (const command of commands) {
        await executeCommand(serverUrl, moduleId, command, token);
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BACKGROUND SERVICE  (background_service.dart)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class CommandPoller {
    constructor() {
        this._syncTimer = null;
        this._commandTimer = null;
        this._isRunning = false;
        this._isExecuting = false;
        this._consecutiveErrors = 0;
        this._maxConsecutiveErrors = 3;
        this.lastRunStatus = 'Aguardando';
        this.lastRunTime = null;
        this.nextRunTime = null;
        this.syncCount = 0;
        this.errorCount = 0;
        this.startTime = null;
    }

    get isRunning() { return this._isRunning; }

    // initialize() — background_service.dart
    async initialize() {
        const s = store.get('settings', {});
        if (s.ip && s.port && s.token) {
            await this.start();
        } else {
            this.lastRunStatus = 'Aguardando Configuração';
            console.warn('[CommandPoller] ⚠️ Background Service: Aguardando configuração inicial');
        }
        this._startCommandPolling();
    }

    async start() {
        if (this._isRunning) {
            console.warn('[CommandPoller] ⚠️ Já está rodando');
            return;
        }
        this._isRunning = true;
        this.startTime = new Date();
        console.log('[CommandPoller] ✅ Background Service: Iniciado');
        await this.runCycle();
        this._scheduleNextRun();
        this._startCommandPolling();
    }

    stop() {
        clearTimeout(this._syncTimer);
        clearInterval(this._commandTimer);
        this._syncTimer = null;
        this._commandTimer = null;
        this._isRunning = false;
        this.lastRunStatus = 'Parado';
        console.log('[CommandPoller] 🛑 Background Service: Parado');
    }

    // runCycle() — background_service.dart
    async runCycle() {
        this.lastRunStatus = 'Sincronizando...';
        console.log('[CommandPoller] 🔄 EXECUTANDO CICLO DE MONITORAMENTO');

        const success = await collectAndSendData();

        if (success) {
            this.lastRunStatus = 'Sucesso';
            this.syncCount++;
            this._consecutiveErrors = 0;
            console.log('[CommandPoller] ✅ CICLO CONCLUÍDO COM SUCESSO');
            this._startCommandPolling(); // AUTO-HEALING
        } else {
            this.lastRunStatus = 'Erro';
            this.errorCount++;
            this._consecutiveErrors++;
            if (this._consecutiveErrors >= this._maxConsecutiveErrors) {
                console.error(`[CommandPoller] ❌ CRÍTICO: ${this._consecutiveErrors} erros consecutivos!`);
            }
        }

        this.lastRunTime = new Date();
    }

    _scheduleNextRun() {
        const s = store.get('settings', {});
        const intervalSeconds = s.interval || 300;
        this.nextRunTime = new Date(Date.now() + intervalSeconds * 1000);
        console.log(`[CommandPoller]    Agendando próximo ciclo em ${intervalSeconds}s (para: ${this.nextRunTime.toISOString()})`);

        clearTimeout(this._syncTimer);
        this._syncTimer = setTimeout(async () => {
            if (!this._isRunning) return;
            await this.runCycle();
            this._scheduleNextRun();
        }, intervalSeconds * 1000);
    }

    // _startCommandPolling() — background_service.dart (interval: 5s)
    _startCommandPolling() {
        const s = store.get('settings', {});
        const { ip, port, token, moduleId } = s;

        if (!ip || !token || !moduleId) return;

        const serverUrl = `http://${ip}:${port}`;
        const serialNumber = _getSerialNumberSync();

        clearInterval(this._commandTimer);
        // 5 segundos — igual ao Flutter (background_service.dart: Duration(seconds: 5))
        this._commandTimer = setInterval(async () => {
            if (!this._isExecuting) {
                this._isExecuting = true;
                try {
                    await checkAndExecuteCommands(serverUrl, moduleId, serialNumber, token);
                } catch (_) { }
                this._isExecuting = false;
            }
        }, 5000);

        console.log(`[CommandPoller] ✅ Polling de comandos ativado (ciclo: 5s) para S/N: ${serialNumber}`);
    }

    // updateSettings() — background_service.dart
    async updateSettings(newSettings) {
        console.log('[CommandPoller] 🔄 Background Service: Atualizando configurações');
        if (newSettings) {
            const current = store.get('settings', {});
            store.set('settings', { ...current, ...newSettings });
        }

        clearTimeout(this._syncTimer);
        await this.runCycle();
        this._startCommandPolling();
        this._scheduleNextRun();
    }

    // Força sincronização imediata (botão na UI)
    async syncDeviceData() {
        const success = await collectAndSendData();
        this.lastRunTime = new Date();
        return success;
    }
}

module.exports = new CommandPoller();