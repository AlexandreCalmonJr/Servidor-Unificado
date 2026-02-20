/**
 * Servidor Unificado - Desktop Client
 * Command and Data Polling Service (Refatorado)
 * 
 * Orquestrador de sincronização de dados e processamento de comandos
 * Delega funcionalidades para módulos especializados:
 * - DataCollector: Coleta de informações do sistema
 * - PayloadBuilder: Construção de payloads com validação
 * - APIClient: Comunicação HTTP com o servidor
 * - CommandExecutor: Execução de comandos pendentes
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const Store = require('electron-store');

// Importa novos módulos de serviço
const DataCollector = require('./DataCollector');
const PayloadBuilder = require('./PayloadBuilder');
const APIClient = require('./APIClient');
const CommandExecutor = require('./CommandExecutor');

// Configuração
const CONFIG_FILE = path.join(os.homedir(), '.servidor_unificado', 'client_config.json');
const AUTH_TOKEN_FILE = path.join(os.homedir(), '.servidor_unificado', 'auth.json');
const POLL_INTERVAL = 30000; // 30 segundos
const REQUEST_TIMEOUT = 15000; // 15 segundos

const store = new Store();

let isPolling = false;
let lastPollTime = null;
let pollingTimer = null;

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Carrega configuração do arquivo
 */
function loadConfig() {
    try {
        if (!fs.existsSync(CONFIG_FILE)) {
            return null;
        }
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        return config;
    } catch (err) {
        console.error('[CommandPoller] Erro ao carregar configuração:', err.message);
        return null;
    }
}

/**
 * Valida e retorna configuração ativa
 */
function getActiveConfig() {
    const config = loadConfig();
    if (!config || !config.server_url) {
        console.warn('[CommandPoller] Configuração não encontrada ou inválida');
        return null;
    }
    return config;
}

/**
 * Obtém token JWT salvo
 */
