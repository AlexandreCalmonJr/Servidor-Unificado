const express = require('express');
const ConfigProfile = require('../models/ConfigProfile');

const configProfileRoutes = (logger, modifyApiLimiter, auth) => {
  const router = express.Router();

  // Criar perfil de configuração
  router.post('/', auth, modifyApiLimiter, async (req, res) => {
    try {
      const profileData = req.body;
      
      if (!profileData.name) {
        logger.warn('Nome do perfil ausente');
        return res.status(400).json({ error: 'Nome do perfil é obrigatório' });
      }

      const profile = new ConfigProfile(profileData);
      await profile.save();

      logger.info(`Perfil de configuração criado: ${profileData.name}`);
      res.status(201).json(profile);

    } catch (err) {
      if (err.code === 11000) {
        logger.warn(`Perfil já existe: ${req.body.name}`);
        return res.status(409).json({ error: 'Perfil com este nome já existe' });
      }
      logger.error(`Erro ao criar perfil: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  return router;
};

module.exports = configProfileRoutes;