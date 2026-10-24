const { exec } = require('child_process');
const { promisify } = require('util');
const net = require('net');
const os = require('os');
const http = require('http');
const https = require('https');
const ManagedAsset = require('../models/ManagedAsset');
const AssetModuleConfig = require('../models/AssetModuleConfig');
const NotificationService = require('./notificationService');

const execAsync = promisify(exec);

let snmp = null;
try {
  snmp = require('net-snmp');
} catch (error) {
  snmp = null;
}

// ============================================================
// OIDs — RFC 3805 / Printer-MIB + proprietários HP
//
// Mapeamento confirmado pela página de suprimentos da HP 408dn:
//
//  CARTUCHO DE TONER
//    Preto 4%   → walk dinâmico por descrição (índice varia por modelo)
//                 OID fixo .8.1.1 / .9.1.1 retorna "inválido" no 408dn
//                 → usar walk + heurística de descrição
//
//  UNIDADE DE IMAGEM
//    Preto 63%  → walk dinâmico por descrição (type=OPC ou hint "drum/imaging")
//
//  BANDEJAS DE ENTRADA
//    Bandeja 1 – 50 folhas  (prtInputMaxCapacity índice 1)
//    Bandeja 2 – 250 folhas (prtInputMaxCapacity índice 2)
//    Tipo papel, tamanho papel via prtInputTable
//
//  BANDEJA DE SAÍDA
//    Comp padrao – 150 folhas (prtOutputMaxCapacity índice 1)
//
//  HARDWARE
//    Unidade duplex instalado  → hrPrinterDetectedErrorState / hrDeviceDescr
//    RAM 256 MB                → hrStorageTable walk
// ============================================================

const OIDS = {
  // Sistema
  sysDescr:    '1.3.6.1.2.1.1.1.0',
  sysName:     '1.3.6.1.2.1.1.5.0',
  sysUpTime:   '1.3.6.1.2.1.1.3.0',

  // Status impressora
  printerStatus:  '1.3.6.1.2.1.25.3.5.1.1.1',
  hrDeviceStatus: '1.3.6.1.2.1.25.3.2.1.5.1',

  // Contadores de páginas
  totalPages:   '1.3.6.1.2.1.43.10.2.1.4.1.1',
  powerOnPages: '1.3.6.1.2.1.43.10.2.1.5.1.1',

  // Insumos — índices fixos padrão RFC 3805
  // NOTA: Na HP 408dn o índice .1.1 do toner retorna "inválido"
  // O walk dinâmico é necessário para obter o valor correto
  blackMax:   '1.3.6.1.2.1.43.11.1.1.8.1.1',
  blackCur:   '1.3.6.1.2.1.43.11.1.1.9.1.1',
  cyanMax:    '1.3.6.1.2.1.43.11.1.1.8.1.2',
  cyanCur:    '1.3.6.1.2.1.43.11.1.1.9.1.2',
  magentaMax: '1.3.6.1.2.1.43.11.1.1.8.1.3',
  magentaCur: '1.3.6.1.2.1.43.11.1.1.9.1.3',
  yellowMax:  '1.3.6.1.2.1.43.11.1.1.8.1.4',
  yellowCur:  '1.3.6.1.2.1.43.11.1.1.9.1.4',
  imagingMax: '1.3.6.1.2.1.43.11.1.1.8.1.5',
  imagingCur: '1.3.6.1.2.1.43.11.1.1.9.1.5',

  // Identificação HP (proprietários)
  hpModel:    '1.3.6.1.4.1.11.2.3.9.4.2.1.1.3.2.0',
  hpSerial:   '1.3.6.1.4.1.11.2.3.9.4.2.1.1.3.3.0',
  hpFirmware: '1.3.6.1.4.1.11.2.3.9.4.2.1.1.3.6.0',

  // Toner HP proprietário (fallback alternativo)
  hpTonerBlackMax: '1.3.6.1.4.1.11.2.3.9.4.2.1.1.6.1.22.1',
  hpTonerBlackCur: '1.3.6.1.4.1.11.2.3.9.4.2.1.1.6.1.20.1',
  hpMonoTonerMax:  '1.3.6.1.4.1.11.2.3.9.4.2.2.1.4.1.2.1',
  hpMonoTonerCur:  '1.3.6.1.4.1.11.2.3.9.4.2.2.1.4.1.1.1',

  // Samsung
  samsungModel:  '1.3.6.1.4.1.236.11.5.11.81.2.2.0',
  samsungSerial: '1.3.6.1.4.1.236.11.5.11.81.2.1.0',
};

// ── Insumos: walk dinâmico ─────────────────────────────────
const SUPPLIES_DESC_BASE_OID = '1.3.6.1.2.1.43.11.1.1.6.1';
const SUPPLIES_TYPE_BASE_OID = '1.3.6.1.2.1.43.11.1.1.5.1';
const SUPPLIES_MAX_BASE_OID  = '1.3.6.1.2.1.43.11.1.1.8.1';
const SUPPLIES_CUR_BASE_OID  = '1.3.6.1.2.1.43.11.1.1.9.1';

// ── Bandejas de entrada (prtInputTable) ───────────────────
// HP 408dn: Bandeja 1 = 50 folhas, Bandeja 2 = 250 folhas
const PAPER_INPUT_MAX_OID    = '1.3.6.1.2.1.43.8.2.1.9.1';   // prtInputMaxCapacity
const PAPER_INPUT_CUR_OID    = '1.3.6.1.2.1.43.8.2.1.10.1';  // prtInputCurrentLevel
const PAPER_INPUT_DESC_OID   = '1.3.6.1.2.1.43.8.2.1.13.1';  // prtInputDescription
const PAPER_INPUT_TYPE_OID   = '1.3.6.1.2.1.43.8.2.1.2.1';   // prtInputType
const PAPER_INPUT_MEDIA_OID  = '1.3.6.1.2.1.43.8.2.1.15.1';  // prtInputMediaName (ex: "A4")
const PAPER_INPUT_MTYPE_OID  = '1.3.6.1.2.1.43.8.2.1.12.1';  // prtInputMediaType (ex: "Papel normal")

// ── Bandeja de saída (prtOutputTable) ─────────────────────
// HP 408dn: Comp padrao = 150 folhas
const PAPER_OUTPUT_MAX_OID   = '1.3.6.1.2.1.43.9.2.1.4.1';   // prtOutputMaxCapacity
const PAPER_OUTPUT_CUR_OID   = '1.3.6.1.2.1.43.9.2.1.5.1';   // prtOutputRemainingCapacity
const PAPER_OUTPUT_DESC_OID  = '1.3.6.1.2.1.43.9.2.1.9.1';   // prtOutputDescription

