const express = require('express');
const crypto = require('crypto');
const ManagedAsset = require('../models/ManagedAsset');
const AssetCommand = require('../models/AssetCommand');
const ProvisioningToken = require('../models/ProvisioningToken');
const ConfigProfile = require('../models/ConfigProfile');
const { getLocalIPAddress } = require('../utils/helpers');
const locationService = require('../services/locationService');
const notificationService = require('../services/notificationService');

const provisioningRoutes = (logger, modifyApiLimiter, enrollLimiter, auth) => {
  const router = express.Router();

  // ── Gerar token de provisionamento ───────────────────────────────
  router.post('/generate-token', auth, modifyApiLimiter, async (req, res) => {
    try {
      const { organization, config_profile, max_uses = 1, expires_in_hours = 24 } = req.body;

      if (!organization || !config_profile) {
        return res.status(400).json({ error: 'organization e config_profile são obrigatórios' });
      }

      const profile = await ConfigProfile.findOne({ name: config_profile });
      if (!profile) return res.status(404).json({ error: 'Perfil de configuração não encontrado' });

      const token = crypto.randomBytes(32).toString('hex');
      const expires_at = new Date(Date.now() + expires_in_hours * 60 * 60 * 1000);

      const provisioningToken = new ProvisioningToken({
        token, organization, config_profile, max_uses, expires_at,
      });
      await provisioningToken.save();

      logger.info(`Token de provisionamento gerado: ${token} para ${organization}`);
      
      // 🔔 Notificar via WebSocket
      notificationService.notifyTokenCreated(token, organization, config_profile);

      res.status(201).json({
        token, organization, config_profile, max_uses, expires_at,
        provisioning_url: `http://${getLocalIPAddress()}:${process.env.PORT || 3000}/provision/${token}`,
      });
    } catch (err) {
      logger.error(`Erro ao gerar token: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // ── Verificar status do token (público) ──────────────────────────
  router.get('/tokens/:token/status', modifyApiLimiter, async (req, res) => {
    try {
      const provisioningToken = await ProvisioningToken.findOne({ token: req.params.token });
      if (!provisioningToken) return res.status(404).json({ valid: false, message: 'Token não encontrado' });

      const now = new Date();
      const isExpired = provisioningToken.expires_at < now;
      const isExhausted = provisioningToken.used_count >= provisioningToken.max_uses;

      if (isExpired || isExhausted || !provisioningToken.is_active) {
        return res.status(410).json({
          valid: false, message: 'Token expirado ou esgotado',
          organization: provisioningToken.organization,
          config_profile: provisioningToken.config_profile,
          uses_remaining: 0,
          expires_at: provisioningToken.expires_at,
        });
      }

      res.json({
        valid: true,
        organization: provisioningToken.organization,
        config_profile: provisioningToken.config_profile,
        uses_remaining: provisioningToken.max_uses - provisioningToken.used_count,
        expires_at: provisioningToken.expires_at,
        minutes_remaining: Math.floor((provisioningToken.expires_at - now) / 60000),
      });
    } catch (err) {
      logger.error(`Erro ao verificar token: ${err.message}`);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  // ── Enrollar dispositivo ─────────────────────────────────────────
  router.post('/enroll', enrollLimiter, async (req, res) => {
    try {
      const {
        provisioning_token, device_id, device_name, device_model,
        serial_number, imei, secure_android_id, android_id,
        ip_address, mac_address_radio,
        wifi_ipv6, wifi_gateway_ip, wifi_broadcast, wifi_submask,
      } = req.body;

      if (!provisioning_token || !device_id || !device_name) {
        return res.status(400).json({ error: 'provisioning_token, device_id e device_name são obrigatórios' });
      }

      if (mac_address_radio && mac_address_radio !== 'N/A') {
        if (!/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac_address_radio)) {
          return res.status(400).json({ error: 'Formato de MAC Address inválido' });
        }
      }

      const token = await ProvisioningToken.findOne({
        token: provisioning_token, is_active: true, expires_at: { $gt: new Date() },
      });
      if (!token) return res.status(401).json({ error: 'Token de provisionamento inválido ou expirado' });
      if (token.used_count >= token.max_uses) return res.status(401).json({ error: 'Token esgotado' });

      // Verifica se já foi provisionado
      const existing = await ManagedAsset.findOne({ serial_number });
      if (existing && existing.provisioning_status === 'completed') {
        return res.status(409).json({ error: 'Dispositivo já provisionado' });
      }

      const configProfile = await ConfigProfile.findOne({ name: token.config_profile });
      if (!configProfile) return res.status(500).json({ error: 'Perfil de configuração não encontrado' });

      const location = await locationService.mapDeviceLocation({
        ip_address, mac_address_radio, device_name,
      });

      const targetType = configProfile.module_type || 'desktop';
      const assetData = {
        asset_type: targetType,
        asset_name: device_name,
        serial_number: serial_number || 'N/A',
        model: device_model,
        ip_address,
        mac_address: mac_address_radio,
        unit: location.unit,
        sector: location.sector,
        floor: location.floor,
        status: 'offline',
        last_seen: new Date(),
        custom_data: {
          imei,
          android_id: android_id || secure_android_id,
          wifi_ipv6,
          wifi_gateway_ip,
          wifi_broadcast,
          wifi_submask,
          provisioning_token,
          owner_organization: token.organization,
          configuration_profile: token.config_profile,
          provisioning_status: 'in_progress',
          enrollment_date: new Date().toISOString(),
        },
      };

      let asset;
      if (existing) {
        Object.assign(existing, assetData);
        asset = await existing.save();
      } else {
        asset = await ManagedAsset.create(assetData);
      }

      // Incrementa uso do token
      token.used_count += 1;
      if (token.used_count >= token.max_uses) token.is_active = false;
      await token.save();

      // Cria comandos iniciais
      const initialCommands = [];

      if (configProfile.settings?.mandatory_apps?.length) {
        for (const app of configProfile.settings.mandatory_apps) {
          initialCommands.push({
            moduleId: targetType,
            assetId: asset._id.toString(),
            serialNumber: serial_number,
            assetName: device_name,
            commandType: 'install_apk',
            command: 'INTERNAL_APK_INSTALL',
            parameters: {
              package_name: app.package_name,
              apk_url: app.apk_url,
              version: app.version,
            },
            requiresElevation: false,
            createdBy: 'provisioning',
          });
        }
      }

      if (configProfile.settings?.restrictions) {
        initialCommands.push({
          moduleId: targetType,
          assetId: asset._id.toString(),
          serialNumber: serial_number,
          assetName: device_name,
          commandType: 'cmd_custom',
          command: 'INTERNAL_APPLY_RESTRICTIONS',
          parameters: configProfile.settings.restrictions,
          requiresElevation: false,
          createdBy: 'provisioning',
        });
      }

      if (initialCommands.length > 0) {
        await AssetCommand.insertMany(initialCommands);
      }

      logger.info(`Dispositivo provisionado: ${serial_number} para ${token.organization}`);
      
      // 🔔 Notificar via WebSocket
      notificationService.notifyDeviceEnrolled(device_name, serial_number, token.organization);

      res.status(200).json({
        message: 'Dispositivo provisionado com sucesso',
        device_id, serial_number,
        organization: token.organization,
        config_profile: token.config_profile,
        commands_count: initialCommands.length,
      });
    } catch (err) {
      logger.error(`Erro no provisionamento: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
  });

  // ── Finalizar provisionamento ────────────────────────────────────
  router.post('/complete', auth, modifyApiLimiter, async (req, res) => {
    try {
      const { device_id, serial_number, success, error_message } = req.body;
      if (!serial_number || !device_id) {
        return res.status(400).json({ error: 'serial_number e device_id são obrigatórios' });
      }

      const asset = await ManagedAsset.findOne({ serial_number });
      if (!asset) return res.status(404).json({ error: 'Dispositivo não encontrado' });

      const status = success ? 'completed' : 'failed';
      asset.custom_data = asset.custom_data || {};
      asset.custom_data.provisioning_status = status;
      if (!success && error_message) asset.custom_data.provisioning_error = error_message;
      await asset.save();

      logger.info(`Provisionamento ${success ? 'concluído' : 'falhou'} para: ${serial_number}`);
      res.status(200).json({ message: 'Status de provisionamento atualizado' });
    } catch (err) {
      logger.error(`Erro ao finalizar provisionamento: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
  });

  // ── Listar tokens ────────────────────────────────────────────────
  router.get('/tokens', auth, async (req, res) => {
    try {
      const tokens = await ProvisioningToken.find().sort({ created_at: -1 });
      res.json(tokens);
    } catch (err) {
      logger.error(`Erro ao listar tokens: ${err.message}`);
      res.status(500).json({ error: 'Erro ao listar tokens' });
    }
  });

  // ── Revogar token ────────────────────────────────────────────────
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

  // ── Download do agente desktop ───────────────────────────────────
  router.get('/download/desktop/:token', modifyApiLimiter, async (req, res) => {
    try {
      const provisioningToken = await ProvisioningToken.findOne({ token: req.params.token });
      if (!provisioningToken || !provisioningToken.is_active) {
        return res.status(401).send('Token de provisionamento inválido ou expirado.');
      }

      const filePath = require('path').join(__dirname, '..', 'public', 'downloads', 'UnifiedDesktop.exe');
      try {
        await require('fs').promises.access(filePath);
      } catch {
        return res.status(404).send('Instalador não encontrado no servidor.');
      }

      res.download(filePath, `UnifiedDesktop-${req.params.token}.exe`);
    } catch (err) {
      logger.error(`Erro no download desktop: ${err.message}`);
      res.status(500).send('Erro interno');
    }
  });

  return router;
};

// Renderizar página de provisionamento (SSR)
module.exports = provisioningRoutes;
module.exports.renderProvisioningPage = (logger) => async (req, res) => {
  try {
    const provisioningToken = await ProvisioningToken.findOne({
      token: req.params.token,
      is_active: true,
      expires_at: { $gt: new Date() },
    });
    if (!provisioningToken) return res.status(404).send('Token de provisionamento inválido ou expirado');

    res.render('provision', {
      token: req.params.token,
      organization: provisioningToken.organization,
      server_url: `http://${getLocalIPAddress()}:${process.env.PORT || 3000}`,
    });
  } catch (err) {
    logger.error(`Erro na página de provisionamento: ${err.message}`);
    res.status(500).send('Erro interno do servidor');
  }
};
