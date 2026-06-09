const { getModelByType } = require('../utils/assetFactory');
const AssetCommand = require('../models/AssetCommand');
const Module = require('../models/AssetModuleConfig');
const mongoose = require('mongoose');
const { signCommand } = require('../utils/commandSignature');

const PREDEFINED_COMMANDS = {
  restart_computer: { cmd: 'shutdown /r /t 30 /f', requiresElevation: true, timeout: 60000 },
  flush_dns: { cmd: 'ipconfig /flushdns', requiresElevation: false, timeout: 30000 },
  restart_print_spooler: { cmd: 'net stop spooler && net start spooler', requiresElevation: true, timeout: 60000 },
  clear_temp: { cmd: 'del /q/f/s %TEMP%\\*', requiresElevation: true, timeout: 300000 },
  check_disk: { cmd: 'chkdsk C: /F', requiresElevation: true, timeout: 600000 },
  network_reset: { cmd: 'netsh winsock reset', requiresElevation: true, timeout: 60000 },
  restart_automatos: { cmd: 'taskkill /f /im automatos.exe && start automatos.exe', requiresElevation: true, timeout: 60000 },
  restart_ndd: { cmd: 'taskkill /f /im ndd.exe && start ndd.exe', requiresElevation: true, timeout: 60000 },
  install_update: { cmd: 'wuauclt /detectnow /updatenow', requiresElevation: true, timeout: 600000 },
  reboot_device: { cmd: 'INTERNAL_REBOOT', requiresElevation: false, timeout: 60000 },
  lock_device: { cmd: 'INTERNAL_LOCK', requiresElevation: false, timeout: 60000 },
  wipe_data: { cmd: 'INTERNAL_WIPE', requiresElevation: false, timeout: 60000 },
  send_message: { cmd: 'INTERNAL_MESSAGE', requiresElevation: false, timeout: 60000 },
  install_apk: { cmd: 'INTERNAL_APK_INSTALL', requiresElevation: false, timeout: 60000 },
  install_exe: { cmd: 'POWERSHELL_INSTALL_EXE', requiresElevation: true, timeout: 600000 } // 10 minutes timeout
};