// ── Recursos de hardware (hrStorageTable) ─────────────────
// HP 408dn: RAM 256 MB, Duplex instalado
const HR_STORAGE_TYPE_OID    = '1.3.6.1.2.1.25.2.3.1.2';     // hrStorageType
const HR_STORAGE_DESC_OID    = '1.3.6.1.2.1.25.2.3.1.3';     // hrStorageDescr
const HR_STORAGE_SIZE_OID    = '1.3.6.1.2.1.25.2.3.1.5';     // hrStorageSize
const HR_STORAGE_ALLOC_OID   = '1.3.6.1.2.1.25.2.3.1.4';     // hrStorageAllocationUnits

// ── Detecção de duplex ─────────────────────────────────────
// HP 408dn reporta duplex via hrDeviceTable
const HR_DEVICE_DESC_OID     = '1.3.6.1.2.1.25.3.2.1.3';     // hrDeviceDescr
const HR_DEVICE_TYPE_OID     = '1.3.6.1.2.1.25.3.2.1.2';     // hrDeviceType

// ============================================================
// Padrões de detecção
// ============================================================

const IMAGING_DESC_HINT = /(imaging|image unit|drum|opc|photo conductor|unidade de imagem|unidad de imagen|cilindro|fotocondutor|tambor)/i;
const IMAGING_DESC_EXCLUDE = /(fuser|maintenance kit|transfer|belt|waste|collector|pickup|roller|fixador|fusor)/i;
const TONER_DESC_HINT = /(toner|cartridge|cartucho|w1330|w1331|cf258|cf259|mlt-|crum)/i;

const SUPPLY_TYPE = { TONER: 3, OPC: 9, DEVELOPER: 10, FUSER: 15, TRANSFER_UNIT: 30 };
const STATUS_MAP  = { 1: 'unknown', 2: 'online', 3: 'online', 4: 'online', 5: 'maintenance' };

const PRINTER_TEXT_HINT = /(printer|laserjet|officejet|deskjet|pagewide|neverstop|mfp|workcentre|phaser|altalink|xerox|samsung\s*(ml|scx|sl-|xpress)|brother|canon|ricoh|kyocera|epson|lexmark|hp laser)/i;
const NETWORK_DEVICE_HINT = /(switch|router|firewall|officeconnect|aruba|cisco|juniper|mikrotik|fortigate|ubiquiti|hpe officeconnect)/i;
const HP_WEB_SUPPLIES_PATHS = [
  '/sws/app/information/supplies/supplies.json',
];

// ============================================================
// PrinterService
// ============================================================

class PrinterService {
  constructor(logger) {
    this.logger = logger || console;
    this.intervalMs = 60_000;
    this.timer = null;
    this.snmpTimeout = 5000;
    this.monoOnly = String(process.env.PRINTER_MONO_ONLY || 'true').toLowerCase() !== 'false';
    const debugFlag = String(process.env.PRINTER_DEBUG_IMAGING || 'false').toLowerCase();
    this.debugImaging = ['true', '1', 'yes', 'on'].includes(debugFlag);
  }

  // ----------------------------------------------------------
  // Ciclo de vida
  // ----------------------------------------------------------

