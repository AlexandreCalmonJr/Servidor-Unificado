// services/printerService.js
// Serviço para gerenciar impressoras HP e Samsung via IP e USB
// Responsável por descoberta, monitoramento de status e coleta de nível de toner

const { exec } = require('child_process');
const { promisify } = require('util');
const net = require('net');
const ManagedAsset = require('../models/ManagedAsset');
const AssetModuleConfig = require('../models/AssetModuleConfig');

const execAsync = promisify(exec);

/**
 * Classe para gerenciar impressoras
 */
class PrinterService {
  constructor(logger) {
    this.logger = logger || console;
    this.discoveredPrinters = new Map(); // Cache de impressoras descobertas
    this.statusCheckInterval = 60000; // 1 minuto entre verificações
    this.statusCheckTimer = null;
  }

  /**
   * Inicia o serviço de monitoramento de impressoras
   */
  async start() {
    this.logger.info('[PrinterService] Iniciando serviço de impressoras...');
    
    // Inicia verificação periódica de status
    this.startStatusMonitoring();
    
    // Realiza descoberta inicial
    await this.discoverPrinters();
  }

  /**
   * Para o serviço de monitoramento
   */
  stop() {
    this.logger.info('[PrinterService] Parando serviço de impressoras...');
    if (this.statusCheckTimer) {
      clearInterval(this.statusCheckTimer);
      this.statusCheckTimer = null;
    }
  }

  /**
   * Inicia monitoramento periódico de status
   */
  startStatusMonitoring() {
    this.statusCheckTimer = setInterval(async () => {
      try {
        await this.updateAllPrinterStatus();
      } catch (error) {
        this.logger.error('[PrinterService] Erro ao atualizar status:', error.message);
      }
    }, this.statusCheckInterval);
  }

  /**
   * Descobre impressoras na rede (IP) e conectadas via USB
   */
  async discoverPrinters() {
    this.logger.info('[PrinterService] Iniciando descoberta de impressoras...');
    
    try {
      // Descobre impressoras via IP
      await this.discoverNetworkPrinters();
      
      // Descobre impressoras via USB
      await this.discoverUSBPrinters();
      
      this.logger.info(`[PrinterService] Descoberta concluída. Total: ${this.discoveredPrinters.size} impressoras`);
    } catch (error) {
      this.logger.error('[PrinterService] Erro na descoberta:', error.message);
    }
  }

  /**
   * Descobre impressoras conectadas via rede (IP)
   * Usa lpstat ou avahi para descobrir impressoras CUPS
   */
  async discoverNetworkPrinters() {
    try {
      // Tenta usar lpstat (CUPS)
      const { stdout } = await execAsync('lpstat -p -d 2>/dev/null || echo ""');
      
      if (stdout) {
        const printers = this.parseLpstatOutput(stdout);
        for (const printer of printers) {
          this.discoveredPrinters.set(printer.id, printer);
        }
      }

      // Tenta descoberta via nmap (se disponível)
      await this.discoverViaNetworkScan();
    } catch (error) {
      this.logger.warn('[PrinterService] Não foi possível descobrir impressoras via rede:', error.message);
    }
  }

  /**
   * Descobre impressoras conectadas via USB
   */
  async discoverUSBPrinters() {
    try {
      // Lista dispositivos USB
      const { stdout } = await execAsync('lsusb 2>/dev/null || echo ""');
      
      if (stdout) {
        const usbPrinters = this.parseUSBOutput(stdout);
        for (const printer of usbPrinters) {
          this.discoveredPrinters.set(printer.id, printer);
        }
      }

      // Tenta listar impressoras via lpstat
      const { stdout: lpstat } = await execAsync('lpstat -v 2>/dev/null || echo ""');
      if (lpstat) {
        const printers = this.parseLpstatDevices(lpstat);
        for (const printer of printers) {
          this.discoveredPrinters.set(printer.id, printer);
        }
      }
    } catch (error) {
      this.logger.warn('[PrinterService] Não foi possível descobrir impressoras USB:', error.message);
    }
  }