exports.createCommand = async (req, res) => {
  const logger = req.logger || console;

  try {
    const { moduleId, assetId } = req.params;
    let { commandType, customCommand, parameters, timeout } = req.body;

    // ... (Log logic remains)

    if (commandType === 'custom') {
      commandType = 'cmd_custom';
    }

    if (!commandType) {
      return res.status(400).json({ success: false, message: 'commandType é obrigatório' });
    }

    // RESOLUÇÃO DE MODELO VIA FACTORY
    let AssetModel;
    try {
      // 1. Tenta identificar pelo moduleId (se for um ID de Módulo)
      if (mongoose.Types.ObjectId.isValid(moduleId)) {
        const moduleDoc = await Module.findById(moduleId);
        if (moduleDoc) {
          AssetModel = getModelByType(moduleDoc.type);
        }
      }

      // 2. Se não achou (ou moduleId é uma string tipo 'mobile'), tenta direto
      if (!AssetModel) {
        AssetModel = getModelByType(moduleId);
      }
    } catch (e) {
      logger.warn(`Erro ao resolver modelo: ${e.message}`);
    }

    if (!AssetModel) {
      // ✅ CONSOLIDADO - Usar sempre ManagedAsset (asset_type identifica o tipo)
      // Mobile foi consolidado em ManagedAsset
      return res.status(400).json({
        success: false,
        message: `Tipo de módulo inválido ou não suportado: "${moduleId}"`
      });
    }

    // 3. Buscar o ativo no banco
    const asset = await AssetModel.findById(assetId);

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Ativo não encontrado neste módulo' });
    }

    // 4. Determinar o comando a executar e parâmetros
    let commandToExecute;
    let requiresElevation = false;
    let commandTimeout = timeout || 60000;

    // --- LÓGICA PARA COMANDOS ESPECÍFICOS ---

    if (commandType === 'map_lpt2') {
      const path = parameters?.path;
      if (!path) return res.status(400).json({ success: false, message: 'Parâmetro "path" é obrigatório para mapear impressora.' });

      // Remove anterior e adiciona novo persistente
      commandToExecute = `net use lpt2 /delete /yes & net use lpt2 "${path}" /PERSISTENT:YES`;
      requiresElevation = true;
      commandTimeout = 15000;
    }
    else if (commandType === 'download_file') {
      if (!parameters?.url || !parameters?.destination) {
        return res.status(400).json({ success: false, message: 'URL e Destination são obrigatórios.' });
      }
      // O agente identifica essa string e usa o downloader nativo do Dart
      commandToExecute = 'INTERNAL_DOWNLOAD';
      requiresElevation = false;
      commandTimeout = 300000; // 5 minutos
    }
    else if (commandType === 'auto_start_app') {
      const { name, path } = parameters || {};
      if (!name || !path) return res.status(400).json({ success: false, message: 'Nome do App e Caminho são obrigatórios.' });

      // Adiciona ao registro do usuário atual
      commandToExecute = `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${name}" /t REG_SZ /d "${path}" /f`;
      requiresElevation = true;
    }
    else if (commandType === 'install_exe') {
      if (!parameters?.url) {
        return res.status(400).json({ success: false, message: 'URL do arquivo .exe é obrigatória.' });
      }
      // Uses a PowerShell one-liner to download to a temp location, execute with /S, and then delete the temp file.
      commandToExecute = `powershell -Command "Invoke-WebRequest -Uri '${parameters.url}' -OutFile '%TEMP%\\mdm_installer.exe'; Start-Process -FilePath '%TEMP%\\mdm_installer.exe' -ArgumentList '/S' -Wait; Remove-Item '%TEMP%\\mdm_installer.exe'"`;
      requiresElevation = true;
      commandTimeout = 600000; // 10 minutes max for download and install
    }
    else if (commandType === 'cmd_custom' || commandType === 'powershell_custom') {
      if (!customCommand) {
        return res.status(400).json({ success: false, message: 'Comando customizado é obrigatório' });
      }
      commandToExecute = customCommand;
      requiresElevation = parameters?.requiresElevation || false;
    }
    else if (PREDEFINED_COMMANDS[commandType]) {
      const predefined = PREDEFINED_COMMANDS[commandType];
      commandToExecute = predefined.cmd;
      requiresElevation = predefined.requiresElevation;
      commandTimeout = predefined.timeout;
    }
    else {
      return res.status(400).json({ success: false, message: `Tipo de comando inválido: ${commandType}` });
    }

    // Tenta obter dados do ativo de forma segura
    const serial = asset.serialNumber || asset.serial_number || 'UNKNOWN';
    const name = asset.assetName || asset.asset_name || asset.hostname || 'Unknown Asset';

    // 5. Criar e Salvar o comando
    const command = new AssetCommand({
      moduleId,
      assetId,
      serialNumber: serial,
      assetName: name,
      commandType,
      command: commandToExecute,
      parameters: parameters || {},
      requiresElevation,
      timeout: commandTimeout,
      createdBy: req.user ? req.user.username : 'Sistema'
    });

    await command.save();

    logger.info('✅ Comando criado e enfileirado', {
      commandId: command._id,
      serialNumber: command.serialNumber,
      commandType
    });

    res.status(201).json({
      success: true,
      message: 'Comando enviado com sucesso',
      command: {
        id: command._id,
        status: command.status
      }
    });

  } catch (error) {
    logger.error('❌ Erro ao criar comando:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao processar comando',
      error: error.message
    });
  }
};

