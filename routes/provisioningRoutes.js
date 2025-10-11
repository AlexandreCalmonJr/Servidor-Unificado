const express = require('express');
const crypto = require('crypto');
const Device = require('../models/Device');
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
  
      const token = await ProvisioningToken.findOne({ 
        token: provisioning_token,
        is_active: true,
        expires_at: { $gt: new Date() }
      });
  
      if (!token) {
        logger.warn(`Token de provisionamento inválido ou expirado: ${provisioning_token}`);
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
        device_name,
        device_model,
        serial_number,
        imei,
        secure_android_id,
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
        device = new Device(deviceData);
      }
  
      await device.save();
  
      token.used_count += 1;
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