  async start() {
    this.logger.info('[PrinterService] Iniciando monitoramento de impressoras');
    await this.pollAll();
    this.timer = setInterval(() => {
      this.pollAll().catch((err) => this.logger.error(`[PrinterService] Falha no poll: ${err.message}`));
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  // ----------------------------------------------------------
  // Módulo
  // ----------------------------------------------------------

  async ensurePrinterModule() {
    let module = await AssetModuleConfig.findOne({ type: 'printer', is_active: true });
    if (!module) {
      module = await AssetModuleConfig.create({
        name: 'Impressoras', type: 'printer',
        description: 'Monitoramento de impressoras HP e Samsung (IP/USB)',
        is_active: true,
      });
      this.logger.info('[PrinterService] Modulo de impressoras criado automaticamente');
    }
    return module;
  }

  // ----------------------------------------------------------
  // Descoberta
  // ----------------------------------------------------------

  async discoverPrinters(options = {}) {
    const persist = options.persist === true;
    const module = await this.ensurePrinterModule();
    const usb = await this.detectUsbPrinters();
    const network = await this.detectNetworkPrinters();
    const discovered = [...usb, ...network];

    if (!persist) return { success: true, persist: false, detected_usb: usb.length, detected_network: network.length, discovered, upserted: [] };

    const upserted = [];
    for (const p of usb) {
      const serial = p.serial_number || p.id;
      const asset = await ManagedAsset.findOneAndUpdate(
        { module_id: module._id, serial_number: serial },
        { module_id: module._id, asset_type: 'printer', asset_name: p.asset_name, serial_number: serial, manufacturer: p.manufacturer || 'Unknown', model: p.model || 'Unknown', connection_type: 'usb', usb_path: p.usb_path || null, status: 'online', last_check_time: new Date(), custom_data: { ...(p.custom_data || {}), detected_by: 'local-discovery' } },
        { upsert: true, new: true }
      );
      upserted.push({ id: asset._id, asset_name: asset.asset_name, serial_number: asset.serial_number, connection_type: asset.connection_type });
    }
    for (const p of network) {
      const serial = p.serial_number || `NET-${p.ip_address}`;
      const asset = await ManagedAsset.findOneAndUpdate(
        { module_id: module._id, serial_number: serial },
        { module_id: module._id, asset_type: 'printer', asset_name: p.asset_name || `Printer ${p.ip_address}`, serial_number: serial, manufacturer: p.manufacturer || 'Unknown', model: p.model || 'Unknown', connection_type: 'network', ip_address: p.ip_address, status: p.status || 'online', last_check_time: new Date(), custom_data: { ...(p.custom_data || {}), detected_by: 'network-discovery', discovered_ports: p.open_ports || [] } },
        { upsert: true, new: true }
      );
      upserted.push({ id: asset._id, asset_name: asset.asset_name, serial_number: asset.serial_number, connection_type: asset.connection_type });
    }

    return { success: true, persist: true, detected_usb: usb.length, detected_network: network.length, discovered, upserted };
  }

  async detectUsbPrinters() {
    if (process.platform === 'win32') return this.detectUsbPrintersWindows();
    return this.detectUsbPrintersLinux();
  }

  async detectUsbPrintersWindows() {
    try {
      const cmd = 'Get-CimInstance Win32_Printer | Select-Object Name,DriverName,PortName,WorkOffline,PrinterStatus,DeviceID | ConvertTo-Json -Depth 4';
      const { stdout } = await execAsync(`powershell -NoProfile -Command "${cmd}"`, { timeout: 12_000 });
      if (!stdout?.trim()) return [];
      const parsed = JSON.parse(stdout);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      return items.filter((p) => p.PortName?.toLowerCase().includes('usb')).map((p, idx) => ({
        id: `win-usb-${idx}-${(p.DeviceID || p.Name || 'printer').replace(/\s+/g, '-')}`,
        serial_number: p.DeviceID || `WIN-USB-${idx}`,
        asset_name: p.Name || `Printer USB ${idx + 1}`,
        manufacturer: this.detectBrand(`${p.Name || ''} ${p.DriverName || ''}`),
        model: p.DriverName || p.Name || 'Unknown',
        usb_path: p.PortName,
        status: p.WorkOffline ? 'offline' : 'online',
        custom_data: { windows_printer_status: p.PrinterStatus },
      }));
    } catch (error) {
      this.logger.warn(`[PrinterService] Falha USB Windows: ${error.message}`);
      return [];
    }
  }

  async detectUsbPrintersLinux() {
    try {
      const { stdout } = await execAsync('lsusb 2>/dev/null || true', { timeout: 8000 });
      if (!stdout?.trim()) return [];
      return stdout.split('\n').filter(Boolean).filter((l) => /hp|samsung|brother|xerox|epson/i.test(l)).map((line, idx) => {
        const parts = line.split(/\s+/);
        const [vendor = 'unknown', product = 'unknown'] = (parts[5] || '').split(':');
        const description = parts.slice(6).join(' ') || 'USB Printer';
        return { id: `usb-${vendor}-${product}-${idx}`, serial_number: `USB-${vendor}-${product}-${idx}`, asset_name: description, manufacturer: this.detectBrand(description), model: description, usb_path: `/dev/usb-${vendor}-${product}`, status: 'online', custom_data: { vendor_id: vendor, product_id: product } };
      });
    } catch (error) {
      this.logger.warn(`[PrinterService] Falha USB Linux: ${error.message}`);
      return [];
    }
  }

  async detectNetworkPrinters() {
    const subnets = this.getScanSubnets();
    if (!subnets.length) return [];
    const hosts = [];
    subnets.forEach((prefix) => { for (let i = 1; i <= 254; i++) hosts.push(`${prefix}.${i}`); });
    const found = [];
    const concurrency = 40;
    let cursor = 0;
    const worker = async () => {
      while (cursor < hosts.length) {
        const ip = hosts[cursor++];
        const ports = await this.getOpenPrinterPorts(ip, { includeWebPorts: false });
        if (!ports.length) continue;
        const deviceInfo = await this.tryReadDiscoveryInfo(ip);
        if (!this.shouldAcceptDiscoveryDevice(ports, deviceInfo)) continue;
        const model = deviceInfo.model || 'Network Printer';
        found.push({ id: `net-${ip}`, serial_number: deviceInfo.serial || `NET-${ip}`, asset_name: deviceInfo.hostname || model || `Printer ${ip}`, manufacturer: deviceInfo.brand || this.detectBrand(model) || 'Unknown', model, ip_address: ip, connection_type: 'network', status: 'online', open_ports: ports, custom_data: { hostname: deviceInfo.hostname || null, discovered_by: 'network-scan' } });
      }
    };
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    return found;
  }

  getScanSubnets() {
    const envValue = process.env.PRINTER_SCAN_SUBNETS;
    if (envValue) return envValue.split(',').map((s) => s.trim()).filter((s) => /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(s));
    const nets = os.networkInterfaces();
    const prefixes = new Set();
    Object.values(nets).forEach((entries) => {
      (entries || []).forEach((entry) => {
        if (!entry || entry.family !== 'IPv4' || entry.internal) return;
        const parts = String(entry.address).split('.');
        if (parts.length === 4) prefixes.add(`${parts[0]}.${parts[1]}.${parts[2]}`);
      });
    });
    return Array.from(prefixes);
  }

  async getOpenPrinterPorts(ip, options = {}) {
    const ports = options.includeWebPorts ? [9100, 631, 515, 80, 443] : [9100, 631, 515];
    const checks = await Promise.all(ports.map((port) => this.isTcpPortOpen(ip, port, 450)));
    return ports.filter((_, idx) => checks[idx]);
  }

  async tryReadDiscoveryInfo(ip) {
    if (!snmp) return { brand: null, model: null, serial: null, hostname: null };
    const data = await this.snmpGet(ip, 'public', [OIDS.sysDescr, OIDS.hpModel, OIDS.hpSerial, OIDS.samsungModel, OIDS.samsungSerial]);
    if (!data) return { brand: null, model: null, serial: null, hostname: null };
    const model = data[OIDS.hpModel] || data[OIDS.samsungModel] || data[OIDS.sysDescr] || null;
    return { brand: this.detectBrand(model), model, serial: data[OIDS.hpSerial] || data[OIDS.samsungSerial] || null, hostname: null, sysDescr: data[OIDS.sysDescr] || null };
  }

  isLikelyPrinterBySnmp(deviceInfo) {
    const model = String(deviceInfo?.model || '');
    const sysDescr = String(deviceInfo?.sysDescr || '');
    if (NETWORK_DEVICE_HINT.test(model) || NETWORK_DEVICE_HINT.test(sysDescr)) return false;
    return PRINTER_TEXT_HINT.test(model) || PRINTER_TEXT_HINT.test(sysDescr);
  }

  shouldAcceptDiscoveryDevice(ports, deviceInfo) {
    const model = String(deviceInfo?.model || '');
    const sysDescr = String(deviceInfo?.sysDescr || '');
    if (NETWORK_DEVICE_HINT.test(model) || NETWORK_DEVICE_HINT.test(sysDescr)) return false;
    if (ports.includes(9100)) return true;
    if ((ports.includes(515) || ports.includes(631)) && this.isLikelyPrinterBySnmp(deviceInfo)) return true;
    return false;
  }

  async isTcpPortOpen(ip, port, timeoutMs = 500) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let done = false;
      const finish = (r) => { if (done) return; done = true; try { socket.destroy(); } catch (e) {} resolve(r); };
      socket.setTimeout(timeoutMs);
      socket.once('connect', () => finish(true));
      socket.once('timeout', () => finish(false));
      socket.once('error', () => finish(false));
      try { socket.connect(port, ip); } catch (e) { finish(false); }
    });
  }

  detectBrand(text) {
    const val = String(text || '').toLowerCase();
    if (val.includes('hp') || val.includes('hewlett')) return 'HP';
    if (val.includes('samsung') && /(4020|4080|m4020|m4080|proxpress)/i.test(val)) return 'HP';
    if (val.includes('samsung')) return 'Samsung';
    if (val.includes('brother')) return 'Brother';
    if (val.includes('xerox')) return 'Xerox';
    return 'Unknown';
  }

  // ----------------------------------------------------------
  // Poll / atualização
  // ----------------------------------------------------------

