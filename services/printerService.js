const { exec } = require('child_process');
const { promisify } = require('util');
const net = require('net');
const os = require('os');
const ManagedAsset = require('../models/ManagedAsset');
const AssetModuleConfig = require('../models/AssetModuleConfig');
const NotificationService = require('./notificationService');

const execAsync = promisify(exec);

let snmp = null;
try {
  // Dependencia opcional: npm install net-snmp
  // Sem ela o monitoramento continua (status online/offline), mas sem toner via SNMP.
  // eslint-disable-next-line global-require
  snmp = require('net-snmp');
} catch (error) {
  snmp = null;
}

const OIDS = {
  sysDescr: '1.3.6.1.2.1.1.1.0',
  printerStatus: '1.3.6.1.2.1.25.3.5.1.1.1',
  totalPages: '1.3.6.1.2.1.43.10.2.1.4.1.1',
  blackMax: '1.3.6.1.2.1.43.11.1.1.8.1.1',
  blackCur: '1.3.6.1.2.1.43.11.1.1.9.1.1',
  cyanMax: '1.3.6.1.2.1.43.11.1.1.8.1.2',
  cyanCur: '1.3.6.1.2.1.43.11.1.1.9.1.2',
  magentaMax: '1.3.6.1.2.1.43.11.1.1.8.1.3',
  magentaCur: '1.3.6.1.2.1.43.11.1.1.9.1.3',
  yellowMax: '1.3.6.1.2.1.43.11.1.1.8.1.4',
  yellowCur: '1.3.6.1.2.1.43.11.1.1.9.1.4',
  imagingMax: '1.3.6.1.2.1.43.11.1.1.8.1.5',
  imagingCur: '1.3.6.1.2.1.43.11.1.1.9.1.5',
  hpModel: '1.3.6.1.4.1.11.2.3.9.4.2.1.1.3.2.0',
  hpSerial: '1.3.6.1.4.1.11.2.3.9.4.2.1.1.3.3.0',
  samsungModel: '1.3.6.1.4.1.236.11.5.11.81.2.2.0',
  samsungSerial: '1.3.6.1.4.1.236.11.5.11.81.2.1.0',
};
const SUPPLIES_DESC_BASE_OID = '1.3.6.1.2.1.43.11.1.1.6.1';
const SUPPLIES_MAX_BASE_OID = '1.3.6.1.2.1.43.11.1.1.8.1';
const SUPPLIES_CUR_BASE_OID = '1.3.6.1.2.1.43.11.1.1.9.1';
const IMAGING_DESC_HINT = /(imaging|image unit|drum|opc|photo conductor|fuser|maintenance kit|unidade de imagem|unidad de imagen|cilindro|fotocondutor)/i;

const STATUS_MAP = {
  1: 'unknown',
  2: 'online',
  3: 'online',
  4: 'online',
  5: 'maintenance',
};
const PRINTER_TEXT_HINT = /(printer|laserjet|officejet|deskjet|pagewide|neverstop|mfp|workcentre|phaser|altalink|xerox|samsung\s*(ml|scx|sl-|xpress)|brother|canon|ricoh|kyocera|epson|lexmark)/i;
const NETWORK_DEVICE_TEXT_HINT = /(switch|router|firewall|officeconnect|aruba|cisco|juniper|mikrotik|fortigate|ubiquiti|hpe officeconnect)/i;

class PrinterService {
  constructor(logger) {
    this.logger = logger || console;
    this.intervalMs = 60_000;
    this.timer = null;
    this.snmpTimeout = 5000;
    this.monoOnly = String(process.env.PRINTER_MONO_ONLY || 'true').toLowerCase() !== 'false';
  }

