const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Device = require('../models/Device');
const Command = require('../models/Command');
const LocationHistory = require('../models/LocationHistory');
const locationService = require('../services/locationService');
const { asyncHandler, validationErrorHandler, NotFoundError, BadRequestError, ForbiddenError } = require('../middleware/error');

// ===== FUNÇÃO PRINCIPAL =====
const deviceRoutes = (logger, getApiLimiter, modifyApiLimiter, deviceAuth, auth) => {
  const router = express.Router();

  // ===== MIDDLEWARE DE AUTENTICAÇÃO FLEXÍVEL =====
  const flexibleAuth = (req, res, next) => {
    auth(req, res, (err) => {
      if (!err) {
        return next();
      }
      deviceAuth(req, res, (err2) => {
        if (!err2) {
          logger.warn('Autenticação de fallback: Legacy Token usado em rota de painel (auth)', {
            ip: req.ip,
            path: req.originalUrl,
            userAgent: req.get('User-Agent')
          });
          req.user = {
            id: 'legacy_token_user',
            username: 'legacy_device_admin',
            role: 'admin',
            sector: 'Global',
            permissions: ['mobile', 'totem', 'admin']
          };
          return next();
        }
        if (err && (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')) {
            return res.status(401).json({ success: false, message: `Token inválido: ${err.message}` });
        }
        return res.status(401).json({ success: false, message: 'Autenticação falha' });
      });
    });
  };

  // ===== ROTAS PARA DISPOSITIVOS (AGENTES) =====
  
  // Receber dados
  router.post('/data', deviceAuth, modifyApiLimiter, [
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
      const historyEntry = new LocationHistory({
        serial_number: deviceData.serial_number,
        bssid: deviceData.mac_address_radio,
        sector: location.sector,
        floor: location.floor,
        timestamp: new Date(deviceData.last_seen),
      });
      await historyEntry.save();
    }
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

  // Heartbeat
  router.post('/heartbeat', deviceAuth, modifyApiLimiter, [
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

  // Obter comandos pendentes
  router.get('/commands', deviceAuth, getApiLimiter, [
    query('serial_number').notEmpty().trim().escape(),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw validationErrorHandler(errors);
    }
    const { serial_number } = req.query;
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

  // Reportar resultado de comando
  router.post('/command-result', deviceAuth, modifyApiLimiter, asyncHandler(async (req, res) => {
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

  // ===== ROTAS PARA PAINEL WEB =====

  // 🔧 LISTAR DISPOSITIVOS (COM FILTROS)
  router.get('/', flexibleAuth, getApiLimiter, asyncHandler(async (req, res) => {
    const startTime = Date.now();
    
    // 🔧 CAPTURA QUERY PARAMETERS
    const { sector, floor, unit, status } = req.query;
    
    // 🔧 CONSTRUIR FILTRO DO MONGODB
    const filter = {};
    
    if (sector) filter.sector = { $regex: new RegExp(sector, 'i') };
    if (floor) filter.floor = { $regex: new RegExp(floor, 'i') };
    if (unit) filter.unit = { $regex: new RegExp(unit, 'i') };
    if (status) filter.status = status;
    
    // Aplicar filtro de permissão de usuário
    if (req.user.role === 'user') {
      const userSector = req.user.sector;
      if (userSector && userSector !== 'Global') {
        const prefixes = userSector.split(',').map(p => p.trim().toLowerCase());
        const deviceNameFilter = {
          $regex: new RegExp(`^(${prefixes.join('|')})`, 'i')
        };
        // Combina com filtros existentes
        if (filter.device_name) {
          filter.$and = [
            { device_name: filter.device_name },
            { device_name: deviceNameFilter }
          ];
        } else {
          filter.device_name = deviceNameFilter;
        }
        
        logger.debug('Dispositivos filtrados por setor', {
          username: req.user.username,
          prefixes,
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
    
    // 🔧 BUSCAR COM FILTROS
    const devices = await Device.find(filter).lean();
    
    const duration = Date.now() - startTime;
    logger.info('Lista de dispositivos retornada', {
      username: req.user.username,
      role: req.user.role,
      count: devices.length,
      filters: { sector, floor, unit, status },
      duration: `${duration}ms`,
    });
    
    res.status(200).json({
      success: true,
      devices,
      count: devices.length,
      filters: { sector, floor, unit, status }
    });
  }));

  // Executar comando
  router.post('/executeCommand', flexibleAuth, modifyApiLimiter, [
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
    const device = await Device.findOne({ serial_number });
    if (!device) {
      throw new NotFoundError(`Dispositivo não encontrado: ${serial_number}`);
    }
    if (req.user.role === 'user' && device.sector !== req.user.sector) {
      throw new ForbiddenError('Acesso negado ao dispositivo');
    }
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

  // Excluir dispositivo
  router.delete('/:serial_number', flexibleAuth, modifyApiLimiter, asyncHandler(async (req, res) => {
    const { serial_number } = req.params;
    const device = await Device.findOne({ serial_number });
    if (!device) {
      throw new NotFoundError(`Dispositivo não encontrado: ${serial_number}`);
    }
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

  // Histórico de localização
  router.get('/:serial_number/location-history', flexibleAuth, getApiLimiter, asyncHandler(async (req, res) => {
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

  // 🔧 NOVO ENDPOINT: RESUMO DE LOCALIZAÇÕES
  router.get('/locations/summary', flexibleAuth, getApiLimiter, asyncHandler(async (req, res) => {
    try {
      // Agregação para contar dispositivos por localização
      const locations = await Device.aggregate([
        {
          $group: {
            _id: {
              unit: '$unit',
              sector: '$sector',
              floor: '$floor'
            },
            count: { $sum: 1 },
            online: {
              $sum: { $cond: [{ $eq: ['$status', 'online'] }, 1, 0] }
            },
            offline: {
              $sum: { $cond: [{ $eq: ['$status', 'offline'] }, 1, 0] }
            },
            maintenance: {
              $sum: { $cond: [{ $eq: ['$maintenance_status', true] }, 1, 0] }
            }
          }
        },
        { 
          $sort: { 
            '_id.unit': 1, 
            '_id.sector': 1, 
            '_id.floor': 1 
          } 
        }
      ]);

      logger.info('Resumo de localizações solicitado', {
        username: req.user.username,
        totalLocations: locations.length,
      });

      res.status(200).json({
        success: true,
        locations: locations.map(loc => ({
          unit: loc._id.unit || 'N/A',
          sector: loc._id.sector || 'Desconhecido',
          floor: loc._id.floor || 'Desconhecido',
          total: loc.count,
          online: loc.online,
          offline: loc.offline,
          maintenance: loc.maintenance,
        }))
      });
    } catch (error) {
      logger.error('Erro ao gerar resumo de localizações', {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        success: false,
        message: 'Erro ao gerar resumo de localizações',
      });
    }
  }));

  router.get('/test-location', auth, getApiLimiter, asyncHandler(async (req, res) => {
    const { bssid } = req.query;
    
    if (!bssid) {
      throw new BadRequestError('Parâmetro "bssid" é obrigatório');
    }
  
    const location = await locationService.mapDeviceLocation({
      ip_address: 'N/A', // Não testa IP
      mac_address_radio: bssid,
      device_name: 'Teste'
    });
  
    res.json({
      success: true,
      bssid_testado: bssid,
      resultado: location,
      mensagem: location.sector !== 'Desconhecido' 
        ? '✅ BSSID encontrado no banco'
        : '⚠️ BSSID NÃO cadastrado. Cadastre em Admin → Localizações.'
    });
  }));

  // 🔧 RETORNAR O ROUTER AQUI (DENTRO DA FUNÇÃO!)
  return router;
};

// 🔧 EXPORTAR A FUNÇÃO (NÃO O ROUTER!)
module.exports = deviceRoutes;