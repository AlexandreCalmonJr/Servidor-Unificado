const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { getLocalIPAddress } = require('../utils/helpers');

const publicRoutes = (logger, getApiLimiter) => {
  const router = express.Router();

  router.get('/public/apks.json', getApiLimiter, async (req, res) => {
    try {
      // O __dirname aqui aponta para a pasta 'routes', então subimos um nível ('..')
      const publicDir = path.join(__dirname, '..', 'public');
      const files = await fs.readdir(publicDir);
      const apks = await Promise.all(
        files
          .filter(file => file.toLowerCase().endsWith('.apk'))
          .map(async (file) => {
            const stats = await fs.stat(path.join(publicDir, file));
            return {
              name: file,
              url: `http://${getLocalIPAddress()}:${process.env.PORT || 3000}/public/${file}`,
            size: stats.size,
            lastModified: stats.mtime
            };
          })
      );
      logger.info(`Listando ${apks.length} APKs disponíveis via publicRoutes`);
      res.status(200).json(apks);
    } catch (err) {
      logger.error(`Erro ao listar APKs em publicRoutes: ${err.message}`);
      res.status(500).json({ error: 'Erro ao listar APKs', details: err.message });
    }
  });

  return router;
};

module.exports = publicRoutes;