  async start() {
    this.logger.info('[PrinterService] Iniciando monitoramento de impressoras');
    await this.pollAll();
    this.timer = setInterval(() => {
      this.pollAll().catch((err) => {
        this.logger.error(`[PrinterService] Falha no poll automatico: ${err.message}`);
      });
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async ensurePrinterModule() {
    let module = await AssetModuleConfig.findOne({ type: 'printer', is_active: true });
    if (!module) {
      module = await AssetModuleConfig.create({
        name: 'Impressoras',
        type: 'printer',
        description: 'Monitoramento de impressoras HP e Samsung (IP/USB)',
        is_active: true,
      });
      this.logger.info('[PrinterService] Modulo de impressoras criado automaticamente');
    }
    return module;
  }

  async discoverPrinters(options = {}) {
    const persist = options.persist === true;
    const module = await this.ensurePrinterModule();
    const usb = await this.detectUsbPrinters();
    const network = await this.detectNetworkPrinters();
    const upserted = [];
    const discovered = [...usb, ...network];

    if (!persist) {
      return {
        success: true,
        persist: false,
        detected_usb: usb.length,
        detected_network: network.length,
        discovered,
        upserted: [],
      };
    }

    for (const p of usb) {
      const serial = p.serial_number || p.id;
      const asset = await ManagedAsset.findOneAndUpdate(
        { module_id: module._id, serial_number: serial },
        {
          module_id: module._id,
          asset_type: 'printer',
          asset_name: p.asset_name,
          serial_number: serial,
          manufacturer: p.manufacturer || 'Unknown',
          model: p.model || 'Unknown',
          connection_type: 'usb',
          usb_path: p.usb_path || null,
          status: 'online',
          last_check_time: new Date(),
          custom_data: {
            ...(p.custom_data || {}),
            detected_by: 'local-discovery',
          },
        },
        { upsert: true, new: true }
      );

      upserted.push({
        id: asset._id,
        asset_name: asset.asset_name,
        serial_number: asset.serial_number,
        connection_type: asset.connection_type,
      });
    }

    for (const p of network) {
      const serial = p.serial_number || `NET-${p.ip_address}`;
      const asset = await ManagedAsset.findOneAndUpdate(
        { module_id: module._id, serial_number: serial },
        {
          module_id: module._id,
          asset_type: 'printer',
          asset_name: p.asset_name || `Printer ${p.ip_address}`,
          serial_number: serial,
          manufacturer: p.manufacturer || 'Unknown',
          model: p.model || 'Unknown',
          connection_type: 'network',
          ip_address: p.ip_address,
          status: p.status || 'online',
          last_check_time: new Date(),
          custom_data: {
            ...(p.custom_data || {}),
            detected_by: 'network-discovery',
            discovered_ports: p.open_ports || [],
          },
        },
        { upsert: true, new: true }
      );

      upserted.push({
        id: asset._id,
        asset_name: asset.asset_name,
        serial_number: asset.serial_number,
        connection_type: asset.connection_type,
      });
    }

    return {
      success: true,
      persist: true,
      detected_usb: usb.length,
      detected_network: network.length,
      discovered,
      upserted,
    };
  }

  async detectUsbPrinters() {
    if (process.platform === 'win32') return this.detectUsbPrintersWindows();
    return this.detectUsbPrintersLinux();
  }

  async detectUsbPrintersWindows() {
    const command = [
      'Get-CimInstance Win32_Printer',
      "| Select-Object Name,DriverName,PortName,WorkOffline,PrinterStatus,DeviceID",
      '| ConvertTo-Json -Depth 4',
    ].join(' ');

    try {
      const { stdout } = await execAsync(`powershell -NoProfile -Command "${command}"`, { timeout: 12_000 });
      if (!stdout || !stdout.trim()) return [];

      const parsed = JSON.parse(stdout);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      return items
        .filter((p) => p.PortName && p.PortName.toLowerCase().includes('usb'))
        .map((p, idx) => ({
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
      this.logger.warn(`[PrinterService] Falha ao detectar impressoras USB (Windows): ${error.message}`);
      return [];
    }
  }

  async detectUsbPrintersLinux() {
    try {
      const { stdout } = await execAsync('lsusb 2>/dev/null || true', { timeout: 8000 });
      if (!stdout || !stdout.trim()) return [];

      return stdout
        .split('\n')
        .filter(Boolean)
        .filter((line) => /hp|samsung|brother|xerox|epson/i.test(line))
        .map((line, idx) => {
          const parts = line.split(/\s+/);
          const vendorProduct = (parts[5] || '').split(':');
          const vendor = vendorProduct[0] || 'unknown';
          const product = vendorProduct[1] || 'unknown';
          const description = parts.slice(6).join(' ') || 'USB Printer';

          return {
            id: `usb-${vendor}-${product}-${idx}`,
            serial_number: `USB-${vendor}-${product}-${idx}`,
            asset_name: description,
            manufacturer: this.detectBrand(description),
            model: description,
            usb_path: `/dev/usb-${vendor}-${product}`,
            status: 'online',
            custom_data: {
              vendor_id: vendor,
              product_id: product,
            },
          };
        });
    } catch (error) {
      this.logger.warn(`[PrinterService] Falha ao detectar impressoras USB (Linux): ${error.message}`);
      return [];
    }
  }

  async detectNetworkPrinters() {
    const subnets = this.getScanSubnets();
    if (!subnets.length) return [];

    const hosts = [];
    subnets.forEach((prefix) => {
      for (let i = 1; i <= 254; i += 1) hosts.push(`${prefix}.${i}`);
    });

    const found = [];
    const concurrency = 40;
    let cursor = 0;

    const worker = async () => {
      while (cursor < hosts.length) {
        const index = cursor;
        cursor += 1;
        const ip = hosts[index];

        // eslint-disable-next-line no-await-in-loop
        const ports = await this.getOpenPrinterPorts(ip, { includeWebPorts: false });
        if (!ports.length) continue;

        // eslint-disable-next-line no-await-in-loop
        const deviceInfo = await this.tryReadDiscoveryInfo(ip);
        if (!this.shouldAcceptDiscoveryDevice(ports, deviceInfo)) continue;

        const model = deviceInfo.model || 'Network Printer';
        const serial = deviceInfo.serial || `NET-${ip}`;
        const manufacturer = deviceInfo.brand || this.detectBrand(model) || 'Unknown';

        found.push({
          id: `net-${ip}`,
          serial_number: serial,
          asset_name: deviceInfo.hostname || `Printer ${ip}`,
          manufacturer,
          model,
          ip_address: ip,
          connection_type: 'network',
          status: 'online',
          open_ports: ports,
          custom_data: {
            hostname: deviceInfo.hostname || null,
            discovered_by: 'network-scan',
          },
        });
      }
    };

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    return found;
  }

  getScanSubnets() {
    const envValue = process.env.PRINTER_SCAN_SUBNETS;
    if (envValue) {
      return envValue
        .split(',')
        .map((s) => s.trim())
        .filter((s) => /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(s));
    }

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
    const includeWebPorts = options.includeWebPorts === true;
    const ports = includeWebPorts ? [9100, 631, 515, 80, 443] : [9100, 631, 515];
    const checks = await Promise.all(ports.map((port) => this.isTcpPortOpen(ip, port, 450)));
    return ports.filter((_, idx) => checks[idx]);
  }

  async tryReadDiscoveryInfo(ip) {
    if (!snmp) {
      return { brand: null, model: null, serial: null, hostname: null };
    }

    const data = await this.snmpGet(ip, 'public', [
      OIDS.sysDescr,
      OIDS.hpModel,
      OIDS.hpSerial,
      OIDS.samsungModel,
      OIDS.samsungSerial,
    ]);

    if (!data) {
      return { brand: null, model: null, serial: null, hostname: null };
    }

    const model = data[OIDS.hpModel] || data[OIDS.samsungModel] || data[OIDS.sysDescr] || null;
    const serial = data[OIDS.hpSerial] || data[OIDS.samsungSerial] || null;
    const brand = this.detectBrand(model);

    return {
      brand,
      model,
      serial,
      hostname: null,
      sysDescr: data[OIDS.sysDescr] || null,
    };
  }

  isLikelyPrinterBySnmp(deviceInfo) {
    const model = String(deviceInfo?.model || '');
    const sysDescr = String(deviceInfo?.sysDescr || '');
    if (NETWORK_DEVICE_TEXT_HINT.test(model) || NETWORK_DEVICE_TEXT_HINT.test(sysDescr)) return false;
    return PRINTER_TEXT_HINT.test(model) || PRINTER_TEXT_HINT.test(sysDescr);
  }

  shouldAcceptDiscoveryDevice(ports, deviceInfo) {
    const model = String(deviceInfo?.model || '');
    const sysDescr = String(deviceInfo?.sysDescr || '');
    if (NETWORK_DEVICE_TEXT_HINT.test(model) || NETWORK_DEVICE_TEXT_HINT.test(sysDescr)) return false;

    const hasRawPort = ports.includes(9100);
    const hasLpdPort = ports.includes(515);
    const hasIppPort = ports.includes(631);
    const looksLikePrinterBySnmp = this.isLikelyPrinterBySnmp(deviceInfo);

    // 9100 eh forte indicativo de impressora; 515/631 exigem confirmacao por SNMP.
    if (hasRawPort) return true;
    if ((hasLpdPort || hasIppPort) && looksLikePrinterBySnmp) return true;
    return false;
  }

  async isTcpPortOpen(ip, port, timeoutMs = 500) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let done = false;

      const finish = (result) => {
        if (done) return;
        done = true;
        try { socket.destroy(); } catch (e) { /* noop */ }
        resolve(result);
      };

      socket.setTimeout(timeoutMs);
      socket.once('connect', () => finish(true));
      socket.once('timeout', () => finish(false));
      socket.once('error', () => finish(false));

      try {
        socket.connect(port, ip);
      } catch (error) {
        finish(false);
      }
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

  async pollAll() {
    const module = await AssetModuleConfig.findOne({ type: 'printer', is_active: true });
    if (!module) return { total: 0, updated: 0 };

    const printers = await ManagedAsset.find({
      module_id: module._id,
      asset_type: 'printer',
      is_deleted: { $ne: true },
    });

    let updated = 0;
    for (const p of printers) {
      // eslint-disable-next-line no-await-in-loop
      await this.updatePrinterStatus(p);
      updated += 1;
    }

    return { total: printers.length, updated };
  }

  async updateAllPrinterStatus() {
    return this.pollAll();
  }

  async pollPrinter(printerOrId) {
    const printer = typeof printerOrId === 'string'
      ? await ManagedAsset.findById(printerOrId)
      : printerOrId;

    if (!printer) throw new Error('Impressora nao encontrada');
    await this.updatePrinterStatus(printer);
    return printer;
  }

  async updatePrinterStatus(printer) {
    const type = (printer.connection_type || '').toLowerCase();
    let result = null;
    const previousToner = printer.toner_levels instanceof Map
      ? Object.fromEntries(printer.toner_levels)
      : (printer.toner_levels || {});

    if (type === 'usb') {
      result = await this.readUsbPrinterStatus(printer);
    } else {
      result = await this.readNetworkPrinterStatus(printer.ip_address, printer.snmp_community || 'public');
    }

    printer.status = result.status || 'unknown';
    printer.last_check_time = new Date();
    printer.last_seen = new Date();

    if (result.model && (!printer.model || printer.model === 'Unknown')) {
      printer.model = result.model;
    }
    if (result.brand && (!printer.manufacturer || printer.manufacturer === 'Unknown')) {
      printer.manufacturer = result.brand;
    }
    if (result.total_pages !== null && result.total_pages !== undefined) {
      printer.total_pages = result.total_pages;
    }
    if (result.toner_levels) {
      // Evita perder a unidade de imagem por flutuacao de leitura SNMP.
      if (
        (result.toner_levels.imaging_unit === undefined || result.toner_levels.imaging_unit === null)
        && previousToner.imaging_unit !== undefined
      ) {
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
      imaging_supported: typeof result.imaging_supported === 'boolean'
        ? result.imaging_supported
        : (result.toner_levels?.imaging_unit !== undefined
          ? true
          : (currentData.imaging_supported === false ? false : null)),
    };

    this.emitPrinterSupplyAlerts(printer, previousToner, result.toner_levels || {});
    await printer.save();
    return result;
  }

  emitPrinterSupplyAlerts(printer, previousToner, currentToner) {
    try {
      const levels = [
        { key: 'black', label: 'Toner preto' },
        { key: 'imaging_unit', label: 'Unidade de imagem' },
      ];
      const customData = printer.custom_data instanceof Map
        ? Object.fromEntries(printer.custom_data)
        : (printer.custom_data || {});
      const state = customData.supply_alert_state || {};

      levels.forEach(({ key, label }) => {
        const current = this.toNumber(currentToner[key]);
        const previous = this.toNumber(previousToner[key]);
        if (current === null) return;

        const alertKey = `${printer._id}:${key}`;
        const isCritical = current <= 5;
        const isLow = current > 5 && current <= 15;
        const level = isCritical ? 'critical' : (isLow ? 'low' : 'ok');
        const previousLevel = state[alertKey] || 'ok';

        if ((level === 'low' || level === 'critical') && level !== previousLevel) {
          const severity = level === 'critical' ? 'error' : 'warning';
          NotificationService.notifyError(
            `${label} baixo`,
            `${printer.asset_name} (${printer.serial_number}) em ${current}%`,
            severity
          );
        }

        if (previous !== null && previous <= 15 && current > 20 && previousLevel !== 'ok') {
          NotificationService.notifySuccess(
            `${label} normalizado`,
            `${printer.asset_name} voltou para ${current}%`
          );
        }

        state[alertKey] = level;
      });

      printer.custom_data = {
        ...customData,
        supply_alert_state: state,
      };
    } catch (error) {
      this.logger.warn(`[PrinterService] Falha ao emitir alerta de suprimentos: ${error.message}`);
    }
  }

  async readUsbPrinterStatus(printer) {
    const currentData = printer.custom_data instanceof Map
      ? Object.fromEntries(printer.custom_data)
      : (printer.custom_data || {});

    const fromAgent = Boolean(currentData.device_agent_id) || String(currentData.source || '').includes('usb-agent');
    if (fromAgent) {
      const lastSyncRaw = currentData.last_sync || currentData.sync_timestamp || printer.last_check_time || printer.updated_at;
      const lastSyncDate = lastSyncRaw ? new Date(lastSyncRaw) : null;
      const ttlMs = Number(process.env.PRINTER_USB_AGENT_TTL_MS || 180000); // 3 min
      const stale = !lastSyncDate || Number.isNaN(lastSyncDate.getTime()) || ((Date.now() - lastSyncDate.getTime()) > ttlMs);

      const tonerFromAsset = printer.toner_levels instanceof Map
        ? Object.fromEntries(printer.toner_levels)
        : (printer.toner_levels || {});
      const tonerFromCustom = currentData.toner_levels || {};
      const tonerLevels = Object.keys(tonerFromAsset).length ? tonerFromAsset : tonerFromCustom;

      if (stale) {
        return {
          status: 'offline',
          snmp_available: false,
          error: 'Agente USB sem sincronizacao recente',
          toner_levels: tonerLevels,
        };
      }

      return {
        status: (printer.status && printer.status !== 'offline') ? printer.status : 'online',
        snmp_available: false,
        brand: printer.manufacturer,
        model: printer.model,
        toner_levels: tonerLevels,
      };
    }

    const usb = await this.detectUsbPrinters();
    const found = usb.find((p) => {
      const sameSerial = p.serial_number && p.serial_number === printer.serial_number;
      const sameName = p.asset_name && p.asset_name === printer.asset_name;
      return sameSerial || sameName;
    });

    if (!found) {
      return {
        status: 'offline',
        snmp_available: false,
        error: 'Impressora USB nao detectada localmente',
      };
    }

    return {
      status: found.status || 'online',
      snmp_available: false,
      brand: found.manufacturer,
      model: found.model,
    };
  }

  async readNetworkPrinterStatus(ip, community = 'public') {
    const start = Date.now();
    if (!ip) {
      return { status: 'unknown', snmp_available: false, error: 'Impressora sem IP configurado' };
    }

    const reachable = await this.ping(ip);
    const openPorts = await this.getOpenPrinterPorts(ip);
    const hasPrinterPort = openPorts.length > 0;

    if (!reachable) {
      // Muitas impressoras bloqueiam ICMP, mas continuam online nas portas 9100/631/515.
      if (!hasPrinterPort) {
        return { status: 'offline', snmp_available: false, error: 'Host nao responde a ping nem portas de impressao' };
      }
    }

    if (!snmp) {
      return {
        status: 'online',
        snmp_available: false,
        response_ms: Date.now() - start,
        error: reachable ? 'Biblioteca net-snmp nao instalada' : 'ICMP bloqueado; impressora respondeu em porta TCP',
        open_ports: openPorts,
      };
    }

    const oids = Object.values(OIDS);
    const snmpData = await this.snmpGet(ip, community, oids);
    if (!snmpData) {
      return {
        status: 'online',
        snmp_available: false,
        response_ms: Date.now() - start,
        error: reachable
          ? 'SNMP indisponivel (community string ou firewall)'
          : 'ICMP bloqueado; SNMP indisponivel, mas porta de impressao aberta',
        open_ports: openPorts,
      };
    }

    const toner = this.parseToner(snmpData);
    if (toner.imaging_unit === undefined || toner.imaging_unit === null) {
      const dynamicImaging = await this.readImagingUnitByWalk(ip, community);
      if (dynamicImaging !== null) toner.imaging_unit = dynamicImaging;
    }
    const imagingSupported = toner.imaging_unit !== undefined && toner.imaging_unit !== null;
    const alerts = this.computeAlerts(toner);
    const statusCode = Number(snmpData[OIDS.printerStatus] || 1);
    const status = STATUS_MAP[statusCode] || 'unknown';
    const finalStatus = status === 'unknown' && hasPrinterPort ? 'online' : status;

    const model = snmpData[OIDS.hpModel] || snmpData[OIDS.samsungModel] || snmpData[OIDS.sysDescr] || null;
    const serial = snmpData[OIDS.hpSerial] || snmpData[OIDS.samsungSerial] || null;
    const brand = this.detectBrand(model);

    return {
      status: finalStatus,
      brand,
      model,
      serial,
      toner_levels: toner,
      total_pages: this.toNumber(snmpData[OIDS.totalPages]),
      snmp_available: true,
      imaging_supported: imagingSupported,
      response_ms: Date.now() - start,
      alerts,
      open_ports: openPorts,
    };
  }

  async testPrinter(ip, community = 'public') {
    const res = await this.readNetworkPrinterStatus(ip, community);
    return {
      success: res.status !== 'offline',
      ip,
      ...res,
    };
  }

  async ping(ip) {
    const command = process.platform === 'win32'
      ? `ping -n 1 -w 2000 ${ip}`
      : `ping -c 1 -W 2 ${ip}`;

    try {
      await execAsync(command, { timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  async snmpGet(ip, community, oids) {
    return new Promise((resolve) => {
      const session = snmp.createSession(ip, community, {
        timeout: this.snmpTimeout,
        retries: 1,
        version: snmp.Version2c,
      });

      session.get(oids, (error, varbinds) => {
        session.close();
        if (error) return resolve(null);

        const result = {};
        varbinds.forEach((vb, idx) => {
          if (snmp.isVarbindError(vb)) return;
          const value = Buffer.isBuffer(vb.value)
            ? vb.value.toString('utf8').replace(/\0/g, '').trim()
            : vb.value;
          result[oids[idx]] = value;
        });

        resolve(result);
      });
    });
  }

  async snmpSubtree(ip, community, baseOid) {
    return new Promise((resolve) => {
      const session = snmp.createSession(ip, community, {
        timeout: this.snmpTimeout,
        retries: 1,
        version: snmp.Version2c,
      });

      const result = {};
      const feedCb = (varbinds) => {
        (varbinds || []).forEach((vb) => {
          if (snmp.isVarbindError(vb)) return;
          const value = Buffer.isBuffer(vb.value)
            ? vb.value.toString('utf8').replace(/\0/g, '').trim()
            : vb.value;
          result[vb.oid] = value;
        });
      };

      const doneCb = () => {
        session.close();
        resolve(result);
      };

      try {
        session.subtree(baseOid, feedCb, doneCb);
      } catch (error) {
        try { session.close(); } catch (e) { /* noop */ }
        resolve({});
      }
    });
  }

  async readImagingUnitByWalk(ip, community) {
    if (!snmp) return null;
    try {
      const [descMap, maxMap, curMap] = await Promise.all([
        this.snmpSubtree(ip, community, SUPPLIES_DESC_BASE_OID),
        this.snmpSubtree(ip, community, SUPPLIES_MAX_BASE_OID),
        this.snmpSubtree(ip, community, SUPPLIES_CUR_BASE_OID),
      ]);

      const toIndex = (oid) => String(oid || '').split('.').pop();
      const allIndexes = new Set([
        ...Object.keys(descMap).map(toIndex),
        ...Object.keys(maxMap).map(toIndex),
        ...Object.keys(curMap).map(toIndex),
      ]);

      const candidateIndexes = Array.from(allIndexes).filter((idx) => /^\d+$/.test(String(idx)));
      if (!candidateIndexes.length) return null;

      const byDesc = candidateIndexes.find((idx) => IMAGING_DESC_HINT.test(String(descMap[`${SUPPLIES_DESC_BASE_OID}.${idx}`] || '')));
      if (byDesc) {
        const max = this.toNumber(maxMap[`${SUPPLIES_MAX_BASE_OID}.${byDesc}`]);
        const current = this.toNumber(curMap[`${SUPPLIES_CUR_BASE_OID}.${byDesc}`]);
        return this.percent(current, max);
      }

      // Fallback para ambientes mono: em muitos modelos, indice 1 eh toner preto e o segundo indice eh unidade de imagem/drum.
      if (this.monoOnly) {
        const sorted = candidateIndexes.map(Number).sort((a, b) => a - b).map(String);
        for (const idx of sorted) {
          if (idx === '1') continue;
          const max = this.toNumber(maxMap[`${SUPPLIES_MAX_BASE_OID}.${idx}`]);
          const current = this.toNumber(curMap[`${SUPPLIES_CUR_BASE_OID}.${idx}`]);
          const pct = this.percent(current, max);
          if (pct !== null) return pct;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  parseToner(snmpData) {
    if (this.monoOnly) {
      const current = this.toNumber(snmpData[OIDS.blackCur]);
      const max = this.toNumber(snmpData[OIDS.blackMax]);
      const black = this.percent(current, max);
      const imagingCurrent = this.toNumber(snmpData[OIDS.imagingCur]);
      const imagingMax = this.toNumber(snmpData[OIDS.imagingMax]);
      const imaging = this.percent(imagingCurrent, imagingMax);
      const result = {};
      if (black !== null) result.black = black;
      if (imaging !== null) result.imaging_unit = imaging;
      return result;
    }

    const colors = {
      black: [OIDS.blackCur, OIDS.blackMax],
      cyan: [OIDS.cyanCur, OIDS.cyanMax],
      magenta: [OIDS.magentaCur, OIDS.magentaMax],
      yellow: [OIDS.yellowCur, OIDS.yellowMax],
    };

    const toner = {};
    Object.entries(colors).forEach(([name, [curOid, maxOid]]) => {
      const current = this.toNumber(snmpData[curOid]);
      const max = this.toNumber(snmpData[maxOid]);
      const pct = this.percent(current, max);
      if (pct !== null) toner[name] = pct;
    });

    const imagingCurrent = this.toNumber(snmpData[OIDS.imagingCur]);
    const imagingMax = this.toNumber(snmpData[OIDS.imagingMax]);
    const imaging = this.percent(imagingCurrent, imagingMax);
    if (imaging !== null) toner.imaging_unit = imaging;

    return toner;
  }

  computeAlerts(toner) {
    const alerts = [];
    Object.entries(toner || {}).forEach(([color, pct]) => {
      const prefix = color === 'imaging_unit' ? 'imaging' : 'toner';
      if (pct <= 5) alerts.push({ type: `${prefix}_critical`, color, percent: pct });
      else if (pct <= 15) alerts.push({ type: `${prefix}_low`, color, percent: pct });
    });
    return alerts;
  }

  percent(current, max) {
    if (max === null || max <= 0 || current === null) return null;
    if (current === -3) return null;
    if (current < 0) return 0;
    return Math.max(0, Math.min(100, Math.round((current / max) * 100)));
  }

  toNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  async getManagedPrinters() {
    const module = await AssetModuleConfig.findOne({ type: 'printer', is_active: true });
    if (!module) return [];
    return ManagedAsset.find({
      module_id: module._id,
      asset_type: 'printer',
      is_deleted: { $ne: true },
    }).lean();
  }

  async getSummary() {
    const printers = await this.getManagedPrinters();
    const tonerAlerts = printers.reduce((sum, p) => {
      const levels = p.toner_levels || p.custom_data?.toner_levels || {};
      const values = this.monoOnly ? [levels.black] : Object.values(levels);
      const hasAlert = values.some((v) => v !== undefined && Number(v) <= 15);
      return hasAlert ? sum + 1 : sum;
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

    const printer = await ManagedAsset.findOneAndUpdate(
      { module_id: module._id, serial_number: serial },
      {
        module_id: module._id,
        asset_type: 'printer',
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

    return printer;
  }
}

module.exports = PrinterService;
