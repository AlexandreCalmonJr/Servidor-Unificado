// controllers/assetCommandController.js
const mongoose = require('mongoose');
const AssetCommand = require('../models/AssetCommand');
const Module = require('../models/AssetModule'); 

// ===== IMPORTAÇÃO DOS MODELOS DE ATIVOS =====
let Desktop, Notebook;
try {
  Desktop = require('../models/Desktop');
  Notebook = require('../models/Notebook');
} catch (e) {
  console.error('❌ ERRO AO IMPORTAR MODELS DE ATIVOS:', e.message);
}

// Comandos pré-definidos (Base)
const PREDEFINED_COMMANDS = {
  restart_computer: {
    cmd: 'shutdown /r /t 30 /c "Reiniciando computador (Solicitado pelo Painel MDM)"',
    requiresElevation: true,
    timeout: 35000
  },
  flush_dns: {
    cmd: 'ipconfig /flushdns',
    requiresElevation: false,
    timeout: 10000
  },
  restart_print_spooler: {
    cmd: 'net stop Spooler & net start Spooler',
    requiresElevation: true,
    timeout: 30000
  },
  restart_automatos: {
    cmd: 'net stop AutomatosService & net start AutomatosService',
    requiresElevation: true,
    timeout: 30000
  },
  restart_ndd: {
    cmd: 'net stop NDDPrintService & net start NDDPrintService',
    requiresElevation: true,
    timeout: 30000
  },
  clear_temp: {
    cmd: 'del /q /f %temp%\\* & for /d %x in (%temp%\\*) do @rd /s /q "%x"',
    requiresElevation: false,
    timeout: 60000
  },
  network_reset: {
    cmd: 'netsh winsock reset & netsh int ip reset & ipconfig /release & ipconfig /renew',
    requiresElevation: true,
    timeout: 60000
  }
};

/**
 * [CREATE] Criar novo comando para um ativo
 * POST /api/modules/:moduleId/assets/:assetId/commands
 */
exports.createCommand = async (req, res) => {
  const logger = req.logger || console;
  
  try {
    const { moduleId, assetId } = req.params;
    
    // Desestruturação com 'let' para permitir modificação
    let { commandType, customCommand, parameters, timeout } = req.body;

    // ===== DEBUG =====
    console.log(`\n🔍 --- NOVO COMANDO SOLICITADO ---`);
    console.log(`📥 Módulo ID: "${moduleId}"`);
    console.log(`📥 Tipo Original: "${commandType}"`);

    // ✅ CORREÇÃO 1: Normaliza 'custom' para 'cmd_custom'
    if (commandType === 'custom') {
        commandType = 'cmd_custom';
        console.log(`🔄 Tipo ajustado para: "cmd_custom"`);
    }

    if (!commandType) {
      return res.status(400).json({ success: false, message: 'commandType é obrigatório' });
    }

    // ✅ CORREÇÃO 2: Identificação Robusta do Modelo (Desktop vs Notebook)
    let AssetModel = getAssetModel(moduleId);
    
    // Se não identificou pelo nome (ex: string 'notebooks'), tenta buscar o ID no banco
    if (!AssetModel) {
      if (mongoose.Types.ObjectId.isValid(moduleId)) {
        try {
          const moduleDoc = await Module.findById(moduleId);
          
          if (moduleDoc) {
            console.log(`📦 Módulo encontrado no Banco: ${moduleDoc.name} (Tipo: ${moduleDoc.type})`);
            AssetModel = getAssetModel(moduleDoc.type);
          } else {
            console.log(`⚠️ ID ${moduleId} válido, mas não encontrado na coleção AssetModule.`);
          }
        } catch (err) {
          logger.warn(`Erro ao buscar módulo por ID: ${err.message}`);
        }
      }
    }

    if (!AssetModel) {
      logger.warn(`⚠️ Módulo desconhecido ou não suportado: "${moduleId}"`);
      return res.status(400).json({
        success: false,
        message: `Módulo inválido. O ID "${moduleId}" não foi encontrado ou o tipo do módulo não é 'notebook'/'desktop'.`
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
    const { serialNumber } = req.query;
    if (!serialNumber) return res.status(400).json({ success: false, message: 'serialNumber obrigatório' });

    const commands = await AssetCommand.find({
      serialNumber,
      status: 'pending',
      expiresAt: { $gte: new Date() }
    }).sort({ createdAt: 1 }).limit(10);

    if (commands.length > 0) {
      await AssetCommand.updateMany(
        { _id: { $in: commands.map(c => c._id) } },
        { $set: { status: 'sent', sentAt: new Date() } }
      );
      logger.info(`📤 ${commands.length} comandos enviados para ${serialNumber}`);
    }

    res.json({
      success: true,
      commands: commands.map(cmd => ({
        id: cmd._id,
        commandType: cmd.commandType,
        command: cmd.command,
        parameters: cmd.parameters,
        requiresElevation: cmd.requiresElevation,
        timeout: cmd.timeout
      }))
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
    const { success, stdout, stderr, exitCode, error, executionTime } = req.body;

    const command = await AssetCommand.findById(commandId);
    if (!command) return res.status(404).json({ success: false, message: 'Comando não encontrado' });

    command.status = success ? 'completed' : 'failed';
    command.result = { stdout: stdout || '', stderr: stderr || '', exitCode: exitCode || null, error: error || '', executionTime: executionTime || 0 };
    command.completedAt = new Date();

    await command.save();
    res.json({ success: true, message: 'Resultado registrado' });
  } catch (error) {
    logger.error('❌ Erro ao reportar resultado:', error);
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
 * Função auxiliar para mapear tipo/nome para o Model Mongoose
 */
function getAssetModel(identifier) {
  if (!identifier) return null;
  const id = identifier.toString().toLowerCase();

  // Verifica se o texto contém 'desktop' ou 'notebook'
  if (id.includes('desktop')) return Desktop;
  if (id.includes('notebook')) return Notebook;
  if (id.includes('laptop')) return Notebook;

  return null;
}

module.exports = exports;