const { exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');

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

      return items
        .filter((p) => p && p.PortName && String(p.PortName).toLowerCase().includes('usb'))
        .map((p, idx) => ({
          id: p.DeviceID || `WIN-USB-${idx}`,
          serial_number: p.DeviceID || `WIN-USB-${idx}`,
          asset_name: p.Name || `USB Printer ${idx + 1}`,
          manufacturer: this._detectBrand(`${p.Name || ''} ${p.DriverName || ''}`),
          model: p.DriverName || p.Name || 'Unknown',
          connection_type: 'usb',
          usb_path: p.PortName || null,
          status: p.WorkOffline ? 'offline' : 'online',
          last_check: new Date().toISOString(),
          connection_details: {
            port_name: p.PortName || null,
            printer_status: p.PrinterStatus || null,
            device_id: p.DeviceID || null,
          },
        }));
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
          return {
            id: `usb-${vendor}-${product}-${idx}`,
            serial_number: `USB-${vendor}-${product}-${idx}`,
            asset_name: description,
            manufacturer: this._detectBrand(description),
            model: description,
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

  _detectBrand(text) {
    const val = String(text || '').toLowerCase();
    if (val.includes('hp') || val.includes('hewlett')) return 'HP';
    if (val.includes('samsung')) return 'Samsung';
    if (val.includes('brother')) return 'Brother';
    if (val.includes('xerox')) return 'Xerox';
    if (val.includes('canon')) return 'Canon';
    if (val.includes('ricoh')) return 'Ricoh';
    return 'Unknown';
  }
}

module.exports = USBPrinterMonitor;