  /**
   * Realiza varredura de rede para encontrar impressoras IP
   * Procura por portas comuns de impressoras (9100, 515, 631)
   */
  async discoverViaNetworkScan() {
    try {
      // Obtém o gateway/rede local
      const { stdout } = await execAsync('ip route | grep default | awk \'{print $3}\'');
      const gateway = stdout.trim();
      
      if (!gateway) return;

      // Extrai a rede (ex: 192.168.1.0/24)
      const networkParts = gateway.split('.');
      const network = `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}`;

      this.logger.info(`[PrinterService] Escaneando rede: ${network}.0/24`);

      // Escaneia IPs comuns para impressoras
      const commonPorts = [9100, 515, 631]; // Portas padrão de impressoras
      const ipsToCheck = [];

      // Gera lista de IPs para verificar (amostragem para não sobrecarregar)
      for (let i = 1; i <= 254; i += 5) { // Verifica a cada 5 IPs
        ipsToCheck.push(`${network}.${i}`);
      }

      // Verifica cada IP
      const promises = ipsToCheck.map(ip => this.checkPrinterAtIP(ip, commonPorts));
      await Promise.allSettled(promises);
    } catch (error) {
      this.logger.warn('[PrinterService] Erro na varredura de rede:', error.message);
    }
  }

  /**
   * Verifica se há uma impressora em um IP específico
   */
  async checkPrinterAtIP(ip, ports) {
    for (const port of ports) {
      return new Promise((resolve) => {
        const socket = net.createConnection({ host: ip, port, timeout: 1000 });
        
        socket.on('connect', () => {
          socket.destroy();
          this.logger.debug(`[PrinterService] Impressora detectada em ${ip}:${port}`);
          
          // Tenta obter informações da impressora
          this.getPrinterInfoFromIP(ip, port).then(info => {
            if (info) {
              const printerId = `${ip}:${port}`;
              this.discoveredPrinters.set(printerId, {
                id: printerId,
                ip_address: ip,
                port,
                connection_type: 'network',
                manufacturer: info.manufacturer || 'Unknown',
                model: info.model || 'Unknown',
                status: 'online',
                last_check: new Date(),
              });
            }
          }).catch(err => this.logger.debug(`Erro ao obter info: ${err.message}`));
          
          resolve(true);
        });

        socket.on('error', () => {
          socket.destroy();
          resolve(false);
        });

        socket.on('timeout', () => {
          socket.destroy();
          resolve(false);
        });
      });
    }
  }

  /**
   * Obtém informações de uma impressora via IP (usando telnet/socket)
   */
  async getPrinterInfoFromIP(ip, port) {
    return new Promise((resolve) => {
      const socket = net.createConnection({ host: ip, port, timeout: 2000 });
      let data = '';

      socket.on('data', (chunk) => {
        data += chunk.toString();
      });

      socket.on('end', () => {
        // Tenta extrair informações do banner
        const info = this.parsePrinterBanner(data);
        resolve(info);
      });

      socket.on('error', () => {
        resolve(null);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(null);
      });

      // Envia comando para obter status (JetDirect para HP)
      setTimeout(() => {
        try {
          socket.write('\r\n');
        } catch (e) {
          // Ignora erro
        }
      }, 500);
    });
  }

  /**
   * Faz parse do output do lpstat
   */
  parseLpstatOutput(output) {
    const printers = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (line.includes('printer')) {
        // Extrai nome da impressora
        const match = line.match(/printer\s+(\S+)/);
        if (match) {
          const name = match[1];
          printers.push({
            id: name,
            asset_name: name,
            connection_type: 'network',
            status: line.includes('disabled') ? 'offline' : 'online',
            last_check: new Date(),
          });
        }
      }
    }

