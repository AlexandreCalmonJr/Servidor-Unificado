const { exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');
const http = require('http');
const https = require('https');

const execAsync = promisify(exec);

class USBPrinterMonitor {
  constructor(logger) {
    this._logger = logger || console;
  }

  async collect() {
    if (process.platform === 'win32') return this._collectWindows();
    return this._collectLinux();
  }

  async _collectWindows() {
    const command = [
      'Get-CimInstance Win32_Printer',
      '| Select-Object Name,DriverName,PortName,WorkOffline,PrinterStatus,DeviceID',
      '| ConvertTo-Json -Depth 4',
    ].join(' ');

    try {
      const { stdout } = await execAsync(`powershell -NoProfile -Command "${command}"`, { timeout: 12000 });
      if (!stdout || !stdout.trim()) return [];

      const parsed = JSON.parse(stdout);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      const basePrinters = items
        .filter((p) => p && p.PortName && String(p.PortName).toLowerCase().includes('usb'))
        .map((p, idx) => {
          const brandInfo = this._normalizePrinterBrand(
            this._detectBrand(`${p.Name || ''} ${p.DriverName || ''}`),
            p.DriverName || p.Name || 'Unknown'
          );
          return {
            id: p.DeviceID || `WIN-USB-${idx}`,
            serial_number: p.DeviceID || `WIN-USB-${idx}`,
            asset_name: p.Name || `USB Printer ${idx + 1}`,
            manufacturer: brandInfo.manufacturer,
            model: brandInfo.model,
          connection_type: 'usb',
          usb_path: p.PortName || null,
          status: p.WorkOffline ? 'offline' : 'online',
          last_check: new Date().toISOString(),
          connection_details: {
            port_name: p.PortName || null,
            printer_status: p.PrinterStatus || null,
            device_id: p.DeviceID || null,
          },
          };
        });

      return Promise.all(basePrinters.map((printer) => this._enrichWithSuppliesData(printer)));
    } catch (error) {
      this._logger.warn(`[USBPrinterMonitor] Falha ao coletar USB no Windows: ${error.message}`);
      return [];
    }
  }

  async _collectLinux() {
    try {
      const { stdout } = await execAsync('lsusb 2>/dev/null || true', { timeout: 8000 });
      if (!stdout || !stdout.trim()) return [];

      return stdout
        .split('\n')
        .filter(Boolean)
        .filter((line) => /hp|samsung|brother|xerox|canon|ricoh/i.test(line))
        .map((line, idx) => {
          const parts = line.split(/\s+/);
          const vendorProduct = (parts[5] || '').split(':');
          const vendor = vendorProduct[0] || 'unknown';
          const product = vendorProduct[1] || 'unknown';
          const description = parts.slice(6).join(' ') || 'USB Printer';
          const brandInfo = this._normalizePrinterBrand(this._detectBrand(description), description);
          return {
            id: `usb-${vendor}-${product}-${idx}`,
            serial_number: `USB-${vendor}-${product}-${idx}`,
            asset_name: description,
            manufacturer: brandInfo.manufacturer,
            model: brandInfo.model,
            connection_type: 'usb',
            usb_path: `/dev/usb-${vendor}-${product}`,
            status: 'online',
            last_check: new Date().toISOString(),
            connection_details: {
              vendor_id: vendor,
              product_id: product,
              hostname: os.hostname(),
            },
          };
        });
    } catch (error) {
      this._logger.warn(`[USBPrinterMonitor] Falha ao coletar USB no Linux: ${error.message}`);
      return [];
    }
  }

  _normalizePrinterBrand(manufacturer, model) {
    const rawManufacturer = String(manufacturer || '').trim() || 'Unknown';
    const rawModel = String(model || '').trim() || 'Unknown';
    const joined = `${rawManufacturer} ${rawModel}`.toLowerCase();

    if (joined.includes('samsung')
      && /(4020|4080|m4020|m4080|proxpress)/i.test(joined)) {
      return { manufacturer: 'HP', model: rawModel };
    }

    return { manufacturer: rawManufacturer, model: rawModel };
  }

  _extractIpAddress(printer) {
    const candidates = [
      printer?.ip_address,
      printer?.connection_details?.port_name,
      printer?.usb_path,
      printer?.asset_name,
      printer?.model,
    ].filter(Boolean).map((value) => String(value));

    for (const value of candidates) {
      const ipMatch = value.match(/\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/);
      if (ipMatch) return ipMatch[0];
    }
    return null;
  }

  _toNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  _parseLooseObject(text) {
    try {
      // HP SWS endpoint costuma retornar objeto JS, nao JSON estrito.
      // eslint-disable-next-line no-new-func
      return Function(`"use strict"; return (${String(text || '').trim()});`)();
    } catch (error) {
      return null;
    }
  }

  _fetchText(url) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https://') ? https : http;
      const req = client.get(url, {
        timeout: 5000,
        rejectUnauthorized: false,
        headers: {
          'User-Agent': 'desktop-usb-printer-monitor/1.0',
          Accept: 'application/json,text/plain,text/html,*/*',
        },
      }, (res) => {
        const statusCode = Number(res.statusCode || 0);
        if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
          const redirected = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).toString();
          res.resume();
          this._fetchText(redirected).then(resolve).catch(reject);
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

  async _readHpSuppliesByWeb(ip) {
    if (!ip) return null;
    const urls = [
      `https://${ip}/sws/app/information/supplies/supplies.json`,
      `http://${ip}/sws/app/information/supplies/supplies.json`,
    ];

    for (const url of urls) {
      try {
        const body = await this._fetchText(url);
        const data = this._parseLooseObject(body);
        if (!data || typeof data !== 'object') continue;
        const drumBlack = data.drum_black || null;
        const tonerBlack = data.toner_black || null;
        const imagingUnit = this._toNumber(drumBlack?.remaining);
        const tonerBlackPct = this._toNumber(tonerBlack?.remaining);
        if (imagingUnit === null && tonerBlackPct === null) continue;

        const levels = {};
        if (tonerBlackPct !== null) levels.black = tonerBlackPct;
        if (imagingUnit !== null) levels.imaging_unit = imagingUnit;
        return {
          source_url: url,
          toner_levels: levels,
          imaging_source: imagingUnit !== null ? 'web_api_hp' : null,
          toner_source: tonerBlackPct !== null ? 'web_api_hp' : null,
        };
      } catch (error) {
        // try next url
      }
    }
    return null;
  }

  async _enrichWithSuppliesData(printer) {
    const enriched = {
      ...printer,
      custom_data: {
        ...(printer.custom_data || {}),
      },
    };
    const manufacturer = String(enriched.manufacturer || '').toLowerCase();
    const ipAddress = this._extractIpAddress(enriched);
    if (ipAddress) enriched.ip_address = ipAddress;

    if (!manufacturer.includes('hp')) {
      enriched.custom_data.usb_toner_supported = false;
      enriched.custom_data.toner_source = 'usb_generic_not_supported';
      enriched.custom_data.toner_message = 'Leitura de insumos USB disponivel principalmente para HP com endpoint web.';
      return enriched;
    }

    const hpSupplies = await this._readHpSuppliesByWeb(ipAddress);
    if (!hpSupplies) {
      enriched.custom_data.usb_toner_supported = false;
      enriched.custom_data.toner_source = ipAddress ? 'web_api_hp_unavailable' : 'usb_no_ip';
      enriched.custom_data.toner_message = ipAddress
        ? 'Endpoint web da impressora HP nao respondeu para leitura de insumos.'
        : 'Sem IP associado a impressora USB para consultar insumos HP.';
      return enriched;
    }

    enriched.toner_levels = {
      ...(enriched.toner_levels || {}),
      ...hpSupplies.toner_levels,
    };
    enriched.custom_data.usb_toner_supported = true;
    enriched.custom_data.toner_source = hpSupplies.toner_source || 'web_api_hp';
    enriched.custom_data.imaging_source = hpSupplies.imaging_source || null;
    enriched.custom_data.imaging_web_source_url = hpSupplies.source_url;
    enriched.custom_data.toner_message = 'Insumos obtidos pelo endpoint web HP.';
    return enriched;
  }

  _detectBrand(text) {
    const val = String(text || '').toLowerCase();
    if (val.includes('hp') || val.includes('hewlett')) return 'HP';
    if (val.includes('samsung') && /(4020|4080|m4020|m4080|proxpress)/i.test(val)) return 'HP';
    if (val.includes('samsung')) return 'Samsung';
    if (val.includes('brother')) return 'Brother';
    if (val.includes('xerox')) return 'Xerox';
    if (val.includes('canon')) return 'Canon';
    if (val.includes('ricoh')) return 'Ricoh';
    return 'Unknown';
  }
}

module.exports = USBPrinterMonitor;