  async pollAll() {
    const module = await AssetModuleConfig.findOne({ type: 'printer', is_active: true });
    if (!module) return { total: 0, updated: 0 };
    const printers = await ManagedAsset.find({ module_id: module._id, asset_type: 'printer', is_deleted: { $ne: true } });
    let updated = 0;
    for (const p of printers) { await this.updatePrinterStatus(p); updated++; }
    return { total: printers.length, updated };
  }

  async updateAllPrinterStatus() { return this.pollAll(); }

  async pollPrinter(printerOrId) {
    const printer = typeof printerOrId === 'string' ? await ManagedAsset.findById(printerOrId) : printerOrId;
    if (!printer) throw new Error('Impressora nao encontrada');
    await this.updatePrinterStatus(printer);
    return printer;
  }

  async updatePrinterStatus(printer) {
    const type = (printer.connection_type || '').toLowerCase();
    const previousToner = printer.toner_levels instanceof Map
      ? Object.fromEntries(printer.toner_levels)
      : (printer.toner_levels || {});

    const result = type === 'usb'
      ? await this.readUsbPrinterStatus(printer)
      : await this.readNetworkPrinterStatus(printer.ip_address, printer.snmp_community || 'public');

    printer.status = result.status || 'unknown';
    printer.last_check_time = new Date();
    printer.last_seen = new Date();

    if (result.model && (!printer.model || printer.model === 'Unknown')) printer.model = result.model;
    if (result.brand && (!printer.manufacturer || printer.manufacturer === 'Unknown')) printer.manufacturer = result.brand;
    if (result.serial && (!printer.serial_number || printer.serial_number.startsWith('NET-'))) printer.serial_number = result.serial;
    if (result.total_pages != null) printer.total_pages = result.total_pages;

    if (result.toner_levels) {
      // Preserva unidade de imagem se a leitura atual não retornou valor (flutuação SNMP)
      if (result.toner_levels.imaging_unit == null && previousToner.imaging_unit !== undefined) {
        result.toner_levels.imaging_unit = previousToner.imaging_unit;
      }
      printer.toner_levels = result.toner_levels;
    }

    const currentData = printer.custom_data instanceof Map
      ? Object.fromEntries(printer.custom_data)
      : (printer.custom_data || {});

    printer.custom_data = {
      ...currentData,
      snmp_available: result.snmp_available !== false,
      error: result.error || null,
      response_ms: result.response_ms || null,
      open_ports: result.open_ports || currentData.open_ports || [],
      alerts: result.alerts || [],
      toner_levels: result.toner_levels || currentData.toner_levels || {},
      // ★ Dados enriquecidos vindos da página de suprimentos HP
      paper_trays_input:  result.paper_trays_input  || currentData.paper_trays_input  || [],
      paper_trays_output: result.paper_trays_output || currentData.paper_trays_output || [],
      hardware_resources: result.hardware_resources || currentData.hardware_resources || {},
      firmware: result.firmware || currentData.firmware || null,
      imaging_source: result.imaging_source || currentData.imaging_source || null,
      imaging_web_source_url: result.imaging_web_source_url || currentData.imaging_web_source_url || null,
      imaging_web_values: result.imaging_web_values || currentData.imaging_web_values || null,
      imaging_supported: typeof result.imaging_supported === 'boolean'
        ? result.imaging_supported
        : (result.toner_levels?.imaging_unit != null ? true : (currentData.imaging_supported === false ? false : null)),
    };

    this.emitPrinterSupplyAlerts(printer, previousToner, result.toner_levels || {});
    await printer.save();
    return result;
  }

  // ----------------------------------------------------------
  // Alertas
  // ----------------------------------------------------------

  emitPrinterSupplyAlerts(printer, previousToner, currentToner) {
    try {
      const supplyKeys = [
        { key: 'black',        label: 'Toner preto' },
        { key: 'imaging_unit', label: 'Unidade de imagem' },
        { key: 'cyan',         label: 'Toner ciano' },
        { key: 'magenta',      label: 'Toner magenta' },
        { key: 'yellow',       label: 'Toner amarelo' },
      ];
      const customData = printer.custom_data instanceof Map ? Object.fromEntries(printer.custom_data) : (printer.custom_data || {});
      const state = customData.supply_alert_state || {};

      supplyKeys.forEach(({ key, label }) => {
        const current = this.toNumber(currentToner[key]);
        const previous = this.toNumber(previousToner[key]);
        if (current === null) return;

        const alertKey = `${printer._id}:${key}`;
        const level = current <= 5 ? 'critical' : (current <= 15 ? 'low' : 'ok');
        const prevLevel = state[alertKey] || 'ok';

        if ((level === 'low' || level === 'critical') && level !== prevLevel) {
          NotificationService.notifyError(
            `${label} baixo`,
            `${printer.asset_name} (${printer.serial_number}) em ${current}%`,
            level === 'critical' ? 'error' : 'warning'
          );
        }
        if (previous !== null && previous <= 15 && current > 20 && prevLevel !== 'ok') {
          NotificationService.notifySuccess(`${label} normalizado`, `${printer.asset_name} voltou para ${current}%`);
        }
        state[alertKey] = level;
      });

      printer.custom_data = { ...customData, supply_alert_state: state };
    } catch (error) {
      this.logger.warn(`[PrinterService] Falha ao emitir alerta: ${error.message}`);
    }
  }

  // ----------------------------------------------------------
  // Leitura USB
  // ----------------------------------------------------------

  async readUsbPrinterStatus(printer) {
    const currentData = printer.custom_data instanceof Map ? Object.fromEntries(printer.custom_data) : (printer.custom_data || {});
    const fromAgent = Boolean(currentData.device_agent_id) || String(currentData.source || '').includes('usb-agent');

    if (fromAgent) {
      const lastSyncDate = currentData.last_sync || currentData.sync_timestamp || printer.last_check_time || printer.updated_at;
      const ttlMs = Number(process.env.PRINTER_USB_AGENT_TTL_MS || 180000);
      const stale = !lastSyncDate || ((Date.now() - new Date(lastSyncDate).getTime()) > ttlMs);
      const tonerFromAsset = printer.toner_levels instanceof Map ? Object.fromEntries(printer.toner_levels) : (printer.toner_levels || {});
      const tonerLevels = Object.keys(tonerFromAsset).length ? tonerFromAsset : (currentData.toner_levels || {});
      if (stale) return { status: 'offline', snmp_available: false, error: 'Agente USB sem sincronizacao recente', toner_levels: tonerLevels };
      return { status: (printer.status && printer.status !== 'offline') ? printer.status : 'online', snmp_available: false, brand: printer.manufacturer, model: printer.model, toner_levels: tonerLevels };
    }

    const usb = await this.detectUsbPrinters();
    const found = usb.find((p) => (p.serial_number && p.serial_number === printer.serial_number) || (p.asset_name && p.asset_name === printer.asset_name));
    if (!found) return { status: 'offline', snmp_available: false, error: 'Impressora USB nao detectada localmente' };
    return { status: found.status || 'online', snmp_available: false, brand: found.manufacturer, model: found.model };
  }