// [READ] Buscar comandos pendentes (Para o Cliente/Agente)
exports.getPendingCommands = async (req, res) => {
  const logger = req.logger || console;
  try {
    // Suporte a camelCase e snake_case
    const serialNumber = req.query.serialNumber || req.query.serial_number;

    if (!serialNumber) return res.status(400).json({ success: false, message: 'serialNumber obrigatório' });

    logger.info(`[DEBUG] getPendingCommands -> Buscando comandos pendentes para: "${serialNumber}"`);

    // ✅ Mantém o ativo online ao receber o polling
    try {
      const ManagedAsset = require('../models/ManagedAsset');
      // Atualiza o ativo para status 'online' e last_seen = agora
      await ManagedAsset.updateOne(
        { serial_number: serialNumber, module_id: req.params.moduleId },
        { $set: { status: 'online', last_seen: new Date() } }
      );
    } catch (err) {
      logger.warn(`[DEBUG] getPendingCommands -> Erro ao atualizar status do ativo para online: ${err.message}`);
    }

    // Busca detalhada para debug
    const allPending = await AssetCommand.find({ serialNumber, status: 'pending' }).lean();
    logger.info(`[DEBUG] total pending para este serial (independente de expiresAt): ${allPending.length}`);

    const commands = await AssetCommand.find({
      serialNumber,
      status: 'pending'
    }).sort({ createdAt: 1 }).limit(10);

    if (commands.length > 0) {
      await AssetCommand.updateMany(
        { _id: { $in: commands.map(c => c._id) } },
        { $set: { status: 'sent', sentAt: new Date() } }
      );
      logger.info(`📤 ${commands.length} comandos enviados para ${serialNumber}`);
    }

    const payloadCommands = commands.map(cmd => {
      const payload = {
        id: cmd._id,
        commandType: cmd.commandType,
        command: cmd.command,
        parameters: cmd.parameters,
        requiresElevation: cmd.requiresElevation,
        timeout: cmd.timeout
      };
      const signature = signCommand(payload);
      if (signature) payload.signature = signature.value;
      if (signature) payload.signatureAlg = signature.alg;
      return payload;
    });

    res.json({
      success: true,
      commands: payloadCommands
    });
  } catch (error) {
    logger.error('❌ Erro ao buscar comandos pendentes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// [UPDATE] Reportar resultado (Para o Cliente/Agente)
exports.reportCommandResult = async (req, res) => {
  const logger = req.logger || console;
  try {
    const { commandId } = req.params;

    // ✅ CORREÇÃO: suporta payload flat (novo CommandPoller) e aninhado (legado)
    // Novo formato:  { success, stdout, stderr, exitCode, executionTime, executedAt }
    // Legado:        { success, result: { stdout, stderr, exitCode }, executionTime }
    const {
      success,
      // flat (novo)
      stdout: flatStdout,
      stderr: flatStderr,
      exitCode: flatExitCode,
      executionTime: flatExecTime,
      // aninhado (legado)
      result: nestedResult,
      executionTime: legacyExecTime,
      error,
    } = req.body;

    const stdout = flatStdout ?? nestedResult?.stdout ?? '';
    const stderr = flatStderr ?? nestedResult?.stderr ?? error ?? '';
    const exitCode = flatExitCode ?? nestedResult?.exitCode ?? null;
    const executionTime = flatExecTime ?? nestedResult?.executionTime ?? legacyExecTime ?? 0;

    const command = await require('../models/AssetCommand').findById(commandId);
    if (!command) return res.status(404).json({ success: false, message: 'Comando não encontrado' });

    command.status = success ? 'completed' : 'failed';
    command.result = { stdout, stderr, exitCode, executionTime };
    command.completedAt = new Date();

    await command.save();

    logger.info?.(`✅ Resultado registrado: comando ${commandId} — ${command.status}`);
    res.json({ success: true, message: 'Resultado registrado' });
  } catch (error) {
    logger.error?.('❌ Erro ao reportar resultado:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// [READ] Histórico (Para o Painel)
exports.getCommandHistory = async (req, res) => {
  try {
    const { assetId } = req.params;
    const { limit = 50, status } = req.query;
    const filter = { assetId };
    if (status) filter.status = status;

    const commands = await AssetCommand.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit));

    res.json({
      success: true,
      commands: commands.map(cmd => ({
        id: cmd._id,
        commandType: cmd.commandType,
        command: cmd.command,
        status: cmd.status,
        createdBy: cmd.createdBy,
        createdAt: cmd.createdAt,
        completedAt: cmd.completedAt,
        result: cmd.result
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * ✅ CONSOLIDADO - Função removida (não mais necessária)
 * Todos os commands agora usam apenas AssetCommand model
 * com asset_type field para identificar o tipo de ativo
 */

module.exports = exports;
