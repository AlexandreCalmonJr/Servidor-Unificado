// routes/deviceRoutes.js - VERSÃO MELHORADA COM VALIDAÇÃO E LOCATIONSERVICE
const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Device = require('../models/Device');
const Command = require('../models/Command');
const LocationHistory = require('../models/LocationHistory');
const locationService = require('../services/locationService');
const { asyncHandler, validationErrorHandler, NotFoundError } = require('../middleware/error');

const deviceRoutes = (logger, getApiLimiter, modifyApiLimiter, auth) => {
  const router = express.Router();

  // ===== RECEBER E SALVAR DADOS DO DISPOSITIVO =====
  router.post('/data', auth, modifyApiLimiter, [
    // Validações robustas
    body('device_id').notEmpty().trim().escape().withMessage('device_id é obrigatório'),
    body('device_name').notEmpty().trim().escape()
      .isLength({ max: 100 }).withMessage('device_name muito longo'),
    body('serial_number').notEmpty().trim().escape()
      .isLength({ max: 100 }).withMessage('serial_number muito longo'),
    body('battery').optional().isInt({ min: 0, max: 100 })
      .withMessage('battery deve ser entre 0 e 100'),
    body('ip_address').optional().custom((value) => {
      if (value && value !== 'N/A') {
        return locationService.isValidIp(value);
      }
      return true;
    }).withMessage('ip_address inválido'),
    body('mac_address_radio').optional().custom((value) => {
      if (value && value !== 'N/A') {
        return locationService.isValidMac(value);
      }
      return true;
    }).withMessage('mac_address_radio inválido'),
    body('device_model').optional().trim().escape(),
    body('imei').optional().trim().escape().isLength({ max: 20 }),
  ], asyncHandler(async (req, res) => {
    // Valida erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw validationErrorHandler(errors);
    }

    const data = req.body;
    
    logger.logDeviceOperation('data_received', {
      device_name: data.device_name,
      serial_number: data.serial_number,
    }, {
      ip: req.ip,
      battery: data.battery,
    });

    // ✅ USA O LOCATIONSERVICE PARA MAPEAR LOCALIZAÇÃO
    const location = await locationService.mapDeviceLocation({
      ip_address: data.ip_address,
      mac_address_radio: data.mac_address_radio,
      device_name: data.device_name,
    });

    const deviceData = {
      device_name: data.device_name || 'unknown',
      device_model: data.device_model || 'N/A',
      device_id: data.device_id || 'unknown',
      serial_number: data.serial_number || 'N/A',
      imei: data.imei || 'N/A',
      battery: data.battery != null ? data.battery : null,
      network: data.network || 'N/A',
      host: data.host || 'N/A',
      
      // ✅ LOCALIZAÇÃO MAPEADA
      unit: location.unit,
      sector: location.sector,
      floor: location.floor,
      
      mac_address_radio: data.mac_address_radio || 'N/A',
      last_sync: data.last_sync || new Date().toISOString(),
      secure_android_id: data.secure_android_id || 'N/A',
      ip_address: data.ip_address || 'N/A',
      wifi_ipv6: data.wifi_ipv6 || 'N/A',
      wifi_gateway_ip: data.wifi_gateway_ip || 'N/A',
      wifi_broadcast: data.wifi_broadcast || 'N/A',
      wifi_submask: data.wifi_submask || 'N/A',
      last_seen: data.last_seen || new Date().toISOString(),
      status: 'online',
      is_online: true
    };

    // Verifica se houve mudança de localização
    const existingDevice = await Device.findOne({ 
      serial_number: deviceData.serial_number 
    }).lean();

    if (existingDevice && existingDevice.mac_address_radio !== deviceData.mac_address_radio) {
      logger.logDeviceOperation('location_changed', {
        serial_number: deviceData.serial_number,
      }, {
        old_bssid: existingDevice.mac_address_radio,
        new_bssid: deviceData.mac_address_radio,
        new_location: `${location.unit} - ${location.sector} - ${location.floor}`,
      });

      // Salva no histórico
      const historyEntry = new LocationHistory({
        serial_number: deviceData.serial_number,
        bssid: deviceData.mac_address_radio,
        sector: location.sector,
        floor: location.floor,
        timestamp: new Date(deviceData.last_seen),
      });
      await historyEntry.save();
    }

    // Salva ou atualiza o dispositivo
    const device = await Device.findOneAndUpdate(
      { serial_number: deviceData.serial_number },
      { $set: deviceData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    logger.logDeviceOperation('data_saved', {
      serial_number: device.serial_number,
      device_name: device.device_name,
    }, {
      location: `${location.unit} - ${location.sector} - ${location.floor}`,
    });

    res.status(200).json({ 
      success: true,
      message: 'Dados salvos com sucesso', 
      deviceId: device._id,
      location: {
        unit: device.unit,
        sector: device.sector,
        floor: device.floor,
      }
    });
  }));

  // ===== HEARTBEAT =====
  router.post('/heartbeat', auth, modifyApiLimiter, [
    body('serial_number').notEmpty().trim().escape(),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw validationErrorHandler(errors);
    }

    const { serial_number } = req.body;

    const device = await Device.findOneAndUpdate(
      { serial_number },
      { last_seen: new Date(), status: 'online', is_online: true },
      { new: true }
    );

    if (!device) {
      throw new NotFoundError(`Dispositivo não encontrado: ${serial_number}`);
    }

    logger.debug('Heartbeat recebido', { 
      serial_number,
      device_name: device.device_name 
    });

    res.status(200).json({ 
      success: true,
      message: 'Heartbeat registrado' 
    });
  }));

  // ===== LISTAR DISPOSITIVOS =====
  router.get('/', auth, getApiLimiter, asyncHandler(async (req, res) => {
    const startTime = Date.now();

    // Busca todos os dispositivos
    const allDevices = await Device.find({}).lean();
    let filteredDevices = allDevices;

    // Filtra por setor para usuários comuns
    if (req.user.role === 'user') {
      const userSector = req.user.sector;
      
      if (userSector && userSector !== 'Global') {
        const prefixes = userSector.split(',').map(p => p.trim().toLowerCase());
        
        filteredDevices = allDevices.filter(device => {
          const deviceName = (device.device_name || '').toLowerCase();
          return prefixes.some(prefix => deviceName.startsWith(prefix));
        });
        
        logger.debug('Dispositivos filtrados por setor', {
          username: req.user.username,
          prefixes,
          total: allDevices.length,
          filtered: filteredDevices.length,
        });
      } else {
        logger.warn('Usuário sem setor definido tentou acessar dispositivos', {
          username: req.user.username,
          role: req.user.role,
        });
        
        return res.status(403).json({ 
          success: false,
          error: 'Acesso negado: Setor não definido' 
        });
      }
    }

    const duration = Date.now() - startTime;
    
    logger.info('Lista de dispositivos retornada', {
      username: req.user.username,
      role: req.user.role,
      count: filteredDevices.length,
      duration: `${duration}ms`,
    });

    res.status(200).json({
      success: true,
      devices: filteredDevices,
      count: filteredDevices.length,
    });
  }));

  // ===== OBTER COMANDOS PENDENTES =====
  router.get('/commands', auth, getApiLimiter, [
    query('serial_number').notEmpty().trim().escape(),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw validationErrorHandler(errors);
    }

    const { serial_number } = req.query;

    // Verifica permissões de setor
    if (req.user.role === 'user') {
      const device = await Device.findOne({ serial_number }).lean();
      
      if (device && device.sector !== req.user.sector) {
        throw new ForbiddenError('Acesso negado ao dispositivo');
      }
    }

    const commands = await Command.find({ 
      serial_number, 
      status: 'pending' 
    }).lean();

    if (commands.length > 0) {
      await Command.updateMany(
        { serial_number, status: 'pending' },
        { status: 'sent' }
      );
      
      logger.logDeviceOperation('commands_sent', {
        serial_number,
      }, {
        count: commands.length,
      });
    }

    res.status(200).json({
      success: true,
      commands: commands.map(cmd => ({
        id: cmd._id.toString(),
        command_type: cmd.command,
        parameters: cmd.parameters,
      }))
    });
  }));

  // ===== EXECUTAR COMANDO =====
  router.post('/executeCommand', auth, modifyApiLimiter, [
    body('serial_number').notEmpty().trim().escape(),
    body('command').notEmpty().trim(),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw validationErrorHandler(errors);
    }

    const { 
      device_name, 
      serial_number, 
      command, 
      packageName, 
      apkUrl,
      maintenance_status,
      maintenance_ticket,
      maintenance_reason,
      maintenance_history_entry 
    } = req.body;

    // Verifica se o dispositivo existe e permissões
    const device = await Device.findOne({ serial_number });
    
    if (!device) {
      throw new NotFoundError(`Dispositivo não encontrado: ${serial_number}`);
    }

    if (req.user.role === 'user' && device.sector !== req.user.sector) {
      throw new ForbiddenError('Acesso negado ao dispositivo');
    }

    // Comando de manutenção
    if (command === 'set_maintenance') {
      if (typeof maintenance_status !== 'boolean') {
        throw new BadRequestError('maintenance_status deve ser booleano');
      }

      const updateFields = {
        maintenance_status,
        maintenance_ticket: maintenance_ticket || '',
        maintenance_reason: maintenance_reason || '',
      };

      if (maintenance_history_entry) {
        try {
          const historyEntry = JSON.parse(maintenance_history_entry);
          
          if (!historyEntry.timestamp || !historyEntry.status) {
            throw new BadRequestError(
              'maintenance_history_entry inválido: faltam timestamp ou status'
            );
          }
          
          updateFields.$push = { maintenance_history: historyEntry };
        } catch (err) {
          throw new BadRequestError(
            'Formato inválido para maintenance_history_entry'
          );
        }
      }

      const updatedDevice = await Device.findOneAndUpdate(
        { serial_number },
        updateFields,
        { new: true }
      );

      logger.logDeviceOperation('maintenance_updated', {
        serial_number,
        device_name: updatedDevice.device_name,
      }, {
        status: maintenance_status,
        ticket: maintenance_ticket,
        by: req.user.username,
      });

      return res.status(200).json({ 
        success: true,
        message: `Status de manutenção atualizado` 
      });
    }

    // Outros comandos
    await Command.create({
      device_name,
      serial_number,
      command,
      parameters: { packageName, apkUrl },
    });

    logger.logDeviceOperation('command_created', {
      serial_number,
      device_name,
    }, {
      command,
      by: req.user.username,
    });

    res.status(200).json({ 
      success: true,
      message: `Comando ${command} registrado` 
    });
  }));

  // ===== REPORTAR RESULTADO DE COMANDO =====
  router.post('/command-result', auth, modifyApiLimiter, asyncHandler(async (req, res) => {
    const { command_id, serial_number, success, result, error_message } = req.body;

    if (!serial_number && !command_id) {
      throw new BadRequestError('serial_number ou command_id é obrigatório');
    }

    let command;
    
    if (command_id) {
      command = await Command.findByIdAndUpdate(
        command_id,
        {
          status: success ? 'completed' : 'failed',
          result: result || error_message,
          executedAt: new Date(),
        },
        { new: true }
      );
    } else {
      command = await Command.findOneAndUpdate(
        { serial_number, status: 'sent' },
        {
          status: success ? 'completed' : 'failed',
          result: result || error_message,
          executedAt: new Date(),
        },
        { new: true, sort: { createdAt: -1 } }
      );
    }

    if (!command) {
      throw new NotFoundError('Comando não encontrado');
    }

    // Verifica permissões
    if (req.user.role === 'user') {
      const device = await Device.findOne({ serial_number: command.serial_number }).lean();
      
      if (device && device.sector !== req.user.sector) {
        throw new ForbiddenError('Acesso negado');
      }
    }

    logger.logDeviceOperation('command_result', {
      serial_number: command.serial_number,
    }, {
      command: command.command,
      success,
      result: result || error_message,
    });

    res.status(200).json({ 
      success: true,
      message: 'Resultado registrado' 
    });
  }));

  // ===== EXCLUIR DISPOSITIVO =====
  router.delete('/:serial_number', auth, modifyApiLimiter, asyncHandler(async (req, res) => {
    const { serial_number } = req.params;

    const device = await Device.findOne({ serial_number });
    
    if (!device) {
      throw new NotFoundError(`Dispositivo não encontrado: ${serial_number}`);
    }

    // Verifica permissões
    if (req.user.role === 'user' && device.sector !== req.user.sector) {
      throw new ForbiddenError('Acesso negado');
    }

    await Device.findOneAndDelete({ serial_number });

    logger.logDeviceOperation('device_deleted', {
      serial_number,
      device_name: device.device_name,
    }, {
      by: req.user.username,
    });

    res.status(200).json({ 
      success: true,
      message: `Dispositivo ${serial_number} excluído` 
    });
  }));

  // ===== HISTÓRICO DE LOCALIZAÇÃO =====
  router.get('/:serial_number/location-history', auth, getApiLimiter, asyncHandler(async (req, res) => {
    const { serial_number } = req.params;

    const history = await LocationHistory.find({ serial_number })
      .sort({ timestamp: -1 })
      .limit(20)
      .lean();

    logger.debug('Histórico de localização solicitado', {
      serial_number,
      count: history.length,
    });

    res.status(200).json({
      success: true,
      history,
    });
  }));

  return router;
};

module.exports = deviceRoutes;