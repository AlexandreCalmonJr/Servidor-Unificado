// routes/deviceRoutes.js
const express = require('express');
const ManagedAsset = require('../models/ManagedAsset');
const AssetCommand = require('../models/AssetCommand');

module.exports = (logger, modifyApiLimiter, getApiLimiter, deviceAuth) => {
  const router = express.Router();

  // ────────────────────────────────────────────────────────────────────
  // POST /api/devices/heartbeat
  // ────────────────────────────────────────────────────────────────────
  router.post('/heartbeat', deviceAuth, modifyApiLimiter, async (req, res) => {
    const log = req.logger || logger;
    try {
      const { device_id, serial_number, battery, last_seen } = req.body;
      const serialNum = serial_number || device_id;

      if (!serialNum) {
        log.warn(`[DeviceRoutes] Tentativa de heartbeat sem identificação de hardware`, { body: req.body });
        return res.status(400).json({
          success: false,
          message: 'serial_number ou device_id é obrigatório'
        });
      }

      const update = {
        status: 'online',
        last_seen: last_seen ? new Date(last_seen) : new Date(),
      };

      if (battery !== undefined && battery !== null) {
        update.battery_level = Number(battery);
      }

      const asset = await ManagedAsset.findOneAndUpdate(
        { serial_number: serialNum },
        { $set: update }, // Usar $set explicitamente é mais seguro em Mongoose
        { new: true }
      );

      if (!asset) {
        log.warn(`[DeviceRoutes] Heartbeat de dispositivo não registrado: ${serialNum}`);
        return res.json({ success: true, message: 'Dispositivo não cadastrado ainda' });
      }

      log.info(`💓 Heartbeat: ${serialNum} (${asset.asset_name || 'Sem nome'})`);
      res.json({ success: true, last_seen: asset.last_seen });
    } catch (error) {
      log.error(`[DeviceRoutes] Erro no heartbeat: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ────────────────────────────────────────────────────────────────────
  // POST /api/devices/command-result
  // ────────────────────────────────────────────────────────────────────
  router.post('/command-result', deviceAuth, modifyApiLimiter, async (req, res) => {
    const log = req.logger || logger;
    try {
      const { command_id, success, result, error_message, executed_at } = req.body;

      if (!command_id) {
        return res.status(400).json({ success: false, message: 'command_id é obrigatório' });
      }

      const command = await AssetCommand.findById(command_id);
      if (!command) {
        return res.status(404).json({ success: false, message: 'Comando não encontrado' });
      }

      command.status = success ? 'completed' : 'failed';
      command.result = {
        stdout: result || '',
        stderr: error_message || '',
        exitCode: success ? 0 : 1,
        executionTime: 0,
      };
      command.completedAt = executed_at ? new Date(executed_at) : new Date();
      await command.save();

      log.info(`✅ Resultado de comando: ${command_id} | Status: ${command.status}`);
      res.json({ success: true, message: 'Resultado registrado' });
    } catch (error) {
      log.error(`[DeviceRoutes] Erro ao registrar resultado: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ────────────────────────────────────────────────────────────────────
  // GET /api/devices/:serialNumber/allowed-apps
  // ────────────────────────────────────────────────────────────────────
  router.get('/:serialNumber/allowed-apps', deviceAuth, getApiLimiter, async (req, res) => {
    const log = req.logger || logger;
    try {
      const { serialNumber } = req.params;
      const asset = await ManagedAsset.findOne({ serial_number: serialNumber }).lean();

      if (!asset) {
        return res.status(404).json({ success: false, message: 'Dispositivo não encontrado' });
      }

      // Normalização do acesso ao custom_data (suporta Map ou Object literal)
      const data = asset.custom_data || {};
      const allowedApps = data.allowed_apps || [];

      log.info(`📱 Apps permitidos para ${serialNumber}: ${allowedApps.length}`);
      res.json({
        success: true,
        allowed_apps: allowedApps,
        packages: allowedApps,
      });
    } catch (error) {
      log.error(`[DeviceRoutes] Erro ao buscar apps: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};