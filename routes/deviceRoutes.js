const express = require('express');
const { body, validationResult, query, matchedData } = require('express-validator');
const { Device } = require('../models/Device');
const AssetCommand = require('../models/AssetCommand');  // ✅ FIX: Usar apenas AssetCommand
const LocationHistory = require('../models/LocationHistory');
const locationService = require('../services/locationService');
const { validationErrorHandler, NotFoundError, BadRequestError, ForbiddenError } = require('../middleware/error');
const asyncHandler = require('../middleware/asyncHandler');
const WebSocketServer = require('../services/websocketServer');

// ===== FUNÇÃO PRINCIPAL =====
const deviceRoutes = (logger, cache, getApiLimiter, modifyApiLimiter, deviceAuth, auth) => {
  const router = express.Router();

  const escapeRegex = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // ===== MIDDLEWARE DE AUTENTICAÇÃO FLEXÍVEL =====
  const flexibleAuth = (req, res, next) => {
    auth(req, res, (err) => {
      if (!err) {
        return next();
      }
      deviceAuth(req, res, (err2) => {
        if (!err2) {
          // ✅ FIX: Usar role 'device' ao invés de 'admin'
          logger.info('Autenticação de dispositivo: Token device usado', {
            ip: req.ip,
            path: req.originalUrl,
            userAgent: req.get('User-Agent')
          });
          req.user = {
            id: req.deviceId || 'device_unknown',
            username: `device_${req.deviceId || 'unknown'}`,
            role: 'device',  // ✅ Permissão reduzida
            sector: 'Global',
            permissions: ['read_own_data', 'send_updates']  // ✅ Permissões específicas
          };
          return next();
        }
        // Se ambas falharem, retornar erro de autenticação
        if (err && (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError' || err.name === 'NoTokenError')) {
          return res.status(401).json({ 
            success: false, 
            message: `Token inválido ou não fornecido: ${err.message}` 
          });
        }
        return res.status(401).json({ success: false, message: 'Autenticação falha' });
      });
    });
  };

  // ===== ROTAS PARA DISPOSITIVOS (AGENTES) =====

  // Receber dados (Data/Sync)
  router.post('/data', deviceAuth, modifyApiLimiter, [
    body('device_id').notEmpty().trim().escape().withMessage('device_id é obrigatório'),
    body('device_name').notEmpty().trim().escape().isLength({ max: 100 }),
    body('serial_number').notEmpty().trim().escape().isLength({ max: 100 }),
    body('battery').optional().toInt().isInt({ min: 0, max: 100 }),
    body('ip_address').optional().isIP(),
    body('mac_address_radio').optional().custom((value) => {
      if (value && value !== 'N/A') return locationService.isValidMac(value);
      return true;
    }),
    body('device_model').optional().trim().escape(),
    body('imei').optional().trim().escape().isLength({ max: 20 }),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const { serial_number, device_name } = req.body;
      logger.warn('Validação falhou para /data', { serial_number, device_name, errors: errors.array() });
      throw validationErrorHandler(errors);
    }

    const { body: reqBody } = req;
    logger.logDeviceOperation('data_received', { device_name: reqBody.device_name, serial_number: reqBody.serial_number }, { ip: req.ip, battery: reqBody.battery });

    const location = await locationService.mapDeviceLocation({
      ip_address: reqBody.ip_address || reqBody.ipAddress,
      mac_address_radio: reqBody.mac_address_radio || reqBody.macAddressRadio,
      device_name: reqBody.device_name,
    });

    // Mapeamento de campos legados para o Schema Unificado
    const deviceData = {
      // Identificação
      asset_name: reqBody.device_name || reqBody.name || 'unknown',
      serial_number: reqBody.serial_number || 'N/A',
      device_type: 'mobile', // Assume mobile para este endpoint legado

      // Conectividade
      ip_address: reqBody.ip_address || reqBody.ipAddress || 'N/A',
      mac_address: reqBody.mac_address_radio || reqBody.macAddressRadio || 'N/A',

      // Hardware / Software (Mobile Discriminator)
      model: reqBody.device_model || reqBody.deviceModel || 'N/A',
      manufacturer: reqBody.manufacturer || 'N/A',
      android_id: reqBody.secure_android_id || reqBody.secureAndroidId || 'N/A',
      battery_level: reqBody.battery != null ? reqBody.battery : null,
      imei: reqBody.imei || 'N/A',
      os_version: reqBody.os_version || reqBody.osVersion || 'N/A',

      // Status e Monitoramento
      status: 'online',
      last_seen: reqBody.last_seen || reqBody.lastSeen || new Date(),

      // Localização
      unit: location.unit,
      sector: location.sector,
      floor: location.floor,

      // Campos legados mantidos em custom_data para compatibilidade
      custom_data: {
        network: reqBody.network || 'N/A',
        wifi_ipv6: reqBody.wifi_ipv6 || reqBody.wifiIpv6 || 'N/A',
        wifi_gateway_ip: reqBody.wifi_gateway_ip || reqBody.wifiGatewayIp || 'N/A',
        wifi_broadcast: reqBody.wifi_broadcast || reqBody.wifiBroadcast || 'N/A',
        wifi_submask: reqBody.wifi_submask || reqBody.wifiSubmask || 'N/A',
        last_sync: reqBody.last_sync || reqBody.lastSync || new Date().toISOString()
      }
    };

    const existingDevice = await Device.findOne({ serial_number: deviceData.serial_number }).lean();
    if (existingDevice && existingDevice.mac_address_radio !== deviceData.mac_address_radio) {
      const historyEntry = new LocationHistory({
        serial_number: deviceData.serial_number,
        bssid: deviceData.mac_address_radio,
        sector: location.sector,
        floor: location.floor,
        timestamp: new Date(deviceData.last_seen),
      });
      await historyEntry.save();
    }

    let hasChanges = true;
    if (existingDevice) {
      // Comparar campos relevantes para evitar escritas desnecessárias
      const fieldsToCheck = ['device_name', 'device_model', 'imei', 'battery', 'ip_address', 'mac_address_radio', 'unit', 'sector', 'floor', 'wifi_ipv6', 'wifi_gateway_ip', 'wifi_broadcast', 'wifi_submask', 'network'];
      const isSame = fieldsToCheck.every(field => existingDevice[field] == deviceData[field] || (existingDevice[field] == null && deviceData[field] == null));

      // Se status mudou de offline para online, considera mudança
      if (existingDevice.status !== 'online') hasChanges = true;
      else if (isSame) hasChanges = false;
    }

    let device;
    if (!hasChanges) {
      // Apenas atualiza heartbeat/timestamps
      device = await Device.findOneAndUpdate(
        { serial_number: deviceData.serial_number },
        { $set: { last_seen: deviceData.last_seen, last_sync: deviceData.last_sync, status: 'online', is_online: true } },
        { new: true }
      );
      // logger.debug(`[Optimization] Write suppression active for ${deviceData.serial_number}`);
    } else {
      device = await Device.findOneAndUpdate(
        { serial_number: deviceData.serial_number },
        { $set: deviceData, $setOnInsert: { maintenance_status: false, maintenance_reason: '', maintenance_ticket: '' } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    }

    if (!existingDevice || existingDevice.status !== 'online') {
      WebSocketServer.broadcastToAll({
        type: 'device_online',
        deviceId: device._id,
        hostname: device.device_name,
        status: 'online',
        timestamp: new Date()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Dados salvos com sucesso',
      deviceId: device._id,
      location: { unit: device.unit, sector: device.sector, floor: device.floor }
    });
  }));

  // Heartbeat
  router.post('/heartbeat', deviceAuth, modifyApiLimiter, [
    body('serial_number').notEmpty().trim().escape(),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw validationErrorHandler(errors);

    const { serial_number } = matchedData(req);

    const existing = await Device.findOne({ serial_number }).select('status').lean();

    const device = await Device.findOneAndUpdate(
      { serial_number: serial_number, maintenance_status: { $ne: true } },
      { $set: { last_seen: new Date(), status: 'online', is_online: true } },
      { new: true }
    );
    if (!device) {
      const maintenanceDevice = await Device.findOne({ serial_number: serial_number });
      if (maintenanceDevice) return res.status(200).json({ success: true, message: `Heartbeat registrado (Status: ${maintenanceDevice.maintenance_status})` });
      throw new NotFoundError(`Dispositivo não encontrado: ${serial_number}`);
    }

    if (!existing || existing.status !== 'online') {
      WebSocketServer.broadcastToAll({
        type: 'device_online',
        deviceId: device._id,
        hostname: device.device_name,
        status: 'online',
        timestamp: new Date()
      });
    }

    res.status(200).json({ success: true, message: 'Heartbeat registrado' });
  }));

  // Obter comandos pendentes
  router.get('/commands', deviceAuth, getApiLimiter, [
    query('serial_number').notEmpty().trim().escape(),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw validationErrorHandler(errors);
    }
    const { serial_number } = matchedData(req);

    // ✅ FIX: Consolidado - usar apenas AssetCommand
    const commands = await AssetCommand.find({
      serialNumber: serial_number,
      status: 'pending'
    }).lean();

    if (commands.length > 0) {
      await AssetCommand.updateMany(
        { _id: { $in: commands.map(c => c._id) } },
        { $set: { status: 'sent', sentAt: new Date() } }
      );
      logger.logDeviceOperation('commands_sent', { serial_number }, { count: commands.length });
    }

    function mapAssetCommandType(type) {
      const mapping = {
        'restart_computer': 'reboot',
        'reboot_device': 'reboot',
        'restart_app': 'restart_app',
        'install_apk': 'install_apk',
        'cmd_custom': 'cmd_custom',
        'powershell_custom': 'powershell_custom'
      };
      return mapping[type] || type;
    }

    const allCommands = commands.map(c => ({
      _id: c._id,
      serial_number: c.serialNumber,
      command: mapAssetCommandType(c.commandType),
      parameters: c.parameters || {},
      status: c.status,
      createdAt: c.createdAt
    }));

    res.status(200).json({
      success: true,
      commands: allCommands
    });
  }));

  // Buscar Apps Permitidos (Kiosk Mode)
  router.get('/:serial_number/allowed-apps', deviceAuth, getApiLimiter, asyncHandler(async (req, res) => {
    const { serial_number } = req.params;
    const device = await Device.findOne({ serial_number }).lean();
    if (!device) throw new NotFoundError(`Dispositivo não encontrado: ${serial_number}`);

    // Retorna lista vazia se não houver apps definidos
    res.json({
      success: true,
      allowed_apps: device.allowed_apps || []
    });
  }));

  // Reportar resultado de comando
  router.post('/command-result', deviceAuth, modifyApiLimiter, asyncHandler(async (req, res) => {
    const { command_id, serial_number, success, result, error_message } = req.body;
    if (!serial_number && !command_id) {
      throw new BadRequestError('serial_number ou command_id é obrigatório');
    }

    // ✅ FIX: Consolidado - usar apenas AssetCommand
    const updateData = {
      status: success ? 'completed' : 'failed',
      result: { stdout: result, stderr: error_message },
      executedAt: new Date(),
      completedAt: new Date()
    };

    let command = await AssetCommand.findByIdAndUpdate(command_id, updateData, { new: true });

    if (!command && serial_number) {
      command = await AssetCommand.findOneAndUpdate(
        { serialNumber: serial_number, status: 'sent' },
        updateData,
        { new: true, sort: { createdAt: -1 } }
      );
    }

    if (!command) {
      logger.warn(`Tentativa de reportar resultado para comando inexistente ou já processado: ${command_id}`);
      return res.status(200).json({ success: false, message: 'Comando não encontrado ou já finalizado' });
    }

    logger.logDeviceOperation('command_result', {
      serial_number: serial_number || command.serial_number || command.serialNumber,
    }, {
      command: command.command || command.commandType,
      success,
      result: result || error_message,
    });

    res.status(200).json({
      success: true,
      message: 'Resultado registrado'
    });
  }));

  // ===== ROTAS PARA PAINEL WEB =====

  // LISTAR DISPOSITIVOS
  router.get('/', flexibleAuth, getApiLimiter, asyncHandler(async (req, res) => {
    const startTime = Date.now();

    const {
      sector,
      floor,
      unit,
      status,
      cursor,
      limit = 2000
    } = req.query;

    const filter = {};
    if (sector) filter.sector = { $regex: new RegExp(escapeRegex(sector), 'i') };
    if (floor) filter.floor = { $regex: new RegExp(escapeRegex(floor), 'i') };
    if (unit) filter.unit = { $regex: new RegExp(escapeRegex(unit), 'i') };
    if (status) filter.status = status;

    if (cursor) {
      if (!/^[0-9a-fA-F]{24}$/.test(cursor)) {
        throw new BadRequestError('Cursor inválido');
      }
      filter._id = { $gt: cursor };
    }

    if (req.user.role === 'user') {
      const userSector = req.user.sector;
      if (userSector && userSector !== 'Global') {
        const prefixes = userSector.split(',').map(p => p.trim().toLowerCase());
        const deviceNameFilter = {
          $regex: new RegExp(`^(${prefixes.join('|')})`, 'i')
        };
        if (filter.device_name) {
          filter.$and = [
            { device_name: filter.device_name },
            { device_name: deviceNameFilter }
          ];
        } else {
          filter.device_name = deviceNameFilter;
        }
      } else {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado: Setor não definido'
        });
      }
    }

    const cacheKey = `devices:${req.user.id}:${JSON.stringify(filter)}:cursor:${cursor || 'start'}:limit:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      logger.debug('Retornando lista de dispositivos do cache', { cacheKey });
      return res.status(200).json(cached);
    }

    const queryLimit = parseInt(limit) + 1;

    const devices = await Device
      .find(filter)
      .select(
        'device_name serial_number status ip_address sector floor ' +
        'device_model imei last_sync unit battery maintenance_status last_seen ' +
        'maintenance_reason maintenance_ticket maintenance_history'
      )
      .sort({ _id: 1 })
      .limit(queryLimit)
      .lean();

    const duration = Date.now() - startTime;

    const hasMore = devices.length > parseInt(limit);
    const results = hasMore ? devices.slice(0, -1) : devices;
    const nextCursor = hasMore ? results[results.length - 1]?._id : null;

    logger.info('Lista de dispositivos retornada (do DB)', {
      username: req.user.username,
      role: req.user.role,
      count: results.length,
      filters: { sector, floor, unit, status },
      duration: `${duration}ms`,
    });

    const response = {
      success: true,
      devices: results,
      nextCursor,
      hasMore,
      count: results.length,
      filters: { sector, floor, unit, status }
    };

    await cache.set(cacheKey, response, 15);

    res.status(200).json(response);
  }));

  // Executar comando
  router.post('/executeCommand', flexibleAuth, modifyApiLimiter, [
    body('serial_number').notEmpty().trim().escape(),
    body('command').notEmpty().trim(),
    body('packageName').optional().trim(),
    body('apkUrl').optional().isURL(),
    body('maintenance_status').optional().isBoolean().toBoolean(),
    body('maintenance_ticket').optional().trim().escape(),
    body('maintenance_reason').optional().trim().escape(),
    body('maintenance_history_entry').optional().isJSON(),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Erro de validação (422) ao executar comando', {
        errors: errors.array(),
        body: req.body
      });
      throw validationErrorHandler(errors);
    }

    const data = matchedData(req, { includeOptionals: true });
    const {
      serial_number,
      command,
      maintenance_status,
      maintenance_ticket,
      maintenance_reason,
    } = data;

    const { device_name } = req.body;

    const device = await Device.findOne({ serial_number });
    if (!device) {
      throw new NotFoundError(`Dispositivo não encontrado: ${serial_number}`);
    }

    if (req.user.role === 'user' && device.sector !== req.user.sector) {
      throw new ForbiddenError('Acesso negado ao dispositivo');
    }

    if (command === 'set_maintenance') {
      if (typeof maintenance_status !== 'boolean') {
        throw new BadRequestError("Campo 'maintenance_status' (boolean) é obrigatório");
      }

      const setFields = {
        maintenance_status: maintenance_status,
        maintenance_ticket: maintenance_ticket || '',
        maintenance_reason: maintenance_reason || '',
      };

      const updateOperation = { $set: setFields };

      if (data.maintenance_history_entry) {
        try {
          const historyEntry = JSON.parse(data.maintenance_history_entry);
          if (!historyEntry.timestamp || !historyEntry.status) {
            throw new BadRequestError('maintenance_history_entry inválido: faltam timestamp ou status');
          }
          updateOperation.$push = { maintenance_history: historyEntry };
        } catch (err) {
          throw new BadRequestError('Formato inválido para maintenance_history_entry');
        }
      }

      const updatedDevice = await Device.findOneAndUpdate(
        { serial_number },
        updateOperation,
        { new: true }
      );

      logger.logDeviceOperation('maintenance_updated', {
        serial_number,
        device_name: updatedDevice.device_name,
      }, {
        status: maintenance_status,
        ticket: maintenance_ticket || 'N/A',
        reason: maintenance_reason || 'N/A',
        by: req.user.username,
      });

      return res.status(200).json({
        success: true,
        message: `Status de manutenção atualizado para: ${maintenance_status}`,
        device: {
          serial_number: updatedDevice.serial_number,
          maintenance_status: updatedDevice.maintenance_status,
          maintenance_reason: updatedDevice.maintenance_reason,
          maintenance_ticket: updatedDevice.maintenance_ticket,
        }
      });
    }

    await Command.create({
      device_name: device_name || device.device_name,
      serial_number,
      command,
      parameters: {
        packageName: data.packageName,
        apkUrl: data.apkUrl
      },
    });

    logger.logDeviceOperation('command_created', {
      serial_number,
      device_name: device_name || device.device_name,
    }, {
      command,
      by: req.user.username,
    });

    res.status(200).json({
      success: true,
      message: `Comando ${command} registrado com sucesso`
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

  // Atualizar dispositivo (Painel)
  router.put('/:serial_number', flexibleAuth, modifyApiLimiter, [
    body('device_name').optional().trim().escape(),
    body('unit').optional().trim().escape(),
    body('sector').optional().trim().escape(),
    body('floor').optional().trim().escape(),
  ], asyncHandler(async (req, res) => {
    const { serial_number } = req.params;
    const updateData = matchedData(req);

    const device = await Device.findOneAndUpdate(
      { serial_number },
      { $set: updateData },
      { new: true }
    );

    if (!device) {
      throw new NotFoundError(`Dispositivo não encontrado: ${serial_number}`);
    }

    logger.logDeviceOperation('device_updated', { serial_number }, {
      by: req.user.username,
      changes: updateData
    });

    res.status(200).json({
      success: true,
      message: 'Dispositivo atualizado',
      device
    });
  }));

  // Resumo de localizações (deve vir ANTES de /:identifier)
  router.get('/locations/summary', flexibleAuth, getApiLimiter, asyncHandler(async (req, res) => {
    try {
      const locations = await Device.aggregate([
        {
          $group: {
            _id: { unit: '$unit', sector: '$sector', floor: '$floor' },
            count: { $sum: 1 },
            online: { $sum: { $cond: [{ $eq: ['$status', 'online'] }, 1, 0] } },
            offline: { $sum: { $cond: [{ $eq: ['$status', 'offline'] }, 1, 0] } },
            collected: {
              $sum: {
                $cond: [{
                  $and: [
                    { $eq: ['$maintenance_status', true] },
                    { $ne: ['$maintenance_reason', null] },
                    { $ne: ['$maintenance_reason', ''] },
                    {
                      $or: [
                        { $regexMatch: { input: { $ifNull: ['$maintenance_reason', ''] }, regex: /recolhido/i } },
                        { $regexMatch: { input: { $ifNull: ['$maintenance_reason', ''] }, regex: /collected_by_it/i } }
                      ]
                    }
                  ]
                }, 1, 0]
              }
            },
            maintenance: {
              $sum: {
                $cond: [{
                  $and: [
                    { $eq: ['$maintenance_status', true] },
                    {
                      $or: [
                        { $eq: ['$maintenance_reason', null] },
                        { $eq: ['$maintenance_reason', ''] },
                        {
                          $and: [
                            { $ne: ['$maintenance_reason', null] },
                            { $not: { $regexMatch: { input: { $ifNull: ['$maintenance_reason', ''] }, regex: /recolhido/i } } },
                            { $not: { $regexMatch: { input: { $ifNull: ['$maintenance_reason', ''] }, regex: /collected_by_it/i } } }
                          ]
                        }
                      ]
                    }
                  ]
                }, 1, 0]
              }
            }
          }
        },
        { $sort: { '_id.unit': 1, '_id.sector': 1, '_id.floor': 1 } }
      ]);

      logger.info('✅ Resumo de localizações gerado', {
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
          maintenance: loc.maintenance || 0,
          collected: loc.collected || 0,
        }))
      });
    } catch (error) {
      logger.error('❌ Erro ao gerar resumo de localizações', { error: error.message, stack: error.stack });
      res.status(500).json({ success: false, message: 'Erro ao gerar resumo de localizações', error: error.message });
    }
  }));

  // Rota de teste para mapeamento de BSSID (deve vir ANTES de /:identifier)
  router.get('/test-location', auth, getApiLimiter, asyncHandler(async (req, res) => {
    const { bssid } = req.query;
    if (!bssid) {
      throw new BadRequestError('Parâmetro "bssid" é obrigatório');
    }
    const location = await locationService.mapDeviceLocation({
      ip_address: 'N/A',
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

  // Histórico de localização (deve vir ANTES de /:identifier para evitar conflito)
  router.get('/:serial_number/location-history', flexibleAuth, getApiLimiter, asyncHandler(async (req, res) => {
    const { serial_number } = req.params;
    const history = await LocationHistory.find({ serial_number })
      .sort({ timestamp: -1 })
      .limit(20)
      .lean();
    logger.debug('Histórico de localização solicitado', { serial_number, count: history.length });
    res.status(200).json({ success: true, history });
  }));

  // Obter dispositivo por _id ou serial_number
  router.get('/:identifier', flexibleAuth, getApiLimiter, asyncHandler(async (req, res) => {
    const { identifier } = req.params;
    let device;

    if (/^[0-9a-fA-F]{24}$/.test(identifier)) {
      device = await Device.findById(identifier).lean();
    }
    if (!device) {
      device = await Device.findOne({ serial_number: identifier }).lean();
    }
    if (!device) {
      throw new NotFoundError(`Dispositivo não encontrado: ${identifier}`);
    }
    res.status(200).json({ success: true, device });
  }));

  return router;
};

module.exports = deviceRoutes;