  // ----------------------------------------------------------
  // ★ Leitura de rede — principal
  // ----------------------------------------------------------

  async readNetworkPrinterStatus(ip, community = 'public') {
    const start = Date.now();
    if (!ip) return { status: 'unknown', snmp_available: false, error: 'Impressora sem IP configurado' };

    const [reachable, openPorts] = await Promise.all([this.ping(ip), this.getOpenPrinterPorts(ip, { includeWebPorts: true })]);
    const hasPrinterPort = openPorts.length > 0;

    const noNetworkEvidence = !reachable && !hasPrinterPort;
    if (!snmp) {
      if (noNetworkEvidence) {
        return { status: 'offline', snmp_available: false, response_ms: Date.now() - start, error: 'Host nao responde a ping nem portas de impressao', open_ports: openPorts };
      }
      return { status: 'online', snmp_available: false, response_ms: Date.now() - start, error: 'Biblioteca net-snmp nao instalada', open_ports: openPorts };
    }

    const baseOids = [
      OIDS.sysDescr, OIDS.sysName, OIDS.sysUpTime,
      OIDS.printerStatus, OIDS.hrDeviceStatus,
      OIDS.totalPages, OIDS.powerOnPages,
      OIDS.blackMax, OIDS.blackCur,
      OIDS.cyanMax, OIDS.cyanCur,
      OIDS.magentaMax, OIDS.magentaCur,
      OIDS.yellowMax, OIDS.yellowCur,
      OIDS.imagingMax, OIDS.imagingCur,
      OIDS.hpModel, OIDS.hpSerial, OIDS.hpFirmware,
      OIDS.hpTonerBlackMax, OIDS.hpTonerBlackCur,
      OIDS.hpMonoTonerMax, OIDS.hpMonoTonerCur,
      OIDS.samsungModel, OIDS.samsungSerial,
    ];

    const snmpData = await this.snmpGet(ip, community, baseOids);
    if (!snmpData) {
      return {
        status: noNetworkEvidence ? 'offline' : 'online',
        snmp_available: false,
        response_ms: Date.now() - start,
        open_ports: openPorts,
        error: noNetworkEvidence
          ? 'Host nao responde a ping/portas e SNMP indisponivel'
          : (reachable ? 'SNMP indisponivel (community string ou firewall)' : 'ICMP bloqueado; SNMP indisponivel, mas porta de impressao aberta'),
      };
    }

    const model = snmpData[OIDS.hpModel] || snmpData[OIDS.samsungModel] || snmpData[OIDS.sysDescr] || null;
    const serial = snmpData[OIDS.hpSerial] || snmpData[OIDS.samsungSerial] || null;
    const firmware = snmpData[OIDS.hpFirmware] || null;
    const brand = this.detectBrand(model);
    const isHP = brand === 'HP';

    // Todas as leituras de walk em paralelo para máxima performance
    const [
      tonerFromWalk,
      imagingFromWalk,
      paperTraysInput,
      paperTraysOutput,
      hardwareResources,
      hpSuppliesWeb,
    ] = await Promise.all([
      this.readTonerByWalk(ip, community, isHP),
      this.readImagingUnitByWalk(ip, community),
      this.readPaperTraysInput(ip, community),
      this.readPaperTraysOutput(ip, community),
      this.readHardwareResources(ip, community),
      isHP ? this.readHpSuppliesFromWeb(ip) : Promise.resolve(null),
    ]);

    // Monta toner: walk dinâmico tem prioridade sobre OIDs fixos
    const toner = this.parseToner(snmpData, isHP);
    let imagingSource = toner.imaging_unit != null ? 'snmp_fixed' : null;
    if (tonerFromWalk.black !== null)   toner.black = tonerFromWalk.black;
    if (tonerFromWalk.cyan !== null)    toner.cyan = tonerFromWalk.cyan;
    if (tonerFromWalk.magenta !== null) toner.magenta = tonerFromWalk.magenta;
    if (tonerFromWalk.yellow !== null)  toner.yellow = tonerFromWalk.yellow;
    if (imagingFromWalk !== null) {
      toner.imaging_unit = imagingFromWalk;
      imagingSource = 'snmp_walk';
    }

    // HP EWS tem o mesmo valor exibido na interface web (drum_black.remaining).
    if (hpSuppliesWeb?.imaging_unit != null) {
      toner.imaging_unit = hpSuppliesWeb.imaging_unit;
      imagingSource = 'web_api_hp';
    }

    const imagingSupported = toner.imaging_unit != null;
    const alerts = this.computeAlerts(toner);
    const statusCode = Number(snmpData[OIDS.printerStatus] || 1);
    const status = STATUS_MAP[statusCode] || 'unknown';

    return {
      status: status === 'unknown' ? 'online' : status,
      brand, model, serial, firmware,
      toner_levels: toner,
      total_pages: this.toNumber(snmpData[OIDS.totalPages]),
      power_on_pages: this.toNumber(snmpData[OIDS.powerOnPages]),
      snmp_available: true,
      imaging_supported: imagingSupported,
      imaging_source: imagingSource,
      imaging_web_source_url: hpSuppliesWeb?.source_url || null,
      imaging_web_values: hpSuppliesWeb ? {
        imaging_unit: hpSuppliesWeb.imaging_unit,
        toner_black: hpSuppliesWeb.toner_black,
        drum_count: hpSuppliesWeb.drum_count,
        drum_capacity: hpSuppliesWeb.drum_capacity,
      } : null,
      response_ms: Date.now() - start,
      alerts,
      open_ports: openPorts,
      // ★ Campos enriquecidos (espelho da página de suprimentos HP)
      paper_trays_input: paperTraysInput,
      paper_trays_output: paperTraysOutput,
      hardware_resources: hardwareResources,
    };
  }

  async testPrinter(ip, community = 'public') {
    const res = await this.readNetworkPrinterStatus(ip, community);
    return { success: res.status !== 'offline', ip, ...res };
  }

  // ----------------------------------------------------------
  // ★ Parse de toner com suporte HP 408dn
  //    OIDs fixos como base; walk dinâmico sobrescreve se válido
  // ----------------------------------------------------------

