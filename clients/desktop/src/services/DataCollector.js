/**
 * DataCollector.js
 * Responsável por coletar informações de hardware/software do sistema
 * Extraído de: CommandPoller.js → getCoreSystemInfo + utilitários relacionados
 */

const { exec, execSync } = require('child_process');
const si = require('systeminformation');
const os = require('os');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SERIAL NUMBER COLLECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function _getSerialNumberSync() {
    const isBadSerial = (s) => !s || /^0+$/.test(s) || s.toLowerCase().includes('default') || s.toLowerCase().includes('o.e.m.');
    try {
        let out = '';
        try {
            out = execSync('wmic bios get serialnumber', { timeout: 5000 }).toString();
        } catch (_) {
            out = execSync('powershell -Command "(Get-WmiObject win32_bios).SerialNumber"', { timeout: 5000 }).toString();
        }

        const serial = out.split('\n')
            .filter(l => l.trim() && !l.includes('SerialNumber'))
            .map(l => l.trim())[0];

        if (!isBadSerial(serial)) return serial;
    } catch (_) { }
    return null;
}

function _getSerialNumberFallback() {
    // Fallback: usar UUID do Windows
    try {
        const out = execSync('wmic os get serialnumber', { timeout: 5000 }).toString();
        return out.split('\n')[1]?.trim() || null;
    } catch (_) { }
    return null;
}

async function getSerialNumber() {
    let serial = _getSerialNumberSync();
    if (serial) return serial;

    serial = _getSerialNumberFallback();
    if (serial) return serial;

    // Last resort: hostname
    return os.hostname();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SYSTEM INFO COLLECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function getCoreSystemInfo() {
    console.log('[DataCollector] 🔍 Coletando informações do sistema...');

    try {
        const [
            osInfo,
            cpu,
            mem,
            battery,
            network,
            system,
        ] = await Promise.all([
            si.osInfo().catch(() => ({})),
            si.cpu().catch(() => ({})),
            si.mem().catch(() => ({})),
            si.battery().catch(() => ({})),
            si.networkInterfaces().catch(() => []),
            si.system().catch(() => ({})),
        ]);

        const serialNumber = await getSerialNumber();
        const hostname = os.hostname();

        const isNotebook = battery?.hasBattery === true;

        // MAC Address (primeira interface não-loopback)
        const macAddress = network.find(ni => ni.mac && ni.mac !== '00:00:00:00:00:00')?.mac || 'N/A';

        // Informações de rede (IP local)
        const ipAddress = network.find(ni => ni.ip4 && !ni.ip4.startsWith('127.'))?.ip4 || 'N/A';

        // Informações de processador
        const processorName = cpu.brand || 'N/A';
        const processorCores = cpu.cores || 0;

        // RAM
        const totalRam = Math.round(mem.total / (1024 ** 3));
        const availableRam = Math.round(mem.available / (1024 ** 3));

        // Armazenamento
        const storageType = 'SSD'; // Simplificado; poderia detectar melhor
        let storageSize = 'N/A';
        try {
            const fsSize = await si.fsSize().catch(() => []);
            if (fsSize.length > 0) {
                storageSize = `${Math.round(fsSize[0].size / (1024 ** 3))} GB`;
            }
        } catch (_) { }

        // Bateria (notebooks)
        let batteryLevel = -1;
        let batteryHealth = 'N/A';
        if (isNotebook && battery) {
            batteryLevel = Math.round(battery.percent || 0);
            batteryHealth = battery.ischarging ? 'Carregando' : (batteryLevel < 20 ? 'Baixa' : 'Normal');
        }

        // MAC Address BSSID (WiFi - se conectado)
        let macAddressRadio = 'N/A';
        try {
            const wifiInfo = await si.wifiNetworks().catch(() => []);
            if (wifiInfo.length > 0 && wifiInfo[0].bssid) {
                macAddressRadio = wifiInfo[0].bssid;
            }
        } catch (_) { }

        // Sistema operacional
        const osVersion = `${osInfo.distro || 'Windows'} ${osInfo.release || ''}`.trim();

        // Construir payload
        const coreInfo = {
            serial_number: serialNumber,
            hostname,
            asset_name: `${hostname}-${serialNumber}`,
            is_notebook: isNotebook,
            mac_address: macAddress,
            mac_address_radio: macAddressRadio,
            ip_address: ipAddress,
            processor: processorName,
            processor_cores: processorCores,
            ram: `${totalRam} GB`,
            available_ram: availableRam,
            storage_type: storageType,
            storage: storageSize,
            battery_level: batteryLevel,
            battery_health: batteryHealth,
            os_version: osVersion,
        };

        console.log('[DataCollector] ✅ Informações coletadas:', { serial: coreInfo.serial_number, ip: coreInfo.ip_address });
        return coreInfo;
    } catch (error) {
        console.error('[DataCollector] ❌ Erro ao coletar informações:', error.message);
        throw new Error(`Falha ao coletar dados do sistema: ${error.message}`);
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

module.exports = {
    getCoreSystemInfo,
    getSerialNumber,
};
