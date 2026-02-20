const express = require('express');
const crypto = require('crypto');
const { Device } = require('../models/Device');
const ProvisioningToken = require('../models/ProvisioningToken');
const ConfigProfile = require('../models/ConfigProfile');
const Command = require('../models/Command');
const { getLocalIPAddress } = require('../utils/helpers');
const { mapMacAddressRadioToLocation } = require('../utils/mappings');

const provisioningRoutes = (logger, modifyApiLimiter, enrollLimiter, auth) => {
  const router = express.Router();

  // Gerar token de provisionamento
  router.post('/generate-token', auth, modifyApiLimiter, async (req, res) => {
    try {
      const { organization, config_profile, max_uses = 1, expires_in_hours = 24 } = req.body;

      if (!organization || !config_profile) {
        return res.status(400).json({ error: 'organization e config_profile são obrigatórios' });
      }

      const profile = await ConfigProfile.findOne({ name: config_profile });
      if (!profile) {
        return res.status(404).json({ error: 'Perfil de configuração não encontrado' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expires_at = new Date(Date.now() + expires_in_hours * 60 * 60 * 1000);

      const provisioningToken = new ProvisioningToken({
        token,
        organization,
        config_profile,
        max_uses,
        expires_at
      });

      await provisioningToken.save();

      logger.info(`Token de provisionamento gerado: ${token} para ${organization}`);
      res.status(201).json({
        token,
        organization,
        config_profile,
        max_uses,
        expires_at,
        provisioning_url: `http://${getLocalIPAddress()}:${process.env.PORT || 3000}/provision/${token}`
      });
    } catch (err) {
      logger.error(`Erro ao gerar token de provisionamento: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Verificar status do token (Público/Agente)
  router.get('/tokens/:token/status', modifyApiLimiter, async (req, res) => {
    try {
      const { token } = req.params;
      const provisioningToken = await ProvisioningToken.findOne({ token });

      if (!provisioningToken) {
        return res.status(404).json({ valid: false, message: 'Token não encontrado' });
      }

      const now = new Date();
      const isExpired = provisioningToken.expires_at < now;
      const isExhausted = provisioningToken.used_count >= provisioningToken.max_uses;
      const isActive = provisioningToken.is_active;

      if (isExpired || isExhausted || !isActive) {
        return res.status(410).json({
          valid: false,
          message: 'Token expirado ou esgotado',
          organization: provisioningToken.organization,
          config_profile: provisioningToken.config_profile,
          uses_remaining: 0,
          expires_at: provisioningToken.expires_at
        });
      }

      const minutes_remaining = Math.floor((provisioningToken.expires_at - now) / 60000);

      res.json({
        valid: true,
        organization: provisioningToken.organization,
        config_profile: provisioningToken.config_profile,
        uses_remaining: provisioningToken.max_uses - provisioningToken.used_count,
        expires_at: provisioningToken.expires_at,
        minutes_remaining
      });

    } catch (err) {
      logger.error(`Erro ao verificar status do token: ${err.message}`);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  // Endpoint de provisionamento
  router.post('/enroll', enrollLimiter, async (req, res) => {
    try {
      const {
        provisioning_token,
        device_id,
        device_name,
        device_model,
        serial_number,
        imei,
        secure_android_id,
        android_id, // Support android_id form mobile client
        ip_address,
        mac_address_radio,
        wifi_ipv6,
        wifi_gateway_ip,
        wifi_broadcast,
        wifi_submask
      } = req.body;

      if (!provisioning_token || !device_id || !device_name) {
        logger.warn('Campos obrigatórios ausentes no provisionamento');
        return res.status(400).json({ error: 'provisioning_token, device_id e device_name são obrigatórios' });
      }

      // Validação de MAC Address
      if (mac_address_radio && mac_address_radio !== 'N/A') {
        const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
        if (!macRegex.test(mac_address_radio)) {
          logger.warn(`Tentativa de enroll com MAC inválido: ${mac_address_radio}`);
          return res.status(400).json({ error: 'Formato de MAC Address inválido' });
        }
      }

      const token = await ProvisioningToken.findOne({
        token: provisioning_token,
        is_active: true,
        expires_at: { $gt: new Date() }
      });

      if (!token) {
        logger.warn(`Token de provisionamento inválido ou expirado: ${provisioning_token} (IP: ${req.ip})`);
        return res.status(401).json({ error: 'Token de provisionamento inválido ou expirado' });
      }

      if (token.used_count >= token.max_uses) {
        logger.warn(`Token de provisionamento esgotado: ${provisioning_token}`);
        return res.status(401).json({ error: 'Token de provisionamento esgotado' });
      }

      let device = await Device.findOne({ serial_number });

      if (device && device.provisioning_status === 'completed') {
        logger.warn(`Dispositivo já provisionado: ${serial_number}`);
        return res.status(409).json({ error: 'Dispositivo já provisionado' });
      }

      const configProfile = await ConfigProfile.findOne({ name: token.config_profile });
      if (!configProfile) {
        logger.error(`Perfil de configuração não encontrado: ${token.config_profile}`);
        return res.status(500).json({ error: 'Perfil de configuração não encontrado' });
      }

      const location = await mapMacAddressRadioToLocation(mac_address_radio || 'N/A');

      const deviceData = {
        asset_name: device_name, // Unified Schema requires asset_name
        device_name,
        device_model,
        serial_number,
        imei,
        secure_android_id: secure_android_id || android_id, // Map correctly
        android_id: android_id || secure_android_id,        // Map correctly
        ip_address,
        mac_address_radio,
        wifi_ipv6,
        wifi_gateway_ip,
        wifi_broadcast,
        wifi_submask,
        sector: location.sector,
        floor: location.floor,
        provisioning_status: 'in_progress',
        provisioning_token,
        configuration_profile: token.config_profile,
        owner_organization: token.organization,
        enrollment_date: new Date(),
        last_seen: new Date()
      };

      if (device) {
        Object.assign(device, deviceData);
      } else {
        // ✅ CONSOLIDADO - Usar ManagedAsset para todos os tipos de ativos
        const targetType = configProfile.module_type || 'desktop';
        logger.info(`Provisioning: Serial=${serial_number}, Profile=${configProfile.name}, TargetType=${targetType}`);

        // Validar tipo de ativo
        const validTypes = ['desktop', 'notebook', 'panel', 'printer', 'totem', 'mobile', 'scanner', 'custom'];
        if (!validTypes.includes(targetType)) {
          logger.error(`Tipo de ativo inválido: ${targetType}`);
          throw new Error(`Tipo de ativo não suportado: ${targetType}`);
        }

        // ✅ Sempre usar ManagedAsset com asset_type
        const ManagedAsset = require('../models/ManagedAsset');
        const ModelToUse = ManagedAsset;
        
        // Adicionar asset_type ao deviceData
        deviceData.asset_type = targetType;

        // Safety fallback for mobile traits
        if (secure_android_id || android_id || imei) {
          const { Mobile } = require('../models/Device');
          ModelToUse = Mobile;
        }

        device = new ModelToUse({
          ...deviceData,
          device_type: (ModelToUse.modelName === 'Mobile' || targetType === 'mobile') ? 'mobile' : targetType
        });
      }

      await device.save();

      // ATUALIZAÇÃO DO TOKEN COM INVALIDAÇÃO IMEDIATA
      token.used_count += 1;
      if (token.used_count >= token.max_uses) {
        token.is_active = false;
        logger.info(`Token ${token.token} esgotado e invalidado.`);
      }
      await token.save();

      const initialCommands = [];

      if (configProfile.settings.mandatory_apps) {
        for (const app of configProfile.settings.mandatory_apps) {
          initialCommands.push({
            device_name,
            serial_number,
            command: 'install_app',
            parameters: {
              package_name: app.package_name,
              apk_url: app.apk_url,
              version: app.version
            }
          });
        }
      }

      if (configProfile.settings.restrictions) {
        initialCommands.push({
          device_name,
          serial_number,
          command: 'apply_restrictions',
          parameters: configProfile.settings.restrictions
        });
      }

      if (configProfile.settings.wifi_configs && configProfile.settings.wifi_configs.length > 0) {
        initialCommands.push({
          device_name,
          serial_number,
          command: 'configure_wifi',
          parameters: { wifi_configs: configProfile.settings.wifi_configs }
        });
      }

      if (initialCommands.length > 0) {
        await Command.insertMany(initialCommands);
      }

      logger.info(`Dispositivo provisionado: ${serial_number} para ${token.organization}`);
      res.status(200).json({
        message: 'Dispositivo provisionado com sucesso',
        device_id,
        serial_number,
        organization: token.organization,
        config_profile: token.config_profile,
        commands_count: initialCommands.length
      });

    } catch (err) {
      logger.error(`Erro no provisionamento: ${err.message}, Stack: ${err.stack}`);
      res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
  });

  // Finalizar provisionamento
  router.post('/complete', auth, modifyApiLimiter, async (req, res) => {
    try {
      const { device_id, serial_number, success, error_message } = req.body;

      if (!serial_number || !device_id) {
        logger.warn('Campos obrigatórios ausentes ao finalizar provisionamento');
        return res.status(400).json({ error: 'serial_number e device_id são obrigatórios' });
      }

      const device = await Device.findOne({ serial_number });
      if (!device) {
        logger.warn(`Dispositivo não encontrado: ${serial_number}`);
        return res.status(404).json({ error: 'Dispositivo não encontrado' });
      }

      device.provisioning_status = success ? 'completed' : 'failed';
      if (!success && error_message) {
        device.provisioning_error = error_message;
        logger.error(`Provisionamento falhou para ${serial_number}: ${error_message}`);
      }
      device.compliance_status = success ? 'compliant' : 'non_compliant';

      await device.save();

      logger.info(`Provisionamento ${success ? 'concluído' : 'falhou'} para: ${serial_number}`);
      res.status(200).json({ message: 'Status de provisionamento atualizado' });

    } catch (err) {
      logger.error(`Erro ao finalizar provisionamento: ${err.message}, Stack: ${err.stack}`);
      res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
  });

  const renderProvisioningPage = (logger) => async (req, res) => {
    try {
      const token = await ProvisioningToken.findOne({
        token: req.params.token,
        is_active: true,
        expires_at: { $gt: new Date() }
      });

      if (!token) {
        return res.status(404).send('Token de provisionamento inválido ou expirado');
      }

      res.render('provision', {
        token: req.params.token,
        organization: token.organization,
        server_url: `http://${getLocalIPAddress()}:${process.env.PORT || 3000}`
      });
    } catch (err) {
      logger.error(`Erro na página de provisionamento: ${err.message}`);
      res.status(500).send('Erro interno do servidor');
    }
  };

  // Listar tokens ativos
  router.get('/tokens', auth, async (req, res) => {
    try {
      // Retorna apenas tokens que ainda não expiraram, ou todos se preferir histórico
      const tokens = await ProvisioningToken.find().sort({ created_at: -1 });
      res.json(tokens);
    } catch (err) {
      logger.error(`Erro ao listar tokens: ${err.message}`);
      res.status(500).json({ error: 'Erro ao listar tokens' });
    }
  });

  // Revogar/Deletar token
  router.delete('/tokens/:id', auth, modifyApiLimiter, async (req, res) => {
    try {
      const token = await ProvisioningToken.findByIdAndDelete(req.params.id);
      if (!token) return res.status(404).json({ error: 'Token não encontrado' });

      logger.info(`Token revogado: ${token.token} por ${req.user.username}`);
      res.json({ success: true, message: 'Token revogado' });
    } catch (err) {
      logger.error(`Erro ao revogar token: ${err.message}`);
      res.status(500).json({ error: 'Erro ao revogar token' });
    }
  });

  // Download Desktop Client (Renamed with Token)
  router.get('/download/desktop/:token', modifyApiLimiter, async (req, res) => {
    try {
      const { token } = req.params;
      const { platform = 'win' } = req.query; // 'win' default

      // 1. Validar token (Opcional: permitir download mesmo se expirado? Melhor validar para garantir config)
      const provisioningToken = await ProvisioningToken.findOne({ token });
      if (!provisioningToken || !provisioningToken.is_active) {
        //logger.warn(`Tentativa de download com token inválido: ${token}`);
        // return res.status(404).send('Token inválido ou expirado.');
        // Allow download but warn? No, security first.
        return res.status(401).send('Token de provisionamento inválido ou expirado.');
      }

      // 2. Localizar arquivo base
      const publicDir = require('path').join(__dirname, '..', 'public', 'downloads');
      const baseFilename = 'UnifiedDesktop.exe'; // Assumindo executável Portable base
      const filePath = require('path').join(publicDir, baseFilename);

      try {
        await require('fs').promises.access(filePath);
      } catch (e) {
        logger.error(`Arquivo base não encontrado: ${filePath}`);
        return res.status(404).send('Instalador não encontrado no servidor.');
      }

      // 3. Servir com nome modificado
      const downloadFilename = `UnifiedDesktop-${token}.exe`;

      logger.info(`Servindo cliente desktop para token: ${token.substring(0, 8)}...`);
      res.download(filePath, downloadFilename);

    } catch (err) {
      logger.error(`Erro no download desktop: ${err.message}`);
      res.status(500).send('Erro interno');
    }
  });

  return router;
};

// Exportar também a função de renderização da página para ser usada em express.js
module.exports = provisioningRoutes;
module.exports.renderProvisioningPage = (logger) => async (req, res) => {
  const { token } = req.params;
  try {
    const provisioningToken = await ProvisioningToken.findOne({
      token: token,
      is_active: true,
      expires_at: { $gt: new Date() }
    });

    if (!provisioningToken) {
      return res.status(404).send('Token de provisionamento inválido ou expirado');
    }

    res.render('provision', {
      token: token,
      organization: provisioningToken.organization,
      server_url: `http://${getLocalIPAddress()}:${process.env.PORT || 3000}`
    });
  } catch (err) {
    logger.error(`Erro na página de provisionamento: ${err.message}`);
    res.status(500).send('Erro interno do servidor');
  }
};