  parseToner(snmpData, isHP = false) {
    const result = {};

    // HP: tenta OIDs proprietários primeiro (mais confiáveis no 408dn)
    if (isHP) {
      const hpPct  = this.percent(this.toNumber(snmpData[OIDS.hpTonerBlackCur]), this.toNumber(snmpData[OIDS.hpTonerBlackMax]));
      const monoPct = this.percent(this.toNumber(snmpData[OIDS.hpMonoTonerCur]), this.toNumber(snmpData[OIDS.hpMonoTonerMax]));
      if (hpPct !== null)  result.black = hpPct;
      else if (monoPct !== null) result.black = monoPct;
    }

    // Fallback: OIDs padrão RFC 3805
    if (result.black === undefined) {
      const pct = this.percent(this.toNumber(snmpData[OIDS.blackCur]), this.toNumber(snmpData[OIDS.blackMax]));
      if (pct !== null) result.black = pct;
    }

    if (!this.monoOnly) {
      [['cyan', OIDS.cyanCur, OIDS.cyanMax], ['magenta', OIDS.magentaCur, OIDS.magentaMax], ['yellow', OIDS.yellowCur, OIDS.yellowMax]].forEach(([name, curOid, maxOid]) => {
        const pct = this.percent(this.toNumber(snmpData[curOid]), this.toNumber(snmpData[maxOid]));
        if (pct !== null) result[name] = pct;
      });
    }

    // Unidade de imagem — OID fixo como seed (walk sobrescreve com valor correto)
    const imgPct = this.percent(this.toNumber(snmpData[OIDS.imagingCur]), this.toNumber(snmpData[OIDS.imagingMax]));
    if (imgPct !== null) result.imaging_unit = imgPct;

    return result;
  }

  // ----------------------------------------------------------
  // ★ Walk dinâmico de toner por descrição de insumo
  //   Resolve o problema do "inválido" no índice fixo do 408dn
  // ----------------------------------------------------------

  async readTonerByWalk(ip, community, isHP = false) {
    const empty = { black: null, cyan: null, magenta: null, yellow: null };
    if (!snmp) return empty;
    try {
      const [descMap, typeMap, maxMap, curMap] = await Promise.all([
        this.snmpSubtree(ip, community, SUPPLIES_DESC_BASE_OID),
        this.snmpSubtree(ip, community, SUPPLIES_TYPE_BASE_OID),
        this.snmpSubtree(ip, community, SUPPLIES_MAX_BASE_OID),
        this.snmpSubtree(ip, community, SUPPLIES_CUR_BASE_OID),
      ]);

      const toIndex = (oid) => String(oid || '').split('.').pop();
      const indexes = new Set([...Object.keys(descMap).map(toIndex), ...Object.keys(maxMap).map(toIndex)]);
      const result = { black: null, cyan: null, magenta: null, yellow: null };

      Array.from(indexes).filter((idx) => /^\d+$/.test(String(idx))).forEach((idx) => {
        const desc = String(descMap[`${SUPPLIES_DESC_BASE_OID}.${idx}`] || '').toLowerCase();
        const type = this.toNumber(typeMap[`${SUPPLIES_TYPE_BASE_OID}.${idx}`]);
        const max  = this.toNumber(maxMap[`${SUPPLIES_MAX_BASE_OID}.${idx}`]);
        const cur  = this.toNumber(curMap[`${SUPPLIES_CUR_BASE_OID}.${idx}`]);
        const pct  = this.percent(cur, max);
        if (pct === null) return;

        // Só considera itens que são toner/cartucho
        const isToner = TONER_DESC_HINT.test(desc) || type === SUPPLY_TYPE.TONER;
        const isImaging = IMAGING_DESC_HINT.test(desc) || type === SUPPLY_TYPE.OPC;
        if (!isToner || isImaging) return;

        if (/(black|preto|\bk\b)/i.test(desc) || (!/(cyan|magenta|yellow|ciano|amarelo)/i.test(desc))) {
          if (result.black === null) result.black = pct;
        } else if (/cyan|ciano/i.test(desc))     result.cyan    = pct;
        else if (/magenta/i.test(desc))           result.magenta = pct;
        else if (/yellow|amarelo/i.test(desc))    result.yellow  = pct;
      });

      return result;
    } catch (error) {
      return empty;
    }
  }

  // ----------------------------------------------------------
  // ★ Walk dinâmico para unidade de imagem
  // ----------------------------------------------------------

  async readImagingUnitByWalk(ip, community) {
    if (!snmp) return null;
    try {
      const [descMap, typeMap, maxMap, curMap] = await Promise.all([
        this.snmpSubtree(ip, community, SUPPLIES_DESC_BASE_OID),
        this.snmpSubtree(ip, community, SUPPLIES_TYPE_BASE_OID),
        this.snmpSubtree(ip, community, SUPPLIES_MAX_BASE_OID),
        this.snmpSubtree(ip, community, SUPPLIES_CUR_BASE_OID),
      ]);

      const toIndex = (oid) => String(oid || '').split('.').pop();
      const indexes = Array.from(new Set([...Object.keys(descMap).map(toIndex), ...Object.keys(maxMap).map(toIndex)])).filter((idx) => /^\d+$/.test(String(idx)));
      if (!indexes.length) return null;

      const ranked = indexes.map((idx) => {
        const desc = String(descMap[`${SUPPLIES_DESC_BASE_OID}.${idx}`] || '');
        const type = this.toNumber(typeMap[`${SUPPLIES_TYPE_BASE_OID}.${idx}`]);
        const pct  = this.percent(this.toNumber(curMap[`${SUPPLIES_CUR_BASE_OID}.${idx}`]), this.toNumber(maxMap[`${SUPPLIES_MAX_BASE_OID}.${idx}`]));

        const hasHint    = IMAGING_DESC_HINT.test(desc);
        const hasExclude = IMAGING_DESC_EXCLUDE.test(desc);
        const hasToner   = TONER_DESC_HINT.test(desc);
        const isOPC      = type === SUPPLY_TYPE.OPC;
        const isDev      = type === SUPPLY_TYPE.DEVELOPER;
        const isExclType = [SUPPLY_TYPE.FUSER, SUPPLY_TYPE.TRANSFER_UNIT, SUPPLY_TYPE.TONER].includes(type);

        let score = 0;
        if (hasHint)    score += 50;
        if (isOPC)      score += 35;
        if (isDev)      score += 8;
        if (hasExclude) score -= 100;
        if (hasToner)   score -= 100;
        if (isExclType) score -= 100;
        if (/(black|preto|\bk\b)/i.test(desc))             score += 12;
        if (/(cyan|magenta|yellow|ciano|amarelo)/i.test(desc)) score -= 20;
        if (pct === null) score -= 5;

        return { idx, pct, score, hasHint, isOPC, isDev, hasExclude, isExclType, hasToner, desc: desc.toLowerCase() };
      });

      ranked.sort((a, b) => b.score - a.score);

      if (this.debugImaging) {
        const rows = ranked.slice(0, 12).map((r) => ({ idx: r.idx, score: r.score, percent: r.pct, desc: r.desc }));
        this.logger.info(`[PrinterService][ImagingDebug] ip=${ip} ${JSON.stringify(rows)}`);
        // eslint-disable-next-line no-console
        console.log(`[PrinterService][ImagingDebug] ip=${ip}`, rows);
      }

      const best = ranked.find((r) => r.pct !== null && (r.isOPC || r.hasHint || r.isDev) && !r.hasExclude && !r.isExclType && !r.hasToner);
      return best ? best.pct : null;
    } catch (error) {
      return null;
    }
  }