function getStoredToken() {
    try {
        if (fs.existsSync(AUTH_TOKEN_FILE)) {
            const auth = JSON.parse(fs.readFileSync(AUTH_TOKEN_FILE, 'utf8'));
            return auth.jwt_token || null;
        }
    } catch (err) {
        console.error('[CommandPoller] Erro ao ler token:', err.message);
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA SYNCHRONIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Coleta dados do sistema e envia para o servidor
 * 
 * Fluxo:
 * 1. DataCollector coleta informações do sistema
 * 2. PayloadBuilder constrói e valida payload
 * 3. APIClient envia para /api/modules/{moduleId}/assets ou /api/monitor (legacy)
 */
async function collectAndSendData() {
    const config = getActiveConfig();
    if (!config) {
        console.warn('[CommandPoller] Configuração não disponível');
        return false;
    }

    try {
        console.log('[CommandPoller] Iniciando sincronização de dados...');
        const startTime = Date.now();

        // ─────────────────────────────────────────────────────────────────
        // ETAPA 1: Coletar dados do sistema
        // ─────────────────────────────────────────────────────────────────
        console.log('[CommandPoller] [1/4] Coletando informações do sistema...');
        const coreInfo = await DataCollector.getCoreSystemInfo();

        if (!coreInfo) {
            console.error('[CommandPoller] Falha ao coletar informações do sistema');
            return false;
        }

        console.log('[CommandPoller] ✓ Sistema:', {
            serial: coreInfo.serial_number,
            hostname: coreInfo.hostname,
            ip: coreInfo.ip_address
        });

        // ─────────────────────────────────────────────────────────────────
        // ETAPA 2: Determinar tipo de asset e obter configuração do módulo
        // ─────────────────────────────────────────────────────────────────
        console.log('[CommandPoller] [2/4] Determinando tipo de asset...');
        const assetType = coreInfo.is_notebook ? 'notebook' : 'desktop';
        const assetName = config.asset_name || coreInfo.hostname;
        const sector = config.sector || 'Padrão';
        const floor = config.floor || 0;

        let moduleId = null;
        let shouldUseLegacy = false;

        // Se tem módulo configurado, tenta usar novo sistema
        if (config.module_id) {
            moduleId = config.module_id;
            console.log('[CommandPoller] ✓ Usando módulo:', moduleId);
        } else if (assetType === 'notebook' || config.use_legacy_totem) {
            // Fallback para legacy /api/monitor (totem)
            shouldUseLegacy = true;
            console.log('[CommandPoller] ✓ Usando endpoint legacy: /api/monitor');
        }

        // ─────────────────────────────────────────────────────────────────
        // ETAPA 3: Construir e validar payload
        // ─────────────────────────────────────────────────────────────────
        console.log('[CommandPoller] [3/4] Construindo payload...');
        
        let payload;
        let validation;

        if (!shouldUseLegacy) {
            // Novo sistema: payload modular
            payload = PayloadBuilder.buildModulePayload(
                coreInfo,
                assetType,
                sector,
                floor,
                assetName
            );
            validation = PayloadBuilder.validatePayload(payload, assetType);
        } else {
            // Legacy: payload totem
            payload = PayloadBuilder.buildLegacyPayload(coreInfo, assetName);
            validation = PayloadBuilder.validatePayload(payload, 'totem');
        }

        if (!validation.isValid) {
            console.error('[CommandPoller] Payload inválido:', validation.errors);
            return false;
        }

        if (validation.warnings.length > 0) {
            console.warn('[CommandPoller] Avisos de validação:', validation.warnings);
        }

        console.log('[CommandPoller] ✓ Payload construído e validado');

        // ─────────────────────────────────────────────────────────────────
        // ETAPA 4: Enviar para o servidor
        // ─────────────────────────────────────────────────────────────────
        console.log('[CommandPoller] [4/4] Enviando para servidor...');
        const token = getStoredToken();

        let result;
        if (!shouldUseLegacy && moduleId) {
            // Novo sistema
            result = await APIClient.sendAssetToModule(
                config.server_url,
                moduleId,
                payload,
                token
            );
        } else {
            // Legacy
            result = await APIClient.sendLegacyData(
                config.server_url,
                payload,
                token
            );
        }

        if (!result.success) {
            console.error('[CommandPoller] Falha ao enviar dados:', result.error);
            return false;
        }

        const elapsed = Date.now() - startTime;
        console.log(`[CommandPoller] ✓ Sincronização concluída em ${elapsed}ms`, {
            endpoint: !shouldUseLegacy ? `/api/modules/${moduleId}/assets` : '/api/monitor',
            status: result.status,
            updated: result.updated
        });

        return true;
    } catch (err) {
        console.error('[CommandPoller] Erro durante sincronização:', err.message);
        return false;
    }
}

/**
 * Processa comandos pendentes
 * 
 * Fluxo:
 * 1. Obtém serial e configuração
 * 2. CommandExecutor busca comandos pendentes no servidor
 * 3. CommandExecutor executa cada comando
 * 4. CommandExecutor reporta resultados
 */
async function processPendingCommands() {
    const config = getActiveConfig();
    if (!config || !config.module_id) {
        // Sem módulo configurado, não processa comandos
        return;
    }

    try {
        console.log('[CommandPoller] Processando comandos pendentes...');
        
        const serialNumber = await DataCollector.getSerialNumber();
        if (!serialNumber) {
            console.warn('[CommandPoller] Serial number não disponível');
            return;
        }

        const token = getStoredToken();

        // CommandExecutor gerencia todo o ciclo: busca, executa, reporta
        const count = await CommandExecutor.executePendingCommands(
            config.server_url,
            config.module_id,
            serialNumber,
            token
        );

        console.log(`[CommandPoller] Processados ${count} comandos`);
    } catch (err) {
        console.error('[CommandPoller] Erro ao processar comandos:', err.message);
    }
}

/**
 * Ciclo completo: coleta dados + processa comandos
 */
async function syncDeviceData() {
    try {
        // Evita múltiplas sincronizações simultâneas
        if (isPolling) {
            console.warn('[CommandPoller] Sincronização já em andamento');
            return false;
        }

        isPolling = true;
        const dataSuccess = await collectAndSendData();
        await processPendingCommands();

        lastPollTime = new Date();
        return dataSuccess;
    } catch (err) {
        console.error('[CommandPoller] Erro no ciclo de sincronização:', err.message);
        return false;
    } finally {
        isPolling = false;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// POLLING MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Inicia polling periódico
 */
function startPolling(interval = POLL_INTERVAL) {
    if (pollingTimer) {
        console.warn('[CommandPoller] Polling já está ativo');
        return;
    }

    console.log(`[CommandPoller] Iniciando polling (intervalo: ${interval}ms)`);

    // Sincroniza imediatamente
    syncDeviceData();

    // Configura polling periódico
    pollingTimer = setInterval(async () => {
        await syncDeviceData();
    }, interval);
}

/**
 * Para polling periódico
 */
function stopPolling() {
    if (pollingTimer) {
        console.log('[CommandPoller] Parando polling');
        clearInterval(pollingTimer);
        pollingTimer = null;
    }
}

/**
 * Verifica se está em polling
 */
function isActive() {
    return pollingTimer !== null;
}

/**
 * Retorna timestamp do último poll
 */
function getLastPollTime() {
    return lastPollTime;
}

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION & EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

class CommandPollerManager {
    constructor() {
        this.isRunning = false;
        this.lastRunTime = null;
    }

    /**
     * Inicializa o serviço
     */
    async init() {
        console.log('[CommandPoller] Inicializando serviço...');
        const config = getActiveConfig();
        
        if (!config) {
            console.error('[CommandPoller] Configuração não disponível - não iniciando polling');
            return false;
        }

        this.isRunning = true;
        startPolling();
        return true;
    }

    /**
     * Para o serviço
     */
    stop() {
        console.log('[CommandPoller] Parando serviço');
        stopPolling();
        this.isRunning = false;
    }

    /**
     * Força sincronização agora
     */
    async forceSync() {
        console.log('[CommandPoller] Sincronização forçada');
        return await syncDeviceData();
    }

    /**
     * Retorna status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            isPolling,
            lastPollTime,
            isActive: isActive()
        };
    }

    /**
     * Gerencia configuração
     */
    getConfig() {
        return getActiveConfig();
    }

    async syncDeviceData() {
        const success = await collectAndSendData();
        this.lastRunTime = new Date();
        return success;
    }
}

module.exports = new CommandPollerManager();
