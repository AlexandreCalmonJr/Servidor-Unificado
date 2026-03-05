// services/printerMonitorService.js
// Monitora impressoras HP e Samsung via SNMP (IP) e detecta USB
// Dependências: npm install net-snmp ping

const snmp = require('net-snmp');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const ManagedAsset = require('../models/ManagedAsset');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');

// ─── OIDs SNMP PADRÃO (RFC 3805 - Printer MIB) ───────────────────
// Compatíveis com HP LaserJet, Samsung Xpress, Samsung ProXpress, etc.
const PRINTER_OIDS = {
  // Info geral
  sysDescr:           '1.3.6.1.2.1.1.1.0',          // Descrição do sistema
  sysName:            '1.3.6.1.2.1.1.5.0',          // Nome do host
  sysUpTime:          '1.3.6.1.2.1.1.3.0',          // Uptime em ticks

  // Contadores de páginas (Printer MIB)
  totalPageCount:     '1.3.6.1.2.1.43.10.2.1.4.1.1', // Total de páginas impressas
  
  // Status geral da impressora
  printerStatus:      '1.3.6.1.2.1.25.3.5.1.1.1',   // hrPrinterStatus (3=idle, 4=printing, 5=warmup)
  printerDetectedErrorState: '1.3.6.1.2.1.25.3.5.1.2.1', // Error flags

  // Níveis de suprimentos (toner/papel)
  // Índice 1 = Black, 2 = Cyan, 3 = Magenta, 4 = Yellow (colorido)
  supplyMaxCapacity1: '1.3.6.1.2.1.43.11.1.1.8.1.1', // Capacidade máx suprimento 1
  supplyCurrentLevel1:'1.3.6.1.2.1.43.11.1.1.9.1.1', // Nível atual suprimento 1 (Black/Mono)
  supplyMaxCapacity2: '1.3.6.1.2.1.43.11.1.1.8.1.2',
  supplyCurrentLevel2:'1.3.6.1.2.1.43.11.1.1.9.1.2', // Cyan
  supplyMaxCapacity3: '1.3.6.1.2.1.43.11.1.1.8.1.3',
  supplyCurrentLevel3:'1.3.6.1.2.1.43.11.1.1.9.1.3', // Magenta
  supplyMaxCapacity4: '1.3.6.1.2.1.43.11.1.1.8.1.4',
  supplyCurrentLevel4:'1.3.6.1.2.1.43.11.1.1.9.1.4', // Yellow
  
  // Descrição dos suprimentos (nome do toner/cartucho)
  supplyDesc1:        '1.3.6.1.2.1.43.11.1.1.6.1.1',
  supplyDesc2:        '1.3.6.1.2.1.43.11.1.1.6.1.2',
  supplyDesc3:        '1.3.6.1.2.1.43.11.1.1.6.1.3',
  supplyDesc4:        '1.3.6.1.2.1.43.11.1.1.6.1.4',

  // Status da bandeja de papel
  inputMaxCapacity1:  '1.3.6.1.2.1.43.8.2.1.9.1.1',  // Capacidade máx bandeja 1
  inputCurrentLevel1: '1.3.6.1.2.1.43.8.2.1.10.1.1', // Nível atual bandeja 1
  inputDesc1:         '1.3.6.1.2.1.43.8.2.1.13.1.1', // Descrição bandeja 1

  // HP-specific OIDs (Jetdirect MIB)
  hpSerialNumber:     '1.3.6.1.4.1.11.2.3.9.4.2.1.1.3.3.0',  // HP Serial Number
  hpModelName:        '1.3.6.1.4.1.11.2.3.9.4.2.1.1.3.2.0',  // HP Model Name
  hpFirmwareVersion:  '1.3.6.1.4.1.11.2.3.9.4.2.1.1.3.5.0',  // HP Firmware
  
  // Samsung-specific OIDs
  samsungModel:       '1.3.6.1.4.1.236.11.5.11.81.2.2.0',     // Samsung Model
  samsungSerial:      '1.3.6.1.4.1.236.11.5.11.81.2.1.0',     // Samsung Serial
};

// ─── STATUS MAP ──────────────────────────────────────────────────
const PRINTER_STATUS_MAP = {
  1: 'unknown',
  2: 'running',  // online/ativo
  3: 'idle',     // ocioso/online
  4: 'printing', // imprimindo
  5: 'warmup',   // aquecendo
};

// ─── CLASSE DO SERVIÇO ────────────────────────────────────────────
class PrinterMonitorService {
  constructor() {
    this.pollIntervalMs = 60 * 1000; // 60 segundos por padrão
    this.snmpTimeout   = 5000;       // 5 segundos timeout SNMP
    this.snmpRetries   = 1;
    this._timer        = null;
    this._running      = false;
  }