  // ----------------------------------------------------------
  // ★ Bandejas de entrada — HP 408dn: Bandeja 1=50f, Bandeja 2=250f
  //   Inclui tipo de papel ("Papel normal") e tamanho ("A4")
  // ----------------------------------------------------------

  async readPaperTraysInput(ip, community) {
    if (!snmp) return [];
    try {
      const [maxMap, curMap, descMap, mediaNameMap, mediaTypeMap] = await Promise.all([
        this.snmpSubtree(ip, community, PAPER_INPUT_MAX_OID),
        this.snmpSubtree(ip, community, PAPER_INPUT_CUR_OID),
        this.snmpSubtree(ip, community, PAPER_INPUT_DESC_OID),
        this.snmpSubtree(ip, community, PAPER_INPUT_MEDIA_OID),
        this.snmpSubtree(ip, community, PAPER_INPUT_MTYPE_OID),
      ]);

      const toIndex = (oid) => String(oid || '').split('.').pop();
      const indexes = new Set([...Object.keys(maxMap).map(toIndex), ...Object.keys(curMap).map(toIndex)]);

      return Array.from(indexes).filter((idx) => /^\d+$/.test(String(idx))).map((idx) => {
        const max       = this.toNumber(maxMap[`${PAPER_INPUT_MAX_OID}.${idx}`]);
        const cur       = this.toNumber(curMap[`${PAPER_INPUT_CUR_OID}.${idx}`]);
        const desc      = String(descMap[`${PAPER_INPUT_DESC_OID}.${idx}`] || `Bandeja ${idx}`).trim();
        const mediaName = String(mediaNameMap[`${PAPER_INPUT_MEDIA_OID}.${idx}`] || '').trim() || null;
        const mediaType = String(mediaTypeMap[`${PAPER_INPUT_MTYPE_OID}.${idx}`] || '').trim() || null;
        const pct       = this.percent(cur, max);

        return {
          index: idx,
          description: desc,
          capacity: max,          // folhas máximas
          current_level: cur,     // folhas atuais (nem sempre reportado)
          percent: pct,
          media_name: mediaName,  // ex: "A4"
          media_type: mediaType,  // ex: "Papel normal"
          status: cur === 0 ? 'empty' : (pct !== null && pct <= 10 ? 'low' : 'ok'),
        };
      }).sort((a, b) => Number(a.index) - Number(b.index));
    } catch (error) {
      return [];
    }
  }

  // ----------------------------------------------------------
  // ★ Bandeja de saída — HP 408dn: Comp padrao = 150 folhas
  // ----------------------------------------------------------

  async readPaperTraysOutput(ip, community) {
    if (!snmp) return [];
    try {
      const [maxMap, curMap, descMap] = await Promise.all([
        this.snmpSubtree(ip, community, PAPER_OUTPUT_MAX_OID),
        this.snmpSubtree(ip, community, PAPER_OUTPUT_CUR_OID),
        this.snmpSubtree(ip, community, PAPER_OUTPUT_DESC_OID),
      ]);

      const toIndex = (oid) => String(oid || '').split('.').pop();
      const indexes = new Set([...Object.keys(maxMap).map(toIndex), ...Object.keys(curMap).map(toIndex)]);

      return Array.from(indexes).filter((idx) => /^\d+$/.test(String(idx))).map((idx) => {
        const max  = this.toNumber(maxMap[`${PAPER_OUTPUT_MAX_OID}.${idx}`]);
        const cur  = this.toNumber(curMap[`${PAPER_OUTPUT_CUR_OID}.${idx}`]);
        const desc = String(descMap[`${PAPER_OUTPUT_DESC_OID}.${idx}`] || `Saida ${idx}`).trim();
        return {
          index: idx,
          description: desc,   // ex: "Comp padrao"
          capacity: max,        // ex: 150
          current_level: cur,
          status: 'ok',
        };
      }).sort((a, b) => Number(a.index) - Number(b.index));
    } catch (error) {
      return [];
    }
  }

  // ----------------------------------------------------------
  // ★ Recursos de hardware — HP 408dn: RAM 256MB + Duplex
  // ----------------------------------------------------------

  async readHardwareResources(ip, community) {
    if (!snmp) return {};
    try {
      const [storageDescMap, storageSizeMap, storageAllocMap, storageTypeMap, deviceDescMap, deviceTypeMap] = await Promise.all([
        this.snmpSubtree(ip, community, HR_STORAGE_DESC_OID),
        this.snmpSubtree(ip, community, HR_STORAGE_SIZE_OID),
        this.snmpSubtree(ip, community, HR_STORAGE_ALLOC_OID),
        this.snmpSubtree(ip, community, HR_STORAGE_TYPE_OID),
        this.snmpSubtree(ip, community, HR_DEVICE_DESC_OID),
        this.snmpSubtree(ip, community, HR_DEVICE_TYPE_OID),
      ]);

      // RAM: procura entrada de memória RAM
      let ram_mb = null;
      Object.keys(storageSizeMap).forEach((oid) => {
        const idx = oid.split('.').pop();
        const desc = String(storageDescMap[`${HR_STORAGE_DESC_OID}.${idx}`] || '').toLowerCase();
        if (/ram|memory|memoria/i.test(desc)) {
          const size  = this.toNumber(storageSizeMap[oid]);
          const alloc = this.toNumber(storageAllocMap[`${HR_STORAGE_ALLOC_OID}.${idx}`]);
          if (size !== null && alloc !== null) {
            ram_mb = Math.round((size * alloc) / (1024 * 1024));
          }
        }
      });

      // Duplex: procura dispositivo com "duplex" na descrição
      let duplex_installed = false;
      Object.keys(deviceDescMap).forEach((oid) => {
        const desc = String(deviceDescMap[oid] || '').toLowerCase();
        if (/duplex/i.test(desc)) duplex_installed = true;
      });

      // Lista todos dispositivos de hardware detectados
      const devices = Object.keys(deviceDescMap).map((oid) => ({
        oid,
        description: String(deviceDescMap[oid] || '').trim(),
      })).filter((d) => d.description);

      return { ram_mb, duplex_installed, devices };
    } catch (error) {
      return {};
    }
  }

