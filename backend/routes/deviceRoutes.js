// routes/deviceRoutes.js
const express = require('express');
const ManagedAsset = require('../models/ManagedAsset');
const AssetCommand = require('../models/AssetCommand');
const { validateBody } = require('../middleware/schemaValidator');

module.exports = (logger, modifyApiLimiter, getApiLimiter, deviceAuth) => {
  const router = express.Router();

  // ────────────────────────────────────────────────────────────────────
  // POST /api/devices/heartbeat
  // ────────────────────────────────────────────────────────────────────
  router.post('/heartbeat', deviceAuth, validateBody('heartbeat'), modifyApiLimiter, async (req, res) => {
    const log = req.logger || logger;
    try {
      const { device_id, serial_number, module_id, battery } = req.body || {};
      const serialNum = serial_number || device_id;

      if (!serialNum) {
        log.warn(`[DeviceRoutes] Tentativa de heartbeat sem identificação de hardware`, { body: req.body });
        return res.status(400).json({
          success: false,
          message: 'serial_number ou device_id é obrigatório'
        });
      }

      // last_seen é sempre do servidor; data enviada pelo cliente é ignorada.
      // Se dispositivo estiver em quarentena, preserva status 'quarantine' para auditoria forense.
      const isQuarantined = Boolean(req.device?.isQuarantined);
      const update = {
        status: isQuarantined ? 'quarantine' : 'online',
        last_seen: new Date(),
      };

      if (battery !== undefined && battery !== null && battery !== '') {
        const parsedBattery = Number(battery);
        if (Number.isFinite(parsedBattery)) {
          update.battery_level = Math.max(0, Math.min(100, Math.round(parsedBattery)));
        }
      }

      // ─── CORREÇÃO CRÍTICA ──────────────────────────────────────────
      // O índice único é {module_id, serial_number}. Buscar só por
      // serial_number pode bater no ativo errado quando o mesmo serial
      // existe em módulos diferentes (ex: mesmo hardware re-provisionado
      // em outro módulo). Se module_id vier no body, usa-o como filtro.
      const filter = module_id
        ? { module_id, serial_number: serialNum }
        : { serial_number: serialNum };
      // ─────────────────────────────────────────────────────────────

      const asset = await ManagedAsset.findOneAndUpdate(
        filter,
        { $set: update },
        { new: true }
      );

      if (!asset) {
        log.warn(`[DeviceRoutes] Heartbeat de dispositivo não registrado: ${serialNum}`);
        return res.status(404).json({ success: false, registered: false, message: 'Dispositivo não cadastrado' });
      }

      log.info(`💓 Heartbeat: ${serialNum} (${asset.asset_name || 'Sem nome'})${isQuarantined ? ' [QUARENTENA]' : ''}`);
      res.json({
        success: true,
        registered: true,
        last_seen: asset.last_seen,
        quarantine: isQuarantined,
      });
    } catch (error) {
      log.error(`[DeviceRoutes] Erro no heartbeat: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ────────────────────────────────────────────────────────────────────
  // POST /api/devices/command-result
  // ────────────────────────────────────────────────────────────────────
  router.post('/command-result', deviceAuth, validateBody('commandResult'), modifyApiLimiter, async (req, res) => {
    const log = req.logger || logger;
    try {
      if (req.device?.isQuarantined) {
        log.warn(`[DeviceRoutes] Dispositivo em QUARENTENA tentou reportar resultado de comando: ${req.device.serial_number}`);
        return res.status(403).json({
          success: false,
          code: 'DEVICE_IN_QUARANTINE',
          message: 'Dispositivo em quarentena. Operações de comando bloqueadas.',
        });
      }

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
      const { module_id } = req.query; // opcional, mas recomendado

      // ─── CORREÇÃO: usa module_id como filtro adicional se fornecido ───
      const filter = module_id
        ? { serial_number: serialNumber, module_id }
        : { serial_number: serialNumber };

      const asset = await ManagedAsset.findOne(filter).lean();

      if (!asset) {
        return res.status(404).json({ success: false, message: 'Dispositivo não encontrado' });
      }

      // Normalização do acesso ao custom_data (suporta Map ou Object literal)
      const data = asset.custom_data instanceof Map
        ? Object.fromEntries(asset.custom_data)
        : (asset.custom_data || {});

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