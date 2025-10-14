// Corrected Unified deviceRoutes.js (Fixed query for prefix matching and removed pagination)
const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Device = require('../models/Device');
const Command = require('../models/Command');
const LocationHistory = require('../models/LocationHistory');
const { mapIpToUnit, mapMacAddressRadioToLocation } = require('../utils/mappings');

const deviceRoutes = (logger, getApiLimiter, modifyApiLimiter, auth) => {
  const router = express.Router();

  // Helper function to check if device_name matches user prefixes
  const matchesUserPrefixes = (deviceName, userSector) => {
    if (!userSector || userSector.trim() === '') return false;
    const prefixes = userSector.split(',').map(p => p.trim().toLowerCase()).filter(p => p.length > 0);
    if (prefixes.length === 0) return false;
    const lowerDeviceName = deviceName.toLowerCase();
    return prefixes.some(prefix => lowerDeviceName.startsWith(prefix));
  };

  // Helper to escape regex special chars
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Receber e salvar dados do dispositivo
  router.post('/data', auth, modifyApiLimiter, [
    body('device_id').notEmpty().withMessage('device_id é obrigatório'),
    body('device_name').notEmpty().withMessage('device_name é obrigatório'),
    body('serial_number').notEmpty().withMessage('serial_number é obrigatório'),
    body('battery').optional().isInt({ min: 0, max: 100 }).withMessage('battery deve ser um número entre 0 e 100'),
    body('ip_address').optional().isIP().withMessage('ip_address deve ser um IP válido'),
    body('mac_address_radio').optional().matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).withMessage('mac_address_radio deve ser um MAC válido'),
    body('wifi_ipv6').optional(),
    body('wifi_gateway_ip').optional().isIP().withMessage('wifi_gateway_ip deve ser um IP válido'),
    body('wifi_broadcast').optional().isIP().withMessage('wifi_broadcast deve ser um IP válido'),
    body('wifi_submask').optional(),
    body('device_model').optional(),
    body('imei').optional(),
    body('secure_android_id').optional(),
    body('network').optional(),
    body('host').optional(),
    body('sector').optional(),
    body('floor').optional(),
    body('last_seen').optional(),
    body('last_sync').optional(),
    body('unit').optional(),
    body('provisioning_status').optional().isIn(['pending', 'in_progress', 'completed', 'failed']),
    body('provisioning_token').optional(),
    body('enrollment_date').optional(),
    body('configuration_profile').optional(),
    body('owner_organization').optional(),
    body('compliance_status').optional().isIn(['compliant', 'non_compliant', 'unknown']),
    body('installed_apps.*.package_name').optional(),
    body('installed_apps.*.version').optional(),
    body('installed_apps.*.install_date').optional(),
    body('security_policies.password_required').optional().isBoolean(),
    body('security_policies.encryption_enabled').optional().isBoolean(),
    body('security_policies.screen_lock_timeout').optional().isInt({ min: 0 }),
    body('security_policies.allow_unknown_sources').optional().isBoolean(),
    body('status').optional().isIn(['online', 'offline', 'Sem Monitorar']),
    body('is_online').optional().isBoolean(),
    body('maintenance_status').optional().isBoolean(),
    body('maintenance_ticket').optional(),
    body('maintenance_reason').optional(),
    body('maintenance_history.*.timestamp').optional(),
    body('maintenance_history.*.status').optional(),
    body('maintenance_history.*.ticket').optional(),

    body().custom((value) => {
      if (!value.imei && !value.serial_number) {
        throw new Error('Pelo menos um dos campos imei ou serial_number deve ser fornecido');
      }
      return true;
    }),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`Erros de validação: ${JSON.stringify(errors.array())}`);
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      let data = req.body;
      logger.info(`Dados recebidos de ${req.ip}: ${JSON.stringify(data)}`);

      // Apenas uma chamada para a função de mapeamento
      const location = await mapMacAddressRadioToLocation(data.mac_address_radio || 'N/A');

      const deviceData = {
        device_name: data.device_name || 'unknown',
        device_model: data.device_model || 'N/A',
        device_id: data.device_id || 'unknown',
        serial_number: data.serial_number || 'N/A',
        imei: data.imei || 'N/A',
        battery: data.battery != null ? data.battery : null,
        network: data.network || 'N/A',
        host: data.host || 'N/A',
        sector: location.sector,
        floor: location.floor,
        mac_address_radio: data.mac_address_radio || 'N/A',
        last_sync: data.last_sync || 'N/A',
        secure_android_id: data.secure_android_id || 'N/A',
        ip_address: data.ip_address || 'N/A',
        wifi_ipv6: data.wifi_ipv6 || 'N/A',
        wifi_gateway_ip: data.wifi_gateway_ip || 'N/A',
        wifi_broadcast: data.wifi_broadcast || 'N/A',
        wifi_submask: data.wifi_submask || 'N/A',
        last_seen: data.last_seen || new Date().toISOString(),
        unit: unitName !== 'Desconhecido' ? unitName : 'N/A',
        provisioning_status: data.provisioning_status || 'N/A',
        provisioning_token: data.provisioning_token || 'N/A',
        enrollment_date: data.enrollment_date || 'N/A',
        configuration_profile: data.configuration_profile || 'N/A',
        owner_organization: data.owner_organization || 'N/A',
        compliance_status: data.compliance_status || 'unknown',
        installed_apps: data.installed_apps || [],
        security_policies: data.security_policies || {},
        status: data.status || 'unknown',
        is_online: data.is_online || false,
        // Manutenção
        maintenance_status: data.maintenance_status || false,
        maintenance_ticket: data.maintenance_ticket || '',
        maintenance_reason: data.maintenance_reason || '',
        maintenance_history: data.maintenance_history || [],
        // Campos adicionais podem ser adicionados aqui conforme necessário
        // Removidos os campos de manutenção daqui para evitar a sobreposição de dados.
        // maintenance_status: data.maintenance_status,
        // maintenance_ticket: data.maintenance_ticket,
        // maintenance_reason: data.maintenance_reason,
      };
      logger.info(`Dados do dispositivo processados: ${JSON.stringify(deviceData)}`);

      const existingDevice = await Device.findOne({ serial_number: deviceData.serial_number });

      if (existingDevice && existingDevice.mac_address_radio !== deviceData.mac_address_radio) {
        logger.info(`Nova localização detetada para ${deviceData.serial_number}. A registar histórico.`);
        const historyEntry = new LocationHistory({
          serial_number: deviceData.serial_number,
          bssid: deviceData.mac_address_radio,
          sector: location.sector,
          floor: location.floor,
          timestamp: new Date(deviceData.last_seen)
        });
        await historyEntry.save();
      }

      const device = await Device.findOneAndUpdate(
        { serial_number: deviceData.serial_number },
        { $set: deviceData },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      logger.info(`Dispositivo ${device.serial_number} salvo/atualizado com sucesso`);
      res.status(200).json({ message: 'Dados salvos com sucesso', deviceId: device._id });
    } catch (err) {
      if (err.code === 11000) {
        const field = err.keyValue?.serial_number ? 'serial_number' : 'imei';
        const value = err.keyValue?.serial_number || err.keyValue?.imei;
        logger.error(`Erro de duplicidade para ${field}: ${value}`);
        return res.status(409).json({ error: `Dispositivo com este ${field} já existe`, field, value });
      }
      logger.error(`Erro ao salvar dados de ${req.ip}: ${err.message}`);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Listar dispositivos (com filtro por prefixos de device_name para usuários comuns, sem paginação)
  router.get('/', auth, getApiLimiter, async (req, res) => {
    try {
      let query = {};

      // Filtro por prefixos de device_name para usuários comuns
      if (req.user.role === 'user') {
        if (!req.user.sector || req.user.sector.trim() === '') {
          logger.warn(`Usuário '${req.user.username}' sem prefixos definidos`);
          return res.status(403).json({ error: 'Usuário sem prefixos definidos. Contacte o administrador.' });
        }
        const prefixes = req.user.sector.split(',').map(p => p.trim()).filter(p => p.length > 0);
        if (prefixes.length === 0) {
          return res.status(200).json({ success: true, devices: [] });
        }
        // Use $or com $regex para matching de prefixo case-insensitive
        query.$or = prefixes.map(prefix => ({ device_name: { $regex: new RegExp(`^${escapeRegExp(prefix)}`, 'i') } }));
      }

      // Filtros opcionais de query params (apenas search, sem paginação)
      if (req.query.search) {
        const searchTerm = req.query.search.toString().trim();
        const searchQuery = {
          $or: [
            { device_name: { $regex: searchTerm, $options: 'i' } },
            { serial_number: { $regex: searchTerm, $options: 'i' } },
            { imei: { $regex: searchTerm, $options: 'i' } }
          ]
        };
        if (query.$or) {
          query.$and = [query, searchQuery];
        } else {
          query = searchQuery;
        }
      }

      const devices = await Device.find(query)
        .sort({ last_seen: -1 })
        .lean();

      // Calcular status baseado em last_seen
      const now = new Date();
      devices.forEach(device => {
        const lastSeen = new Date(device.last_seen);
        device.isOnline = (now - lastSeen) < 5 * 60 * 1000; // 5 minutos
      });

      logger.info(`Dispositivos listados para ${req.user.username}: ${devices.length}`);
      res.status(200).json({
        success: true,
        devices
      });
    } catch (err) {
      logger.error(`Erro ao listar dispositivos: ${err.message}`);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  });

  // Obter dispositivo por serial_number
  router.get('/:serial_number', auth, getApiLimiter, async (req, res) => {
    try {
      const { serial_number } = req.params;

      let device = await Device.findOne({ serial_number: serial_number }).lean();
      if (!device) {
        logger.warn(`Dispositivo não encontrado: ${serial_number}`);
        return res.status(404).json({ error: 'Dispositivo não encontrado' });
      }

      // Verificação de prefixos
      if (req.user.role === 'user' && !matchesUserPrefixes(device.device_name, req.user.sector)) {
        logger.warn(`Usuário '${req.user.username}' tentou acessar dispositivo fora dos seus prefixos: ${serial_number}`);
        return res.status(403).json({ error: 'Acesso negado: Dispositivo fora dos seus prefixos de permissão.' });
      }

      const now = new Date();
      const lastSeen = new Date(device.last_seen);
      device.isOnline = (now - lastSeen) < 5 * 60 * 1000;

      logger.info(`Dispositivo ${serial_number} acessado por ${req.user.username}`);
      res.status(200).json({ success: true, device });
    } catch (err) {
      logger.error(`Erro ao obter dispositivo: ${err.message}`);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  });

  // Enviar comando para dispositivo
  router.post('/commands', auth, modifyApiLimiter, [
    body('serial_number').notEmpty().withMessage('serial_number é obrigatório'),
    body('command').notEmpty().withMessage('command é obrigatório'),
    body('device_name').optional().notEmpty().withMessage('device_name é opcional mas recomendado'),
  ], async (req, res) => {
    try {
      const { serial_number, command, device_name, packageName, apkUrl, maintenance_status } = req.body;

      // Verificação de dispositivo e prefixos
      const device = await Device.findOne({ serial_number: serial_number });
      if (!device) {
        logger.warn(`Dispositivo não encontrado: ${serial_number}`);
        return res.status(404).json({ error: 'Dispositivo não encontrado' });
      }
      if (req.user.role === 'user' && !matchesUserPrefixes(device.device_name, req.user.sector)) {
        logger.warn(`Usuário '${req.user.username}' tentou enviar comando para dispositivo fora dos seus prefixos: ${serial_number}`);
        return res.status(403).json({ error: 'Acesso negado: Dispositivo fora dos seus prefixos de permissão.' });
      }

      if (command === 'set_maintenance') {
        // Atualizar status de manutenção diretamente
        await Device.findOneAndUpdate(
          { serial_number: serial_number },
          {
            maintenance_status: maintenance_status === 'true' || maintenance_status === true,
            maintenance_ticket: req.body.maintenance_ticket || null,
            maintenance_reason: req.body.maintenance_reason || null
          }
        );
        logger.info(`Comando set_maintenance executado para ${serial_number}: status=${maintenance_status}`);
        return res.status(200).json({ message: `Status de manutenção atualizado para ${serial_number}` });
      } else {
        // Registrar comando para outros tipos
        await Command.create({
          device_name: device_name || device.device_name,
          serial_number,
          command,
          parameters: { packageName, apkUrl },
          status: 'sent',
          createdBy: req.user.username
        });
        logger.info(`Comando "${command}" registrado para ${serial_number}`);
        res.status(200).json({ message: `Comando ${command} registrado para ${device_name || device.device_name}` });
      }
    } catch (err) {
      logger.error(`Erro ao processar comando: ${err.message}`);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Reportar resultado de comando
  router.post('/command-result', auth, modifyApiLimiter, async (req, res) => {
    try {
      const { command_id, serial_number, success, result, error_message } = req.body;

      if (!serial_number && !command_id) {
        logger.warn('serial_number ou command_id ausente');
        return res.status(400).json({ error: 'serial_number ou command_id é obrigatório' });
      }

      let command;
      if (command_id) {
        command = await Command.findByIdAndUpdate(command_id, {
          status: success ? 'completed' : 'failed',
          result: result || error_message,
          executedAt: new Date(),
        }, { new: true });
      } else {
        command = await Command.findOneAndUpdate(
          { serial_number, status: 'sent' },
          {
            status: success ? 'completed' : 'failed',
            result: result || error_message,
            executedAt: new Date()
          },
          { new: true, sort: { createdAt: -1 } }
        );
      }

      if (!command) {
        logger.warn(`Comando não encontrado para serial_number: ${serial_number}`);
        return res.status(404).json({ error: 'Comando não encontrado' });
      }

      // Verificação de prefixos para garantir que o usuário não manipule comandos de outros dispositivos
      const device = await Device.findOne({ serial_number: command.serial_number });
      if (req.user.role === 'user' && device && !matchesUserPrefixes(device.device_name, req.user.sector)) {
        logger.warn(`Usuário '${req.user.username}' tentou reportar comando para dispositivo fora dos seus prefixos: ${serial_number}`);
        return res.status(403).json({ error: 'Acesso negado: Dispositivo fora dos seus prefixos de permissão.' });
      }

      logger.info(`Resultado do comando recebido: ${command.command} para ${serial_number} - ${success ? 'sucesso' : 'falha'}`);
      res.status(200).json({ message: 'Resultado do comando registrado' });

    } catch (err) {
      logger.error(`Erro ao registrar resultado do comando: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Excluir dispositivo
  router.delete('/:serial_number', auth, modifyApiLimiter, async (req, res) => {
    try {
      const { serial_number } = req.params;
      // Verificação de prefixos antes de excluir
      const device = await Device.findOne({ serial_number: serial_number });
      if (!device) {
        logger.warn(`Dispositivo não encontrado: ${serial_number}`);
        return res.status(404).json({ error: 'Dispositivo não encontrado' });
      }
      if (req.user.role === 'user' && !matchesUserPrefixes(device.device_name, req.user.sector)) {
        logger.warn(`Usuário '${req.user.username}' tentou excluir dispositivo fora dos seus prefixos: ${serial_number}`);
        return res.status(403).json({ error: 'Acesso negado: Dispositivo fora dos seus prefixos de permissão.' });
      }

      const deletedDevice = await Device.findOneAndDelete({ serial_number: serial_number });
      logger.info(`Dispositivo excluído: ${serial_number}`);
      res.status(200).json({ message: `Dispositivo ${serial_number} excluído com sucesso` });
    } catch (err) {
      logger.error(`Erro ao excluir dispositivo: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
  });

  // Obter histórico de localização
  router.get('/:serial_number/location-history', auth, getApiLimiter, async (req, res) => {
    try {
      const { serial_number } = req.params;

      // Verificação de permissão para ver histórico deste dispositivo
      const device = await Device.findOne({ serial_number: serial_number });
      if (!device) {
        logger.warn(`Dispositivo não encontrado: ${serial_number}`);
        return res.status(404).json({ error: 'Dispositivo não encontrado' });
      }
      if (req.user.role === 'user' && !matchesUserPrefixes(device.device_name, req.user.sector)) {
        logger.warn(`Usuário '${req.user.username}' tentou acessar histórico de dispositivo fora dos seus prefixos: ${serial_number}`);
        return res.status(403).json({ error: 'Acesso negado: Dispositivo fora dos seus prefixos de permissão.' });
      }

      const history = await LocationHistory.find({ serial_number: serial_number })
        .sort({ timestamp: -1 }) // Ordena do mais recente para o mais antigo
        .limit(20) // Limita aos últimos 20 registos
        .lean();

      logger.info(`Histórico de localização solicitado para ${serial_number}: ${history.length} registos encontrados.`);

      res.status(200).json({
        success: true,
        history
      });

    } catch (err) {
      logger.error(`Erro ao obter histórico de localização: ${err.message}`);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  });

  return router;
};

module.exports = deviceRoutes;