  async fetchUrlText(url) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https://') ? https : http;
      const req = client.get(url, {
        timeout: 5000,
        rejectUnauthorized: false,
        headers: {
          'User-Agent': 'servidor-unificado-printer-service/1.0',
          Accept: 'application/json,text/javascript,text/plain,text/html,*/*',
        },
      }, (res) => {
        const statusCode = Number(res.statusCode || 0);
        if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
          const redirected = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).toString();
          res.resume();
          this.fetchUrlText(redirected).then(resolve).catch(reject);
          return;
        }

        if (statusCode < 200 || statusCode >= 300) {
          res.resume();
          reject(new Error(`HTTP ${statusCode}`));
          return;
        }

        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => resolve(body));
      });

      req.on('timeout', () => req.destroy(new Error('timeout')));
      req.on('error', reject);
    });
  }

  parseLooseObject(text) {
    try {
      // HP SWS endpoint retorna objeto JS (não JSON estrito)
      // eslint-disable-next-line no-new-func
      return Function(`"use strict"; return (${String(text || '').trim()});`)();
    } catch (error) {
      return null;
    }
  }

  async readHpSuppliesFromWeb(ip) {
    if (!ip) return null;

    const urls = [
      ...HP_WEB_SUPPLIES_PATHS.map((path) => `https://${ip}${path}`),
      ...HP_WEB_SUPPLIES_PATHS.map((path) => `http://${ip}${path}`),
    ];

    for (const url of urls) {
      try {
        const body = await this.fetchUrlText(url);
        const data = this.parseLooseObject(body);
        if (!data || typeof data !== 'object') continue;

        const drumBlack = data.drum_black || null;
        const tonerBlack = data.toner_black || null;
        const imagingUnit = this.toNumber(drumBlack?.remaining);
        if (imagingUnit === null) continue;

        return {
          source_url: url,
          imaging_unit: imagingUnit,
          toner_black: this.toNumber(tonerBlack?.remaining),
          drum_count: this.toNumber(drumBlack?.cnt),
          drum_capacity: this.toNumber(drumBlack?.capa),
        };
      } catch (error) {
        // tenta próxima URL
      }
    }

    return null;
  }

  // ----------------------------------------------------------
  // SNMP helpers
  // ----------------------------------------------------------

  async ping(ip) {
    const cmd = process.platform === 'win32' ? `ping -n 1 -w 2000 ${ip}` : `ping -c 1 -W 2 ${ip}`;
    try { await execAsync(cmd, { timeout: 5000 }); return true; } catch { return false; }
  }

  async snmpGet(ip, community, oids) {
    return new Promise((resolve) => {
      const session = snmp.createSession(ip, community, { timeout: this.snmpTimeout, retries: 1, version: snmp.Version2c });
      session.get(oids, (error, varbinds) => {
        session.close();
        if (error) return resolve(null);
        const result = {};
        varbinds.forEach((vb, idx) => {
          if (snmp.isVarbindError(vb)) return;
          result[oids[idx]] = Buffer.isBuffer(vb.value) ? vb.value.toString('utf8').replace(/\0/g, '').trim() : vb.value;
        });
        resolve(result);
      });
    });
  }

  async snmpSubtree(ip, community, baseOid) {
    return new Promise((resolve) => {
      const session = snmp.createSession(ip, community, { timeout: this.snmpTimeout, retries: 1, version: snmp.Version2c });
      const result = {};
      const feedCb = (varbinds) => {
        (varbinds || []).forEach((vb) => {
          if (snmp.isVarbindError(vb)) return;
          result[vb.oid] = Buffer.isBuffer(vb.value) ? vb.value.toString('utf8').replace(/\0/g, '').trim() : vb.value;
        });
      };
      const doneCb = () => { session.close(); resolve(result); };
      try { session.subtree(baseOid, feedCb, doneCb); }
      catch (e) { try { session.close(); } catch (_) {} resolve({}); }
    });
  }

  // ----------------------------------------------------------
  // Utilitários
  // ----------------------------------------------------------

  computeAlerts(toner) {
    const alerts = [];
    Object.entries(toner || {}).forEach(([color, pct]) => {
      const prefix = color === 'imaging_unit' ? 'imaging' : 'toner';
      if (pct <= 5)       alerts.push({ type: `${prefix}_critical`, color, percent: pct });
      else if (pct <= 15) alerts.push({ type: `${prefix}_low`,      color, percent: pct });
    });
    return alerts;
  }

  percent(current, max) {
    if (max === null || max <= 0 || current === null) return null;
    if (current === -3) return null; // "some remaining" indeterminado
    if (current < 0) return 0;
    return Math.max(0, Math.min(100, Math.round((current / max) * 100)));
  }

  toNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  // ----------------------------------------------------------
  // Consultas públicas
  // ----------------------------------------------------------

  async getManagedPrinters() {
    const module = await AssetModuleConfig.findOne({ type: 'printer', is_active: true });
    if (!module) return [];
    return ManagedAsset.find({ module_id: module._id, asset_type: 'printer', is_deleted: { $ne: true } }).lean();
  }

  async getSummary() {
    const printers = await this.getManagedPrinters();
    const tonerAlerts = printers.reduce((sum, p) => {
      const levels = p.toner_levels || p.custom_data?.toner_levels || {};
      const values = this.monoOnly ? [levels.black] : Object.values(levels);
      return values.some((v) => v !== undefined && Number(v) <= 15) ? sum + 1 : sum;
    }, 0);
    return {
      total: printers.length,
      online: printers.filter((p) => p.status === 'online').length,
      offline: printers.filter((p) => p.status === 'offline').length,
      maintenance: printers.filter((p) => p.status === 'maintenance').length,
      toner_alerts: tonerAlerts,
      snmp_enabled: Boolean(snmp),
    };
  }

  async registerPrinter(printerData) {
    const module = await this.ensurePrinterModule();
    const serial = printerData.serial_number || printerData.id || `PRINTER-${Date.now()}`;
    return ManagedAsset.findOneAndUpdate(
      { module_id: module._id, serial_number: serial },
      {
        module_id: module._id, asset_type: 'printer',
        asset_name: printerData.asset_name || serial,
        serial_number: serial,
        manufacturer: printerData.manufacturer || 'Unknown',
        model: printerData.model || 'Unknown',
        ip_address: printerData.ip_address || null,
        connection_type: printerData.connection_type || (printerData.ip_address ? 'network' : 'usb'),
        usb_path: printerData.usb_path || null,
        snmp_community: printerData.snmp_community || 'public',
        status: printerData.status || 'offline',
      },
      { upsert: true, new: true }
    );
  }
}

module.exports = PrinterService;

