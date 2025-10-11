const express = require('express');
const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const Device = require('../models/Device');
const Command = require('../models/Command');
const { getLocalIPAddress } = require('../utils/helpers');

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

  // Listar APKs na pasta public (ajustado para compatibilidade com Flutter)
  router.get('/public/apks.json', getApiLimiter, async (req, res) => {
    try {
      const publicDir = path.join(__dirname, '..', 'public');
      const files = await fs.readdir(publicDir);
      const apks = await Promise.all(
        files
          .filter(file => file.toLowerCase().endsWith('.apk'))
          .map(async (file) => {
            const stats = await fs.stat(path.join(publicDir, file));
            return {
              name: file,
              // Certifique-se que getLocalIPAddress() está funcionando como esperado
              url: `http://${getLocalIPAddress()}:${process.env.PORT || 3000}/public/${file}`,
              size: stats.size,
              lastModified: stats.mtime
            };
          })
      );
      logger.info(`Listando ${apks.length} APKs disponíveis na pasta public`);
      res.status(200).json(apks);
    } catch (err) {
      logger.error(`Erro ao listar APKs: ${err.message}`);
      res.status(500).json({ error: 'Erro ao listar APKs', details: err.message });
    }
  });

  const renderDashboard = (logger) => async (req, res) => {
    try {
      const devices = await Device.find().lean();
      const publicDir = path.join(__dirname, '..', 'public');
      const files = await fs.readdir(publicDir);
      const apks = files.filter(file => file.endsWith('.apk')).map(file => ({
        name: file,
        url: `http://${getLocalIPAddress()}:${process.env.PORT || 3000}/public/${file}`
      }));
      res.render('dashboard', { devices, apks, serverUrl: `http://${getLocalIPAddress()}:${process.env.PORT || 3000}` });
    } catch (err) {
      logger.error(`Erro ao carregar dashboard: ${err.message}`);
      res.status(500).send('Erro interno do servidor');
    }
  };

  return router;
};

// Exportar também a função de renderização do dashboard para ser usada em express.js
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
    res.render('dashboard', { devices, apks, serverUrl: `http://${getLocalIPAddress()}:${process.env.PORT || 3000}` });
  } catch (err) {
    logger.error(`Erro ao carregar dashboard: ${err.message}`);
    res.status(500).send('Erro interno do servidor');
  }
};