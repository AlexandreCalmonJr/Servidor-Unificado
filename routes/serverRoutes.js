// routes/serverRoutes.js - SEM ROTA /public/apks.json
const express = require('express');
const os = require('os');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { Device } = require('../models/Device');
const Command = require('../models/Command');
const { getLocalIPAddress } = require('../utils/helpers');

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const publicDir = path.join(__dirname, '..', 'public');
    try {
      await fs.access(publicDir);
    } catch {
      await fs.mkdir(publicDir, { recursive: true });
    }
    cb(null, publicDir);
  },
  filename: (req, file, cb) => {
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, sanitizedName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 200 * 1024 * 1024 // 200MB max
  },
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== '.apk') {
      return cb(new Error('Apenas arquivos .apk são permitidos'));
    }
    cb(null, true);
  }
});

const serverRoutes = (logger, getApiLimiter, auth) => {
  const router = express.Router();

  // Métricas do servidor
  router.get('/status', auth, getApiLimiter, async (req, res) => {
    try {
      const cpus = os.cpus();
      const totalIdle = cpus.reduce((sum, cpu) => sum + cpu.times.idle, 0);
      const totalTick = cpus.reduce((sum, cpu) => sum + Object.values(cpu.times).reduce((t, v) => t + v, 0), 0);
      const cpuUsage = totalTick ? ((1 - totalIdle / totalTick) * 100).toFixed(2) : 0;

      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const memoryUsage = ((1 - freeMemory / totalMemory) * 100).toFixed(2);

      const metrics = {
        cpu_usage: parseFloat(cpuUsage),
        memory_usage: parseFloat(memoryUsage),
        uptime: os.uptime(),
        device_count: await Device.countDocuments(),
        provisioned_devices: await Device.countDocuments({ provisioning_status: 'completed' }),
        pending_commands: await Command.countDocuments({ status: 'pending' })
      };

      logger.info(`Métricas do servidor retornadas: CPU ${metrics.cpu_usage}%, Memória ${metrics.memory_usage}%`);
      res.status(200).json(metrics);
    } catch (err) {
      logger.error(`Erro ao obter métricas do servidor: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // ❌ REMOVIDO: A rota /public/apks.json está agora em publicRoutes.js

  // GET /api/server/apks - Listar APKs (para o painel admin)
  router.get('/apks', auth, getApiLimiter, async (req, res) => {
    try {
      const publicDir = path.join(__dirname, '..', 'public');
      const files = await fs.readdir(publicDir);

      const apks = await Promise.all(
        files
          .filter(file => file.toLowerCase().endsWith('.apk'))
          .map(async (file) => {
            const stats = await fs.stat(path.join(publicDir, file));
            const config = require('../utils/helpers').getLocalIPAddress;

            return {
              name: file,
              url: `http://${config()}:${process.env.PORT || 3000}/public/${file}`,
              size: stats.size,
              lastModified: stats.mtime
            };
          })
      );

      logger.info(`APKs listados por ${req.user.username}: ${apks.length} arquivo(s)`);
      res.status(200).json(apks);
    } catch (err) {
      logger.error(`Erro ao listar APKs: ${err.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar APKs',
        details: err.message
      });
    }
  });

  // POST /api/server/upload-apk - Upload de APK (apenas admin)
  router.post('/upload-apk', auth, upload.single('apk'), async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        if (req.file) {
          await fs.unlink(req.file.path);
        }
        return res.status(403).json({
          success: false,
          message: 'Acesso negado. Apenas administradores podem enviar APKs.'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum arquivo foi enviado'
        });
      }

      logger.info(`APK enviado por ${req.user.username}: ${req.file.filename} (${req.file.size} bytes)`);

      const config = require('../utils/helpers').getLocalIPAddress;
      res.status(200).json({
        success: true,
        message: 'APK enviado com sucesso',
        file: {
          name: req.file.filename,
          size: req.file.size,
          url: `http://${config()}:${process.env.PORT || 3000}/public/${req.file.filename}`
        }
      });
    } catch (err) {
      logger.error(`Erro ao fazer upload de APK: ${err.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao fazer upload',
        details: err.message
      });
    }
  });

  // DELETE /api/server/apks/:filename - Deletar APK (apenas admin)
  router.delete('/apks/:filename', auth, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado. Apenas administradores podem excluir APKs.'
        });
      }

      const filename = decodeURIComponent(req.params.filename);

      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({
          success: false,
          message: 'Nome de arquivo inválido'
        });
      }

      if (!filename.toLowerCase().endsWith('.apk')) {
        return res.status(400).json({
          success: false,
          message: 'Apenas arquivos .apk podem ser excluídos'
        });
      }

      const publicDir = path.join(__dirname, '..', 'public');
      const filePath = path.join(publicDir, filename);

      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({
          success: false,
          message: 'Arquivo não encontrado'
        });
      }

      await fs.unlink(filePath);

      logger.info(`APK excluído por ${req.user.username}: ${filename}`);
      res.status(200).json({
        success: true,
        message: `APK "${filename}" excluído com sucesso`
      });
    } catch (err) {
      logger.error(`Erro ao excluir APK: ${err.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao excluir APK',
        details: err.message
      });
    }
  });

  return router;
};

// Exportar também a função de renderização do dashboard
module.exports = serverRoutes;

module.exports.renderDashboard = (logger) => async (req, res) => {
  try {
    const devices = await Device.find().lean();
    const publicDir = path.join(__dirname, '..', 'public');
    const files = await fs.readdir(publicDir);
    const apks = files.filter(file => file.endsWith('.apk')).map(file => ({
      name: file,
      url: `http://${getLocalIPAddress()}:${process.env.PORT || 3000}/public/${file}`
    }));
    res.render('dashboard', {
      devices,
      apks,
      serverUrl: `http://${getLocalIPAddress()}:${process.env.PORT || 3000}`
    });
  } catch (err) {
    logger.error(`Erro ao carregar dashboard: ${err.message}`);
    res.status(500).send('Erro interno do servidor');
  }
};