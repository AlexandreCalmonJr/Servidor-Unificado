// clients/desktop/src/services/CommandPoller.js
const https = require('https');
const http = require('http');
const os = require('os');
const { EventEmitter } = require('events');

const DataCollector = require('./DataCollector');
const PayloadBuilder = require('./PayloadBuilder');
const APIClient = require('./APIClient');
const CommandExecutor = require('./CommandExecutor'); // ✅ ADICIONADO
const USBPrinterMonitor = require('./USBPrinterMonitor');

const DEFAULT_POLL_INTERVAL = 10_000; // 10 segundos

class CommandPollerManager extends EventEmitter {
  constructor() {
    super();
    this._logger = console;
    this._settings = null;
    this._pollingTimer = null;
    this._running = false;
    this._serialNumber = null;
    this._executor = null; // ✅ ADICIONADO
    this._usbMonitor = null;

    this.lastRunTime = null;
    this.lastRunStatus = 'Aguardando inicialização...';
    this.syncCount = 0;
    this.errorCount = 0;
  }

  setLogger(logger) {
    this._logger = logger || console;
    // ✅ Repassa o logger ao executor se já existir
    if (this._executor) {
      this._executor._logger = this._logger;
    }
  }

  async initialize() {
    this._logger.info('[CommandPoller] Inicializando serviço de background...');
    // ✅ Cria o executor uma vez
    this._executor = new CommandExecutor(this._logger);
    this._usbMonitor = new USBPrinterMonitor(this._logger);
    this.lastRunStatus = 'Inicializado';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Configuração e Estado
  // ──────────────────────────────────────────────────────────────────────────

  configure(settings = {}) {
    this._settings = { ...(this._settings || {}), ...settings };
    this._settings.serverIp = this._settings.ip || this._settings.serverIp || '127.0.0.1';
    this._settings.serverPort = this._settings.port || this._settings.serverPort || 3000;

    if (settings.serialNumber) this._serialNumber = settings.serialNumber;

    this._logger.info(`[CommandPoller] Configurado — servidor: ${this._settings.serverIp}:${this._settings.serverPort}`);

    if (this._running) {
      this.stop();
      setTimeout(() => this.start(this._serialNumber), 500);
    }
  }

  updateSettings(settings = {}) {
    this.configure(settings);
    return Promise.resolve();
  }

  setSerialNumber(serial) {
    this._serialNumber = serial;
  }

  get isRunning() {
    return this._running;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Getters Internos
  // ──────────────────────────────────────────────────────────────────────────

  _getConfig() {
    if (!this._settings) throw new Error('[CommandPoller] configure() ainda não foi chamado');
    return {
      serverIp: this._settings.serverIp || '127.0.0.1',
      serverPort: this._settings.serverPort || 3000,
      token: this._settings.token || '',
      moduleId: this._settings.moduleId || 'desktop',
    };
  }

  _getBaseUrl() {
    const { serverIp, serverPort } = this._getConfig();
    const proto = Number(serverPort) === 443 ? 'https' : 'http';
    return `${proto}://${serverIp}:${serverPort}`;
  }

  _getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this._getConfig().token}`,
      'AUTH_TOKEN': this._getConfig().token,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CICLO PRINCIPAL — Sincronização de inventário
  // ──────────────────────────────────────────────────────────────────────────

  async runCycle() {
    if (!this._settings || !this._settings.serverIp) {
      throw new Error('Servidor não configurado ou IP ausente.');
    }

    this.lastRunTime = new Date();
    this._logger.info('[CommandPoller] Iniciando runCycle...');

    const config = this._getConfig();
    this._logger.info(`[CommandPoller] Configuração: serverIp=${config.serverIp}, serverPort=${config.serverPort}, moduleId=${config.moduleId}`);

    try {
      const coreInfo = await DataCollector.getCoreSystemInfo();
      if (coreInfo.serial_number) {
        this.setSerialNumber(coreInfo.serial_number);
      }

      const baseUrl = this._getBaseUrl();
      const token = this._settings.token;

      let result;
      if (this._settings.forceLegacyMode) {
        const payload = PayloadBuilder.buildLegacyPayload(coreInfo, this._settings.assetName);
        result = await APIClient.sendLegacyData(baseUrl, payload, token);
      } else {
        let moduleType = 'desktop';
        this._logger.info(`[CommandPoller] 🔍 Buscando tipo do módulo ${this._settings.moduleId}...`);

        try {
          const moduleInfo = await APIClient.getModuleInfo(baseUrl, this._settings.moduleId, token);
          if (moduleInfo && moduleInfo.type) {
            moduleType = moduleInfo.type;
          } else if (moduleInfo && moduleInfo.module && moduleInfo.module.type) {
            moduleType = moduleInfo.module.type;
          }
          this._logger.info(`[CommandPoller] ✅ Tipo do módulo: ${moduleType}`);
        } catch (e) {
          this._logger.warn(`[CommandPoller] ⚠️ Falha ao obter tipo do módulo: ${e.message}. Usando 'desktop'.`);
        }

        const payload = PayloadBuilder.buildModulePayload(
          coreInfo,
          moduleType,
          this._settings.sector,
          this._settings.floor,
          this._settings.assetName
        );
        result = await APIClient.sendAssetToModule(baseUrl, this._settings.moduleId, payload, token);
      }

      this.lastRunStatus = 'Online / Sincronizado';
      this.syncCount++;
      this._logger.info('[CommandPoller] ✅ Sincronização concluída!');

      const enableUsbMonitor = this._settings.enableUsbMonitor !== false
        && String(process.env.ENABLE_USB_MONITOR || 'true').toLowerCase() !== 'false';

      if (enableUsbMonitor) {
        try {
          const printers = await this._usbMonitor.collect();
          if (printers.length > 0) {
            const usbPayload = {
              source: 'desktop-agent',
              agent_hostname: os.hostname(),
              device_id: coreInfo.serial_number || this._serialNumber || os.hostname(),
              timestamp: new Date().toISOString(),
              printers,
            };
            const syncResult = await APIClient.syncPrinters(baseUrl, usbPayload, token);
            this._logger.info(`[CommandPoller] USB sync: ${syncResult.data?.synced_count || printers.length}/${printers.length}`);
          } else {
            this._logger.debug('[CommandPoller] Nenhuma impressora USB encontrada neste ciclo');
          }
        } catch (usbError) {
          this._logger.warn(`[CommandPoller] Falha no monitoramento USB: ${usbError.message}`);
        }
      }
      return { success: true, result };
    } catch (error) {
      this.lastRunStatus = `Erro: ${error.message}`;
      this.errorCount++;
      this._logger.error(`[CommandPoller] ❌ Falha no runCycle: ${error.message}`);
      throw error;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Start / Stop
  // ──────────────────────────────────────────────────────────────────────────

  async start(serialNumber) {
    if (serialNumber) this._serialNumber = serialNumber;

    if (this._running) return;
    if (!this._settings) return;

    // ✅ Garante que o executor existe antes de começar
    if (!this._executor) {
      this._executor = new CommandExecutor(this._logger);
    }
    if (!this._usbMonitor) {
      this._usbMonitor = new USBPrinterMonitor(this._logger);
    }

    this._running = true;
    this._logger.info(`[CommandPoller] Iniciando para serial: ${this._serialNumber || 'Desconhecido'}`);

    try {
      await this.runCycle();
    } catch (e) {
      this._logger.warn(`[CommandPoller] Erro na primeira sincronização: ${e.message}`);
    }

    this._poll();
  }

  stop() {
    this._running = false;
    if (this._pollingTimer) {
      clearTimeout(this._pollingTimer);
      this._pollingTimer = null;
    }
    this.lastRunStatus = 'Parado';
    this._logger.info('[CommandPoller] Parado');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // POLLING DE COMANDOS + EXECUÇÃO  ← CORREÇÃO PRINCIPAL
  // ──────────────────────────────────────────────────────────────────────────

  async _poll() {
    if (!this._running) return;

    try {
      const commands = await this._fetchPendingCommands();

      if (commands && commands.length > 0) {
        this._logger.info(`[CommandPoller] 📥 ${commands.length} comando(s) recebido(s)`);

        // ✅ EXECUTA cada comando sequencialmente
        for (const cmd of commands) {
          await this._executeCommand(cmd);
        }
      }
    } catch (err) {
      this._logger.warn(`[CommandPoller] Erro no poll: ${err.message}`);
    }

    if (this._running) {
      this._pollingTimer = setTimeout(() => this._poll(), DEFAULT_POLL_INTERVAL);
    }
  }

  // ✅ NOVO: Executa um único comando e reporta o resultado
  async _executeCommand(cmd) {
    const commandId = cmd.id || cmd._id;
    const commandType = cmd.commandType || cmd.command_type || 'cmd_custom';

    this._logger.info(`[CommandPoller] ▶️  Executando comando ${commandId} (tipo: ${commandType})`);

    const startTime = Date.now();

    try {
      // Garante que executor existe
      if (!this._executor) {
        this._executor = new CommandExecutor(this._logger);
      }

      const execResult = await this._executor.execute(cmd);
      const executionTime = Date.now() - startTime;

      this._logger.info(
        `[CommandPoller] ✅ Comando ${commandId} concluído em ${executionTime}ms — sucesso: ${execResult.success}`
      );

      // Reporta resultado ao servidor
      await this.reportCommandResult(commandId, execResult.success, {
        stdout: execResult.result?.stdout || '',
        stderr: execResult.result?.stderr || '',
        exitCode: execResult.result?.exitCode ?? (execResult.success ? 0 : 1),
        executionTime,
      });

      // Emite evento para UI (opcional)
      this.emit('command_executed', {
        commandId,
        commandType,
        success: execResult.success,
        executionTime,
      });

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this._logger.error(`[CommandPoller] ❌ Erro ao executar comando ${commandId}: ${error.message}`);

      // Reporta falha ao servidor
      try {
        await this.reportCommandResult(commandId, false, {
          stdout: '',
          stderr: error.message,
          exitCode: 1,
          executionTime,
        });
      } catch (reportErr) {
        this._logger.error(`[CommandPoller] ❌ Falha ao reportar resultado: ${reportErr.message}`);
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Comunicação com servidor
  // ──────────────────────────────────────────────────────────────────────────

  async _fetchPendingCommands() {
    const { moduleId } = this._getConfig();
    const serial = this._serialNumber;

    if (!serial) {
      this._logger.warn('[CommandPoller] Serial number não disponível, pulando poll de comandos');
      return [];
    }

    // ✅ CORRIGIDO: usa 'serialNumber' (camelCase) que é o que o servidor espera
    const url = `${this._getBaseUrl()}/api/modules/${moduleId}/assets/commands/pending?serialNumber=${encodeURIComponent(serial)}`;
    this._logger.debug(`[CommandPoller] 🔍 Buscando comandos para serial: ${serial}`);

    const data = await this._request('GET', url);
    const commands = data?.commands || [];

    if (commands.length > 0) {
      this._logger.info(`[CommandPoller] 📬 ${commands.length} comando(s) pendente(s) encontrado(s)`);
    }

    return commands;
  }

  async reportCommandResult(commandId, success, result = {}) {
    const { moduleId } = this._getConfig();
    const url = `${this._getBaseUrl()}/api/modules/${moduleId}/assets/commands/${commandId}/result`;
    const payload = {
      success,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      exitCode: result.exitCode ?? (success ? 0 : 1),
      executionTime: result.executionTime || 0,
      executedAt: new Date().toISOString(),
    };

    this._logger.info(`[CommandPoller] 📤 Reportando resultado do comando ${commandId} → sucesso: ${success}`);
    return this._request('POST', url, payload);
  }

  _request(method, url, body = null) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const lib = parsedUrl.protocol === 'https:' ? https : http;
      const reqBody = body ? JSON.stringify(body) : null;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers: this._getHeaders(),
        timeout: 15000,
      };

      if (reqBody) options.headers['Content-Length'] = Buffer.byteLength(reqBody);

      const req = lib.request(options, (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(raw)); }
          catch { resolve({ raw }); }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Timeout na requisição para ${url}`));
      });

      req.on('error', reject);
      if (reqBody) req.write(reqBody);
      req.end();
    });
  }
}

module.exports = new CommandPollerManager();