  // ─── PING SIMPLES ─────────────────────────────────────────────
  async pingPrinter(ip) {
    return new Promise((resolve) => {
      const cmd = process.platform === 'win32'
        ? `ping -n 1 -w 2000 ${ip}`
        : `ping -c 1 -W 2 ${ip}`;
      
      exec(cmd, (error) => {
        resolve(!error);
      });
    });
  }

  // ─── CONSULTA SNMP ────────────────────────────────────────────
  async querySnmp(ip, community = 'public', oids = []) {
    return new Promise((resolve) => {
      const results = {};
      const session = snmp.createSession(ip, community, {
        timeout: this.snmpTimeout,
        retries: this.snmpRetries,
        version: snmp.Version2c,
      });

      session.get(oids, (error, varbinds) => {
        session.close();

        if (error) {
          logger.debug(`SNMP error for ${ip}: ${error.message}`);
          return resolve(null);
        }

        varbinds.forEach((vb, idx) => {
          if (!snmp.isVarbindError(vb)) {
            const rawVal = vb.value;
            // Converter Buffer para string quando necessário
            results[oids[idx]] = Buffer.isBuffer(rawVal)
              ? rawVal.toString('utf8').replace(/\0/g, '').trim()
              : rawVal;
          }
        });

        resolve(results);
      });
    });
  }

  // ─── CALCULA % TONER ─────────────────────────────────────────
  _tonerPercent(current, max) {
    if (!max || max <= 0) return null;
    // SNMP retorna -3 quando o nível não é conhecido mas a impressora está OK
    if (current === -3) return -1; // "não monitorado"
    if (current < 0)   return 0;
    return Math.round((current / max) * 100);
  }