    return printers;
  }

  /**
   * Faz parse do output do lpstat -v (dispositivos)
   */
  parseLpstatDevices(output) {
    const printers = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (line.includes('device')) {
        // Extrai informações do dispositivo
        // Formato: device for HP_LaserJet_Pro: usb://HP/LaserJet%20Pro%20M404n?serial=CNCCJ0123456
        const match = line.match(/device for (.+?):\s+(.+)/);
        if (match) {
          const name = match[1];
          const uri = match[2];
          
          let connectionType = 'unknown';
          let connectionDetails = {};

          if (uri.includes('usb://')) {
            connectionType = 'usb';
            connectionDetails = { uri };
          } else if (uri.includes('socket://') || uri.includes('http://')) {
            connectionType = 'network';
            const ipMatch = uri.match(/\/\/(.+?)(?::|\?|\/|$)/);
            if (ipMatch) {
              connectionDetails = { ip_address: ipMatch[1] };
            }
          }

          printers.push({
            id: name,
            asset_name: name,
            connection_type: connectionType,
            connection_details: connectionDetails,
            status: 'online',
            last_check: new Date(),
          });
        }
      }
    }

    return printers;
  }

  /**
   * Faz parse do output do lsusb
   */
  parseUSBOutput(output) {
    const printers = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // Procura por impressoras HP e Samsung
      if (line.includes('HP') || line.includes('Samsung') || line.includes('Xerox') || line.includes('Brother')) {
        const match = line.match(/Bus (\d+) Device (\d+): ID ([0-9a-f]+):([0-9a-f]+) (.+)/i);
        if (match) {
          const [, bus, device, vendorId, productId, description] = match;
          
          // Extrai fabricante e modelo
          const parts = description.split(' ');
          const manufacturer = parts[0];
          const model = parts.slice(1).join(' ');

          printers.push({
            id: `usb-${vendorId}-${productId}`,
            asset_name: `${manufacturer} ${model}`,
            manufacturer,
            model,
            connection_type: 'usb',
            connection_details: {
              bus: parseInt(bus),
              device: parseInt(device),
              vendor_id: vendorId,
              product_id: productId,
            },
            status: 'online',
            last_check: new Date(),
          });
        }
      }
    }

    return printers;
  }

  /**
   * Faz parse do banner de uma impressora
   */
  parsePrinterBanner(banner) {
    const info = {};

    // Procura por padrões comuns em banners de impressoras
    if (banner.includes('HP')) {
      info.manufacturer = 'HP';
      const modelMatch = banner.match(/HP\s+(.+?)(?:\s+|$)/i);
      if (modelMatch) info.model = modelMatch[1];
    } else if (banner.includes('Samsung')) {
      info.manufacturer = 'Samsung';
      const modelMatch = banner.match(/Samsung\s+(.+?)(?:\s+|$)/i);
      if (modelMatch) info.model = modelMatch[1];
    }

    return Object.keys(info).length > 0 ? info : null;
  }

  /**
   * Atualiza o status de todas as impressoras gerenciadas
   */
  async updateAllPrinterStatus() {
    try {
      const module = await AssetModuleConfig.findOne({ type: 'printer', is_active: true });
      if (!module) return;

      const printers = await ManagedAsset.find({
        module_id: module._id,
        asset_type: 'printer',
        is_deleted: { $ne: true },
      });

      for (const printer of printers) {
        await this.updatePrinterStatus(printer);
      }
    } catch (error) {
      this.logger.error('[PrinterService] Erro ao atualizar status:', error.message);
    }
  }

  /**
   * Atualiza o status de uma impressora específica
   */
  async updatePrinterStatus(printer) {
    try {
      const status = await this.checkPrinterStatus(printer);
      const tonerLevels = await this.getTonerLevels(printer);

      // Atualiza o documento
      printer.status = status;
      printer.last_check_time = new Date();
      
      if (tonerLevels) {
        printer.custom_data = printer.custom_data || {};
        printer.custom_data.toner_levels = tonerLevels;
      }

      await printer.save();
      
      this.logger.debug(`[PrinterService] Status atualizado: ${printer.asset_name} - ${status}`);
    } catch (error) {
      this.logger.error(`[PrinterService] Erro ao atualizar ${printer.asset_name}:`, error.message);
    }
  }

  /**
   * Verifica o status de uma impressora (online/offline)
   */
  async checkPrinterStatus(printer) {
    try {
      if (printer.connection_type === 'network' && printer.ip_address) {
        return await this.checkNetworkPrinterStatus(printer.ip_address);
      } else if (printer.connection_type === 'usb') {
        return await this.checkUSBPrinterStatus(printer);
      }
      return 'unknown';
    } catch (error) {
      this.logger.debug(`[PrinterService] Erro ao verificar status: ${error.message}`);
      return 'offline';
    }
  }

  /**
   * Verifica status de uma impressora de rede
   */
  async checkNetworkPrinterStatus(ipAddress) {
    return new Promise((resolve) => {
      const socket = net.createConnection({ host: ipAddress, port: 9100, timeout: 2000 });
      
      socket.on('connect', () => {
        socket.destroy();
        resolve('online');
      });

      socket.on('error', () => {
        resolve('offline');
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve('offline');
      });
    });
  }

  /**
   * Verifica status de uma impressora USB
   */
  async checkUSBPrinterStatus(printer) {
    try {
      // Verifica se o dispositivo USB ainda existe
      const { stdout } = await execAsync('lsusb 2>/dev/null || echo ""');
      
      if (printer.custom_data?.connection_details?.vendor_id) {
        const vendorId = printer.custom_data.connection_details.vendor_id;
        if (stdout.includes(vendorId)) {
          return 'online';
        }
      }
      
      return 'offline';
    } catch (error) {
      return 'offline';
    }
  }

  /**
   * Obtém o nível de toner de uma impressora
   */
  async getTonerLevels(printer) {
    try {
      if (printer.connection_type === 'network' && printer.ip_address) {
        return await this.getNetworkPrinterTonerLevels(printer.ip_address, printer.manufacturer);
      }
      return null;
    } catch (error) {
      this.logger.debug(`[PrinterService] Não foi possível obter nível de toner: ${error.message}`);
      return null;
    }
  }

  /**
   * Obtém nível de toner de uma impressora de rede via SNMP ou comandos
   */
  async getNetworkPrinterTonerLevels(ipAddress, manufacturer) {
    try {
      // Tenta usar snmpget se disponível
      const tonerOids = {
        'black': '1.3.6.1.2.1.43.11.1.1.9.1.1',
        'cyan': '1.3.6.1.2.1.43.11.1.1.9.1.2',
        'magenta': '1.3.6.1.2.1.43.11.1.1.9.1.3',
        'yellow': '1.3.6.1.2.1.43.11.1.1.9.1.4',
      };

      const tonerLevels = {};

      for (const [color, oid] of Object.entries(tonerOids)) {
        try {
          const { stdout } = await execAsync(`snmpget -v 2c -c public ${ipAddress} ${oid} 2>/dev/null || echo ""`);
          
          if (stdout) {
            // Parse do output: INTEGER: 75
            const match = stdout.match(/INTEGER:\s*(\d+)/);
            if (match) {
              tonerLevels[color] = parseInt(match[1]);
            }
          }
        } catch (e) {
          // Continua para próxima cor
        }
      }

      return Object.keys(tonerLevels).length > 0 ? tonerLevels : null;
    } catch (error) {
      this.logger.debug(`[PrinterService] Erro ao obter toner levels: ${error.message}`);
      return null;
    }
  }

  /**
   * Registra uma impressora descoberta no banco de dados
   */
  async registerPrinter(printerData) {
    try {
      const module = await AssetModuleConfig.findOne({ type: 'printer', is_active: true });
      if (!module) {
        throw new Error('Módulo de impressoras não configurado');
      }

      const asset = await ManagedAsset.findOneAndUpdate(
        {
          module_id: module._id,
          serial_number: printerData.serial_number || printerData.id,
        },
        {
          module_id: module._id,
          asset_type: 'printer',
          asset_name: printerData.asset_name || printerData.id,
          serial_number: printerData.serial_number || printerData.id,
          manufacturer: printerData.manufacturer || 'Unknown',
          model: printerData.model || 'Unknown',
          ip_address: printerData.ip_address || null,
          connection_type: printerData.connection_type,
          status: printerData.status || 'online',
          last_check_time: new Date(),
          custom_data: {
            connection_details: printerData.connection_details || {},
          },
        },
        { upsert: true, new: true }
      );

      this.logger.info(`[PrinterService] Impressora registrada: ${asset.asset_name}`);
      return asset;
    } catch (error) {
      this.logger.error('[PrinterService] Erro ao registrar impressora:', error.message);
      throw error;
    }
  }

  /**
   * Obtém lista de impressoras gerenciadas
   */
  async getManagedPrinters() {
    try {
      const module = await AssetModuleConfig.findOne({ type: 'printer', is_active: true });
      if (!module) return [];

      return await ManagedAsset.find({
        module_id: module._id,
        asset_type: 'printer',
        is_deleted: { $ne: true },
      }).lean();
    } catch (error) {
      this.logger.error('[PrinterService] Erro ao obter impressoras:', error.message);
      return [];
    }
  }

  /**
   * Obtém detalhes de uma impressora específica
   */
  async getPrinterDetails(printerId) {
    try {
      return await ManagedAsset.findById(printerId).lean();
    } catch (error) {
      this.logger.error('[PrinterService] Erro ao obter detalhes:', error.message);
      return null;
    }
  }
}

module.exports = PrinterService;
