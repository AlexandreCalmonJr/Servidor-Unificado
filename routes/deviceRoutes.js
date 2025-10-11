const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Device = require('../models/Device');
const Command = require('../models/Command');
const LocationHistory = require('../models/LocationHistory');
const { mapIpToUnit, mapMacAddressRadioToLocation } = require('../utils/mappings');

const deviceRoutes = (logger, getApiLimiter, modifyApiLimiter, auth) => {
  const router = express.Router();

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
      return res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
  });

  // Heartbeat para atualizar last_seen
  router.post('/heartbeat', auth, modifyApiLimiter, [
    body('serial_number').notEmpty().withMessage('serial_number é obrigatório').trim(),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`Erros de validação: ${JSON.stringify(errors.array())}`);
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { serial_number } = req.body;

      const device = await Device.findOneAndUpdate(
        { serial_number },
        { last_seen: new Date() },
        { new: true }
      );

      if (!device) {
        logger.warn(`Dispositivo não encontrado para heartbeat: ${serial_number}`);
        return res.status(404).json({ error: 'Dispositivo não encontrado' });
      }

      logger.info(`Heartbeat recebido de: ${serial_number}`);
      res.status(200).json({ message: 'Heartbeat registrado com sucesso' });
    } catch (err) {
      logger.error(`Erro no heartbeat de ${req.ip}: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Listar dispositivos com filtragem por setor para usuários comuns
  router.get('/', auth, getApiLimiter, async (req, res) => {
    try {
      // Buscar TODOS os dispositivos primeiro
      const allDevices = await Device.find({}).lean();
      let filteredDevices = allDevices;

      // Se o usuário não for admin, filtrar por nome do dispositivo
      if (req.user.role === 'user') {
        const userSector = req.user.sector;
        if (userSector && userSector !== 'Global') {
          // Separar os prefixos por vírgula e limpar espaços
          const prefixes = userSector.split(',').map(p => p.trim().toLowerCase());
          
          // Filtrar dispositivos cujo nome começa com algum dos prefixos
          filteredDevices = allDevices.filter(device => {
            const deviceName = (device.device_name || '').toLowerCase();
            return prefixes.some(prefix => deviceName.startsWith(prefix));
          });
          
          logger.info(`Usuário '${req.user.username}' (prefixos: ${prefixes.join(', ')}) - ${filteredDevices.length} dispositivos filtrados de ${allDevices.length} totais.`);
        } else {
          logger.warn(`Usuário '${req.user.username}' com role 'user' mas sem setor definido ou setor 'Global'.`);
          return res.status(403).json({ error: 'Acesso negado: Setor do usuário não definido ou inválido para esta operação.' });
        }
      } else {
        logger.info(`Usuário '${req.user.username}' (role: ${req.user.role}) solicitando TODOS os dispositivos.`);
      }

      // Aplicar mapIpToUnit apenas nos dispositivos filtrados
      const devicesWithUnit = await Promise.all(filteredDevices.map(async (device) => {
        const unit = await mapIpToUnit(device.ip_address);
        return { ...device, unit };
      }));
      
      logger.info(`Lista de dispositivos retornada: ${devicesWithUnit.length} dispositivos (Role: ${req.user.role}, Setor: ${req.user.sector || 'N/A'})`);
      res.status(200).json(devicesWithUnit);
    } catch (err) {
      logger.error(`Erro ao obter dispositivos: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });;

  // Obter comandos pendentes
  router.get('/commands', auth, getApiLimiter, [
    query('serial_number').notEmpty().withMessage('serial_number é obrigatório').trim(),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`Erros de validação: ${JSON.stringify(errors.array())}`);
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { serial_number } = req.query;
      // Adicionar filtro por setor para usuários comuns também aqui, se necessário
      const device = await Device.findOne({ serial_number });
      if (req.user.role === 'user' && device && device.sector !== req.user.sector) {
        logger.warn(`Usuário '${req.user.username}' tentou acessar comandos para dispositivo fora do seu setor: ${serial_number}`);
        return res.status(403).json({ error: 'Acesso negado: Dispositivo fora do seu setor de permissão.' });
      }

      const commands = await Command.find({ serial_number, status: 'pending' }).lean();
      if (commands.length > 0) {
        await Command.updateMany({ serial_number, status: 'pending' }, { status: 'sent' });
        logger.info(`Comandos pendentes encontrados para ${serial_number}: ${commands.length}`);
      }

      res.status(200).json(commands.map(cmd => ({
        id: cmd._id.toString(),
        command_type: cmd.command,
        parameters: cmd.parameters
      })));
    } catch (err) {
      logger.error(`Erro ao obter comandos: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Executar comando
  router.post('/executeCommand', auth, modifyApiLimiter, [
    body('serial_number').notEmpty().withMessage('serial_number é obrigatório').trim(),
    body('command').notEmpty().withMessage('command é obrigatório').trim(),
  ], async (req, res) => {
    const { device_name, serial_number, command, packageName, apkUrl, maintenance_status, maintenance_ticket, maintenance_history_entry, maintenance_reason } = req.body;

    try {
      if (!serial_number || !command) {
        logger.warn('Faltam campos obrigatórios: device_name ou command');
        return res.status(400).json({ error: 'device_name e command são obrigatórios' });
      }

      // Verificação de setor antes de executar o comando
      const device = await Device.findOne({ serial_number });
      if (!device) {
        logger.warn(`Dispositivo não encontrado: ${serial_number}`);
        return res.status(404).json({ error: 'Dispositivo não encontrado' });
      }
      if (req.user.role === 'user' && device.sector !== req.user.sector) {
        logger.warn(`Usuário '${req.user.username}' tentou executar comando em dispositivo fora do seu setor: ${serial_number}`);
        return res.status(403).json({ error: 'Acesso negado: Dispositivo fora do seu setor de permissão.' });
      }

      if (command === 'set_maintenance') {
        if (typeof maintenance_status !== 'boolean') {
          logger.warn(`maintenance_status deve ser booleano para ${serial_number}`);
          return res.status(400).json({ error: 'maintenance_status deve ser um valor booleano' });
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
              logger.warn(`maintenance_history_entry inválido para ${serial_number}`);
              return res.status(400).json({ error: 'maintenance_history_entry deve conter timestamp e status' });
            }
            updateFields.$push = { maintenance_history: historyEntry };
          } catch (err) {
            logger.error(`Erro ao parsear maintenance_history_entry para ${serial_number}: ${err.message}`);
            return res.status(400).json({ error: 'Formato inválido para maintenance_history_entry' });
          }
        }

        const updatedDevice = await Device.findOneAndUpdate(
          { serial_number },
          updateFields,
          { new: true }
        );

        if (!updatedDevice) { // Dupla checagem, embora já verificada acima
          logger.warn(`Dispositivo não encontrado: ${serial_number}`);
          return res.status(404).json({ error: 'Dispositivo não encontrado' });
        }

        logger.info(`Comando set_maintenance executado para ${serial_number}: status=${maintenance_status}`);
        return res.status(200).json({ message: `Status de manutenção atualizado para ${serial_number}` });
      } else {
        await Command.create({
          device_name,
          serial_number,
          command,
          parameters: { packageName, apkUrl }
        });
        logger.info(`Comando "${command}" registrado para ${serial_number}`);
        res.status(200).json({ message: `Comando ${command} registrado para ${device_name}` });
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

      // Verificação de setor para garantir que o usuário não manipule comandos de outros setores
      const device = await Device.findOne({ serial_number: command.serial_number });
      if (req.user.role === 'user' && device && device.sector !== req.user.sector) {
        logger.warn(`Usuário '${req.user.username}' tentou reportar comando para dispositivo fora do seu setor: ${serial_number}`);
        return res.status(403).json({ error: 'Acesso negado: Dispositivo fora do seu setor de permissão.' });
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
      // Verificação de setor antes de excluir
      const device = await Device.findOne({ serial_number: serial_number });
      if (!device) {
        logger.warn(`Dispositivo não encontrado: ${serial_number}`);
        return res.status(404).json({ error: 'Dispositivo não encontrado' });
      }
      if (req.user.role === 'user' && device.sector !== req.user.sector) {
        logger.warn(`Usuário '${req.user.username}' tentou excluir dispositivo fora do seu setor: ${serial_number}`);
        return res.status(403).json({ error: 'Acesso negado: Dispositivo fora do seu setor de permissão.' });
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

      // Opcional: Adicionar verificação de permissão para ver este dispositivo específico
      // if (req.user.role === 'user') { ... }

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