  // ─── LEITURA COMPLETA DE UMA IMPRESSORA ──────────────────────
  async readPrinterStatus(ip, community = 'public') {
    const startTime = Date.now();

    // 1. Ping para verificar conectividade básica
    const reachable = await this.pingPrinter(ip);
    if (!reachable) {
      return {
        ip,
        reachable: false,
        status: 'offline',
        last_checked: new Date(),
        error: 'Host não responde ao ping',
      };
    }

    // 2. SNMP - Info geral + suprimentos + papel
    const oidList = [
      PRINTER_OIDS.sysDescr,
      PRINTER_OIDS.sysName,
      PRINTER_OIDS.printerStatus,
      PRINTER_OIDS.totalPageCount,
      PRINTER_OIDS.supplyMaxCapacity1,
      PRINTER_OIDS.supplyCurrentLevel1,
      PRINTER_OIDS.supplyMaxCapacity2,
      PRINTER_OIDS.supplyCurrentLevel2,
      PRINTER_OIDS.supplyMaxCapacity3,
      PRINTER_OIDS.supplyCurrentLevel3,
      PRINTER_OIDS.supplyMaxCapacity4,
      PRINTER_OIDS.supplyCurrentLevel4,
      PRINTER_OIDS.supplyDesc1,
      PRINTER_OIDS.supplyDesc2,
      PRINTER_OIDS.supplyDesc3,
      PRINTER_OIDS.supplyDesc4,
      PRINTER_OIDS.inputCurrentLevel1,
      PRINTER_OIDS.inputMaxCapacity1,
      PRINTER_OIDS.hpSerialNumber,
      PRINTER_OIDS.hpModelName,
      PRINTER_OIDS.samsungModel,
      PRINTER_OIDS.samsungSerial,
    ];

    const snmpData = await this.querySnmp(ip, community, oidList);

    if (!snmpData) {
      // SNMP falhou mas ping OK → impressora online mas sem SNMP
      return {
        ip,
        reachable: true,
        status: 'online',
        snmp_available: false,
        last_checked: new Date(),
        error: 'SNMP não disponível (verifique community string)',
      };
    }

    // 3. Parsear resultados
    const printerStatusCode = snmpData[PRINTER_OIDS.printerStatus] || 1;
    const printerStatusStr  = PRINTER_STATUS_MAP[printerStatusCode] || 'unknown';

    // Toner levels
    const tonerBlack   = this._tonerPercent(
      snmpData[PRINTER_OIDS.supplyCurrentLevel1],
      snmpData[PRINTER_OIDS.supplyMaxCapacity1]
    );
    const tonerCyan    = this._tonerPercent(
      snmpData[PRINTER_OIDS.supplyCurrentLevel2],
      snmpData[PRINTER_OIDS.supplyMaxCapacity2]
    );
    const tonerMagenta = this._tonerPercent(
      snmpData[PRINTER_OIDS.supplyCurrentLevel3],
      snmpData[PRINTER_OIDS.supplyMaxCapacity3]
    );
    const tonerYellow  = this._tonerPercent(
      snmpData[PRINTER_OIDS.supplyCurrentLevel4],
      snmpData[PRINTER_OIDS.supplyMaxCapacity4]
    );

    // Papel
    const paperLevel = this._tonerPercent(
      snmpData[PRINTER_OIDS.inputCurrentLevel1],
      snmpData[PRINTER_OIDS.inputMaxCapacity1]
    );

    // Identificação do modelo (HP first, Samsung fallback, sysDescr last)
    const model = snmpData[PRINTER_OIDS.hpModelName]
      || snmpData[PRINTER_OIDS.samsungModel]
      || snmpData[PRINTER_OIDS.sysDescr]
      || 'Desconhecido';

    const serial = snmpData[PRINTER_OIDS.hpSerialNumber]
      || snmpData[PRINTER_OIDS.samsungSerial]
      || null;

    // Detecção de marca
    const modelLower = model.toLowerCase();
    const brand = modelLower.includes('hp') || modelLower.includes('hewlett')
      ? 'HP'
      : modelLower.includes('samsung')
        ? 'Samsung'
        : 'Outro';

    // Alertas automáticos
    const alerts = [];
    if (tonerBlack !== null && tonerBlack >= 0 && tonerBlack <= 15) {
      alerts.push({ type: 'toner_low', message: `Toner preto baixo: ${tonerBlack}%`, severity: tonerBlack <= 5 ? 'critical' : 'warning' });
    }
    if (tonerCyan !== null && tonerCyan >= 0 && tonerCyan <= 15) {
      alerts.push({ type: 'toner_low', message: `Toner ciano baixo: ${tonerCyan}%`, severity: 'warning' });
    }
    if (tonerMagenta !== null && tonerMagenta >= 0 && tonerMagenta <= 15) {
      alerts.push({ type: 'toner_low', message: `Toner magenta baixo: ${tonerMagenta}%`, severity: 'warning' });
    }
    if (tonerYellow !== null && tonerYellow >= 0 && tonerYellow <= 15) {
      alerts.push({ type: 'toner_low', message: `Toner amarelo baixo: ${tonerYellow}%`, severity: 'warning' });
    }
    if (paperLevel !== null && paperLevel >= 0 && paperLevel <= 10) {
      alerts.push({ type: 'paper_low', message: `Papel baixo: ${paperLevel}%`, severity: 'warning' });
    }

    const duration = Date.now() - startTime;

    return {
      ip,
      reachable: true,
      snmp_available: true,
      status: printerStatusStr === 'idle' || printerStatusStr === 'printing' ? 'online' : printerStatusStr,
      printer_status: printerStatusStr,
      brand,
      model: model.substring(0, 80),
      serial_number: serial,
      hostname: snmpData[PRINTER_OIDS.sysName] || null,
      total_pages: snmpData[PRINTER_OIDS.totalPageCount] || 0,
      toner: {
        black:   tonerBlack,
        cyan:    tonerCyan,
        magenta: tonerMagenta,
        yellow:  tonerYellow,
        desc_black:   snmpData[PRINTER_OIDS.supplyDesc1] || 'Toner Preto',
        desc_cyan:    snmpData[PRINTER_OIDS.supplyDesc2] || null,
        desc_magenta: snmpData[PRINTER_OIDS.supplyDesc3] || null,
        desc_yellow:  snmpData[PRINTER_OIDS.supplyDesc4] || null,
      },
      paper: {
        tray1_level: paperLevel,
      },
      alerts,
      last_checked: new Date(),
      poll_duration_ms: duration,
    };
  }

  // ─── DETECTAR IMPRESSORAS USB (Linux) ────────────────────────
  async detectUsbPrinters() {
    if (process.platform === 'win32') {
      return [];
    }

    try {
      // tenta via CUPS lpstat
      const { stdout: cupsOut } = await execAsync('lpstat -v 2>/dev/null || echo ""');
      const printers = [];

      cupsOut.split('\n').forEach(line => {
        const usbMatch = line.match(/device for (.+): usb:\/\/(.+)/i);
        const lpMatch  = line.match(/device for (.+): (.+)/i);
        if (usbMatch) {
          printers.push({
            name: usbMatch[1].trim(),
            uri: `usb://${usbMatch[2].trim()}`,
            type: 'usb',
          });
        } else if (lpMatch && lpMatch[2].startsWith('hp:') || lpMatch?.[2]?.startsWith('ipp:')) {
          printers.push({
            name: lpMatch[1].trim(),
            uri: lpMatch[2].trim(),
            type: 'network',
          });
        }
      });

      return printers;
    } catch (e) {
      logger.debug('USB printer detection failed (CUPS not available):', e.message);
      return [];
    }
  }

