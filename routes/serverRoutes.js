// routes/serverRoutes.js
const express = require('express');
const os = require('os');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const ManagedAsset = require('../models/ManagedAsset');
const AssetCommand = require('../models/AssetCommand');
const { getPublicBaseUrl } = require('../utils/helpers');

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const publicDir = path.join(__dirname, '..', 'public');
    try { await fs.access(publicDir); } catch { await fs.mkdir(publicDir, { recursive: true }); }
    cb(null, publicDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== '.apk') {
      return cb(new Error('Apenas arquivos .apk são permitidos'));
    }
    cb(null, true);
  },
});

const serverRoutes = (logger, getApiLimiter, auth) => {
  const router = express.Router();

  // ── Métricas do servidor ─────────────────────────────────────────
  router.get('/status', auth, getApiLimiter, async (req, res) => {
    try {
      const cpus = os.cpus();
      const totalIdle = cpus.reduce((s, c) => s + c.times.idle, 0);
      const totalTick = cpus.reduce((s, c) => s + Object.values(c.times).reduce((t, v) => t + v, 0), 0);

      res.status(200).json({
        cpu_usage: totalTick ? parseFloat(((1 - totalIdle / totalTick) * 100).toFixed(2)) : 0,
        memory_usage: parseFloat(((1 - os.freemem() / os.totalmem()) * 100).toFixed(2)),
        uptime: os.uptime(),
        device_count: await ManagedAsset.countDocuments(),
        pending_commands: await AssetCommand.countDocuments({ status: 'pending' }),
      });
    } catch (err) {
      logger.error(`Erro ao obter métricas: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // ── Listar APKs (painel admin) ────────────────────────────────────
  router.get('/apks', auth, getApiLimiter, async (req, res) => {
    try {
      const publicDir = path.join(__dirname, '..', 'public');
      const files = await fs.readdir(publicDir);
      const apks = await Promise.all(
        files
          .filter(f => f.toLowerCase().endsWith('.apk'))
          .map(async (file) => {
            const stats = await fs.stat(path.join(publicDir, file));
            return {
              name: file,
              url: `${getPublicBaseUrl(req)}/public/${file}`,
              size: stats.size,
              lastModified: stats.mtime,
            };
          })
      );
      logger.info(`APKs listados por ${req.user.username}: ${apks.length}`);
      res.status(200).json(apks);
    } catch (err) {
      logger.error(`Erro ao listar APKs: ${err.message}`);
      res.status(500).json({ success: false, message: 'Erro ao listar APKs' });
    }
  });

  // ── Upload de APK ────────────────────────────────────────────────
  router.post('/upload-apk', auth, upload.single('apk'), async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        if (req.file) await fs.unlink(req.file.path);
        return res.status(403).json({ success: false, message: 'Apenas administradores podem enviar APKs.' });
      }
      if (!req.file) return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado' });

      logger.info(`APK enviado por ${req.user.username}: ${req.file.filename}`);
      res.status(200).json({
        success: true,
        message: 'APK enviado com sucesso',
        file: {
          name: req.file.filename,
          size: req.file.size,
          url: `${getPublicBaseUrl(req)}/public/${req.file.filename}`,
        },
      });
    } catch (err) {
      logger.error(`Erro no upload de APK: ${err.message}`);
      res.status(500).json({ success: false, message: 'Erro ao fazer upload' });
    }
  });

  // ── Deletar APK ──────────────────────────────────────────────────
  router.delete('/apks/:filename', auth, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Apenas administradores podem excluir APKs.' });
      }

      const filename = decodeURIComponent(req.params.filename);
      if (filename.includes('..') || /[/\\]/.test(filename) || !filename.toLowerCase().endsWith('.apk')) {
        return res.status(400).json({ success: false, message: 'Nome de arquivo inválido' });
      }

      const filePath = path.join(__dirname, '..', 'public', filename);
      try { await fs.access(filePath); } catch {
        return res.status(404).json({ success: false, message: 'Arquivo não encontrado' });
      }

      await fs.unlink(filePath);
      logger.info(`APK excluído por ${req.user.username}: ${filename}`);
      res.status(200).json({ success: true, message: `APK "${filename}" excluído com sucesso` });
    } catch (err) {
      logger.error(`Erro ao excluir APK: ${err.message}`);
      res.status(500).json({ success: false, message: 'Erro ao excluir APK' });
    }
  });

  return router;
};

module.exports = serverRoutes;

// Renderizar dashboard (SSR)
module.exports.renderDashboard = (logger) => async (req, res) => {
  try {
    const devices = await ManagedAsset.find().lean();
    const publicDir = path.join(__dirname, '..', 'public');
    const files = await fs.readdir(publicDir);
    const apks = files.filter(f => f.endsWith('.apk')).map(f => ({
      name: f,
      url: `${getPublicBaseUrl(req)}/public/${f}`,
    }));
    res.render('dashboard', {
      devices, apks,
      serverUrl: getPublicBaseUrl(req),
    });
  } catch (err) {
    logger.error(`Erro ao carregar dashboard: ${err.message}`);
    res.status(500).send('Erro interno do servidor');
  }
};
