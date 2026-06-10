// routes/publicRoutes.js - VERSÃO CORRIGIDA
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { getLocalIPAddress } = require('../utils/helpers');

const publicRoutes = (logger, getApiLimiter) => {
  const router = express.Router();

  /**
   * GET /public/apks.json
   * Rota pública para listar APKs disponíveis
   * Usada pelo aplicativo Android
   */

  // Endpoint de Status Público (para teste de conexão)
  router.get('/status', (req, res) => {
    res.json({
      success: true,
      message: 'Unified Server Online',
      version: process.env.npm_package_version || '1.0.0'
    });
  });

  router.get('/public/apks.json', getApiLimiter, async (req, res) => {
    try {
      const publicDir = path.join(__dirname, '..', 'public');

      logger.debug('Listando APKs na pasta public', {
        path: publicDir,
        userAgent: req.get('User-Agent')
      });

      // Verifica se a pasta existe
      try {
        await fs.access(publicDir);
      } catch (error) {
        logger.error('Pasta public não encontrada', {
          path: publicDir,
          error: error.message
        });
        return res.status(500).json({
          error: 'Pasta public não encontrada',
        });
      }

      // Lista arquivos na pasta
      const files = await fs.readdir(publicDir);

      // Filtra apenas arquivos .apk
      const apkFiles = files.filter(file =>
        file.toLowerCase().endsWith('.apk')
      );

      logger.info(`APKs encontrados: ${apkFiles.length}`, {
        files: apkFiles,
        ip: req.ip
      });

      // Cria array de objetos com informações dos APKs
      const apks = await Promise.all(
        apkFiles.map(async (file) => {
          const filePath = path.join(publicDir, file);
          const stats = await fs.stat(filePath);

          const serverUrl = `http://${getLocalIPAddress()}:${process.env.PORT || 3000}`;

          return {
            name: file,
            url: `${serverUrl}/public/${file}`,
            size: stats.size,
            lastModified: stats.mtime,
            version: extractVersionFromFilename(file) // Função auxiliar
          };
        })
      );

      logger.info(`Retornando ${apks.length} APKs para ${req.ip}`);

      res.status(200).json(apks);

    } catch (err) {
      logger.error('Erro ao listar APKs', {
        error: err.message,
        stack: err.stack,
        ip: req.ip
      });

      res.status(500).json({
        error: 'Erro ao listar APKs',
      });
    }
  });

  return router;
};

/**
 * Função auxiliar para extrair versão do nome do arquivo
 * Exemplo: "app-v1.2.3.apk" → "1.2.3"
 */
function extractVersionFromFilename(filename) {
  const versionMatch = filename.match(/v?(\d+\.\d+\.\d+)/i);
  return versionMatch ? versionMatch[1] : 'N/A';
}

module.exports = publicRoutes;