  // ─── DESCOBERTA DE IMPRESSORAS NA REDE (subnet scan) ─────────
  async discoverPrintersOnSubnet(subnet = '192.168.1', community = 'public') {
    const found = [];
    const PRINTER_PORT = 9100;
    const net = require('net');

    const checkPort = (ip) => new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1500);
      socket.connect(PRINTER_PORT, ip, () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('error', () => resolve(false));
      socket.on('timeout', () => { socket.destroy(); resolve(false); });
    });

    // Verifica as 20 primeiras IPs da subnet (para teste rápido)
    // Em produção, você vai ajustar o range pelo cadastro do módulo
    const checks = [];
    for (let i = 1; i <= 254; i++) {
      checks.push(`${subnet}.${i}`);
    }

    // Processa em lotes de 20 simultâneos
    const BATCH = 20;
    for (let i = 0; i < checks.length; i += BATCH) {
      const batch = checks.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(async (ip) => {
          const open = await checkPort(ip);
          if (open) return ip;
          return null;
        })
      );
      found.push(...results.filter(Boolean));
    }

    // Para cada IP com porta 9100 aberta, faz SNMP
    const printers = [];
    for (const ip of found) {
      const data = await this.readPrinterStatus(ip, community);
      if (data.reachable) printers.push(data);
    }

    return printers;
  }

  // ─── POLLING AUTOMÁTICO — ATUALIZA MANAGED ASSETS ─────────────
  async pollAllPrinters(logger_ref) {
    const log = logger_ref || logger;
    try {
      // Busca todas as impressoras cadastradas no ManagedAsset
      const printers = await ManagedAsset.find({
        asset_type: 'printer',
        is_deleted: { $ne: true },
        ip_address: { $exists: true, $ne: null, $ne: '' },
      }).lean();

      if (printers.length === 0) {
        log.debug('[PrinterMonitor] Nenhuma impressora cadastrada para polling');
        return { polled: 0, errors: 0 };
      }

      let polled = 0;
      let errors = 0;

      const results = await Promise.all(
        printers.map(async (printer) => {
          try {
            const community = printer.custom_data?.snmp_community || 'public';
            const data = await this.readPrinterStatus(printer.ip_address, community);

            // Atualiza o asset no banco
            const update = {
              status:         data.reachable ? (data.status === 'printing' ? 'online' : data.status) : 'offline',
              last_seen:      new Date(),
              printer_status: data.printer_status || 'unknown',
              model:          data.model || printer.model,
              custom_data: {
                ...(printer.custom_data || {}),
                snmp_available: data.snmp_available,
                toner:          data.toner,
                paper:          data.paper,
                total_pages:    data.total_pages,
                alerts:         data.alerts,
                last_checked:   data.last_checked,
                poll_duration_ms: data.poll_duration_ms,
                brand:          data.brand,
                reachable:      data.reachable,
                printer_status_detail: data.printer_status,
              },
            };

            // Atualiza serial se SNMP retornou e asset não tinha
            if (data.serial_number && !printer.serial_number) {
              update.serial_number = data.serial_number;
            }

            await ManagedAsset.findByIdAndUpdate(printer._id, { $set: update });

            // Invalida cache de stats do módulo
            const cacheKey = `stats:${printer.module_id}`;
            await cacheService.del(cacheKey);

            polled++;
            log.debug(`[PrinterMonitor] ✅ ${printer.asset_name} (${printer.ip_address}): ${data.status}`);
            return { id: printer._id, ...data };
          } catch (err) {
            errors++;
            log.error(`[PrinterMonitor] ❌ Erro ao poll ${printer.asset_name}: ${err.message}`);
            return { id: printer._id, error: err.message };
          }
        })
      );

      log.info(`[PrinterMonitor] Ciclo concluído: ${polled} ok, ${errors} erros`);
      return { polled, errors, results };

    } catch (err) {
      log.error('[PrinterMonitor] Erro crítico no polling:', err.message);
      return { polled: 0, errors: 1, fatal: err.message };
    }
  }

  // ─── INICIA POLLING AUTOMÁTICO ───────────────────────────────
  startAutoPolling(intervalMs = 60000, logger_ref) {
    if (this._running) return;
    this._running = true;
    this.pollIntervalMs = intervalMs;

    const log = logger_ref || logger;
    log.info(`[PrinterMonitor] Auto-polling iniciado (intervalo: ${intervalMs / 1000}s)`);

    // Executa imediatamente na primeira vez
    this.pollAllPrinters(log);

    this._timer = setInterval(() => {
      this.pollAllPrinters(log);
    }, intervalMs);
  }

  stopAutoPolling() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
      this._running = false;
      logger.info('[PrinterMonitor] Auto-polling parado');
    }
  }
}

module.exports = new PrinterMonitorService();
