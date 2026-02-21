// clients/desktop/src/services/CommandPoller.js
const https = require('https');
const http = require('http');
const { EventEmitter } = require('events');

// Importação dos seus outros módulos que enviam os dados!
const DataCollector = require('./DataCollector');
const PayloadBuilder = require('./PayloadBuilder');
const APIClient = require('./APIClient');

const DEFAULT_POLL_INTERVAL = 10_000; // 10 segundos

class CommandPollerManager extends EventEmitter {
  constructor() {
    super();
    this._logger = console;
    this._settings = null;
    this._pollingTimer = null;
    this._running = false;
    this._serialNumber = null;

    // Variáveis de estado esperadas pelo main.js para mostrar na interface
    this.lastRunTime = null;
    this.lastRunStatus = 'Aguardando inicialização...';
    this.syncCount = 0;
    this.errorCount = 0;
  }

  setLogger(logger) {
    this._logger = logger || console;
  }

  // Esperado pelo main.js ao iniciar o app
  async initialize() {
    this._logger.info('[CommandPoller] Inicializando serviço de background...');
    this.lastRunStatus = 'Inicializado';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Configuração e Estado
  // ──────────────────────────────────────────────────────────────────────────

  configure(settings = {}) {
    // Mescla as configurações para não perder o token ao salvar só o setor
    this._settings = { ...(this._settings || {}), ...settings };

    // Normaliza
    this._settings.serverIp = this._settings.ip || this._settings.serverIp || '127.0.0.1';
    this._settings.serverPort = this._settings.port || this._settings.serverPort || 3000;

    if (settings.serialNumber) this._serialNumber = settings.serialNumber;

    this._logger.info(`[CommandPoller] Configurado — servidor: ${this._settings.serverIp}:${this._settings.serverPort}`);

    if (this._running) {
      this.stop();
      setTimeout(() => this.start(this._serialNumber), 500);
    }
  }

  // O main.js chama isso quando clica em "Salvar Config"
  updateSettings(settings = {}) {
    this.configure(settings);
    return Promise.resolve();
  }

  setSerialNumber(serial) {
    this._serialNumber = serial;
  }

  // Transforma em Getter para o main.js acessar como "commandPoller.isRunning"
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
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CICLO PRINCIPAL (O QUE ENVIA OS DADOS AO SERVIDOR)
  // ──────────────────────────────────────────────────────────────────────────

  // O main.js chama isso no "Sincronizar Agora" ou ao iniciar
  async runCycle() {
    if (!this._settings || !this._settings.serverIp) {
      throw new Error('Servidor não configurado ou IP ausente.');
    }

    this.lastRunTime = new Date();
    this._logger.info('[CommandPoller] Iniciando runCycle (Coletando dados da máquina)...');

    try {
      // 1. Coleta dados reais da máquina
      const coreInfo = await DataCollector.getCoreSystemInfo();
      if (coreInfo.serial_number) {
        this.setSerialNumber(coreInfo.serial_number);
      }

      // 2. Constrói Payload (Módulo ou Legado)
      const baseUrl = this._getBaseUrl();
      const token = this._settings.token;

      let result;
      if (this._settings.forceLegacyMode) {
        const payload = PayloadBuilder.buildLegacyPayload(coreInfo, this._settings.assetName);
        result = await APIClient.sendLegacyData(baseUrl, payload, token);
      } else {
        const payload = PayloadBuilder.buildModulePayload(
          coreInfo,
          'desktop', // Pode ajustar se necessário
          this._settings.sector,
          this._settings.floor,
          this._settings.assetName
        );
        result = await APIClient.sendAssetToModule(baseUrl, this._settings.moduleId, payload, token);
      }

      this.lastRunStatus = 'Online / Sincronizado';
      this.syncCount++;
      this._logger.info('[CommandPoller] Sincronização concluída com sucesso!');

      return { success: true, result };
    } catch (error) {
      this.lastRunStatus = `Erro: ${error.message}`;
      this.errorCount++;
      this._logger.error(`[CommandPoller] Falha no runCycle: ${error.message}`);
      throw error;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Start / Stop e Polling de Comandos
  // ──────────────────────────────────────────────────────────────────────────

  async start(serialNumber) {
    if (serialNumber) this._serialNumber = serialNumber;

    if (this._running) return;
    if (!this._settings) return;

    this._running = true;
    this._logger.info(`[CommandPoller] Iniciando serviço para serial: ${this._serialNumber || 'Desconhecido'}`);

    // Roda a primeira sincronização de inventário ao iniciar
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

  async _poll() {
    if (!this._running) return;

    try {
      const commands = await this._fetchPendingCommands();
      if (commands && commands.length > 0) {
        this._logger.info(`[CommandPoller] ${commands.length} comando(s) pendente(s)`);
        this.emit('commands', commands);
      }
    } catch (err) {
      // Falha silenciosa para não spammar os logs em caso de rede oscilando
    }

    if (this._running) {
      this._pollingTimer = setTimeout(() => this._poll(), DEFAULT_POLL_INTERVAL);
    }
  }

  async _fetchPendingCommands() {
    const { moduleId } = this._getConfig();
    const serial = this._serialNumber;
    if (!serial) return [];

    const url = `${this._getBaseUrl()}/api/modules/${moduleId}/assets/commands/pending?serial_number=${encodeURIComponent(serial)}`;
    const data = await this._request('GET', url);
    return data?.commands || [];
  }

  async reportCommandResult(commandId, success, result = {}) {
    const { moduleId } = this._getConfig();
    const url = `${this._getBaseUrl()}/api/modules/${moduleId}/assets/commands/${commandId}/result`;
    const payload = {
      success,
      result: {
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.exitCode ?? (success ? 0 : 1),
        executionTime: result.executionTime || 0,
      },
      executedAt: new Date().toISOString(),
    };
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

      req.on('error', reject);
      if (reqBody) req.write(reqBody);
      req.end();
    });
  }
}

module.exports = new CommandPollerManager();